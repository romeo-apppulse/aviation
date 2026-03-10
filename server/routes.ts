import crypto from "crypto";
import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import {
  insertAircraftSchema,
  insertOwnerSchema,
  insertLesseeSchema,
  insertLeaseSchema,
  insertPaymentSchema,
  insertMaintenanceSchema,
  insertDocumentSchema,
  insertNotificationSchema,
  insertPayoutSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated, isApproved, isAdmin, isSuperAdmin, isFlightSchool, isAssetOwner, hashPassword } from "./auth";
import { registerUserSchema, loginSchema, type User } from "@shared/schema";
import passport from "passport";
import { emailService, type NotificationEmailData } from "./emailService";
import rateLimit from "express-rate-limit";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);

  const apiRouter = express.Router();

  // Health check endpoint (no auth required)
  apiRouter.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Error handling middleware
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ error: validationError.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  };

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: "Too many authentication attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Authentication routes
  apiRouter.post('/auth/register', authLimiter, async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash password and remove raw password from data
      const { password, ...userData } = validatedData;
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await storage.createUser({
        ...userData,
        passwordHash,
        role: 'user',
        status: 'pending',
      });

      // Notify admins of new registration
      try {
        const admins = await storage.getAdminUsers();
        for (const admin of admins) {
          if (admin.email && emailService.isReady()) {
            emailService.sendNotificationEmail({
              user: admin,
              type: "system_update",
              title: "New Registration Request",
              message: `New admin registration request from ${user.firstName} ${user.lastName} (${user.email}) is pending review.`,
              actionUrl: "/admin/users",
            }).catch(() => {});
          }
        }
      } catch (_) {}

      res.status(201).json({
        message: "Registration successful. Your account is pending approval.",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
        }
      });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  apiRouter.post('/auth/login', authLimiter, (req, res, next) => {
    try {
      loginSchema.parse(req.body);

      passport.authenticate('local', (err: any, user: User | false, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info?.message || 'Invalid credentials' });
        }

        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
          });
        });
      })(req, res, next);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  apiRouter.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Invite token validation
  apiRouter.get('/auth/invite/validate', async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }

      const user = await storage.getUserByInviteToken(token);
      if (!user) {
        return res.status(404).json({ valid: false, message: "Invalid invite token" });
      }

      if (user.inviteExpiresAt && new Date(user.inviteExpiresAt) < new Date()) {
        return res.status(410).json({ valid: false, message: "Invite token has expired" });
      }

      return res.json({
        valid: true,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: user.role,
        email: user.email,
      });
    } catch (error) {
      console.error("Error validating invite:", error);
      res.status(500).json({ valid: false, message: "Internal server error" });
    }
  });

  // Accept invite and set password
  apiRouter.post('/auth/invite/accept', authLimiter, async (req, res, next) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await storage.getUserByInviteToken(token);
      if (!user) {
        return res.status(404).json({ message: "Invalid invite token" });
      }

      if (user.inviteExpiresAt && new Date(user.inviteExpiresAt) < new Date()) {
        return res.status(410).json({ message: "Invite token has expired" });
      }

      const passwordHash = await hashPassword(password);
      const updatedUser = await storage.updateUser(user.id, {
        passwordHash,
        status: "approved",
        inviteToken: null,
        inviteExpiresAt: null,
        lastLoginAt: new Date(),
      } as any);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to activate account" });
      }

      // Notify admins about activation
      const admins = await storage.getAdminUsers();
      const roleLabel = updatedUser.role === "flight_school" ? "Flight School" : "Asset Owner";
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "system",
          priority: "medium",
          title: `${roleLabel} Activated`,
          message: `${updatedUser.firstName || updatedUser.email} has activated their ${roleLabel.toLowerCase()} account.`,
          relatedType: updatedUser.role === "flight_school" ? "lessee" : "owner",
          relatedId: updatedUser.lesseeId || updatedUser.ownerId || null,
          actionUrl: updatedUser.role === "flight_school" ? `/lessees/${updatedUser.lesseeId}` : `/owners/${updatedUser.ownerId}`,
        });
      }

      // Update portal status to "active"
      if (updatedUser.role === "flight_school" && updatedUser.lesseeId) {
        await storage.updateLessee(updatedUser.lesseeId, { portalStatus: "active" } as any);
      } else if (updatedUser.role === "asset_owner" && updatedUser.ownerId) {
        await storage.updateOwner(updatedUser.ownerId, { portalStatus: "active" } as any);
      }

      // Send welcome email immediately
      const portalPath = updatedUser.role === "flight_school" ? "/portal/dashboard" : "/owner/dashboard";
      const welcomeUrl = `${process.env.APP_URL || "http://localhost:6000"}${portalPath}`;
      await emailService.sendNotificationEmail({
        user: updatedUser,
        type: "system_update",
        title: "Welcome to AeroLease Wise!",
        message: `Your account has been activated. You can now log in to your ${roleLabel} portal to manage your aircraft, leases, and documents.`,
        actionUrl: welcomeUrl,
      });

      req.login(updatedUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          status: updatedUser.status,
          lesseeId: updatedUser.lesseeId,
          ownerId: updatedUser.ownerId,
        });
      });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  apiRouter.post('/auth/register/school', authLimiter, async (req, res) => {
    try {
      const schema = z.object({
        schoolName: z.string().min(1, "School name is required"),
        state: z.string().min(1, "State is required"),
        address: z.string().min(1, "Address is required"),
        contactPerson: z.string().min(1, "Contact person is required"),
        phone: z.string().min(1, "Phone number is required"),
        certificationNumber: z.string().optional(),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      });

      const validatedData = schema.parse(req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const lessee = await storage.createLessee({
        name: validatedData.schoolName,
        email: validatedData.email,
        phone: validatedData.phone,
        address: `${validatedData.address}, ${validatedData.state}`,
        contactPerson: validatedData.contactPerson,
        notes: validatedData.certificationNumber ? `FAA Cert: ${validatedData.certificationNumber}` : "",
      });

      const passwordHash = await hashPassword(validatedData.password);

      const user = await storage.createUser({
        firstName: validatedData.contactPerson.split(' ')[0] || "School",
        lastName: validatedData.contactPerson.split(' ').slice(1).join(' ') || "Admin",
        email: validatedData.email,
        passwordHash,
        role: 'flight_school',
        status: 'approved',
        lesseeId: lessee.id,
      });

      req.login(user, (err) => {
        if (err) {
          console.error("req.login error:", err);
          return res.status(500).json({ message: "Auto-login failed", detail: err?.message || String(err) });
        }

        res.status(201).json({
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          lesseeId: user.lesseeId,
        });
      });

    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Protected routes - everything below this requires authentication
  const protectedRouter = express.Router();
  protectedRouter.use(isAuthenticated);

  protectedRouter.get('/auth/user', async (req, res) => {
    try {
      const user = req.user as User;

      // Block pending/blocked users from getting past the status screen
      if (user.status === 'invited') {
        return res.status(403).json({ message: "INVITED" });
      }
      if (user.status !== 'approved') {
        return res.status(403).json({ message: "PENDING_APPROVAL" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailNotificationsEnabled: user.emailNotificationsEnabled,
        emailPaymentReminders: user.emailPaymentReminders,
        emailMaintenanceAlerts: user.emailMaintenanceAlerts,
        emailLeaseExpiry: user.emailLeaseExpiry,
        emailSystemUpdates: user.emailSystemUpdates,
        lesseeId: user.lesseeId,
        ownerId: user.ownerId,
        lastLoginAt: user.lastLoginAt,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // All subsequent routes in protectedRouter require the user to be approved
  protectedRouter.use(isApproved);

  protectedRouter.put('/auth/email-preferences', async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const preferences = req.body;

      // Validate the preferences object
      const validFields = ['emailNotificationsEnabled', 'emailPaymentReminders', 'emailMaintenanceAlerts', 'emailLeaseExpiry', 'emailSystemUpdates'];
      const filteredPreferences: any = {};

      for (const [key, value] of Object.entries(preferences)) {
        if (validFields.includes(key) && typeof value === 'boolean') {
          filteredPreferences[key] = value;
        }
      }

      if (Object.keys(filteredPreferences).length === 0) {
        return res.status(400).json({ message: "No valid preferences provided" });
      }

      const updatedUser = await storage.updateEmailPreferences(userId, filteredPreferences);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating email preferences:", error);
      res.status(500).json({ message: "Failed to update email preferences" });
    }
  });

  protectedRouter.put('/auth/user', async (req: any, res) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const { firstName, lastName, email } = req.body;

      // Validate input
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "First name, last name, and email are required" });
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const updatedUser = await storage.upsertUser({
        id: userId,
        firstName,
        lastName,
        email
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  protectedRouter.put('/auth/password', async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      // Get current user from database
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const { verifyPassword } = await import("./auth");
      const isValid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await storage.updateUser(userId, { passwordHash: newPasswordHash });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Admin user management routes
  protectedRouter.get('/admin/users', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  protectedRouter.get('/admin/users/pending', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  protectedRouter.put('/admin/users/:id/approve', isSuperAdmin, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const approver = req.user as User;
      const approvedBy = approver.id;

      // Prevent actions on Zach's account
      const targetUser = await storage.getUser(id);
      if (targetUser?.email === 'zacharypurvis2@gmail.com') {
        return res.status(403).json({ message: "Cannot modify permanent admin account" });
      }

      const updatedUser = await storage.approveUser(id, approvedBy);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  protectedRouter.put('/admin/users/:id/block', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Prevent actions on Zach's account
      const targetUser = await storage.getUser(id);
      if (targetUser?.email === 'zacharypurvis2@gmail.com') {
        return res.status(403).json({ message: "Cannot modify permanent admin account" });
      }

      const updatedUser = await storage.blockUser(id);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  protectedRouter.delete('/admin/users/:id', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Prevent actions on Zach's account
      const targetUser = await storage.getUser(id);
      if (targetUser?.email === 'zacharypurvis2@gmail.com') {
        return res.status(403).json({ message: "Cannot delete permanent admin account" });
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Update user (edit user details)
  protectedRouter.put('/admin/users/:id', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, password, role, status } = req.body;

      // Prevent actions on Zach's account
      const targetUser = await storage.getUser(id);
      if (targetUser?.email === 'zacharypurvis2@gmail.com') {
        return res.status(403).json({ message: "Cannot modify permanent admin account" });
      }

      const updateData: any = {
        firstName,
        lastName,
        email,
        role,
        status
      };

      // Only include password if it's provided and not empty
      if (password && password.trim()) {
        updateData.password = password;
      }

      const updatedUser = await storage.updateUser(id, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Create new user
  protectedRouter.post('/admin/users', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash the password before creating user
      const passwordHash = await hashPassword(password);

      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        status: 'approved' // New users created by admin are automatically approved
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  protectedRouter.get('/admin/revenue', isAdmin, async (req, res) => {
    try {
      const startMonth = req.query.startMonth as string || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 7);
      const endMonth = req.query.endMonth as string || new Date().toISOString().slice(0, 7);

      const stats = await storage.getRevenueStats(startMonth, endMonth);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching revenue stats:", error);
      res.status(500).json({ message: "Failed to fetch revenue stats" });
    }
  });

  // Admin hour verification
  protectedRouter.get("/admin/hour-submissions", isAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAllFlightHourLogs();
      res.json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch hour submissions" });
    }
  });

  protectedRouter.put("/flight-hours/:id/verify", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({ verifiedHours: z.number().min(0) });
      const { verifiedHours } = schema.parse(req.body);
      const log = await storage.verifyFlightHourLog(id, verifiedHours);
      if (!log) return res.status(404).json({ error: "Flight hour log not found" });
      res.json(log);
    } catch (err) { handleZodError(err, res); }
  });

  // Payout routes
  protectedRouter.get("/admin/payouts", isAdmin, async (req: Request, res: Response) => {
    try {
      const allPayouts = await storage.getAllPayouts();
      res.json(allPayouts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  protectedRouter.post("/admin/payouts", isAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertPayoutSchema.parse(req.body);
      const payout = await storage.createPayout(data);
      res.status(201).json(payout);
    } catch (err) { handleZodError(err, res); }
  });

  protectedRouter.put("/admin/payouts/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({ status: z.string(), processedAt: z.string().optional() });
      const { status, processedAt } = schema.parse(req.body);
      const payout = await storage.updatePayoutStatus(id, status, processedAt ? new Date(processedAt) : undefined);
      if (!payout) return res.status(404).json({ error: "Payout not found" });
      res.json(payout);
    } catch (err) { handleZodError(err, res); }
  });

  // Portal Routes
  const portalRouter = express.Router();
  portalRouter.use(isFlightSchool);

  portalRouter.get('/dashboard', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });
      const stats = await storage.getPortalDashboardStats(user.lesseeId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching portal dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  portalRouter.get('/aircraft', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });
      const leases = await storage.getLeasesForLessee(user.lesseeId);
      const activeLeases = leases.filter(l => l.status === 'Active');

      const aircraft = await Promise.all(activeLeases.map(async (lease) => {
        const ac = await storage.getAircraft(lease.aircraftId);
        return { ...ac, currentLease: lease };
      }));

      res.json(aircraft);
    } catch (error) {
      console.error("Error fetching portal aircraft:", error);
      res.status(500).json({ message: "Failed to fetch aircraft" });
    }
  });

  portalRouter.get('/hours', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });
      const logs = await storage.getFlightHourLogsForLessee(user.lesseeId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching hour logs:", error);
      res.status(500).json({ message: "Failed to fetch hour logs" });
    }
  });

  portalRouter.post('/hours', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });

      const logSchema = z.object({
        aircraftId: z.number(),
        month: z.string(), // YYYY-MM
        reportedHours: z.number().positive(),
        notes: z.string().optional(),
      });

      const data = logSchema.parse(req.body);

      const leases = await storage.getLeasesForLessee(user.lesseeId);
      const lease = leases.find(l => l.aircraftId === data.aircraftId && l.status === 'Active');

      if (!lease) return res.status(400).json({ message: "No active lease found for this aircraft" });

      const log = await storage.createFlightHourLog({
        ...data,
        lesseeId: user.lesseeId,
        leaseId: lease.id,
      });

      const billableHours = Math.max(data.reportedHours, lease.minimumHours);
      const amount = billableHours * lease.hourlyRate;

      const payment = await storage.createPayment({
        leaseId: lease.id,
        amount,
        period: data.month,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        status: 'Pending',
        notes: `Auto-generated from hour log: ${data.reportedHours} hours reported`,
        grossAmount: amount,
        commissionAmount: amount * 0.1,
        netAmount: amount * 0.9,
        lesseeId: user.lesseeId,
        aircraftId: data.aircraftId,
        flightHourLogId: log.id,
      });

      // Notify admins about hour submission
      const ac = await storage.getAircraft(data.aircraftId);
      const lessee = user.lesseeId ? await storage.getLessee(user.lesseeId) : null;
      const lesseeName = lessee?.name || user.firstName || "Flight School";
      const admins = await storage.getAdminUsers();
      const dueDate = payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "N/A";

      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "payment",
          priority: "medium",
          title: "Flight Hours Logged",
          message: `${lesseeName} logged ${data.reportedHours} hrs on ${ac?.registration || "aircraft"} — $${amount.toFixed(2)} invoice created.`,
          relatedType: "payment",
          relatedId: payment.id,
          actionUrl: "/payments",
        });

        // Also send immediate email to each admin (time-sensitive — invoice just created)
        await emailService.sendNotificationEmail({
          user: admin,
          type: "payment_due",
          title: "Hours Logged — Invoice Created",
          message: `${lesseeName} submitted ${data.reportedHours} hours for ${ac?.registration || "aircraft"} (${data.month}). Invoice of $${amount.toFixed(2)} has been auto-created, due ${dueDate}.`,
          actionUrl: "/payments",
        });
      }

      // Send invoice confirmation email to the submitting flight school
      await emailService.sendNotificationEmail({
        user,
        type: "payment_due",
        title: "Hours Received — Invoice Created",
        message: `Your flight hours for ${data.month} have been received. ${data.reportedHours} hours logged (${billableHours} billable). Invoice of $${amount.toFixed(2)} has been created and is due on ${dueDate}.`,
        actionUrl: "/portal/payments",
      });

      res.status(201).json({ log, payment });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  portalRouter.get('/payments', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });
      const payments = await storage.getPaymentsForLessee(user.lesseeId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching portal payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  portalRouter.get('/browse', async (req, res) => {
    try {
      const allAircraft = await storage.getAllAircraftWithDetails();
      res.json(allAircraft);
    } catch (error) {
      console.error("Error browsing aircraft:", error);
      res.status(500).json({ message: "Failed to browse aircraft" });
    }
  });

  portalRouter.get('/browse/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ac = await storage.getAircraftWithDetails(id);
      if (!ac) return res.status(404).json({ message: "Aircraft not found" });
      res.json(ac);
    } catch (error) {
      console.error("Error fetching portal aircraft detail:", error);
      res.status(500).json({ message: "Failed to fetch aircraft" });
    }
  });

  portalRouter.get('/aircraft/:id/availability', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);

      const endDate = new Date(year, month, 0);
      const numDays = endDate.getDate();
      const days = [];

      const acLeases = await storage.getLeasesForAircraft(id);
      const activeLeases = acLeases.filter(l => l.status === 'Active');
      const acMaintenance = await storage.getMaintenanceForAircraft(id);

      for (let day = 1; day <= numDays; day++) {
        const currDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const currDate = new Date(year, month - 1, day);
        let status = 'available';

        const isLeased = activeLeases.some(l => {
          const lStart = new Date(l.startDate);
          const lEnd = l.endDate ? new Date(l.endDate) : null;
          return lStart <= currDate && (!lEnd || lEnd >= currDate);
        });

        if (isLeased) status = 'leased';
        else {
          const isInMaintenance = acMaintenance.some(m => {
            const mDateStr = new Date(m.scheduledDate).toISOString().split('T')[0];
            return mDateStr === currDateStr && ['Scheduled', 'In Progress'].includes(m.status || '');
          });
          if (isInMaintenance) status = 'maintenance';
        }

        days.push({ date: currDateStr, status });
      }

      res.json({ days });
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  portalRouter.post('/leases/start', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });

      const startLeaseSchema = z.object({
        aircraftId: z.number(),
        startDate: z.string(),
        endDate: z.string().optional(),
        estimatedMonthlyHours: z.number().positive(),
      });

      const data = startLeaseSchema.parse(req.body);

      const ac = await storage.getAircraft(data.aircraftId);
      if (!ac || ac.status !== 'Available') {
        return res.status(400).json({ message: "Aircraft is no longer available" });
      }

      const lease = await storage.createLease({
        aircraftId: data.aircraftId,
        lesseeId: user.lesseeId,
        startDate: data.startDate,
        endDate: data.endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        monthlyRate: 0,
        minimumHours: 40,
        hourlyRate: ac.hourlyRate || 145,
        status: 'Active',
      });

      await storage.updateAircraft(data.aircraftId, { status: 'Leased' });

      const amount = data.estimatedMonthlyHours * lease.hourlyRate;
      const payment = await storage.createPayment({
        leaseId: lease.id,
        amount,
        period: data.startDate.slice(0, 7),
        dueDate: data.startDate,
        paidDate: new Date().toISOString().split('T')[0],
        status: 'Paid',
        notes: 'Initial lease payment',
        grossAmount: amount,
        commissionAmount: amount * 0.1,
        netAmount: amount * 0.9,
        lesseeId: user.lesseeId,
      });

      res.status(201).json({ success: true, lease, payment });

      // Create notifications for activity feed
      const admins = await storage.getAdminUsers();

      const notifyUsers = Array.from(new Set([...admins.map(a => a.id), user.id]));

      for (const targetId of notifyUsers) {
        await storage.createNotification({
          userId: targetId,
          type: "lease",
          priority: "high",
          title: "New Lease Agreement",
          message: `${user.firstName || 'A school'} has started a new lease for aircraft ID: ${data.aircraftId}`,
          relatedType: "lease",
          relatedId: lease.id,
          actionUrl: "/leases",
          read: false
        });
      }
    } catch (error) {
      handleZodError(error, res);
    }
  });

  portalRouter.post('/payments/pay', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });

      const paySchema = z.object({
        paymentIds: z.array(z.number()),
      });

      const { paymentIds } = paySchema.parse(req.body);

      const updatedPayments = await Promise.all(paymentIds.map(async (id) => {
        const p = await storage.getPayment(id);
        if (p && p.lesseeId === user.lesseeId) {
          return await storage.updatePayment(id, {
            status: 'Paid',
            paidDate: new Date().toISOString().split('T')[0]
          });
        }
        return null;
      }));

      const paymentsToNotify = updatedPayments.filter((p): p is NonNullable<typeof p> => p != null);
      res.json({ success: true, updatedPayments: paymentsToNotify });

      // Create notifications for payments
      if (paymentsToNotify.length > 0) {
        const admins = await storage.getAdminUsers();

        // Notify admins
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "payment",
            priority: "medium",
            title: "Payment Received",
            message: `${paymentsToNotify.length} invoice(s) paid by ${user.firstName || 'Flight School'}.`,
            relatedType: "payment",
            relatedId: paymentsToNotify[0].id,
            actionUrl: "/payments",
            read: false
          });
        }

        // Notify the flight school user (portal-scoped link)
        await storage.createNotification({
          userId: user.id,
          type: "payment",
          priority: "low",
          title: "Payment Confirmed",
          message: `Your payment of ${paymentsToNotify.length} invoice(s) has been processed successfully.`,
          relatedType: "payment",
          relatedId: paymentsToNotify[0].id,
          actionUrl: "/portal/payments",
          read: false
        });
      }
    } catch (error) {
      handleZodError(error, res);
    }
  });

  portalRouter.get('/documents', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });

      const leases = await storage.getLeasesForLessee(user.lesseeId);
      const docs: any[] = [];

      // Lessee-level documents
      const lesseeDocs = await storage.getDocumentsForEntity("lessee", user.lesseeId);
      docs.push(...lesseeDocs);

      // Aircraft documents for each leased aircraft
      for (const lease of leases) {
        const acDocs = await storage.getDocumentsForEntity("aircraft", lease.aircraftId);
        docs.push(...acDocs);
      }

      res.json(docs);
    } catch (error) {
      console.error("Error fetching portal documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  portalRouter.get('/maintenance', async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ message: "User not linked to a flight school" });
      const records = await storage.getMaintenanceByLesseeId(user.lesseeId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching portal maintenance:", error);
      res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
  });

  protectedRouter.use('/portal', portalRouter);

  // Dashboard routes
  protectedRouter.get("/dashboard", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Aircraft routes
  protectedRouter.get("/aircraft", async (req: Request, res: Response) => {
    try {
      const aircraft = await storage.getAllAircraftWithDetails();
      res.json(aircraft);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch aircraft" });
    }
  });

  protectedRouter.get("/aircraft/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const aircraft = await storage.getAircraftWithDetails(id);
      if (!aircraft) {
        return res.status(404).json({ error: "Aircraft not found" });
      }
      res.json(aircraft);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch aircraft details" });
    }
  });

  protectedRouter.post("/aircraft", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertAircraftSchema.parse(req.body);
      const aircraft = await storage.createAircraft(validatedData);
      res.status(201).json(aircraft);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.put("/aircraft/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAircraftSchema.partial().parse(req.body);
      const aircraft = await storage.updateAircraft(id, validatedData);
      if (!aircraft) {
        return res.status(404).json({ error: "Aircraft not found" });
      }
      res.json(aircraft);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.delete("/aircraft/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAircraft(id);
      if (!deleted) {
        return res.status(404).json({ error: "Aircraft not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete aircraft" });
    }
  });

  // Owner routes
  protectedRouter.get("/owners", async (req: Request, res: Response) => {
    try {
      const owners = await storage.getAllOwners();
      res.json(owners);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch owners" });
    }
  });

  protectedRouter.get("/owners/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const owner = await storage.getOwner(id);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      res.json(owner);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch owner details" });
    }
  });

  protectedRouter.post("/owners", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertOwnerSchema.parse(req.body);
      const owner = await storage.createOwner(validatedData);
      res.status(201).json(owner);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.put("/owners/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertOwnerSchema.partial().parse(req.body);
      const owner = await storage.updateOwner(id, validatedData);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      res.json(owner);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.delete("/owners/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOwner(id);
      if (!deleted) {
        return res.status(404).json({ error: "Owner not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete owner" });
    }
  });

  // Lessee routes
  protectedRouter.get("/lessees", async (req: Request, res: Response) => {
    try {
      const lessees = await storage.getAllLessees();
      res.json(lessees);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch lessees" });
    }
  });

  protectedRouter.get("/lessees/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lessee = await storage.getLessee(id);
      if (!lessee) {
        return res.status(404).json({ error: "Lessee not found" });
      }
      res.json(lessee);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch lessee details" });
    }
  });

  protectedRouter.post("/lessees", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertLesseeSchema.parse(req.body);
      const lessee = await storage.createLessee(validatedData);
      res.status(201).json(lessee);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.put("/lessees/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLesseeSchema.partial().parse(req.body);
      const lessee = await storage.updateLessee(id, validatedData);
      if (!lessee) {
        return res.status(404).json({ error: "Lessee not found" });
      }
      res.json(lessee);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.delete("/lessees/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLessee(id);
      if (!deleted) {
        return res.status(404).json({ error: "Lessee not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete lessee" });
    }
  });

  // Invite routes for lessees (flight schools)
  protectedRouter.post("/lessees/:id/invite", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lessee = await storage.getLessee(id);
      if (!lessee) {
        return res.status(404).json({ error: "Lessee not found" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create invited user
      const user = await storage.createUser({
        firstName: lessee.contactPerson || lessee.name,
        lastName: "",
        email: lessee.email,
        passwordHash: "", // Will be set on invite accept
        role: "flight_school",
        status: "invited",
        lesseeId: id,
      });

      // Set invite token on user
      await storage.updateUser(user.id, {
        inviteToken: token,
        inviteExpiresAt: expiresAt,
        invitedAt: new Date(),
      } as any);

      // Update lessee portal status
      await storage.updateLessee(id, { portalStatus: "invited" } as any);

      // Send invite email immediately
      const inviteUrlSchool = `${process.env.APP_URL || "http://localhost:6000"}/accept-invite?token=${token}`;
      await emailService.sendInviteEmail({
        to: lessee.email,
        firstName: lessee.contactPerson || lessee.name || "there",
        inviteUrl: inviteUrlSchool,
        role: "flight_school",
      });

      // Notify admins
      const reqUser = req.user as User;
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "system",
          priority: "low",
          title: "Invite Sent",
          message: `Invite sent to flight school "${lessee.name}" (${lessee.email}).`,
          relatedType: "lessee",
          relatedId: id,
          actionUrl: `/lessees/${id}`,
        });
      }

      res.json({ message: "Invite sent", token });
    } catch (err: any) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({ error: "User with this email already exists" });
      }
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  protectedRouter.post("/lessees/:id/resend-invite", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lessee = await storage.getLessee(id);
      if (!lessee) {
        return res.status(404).json({ error: "Lessee not found" });
      }

      const existingUser = await storage.getUserByEmail(lessee.email);
      if (!existingUser) {
        return res.status(404).json({ error: "No invite found for this lessee" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateUser(existingUser.id, {
        inviteToken: token,
        inviteExpiresAt: expiresAt,
        invitedAt: new Date(),
        status: "invited",
      } as any);

      // Resend invite email immediately
      const resendUrlSchool = `${process.env.APP_URL || "http://localhost:6000"}/accept-invite?token=${token}`;
      await emailService.sendInviteEmail({
        to: lessee.email,
        firstName: lessee.contactPerson || lessee.name || "there",
        inviteUrl: resendUrlSchool,
        role: "flight_school",
      });

      res.json({ message: "Invite resent", token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  // Cancel and invite-link for lessees
  protectedRouter.delete("/lessees/:id/invite", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lessee = await storage.getLessee(id);
      if (!lessee) return res.status(404).json({ error: "Lessee not found" });
      const existingUser = await storage.getUserByEmail(lessee.email);
      if (existingUser) {
        await storage.updateUser(existingUser.id, {
          inviteToken: null,
          inviteExpiresAt: null,
          status: "pending",
        } as any);
      }
      await storage.updateLessee(id, { portalStatus: "none" } as any);
      res.json({ message: "Invite cancelled" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to cancel invite" });
    }
  });

  protectedRouter.get("/lessees/:id/invite-link", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lessee = await storage.getLessee(id);
      if (!lessee) return res.status(404).json({ error: "Lessee not found" });
      const user = await storage.getUserByEmail(lessee.email);
      if (!user || !user.inviteToken) return res.status(404).json({ error: "No active invite found" });
      const link = `${process.env.APP_URL || 'https://your-app.onrender.com'}/accept-invite?token=${user.inviteToken}`;
      res.json({ link });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get invite link" });
    }
  });

  // Invite routes for owners (asset owners)
  protectedRouter.post("/owners/:id/invite", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const owner = await storage.getOwner(id);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await storage.createUser({
        firstName: owner.name,
        lastName: "",
        email: owner.email,
        passwordHash: "",
        role: "asset_owner",
        status: "invited",
      });

      await storage.updateUser(user.id, {
        ownerId: id,
        inviteToken: token,
        inviteExpiresAt: expiresAt,
        invitedAt: new Date(),
      } as any);

      await storage.updateOwner(id, { portalStatus: "invited" } as any);

      // Send invite email immediately
      const inviteUrlOwner = `${process.env.APP_URL || "http://localhost:6000"}/accept-invite?token=${token}`;
      await emailService.sendInviteEmail({
        to: owner.email,
        firstName: owner.name || "there",
        inviteUrl: inviteUrlOwner,
        role: "asset_owner",
      });

      // Notify admins
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "system",
          priority: "low",
          title: "Invite Sent",
          message: `Invite sent to asset owner "${owner.name}" (${owner.email}).`,
          relatedType: "owner",
          relatedId: id,
          actionUrl: `/owners/${id}`,
        });
      }

      res.json({ message: "Invite sent", token });
    } catch (err: any) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({ error: "User with this email already exists" });
      }
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  protectedRouter.post("/owners/:id/resend-invite", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const owner = await storage.getOwner(id);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }

      const existingUser = await storage.getUserByEmail(owner.email);
      if (!existingUser) {
        return res.status(404).json({ error: "No invite found for this owner" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateUser(existingUser.id, {
        inviteToken: token,
        inviteExpiresAt: expiresAt,
        invitedAt: new Date(),
        status: "invited",
      } as any);

      // Resend invite email immediately
      const resendUrlOwner = `${process.env.APP_URL || "http://localhost:6000"}/accept-invite?token=${token}`;
      await emailService.sendInviteEmail({
        to: owner.email,
        firstName: owner.name || "there",
        inviteUrl: resendUrlOwner,
        role: "asset_owner",
      });

      res.json({ message: "Invite resent", token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  // Cancel and invite-link for owners
  protectedRouter.delete("/owners/:id/invite", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const owner = await storage.getOwner(id);
      if (!owner) return res.status(404).json({ error: "Owner not found" });
      const existingUser = await storage.getUserByEmail(owner.email);
      if (existingUser) {
        await storage.updateUser(existingUser.id, {
          inviteToken: null,
          inviteExpiresAt: null,
          status: "pending",
        } as any);
      }
      await storage.updateOwner(id, { portalStatus: "none" } as any);
      res.json({ message: "Invite cancelled" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to cancel invite" });
    }
  });

  protectedRouter.get("/owners/:id/invite-link", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const owner = await storage.getOwner(id);
      if (!owner) return res.status(404).json({ error: "Owner not found" });
      const user = await storage.getUserByEmail(owner.email);
      if (!user || !user.inviteToken) return res.status(404).json({ error: "No active invite found" });
      const link = `${process.env.APP_URL || 'https://your-app.onrender.com'}/accept-invite?token=${user.inviteToken}`;
      res.json({ link });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get invite link" });
    }
  });

  // Lease routes
  protectedRouter.get("/leases", async (req: Request, res: Response) => {
    try {
      const leases = await storage.getAllLeasesWithDetails();
      res.json(leases);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch leases" });
    }
  });

  protectedRouter.get("/leases/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lease = await storage.getLeaseWithDetails(id);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }
      res.json(lease);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch lease details" });
    }
  });

  protectedRouter.post("/leases", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertLeaseSchema.parse(req.body);
      const lease = await storage.createLease(validatedData);
      res.status(201).json(lease);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.put("/leases/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLeaseSchema.partial().parse(req.body);
      const lease = await storage.updateLease(id, validatedData);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }
      res.json(lease);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.delete("/leases/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLease(id);
      if (!deleted) {
        return res.status(404).json({ error: "Lease not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete lease" });
    }
  });

  // Lease lifecycle routes
  protectedRouter.put("/leases/:id/terminate", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({ reason: z.string().min(1), effectiveDate: z.string().min(1) });
      const { reason, effectiveDate } = schema.parse(req.body);
      const lease = await storage.terminateLease(id, reason, effectiveDate);
      if (!lease) return res.status(404).json({ error: "Lease not found" });
      res.json(lease);
    } catch (err) { handleZodError(err, res); }
  });

  protectedRouter.put("/leases/:id/renew", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({ endDate: z.string().min(1), monthlyRate: z.number().optional() });
      const { endDate, monthlyRate } = schema.parse(req.body);
      const lease = await storage.renewLease(id, endDate, monthlyRate);
      if (!lease) return res.status(404).json({ error: "Lease not found" });
      res.json(lease);
    } catch (err) { handleZodError(err, res); }
  });

  protectedRouter.put("/leases/:id/suspend", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({ reason: z.string().min(1) });
      const { reason } = schema.parse(req.body);
      const lease = await storage.suspendLease(id, reason);
      if (!lease) return res.status(404).json({ error: "Lease not found" });
      res.json(lease);
    } catch (err) { handleZodError(err, res); }
  });

  protectedRouter.put("/leases/:id/reactivate", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lease = await storage.reactivateLease(id);
      if (!lease) return res.status(404).json({ error: "Lease not found" });
      res.json(lease);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to reactivate lease" });
    }
  });

  protectedRouter.get("/aircraft/:id/leases", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const leases = await storage.getLeasesForAircraft(id);
      res.json(leases);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch leases for aircraft" });
    }
  });

  protectedRouter.get("/lessees/:id/leases", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const leases = await storage.getLeasesForLessee(id);
      res.json(leases);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch leases for lessee" });
    }
  });

  // Payment routes
  protectedRouter.get("/payments", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, status } = req.query as { startDate?: string; endDate?: string; status?: string };
      if (startDate || endDate || status) {
        const filtered = await storage.getAllPaymentsFiltered({ startDate, endDate, status });
        return res.json(filtered);
      }
      const payments = await storage.getAllPaymentsWithDetails();
      res.json(payments);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  protectedRouter.post("/payments/bulk", isAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        ids: z.array(z.number()).min(1),
        action: z.enum(["mark_paid", "mark_overdue", "delete"]),
      });
      const { ids, action } = schema.parse(req.body);
      const count = await storage.bulkUpdatePayments(ids, action);
      res.json({ updated: count });
    } catch (err) { handleZodError(err, res); }
  });

  protectedRouter.post("/maintenance/bulk", isAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        ids: z.array(z.number()).min(1),
        action: z.enum(["mark_completed", "delete"]),
      });
      const { ids, action } = schema.parse(req.body);
      const count = await storage.bulkUpdateMaintenance(ids, action);
      res.json({ updated: count });
    } catch (err) { handleZodError(err, res); }
  });

  protectedRouter.get("/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPaymentWithDetails(id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch payment details" });
    }
  });

  protectedRouter.post("/payments", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.put("/payments/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(id, validatedData);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);

      // Notify flight school user when admin marks payment as Paid
      if (validatedData.status === "Paid" && payment.lesseeId) {
        const flightSchoolUser = await storage.getUserByLesseeId(payment.lesseeId);
        if (flightSchoolUser) {
          await storage.createNotification({
            userId: flightSchoolUser.id,
            type: "payment",
            priority: "medium",
            title: "Payment Marked as Paid",
            message: `Your invoice has been marked as paid by the administrator.`,
            relatedType: "payment",
            relatedId: payment.id,
            actionUrl: "/portal/payments",
            read: false,
          });

          // Also send payment receipt email to the flight school
          await emailService.sendNotificationEmail({
            user: flightSchoolUser,
            type: "general",
            title: "Payment Confirmed — Receipt",
            message: `Your payment of $${payment.amount} for ${payment.period} has been marked as received. Thank you.`,
            actionUrl: "/portal/payments",
          });
        }
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.delete("/payments/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePayment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  protectedRouter.get("/leases/:id/payments", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const payments = await storage.getPaymentsForLease(id);
      res.json(payments);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch payments for lease" });
    }
  });

  // Maintenance routes
  protectedRouter.get("/maintenance", async (req: Request, res: Response) => {
    try {
      const maintenance = await storage.getAllMaintenance();
      res.json(maintenance);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch maintenance records" });
    }
  });

  protectedRouter.get("/maintenance/upcoming", async (req: Request, res: Response) => {
    try {
      const upcoming = await storage.getUpcomingMaintenance();
      res.json(upcoming);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch upcoming maintenance" });
    }
  });

  protectedRouter.get("/maintenance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const maintenance = await storage.getMaintenance(id);
      if (!maintenance) {
        return res.status(404).json({ error: "Maintenance record not found" });
      }
      res.json(maintenance);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch maintenance record" });
    }
  });

  protectedRouter.post("/maintenance", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      let bodyData = { ...req.body };

      if (user.role === 'flight_school') {
        if (!user.lesseeId) {
          return res.status(400).json({ error: "User not linked to a flight school" });
        }
        // Verify the aircraft belongs to their lessee (via active lease)
        const schoolLeases = await storage.getLeasesForLessee(user.lesseeId);
        const activeLeases = schoolLeases.filter((l) => l.status === 'Active');
        const aircraftId = parseInt(bodyData.aircraftId);
        const hasLease = activeLeases.some((l) => l.aircraftId === aircraftId);
        if (!hasLease) {
          return res.status(403).json({ error: "Aircraft does not belong to your leased fleet" });
        }
        bodyData.reportedByLesseeId = user.lesseeId;
      } else if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ error: "Forbidden" });
      }

      const validatedData = insertMaintenanceSchema.parse(bodyData);
      const maintenanceRecord = await storage.createMaintenance(validatedData);
      res.status(201).json(maintenanceRecord);

      // Notify admins if reported by a flight school
      if (user.role === 'flight_school' && user.lesseeId) {
        try {
          const ac = await storage.getAircraft(validatedData.aircraftId);
          const lessee = await storage.getLessee(user.lesseeId);
          const admins = await storage.getAdminUsers();
          for (const admin of admins) {
            await storage.createNotification({
              userId: admin.id,
              type: "maintenance",
              priority: "medium",
              title: "Maintenance Reported by Flight School",
              message: `${lessee?.name || "A flight school"} reported a maintenance issue: ${validatedData.type} on ${ac?.registration || "aircraft"} scheduled ${validatedData.scheduledDate}.`,
              relatedType: "maintenance",
              relatedId: maintenanceRecord.id,
              actionUrl: `/maintenance/${maintenanceRecord.id}`,
            });
            if (emailService.isReady()) {
              emailService.sendNotificationEmail({
                user: admin,
                type: "maintenance_reminder",
                title: "New Maintenance Report",
                message: `${lessee?.name || "A flight school"} has reported a new maintenance item: ${validatedData.type} on aircraft ${ac?.registration || validatedData.aircraftId}. Scheduled: ${validatedData.scheduledDate}.`,
                actionUrl: "/maintenance",
              }).catch(() => {});
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.put("/maintenance/:id", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const validatedData = insertMaintenanceSchema.partial().parse(req.body);

      if (user.role === 'flight_school') {
        if (!user.lesseeId) {
          return res.status(400).json({ error: "User not linked to a flight school" });
        }
        // Can only update records they reported
        const existing = await storage.getMaintenance(id);
        if (!existing) {
          return res.status(404).json({ error: "Maintenance record not found" });
        }
        if (existing.reportedByLesseeId !== user.lesseeId) {
          return res.status(403).json({ error: "You can only update maintenance records you reported" });
        }
        // Prevent flight schools from tampering with attribution
        delete (validatedData as any).reportedByLesseeId;
      } else if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ error: "Forbidden" });
      }

      const maintenanceRecord = await storage.updateMaintenance(id, validatedData);
      if (!maintenanceRecord) {
        return res.status(404).json({ error: "Maintenance record not found" });
      }
      res.json(maintenanceRecord);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.delete("/maintenance/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMaintenance(id);
      if (!deleted) {
        return res.status(404).json({ error: "Maintenance record not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete maintenance record" });
    }
  });

  protectedRouter.get("/aircraft/:id/maintenance", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const records = await storage.getMaintenanceForAircraft(id);
      res.json(records);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch maintenance records for aircraft" });
    }
  });

  // Document routes
  protectedRouter.get("/documents", async (req: Request, res: Response) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  protectedRouter.get("/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  protectedRouter.post("/documents", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.put("/documents/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDocumentSchema.partial().parse(req.body);
      const document = await storage.updateDocument(id, validatedData);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.delete("/documents/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  protectedRouter.get("/entity/:type/:id/documents", async (req: Request, res: Response) => {
    try {
      const relatedType = req.params.type;
      const relatedId = parseInt(req.params.id);
      const documents = await storage.getDocumentsForEntity(relatedType, relatedId);
      res.json(documents);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch documents for entity" });
    }
  });

  // Notification routes
  protectedRouter.get("/notifications", async (req: any, res: Response) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const notifications = await storage.getAllNotifications(userId);
      res.json(notifications);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  protectedRouter.get("/notifications/unread", async (req: any, res: Response) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  protectedRouter.post("/notifications", async (req: any, res: Response) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const validatedData = insertNotificationSchema.parse({ ...req.body, userId });
      const notification = await storage.createNotification(validatedData);

      // Send email notification if email service is available
      if (emailService.isReady()) {
        const user = await storage.getUser(userId);
        if (user && user.email && user.emailNotificationsEnabled) {
          // Determine notification type based on title/content
          let emailType: NotificationEmailData['type'] = 'general';
          const title = validatedData.title.toLowerCase();
          let shouldSendEmail = true;

          if (title.includes('payment') && title.includes('due')) {
            emailType = 'payment_due';
            shouldSendEmail = user.emailPaymentReminders ?? true;
          } else if (title.includes('maintenance')) {
            emailType = 'maintenance_reminder';
            shouldSendEmail = user.emailMaintenanceAlerts ?? true;
          } else if (title.includes('lease') && title.includes('expir')) {
            emailType = 'lease_expiry';
            shouldSendEmail = user.emailLeaseExpiry ?? true;
          } else if (title.includes('system') || title.includes('update')) {
            emailType = 'system_update';
            shouldSendEmail = user.emailSystemUpdates ?? true;
          }

          // Send email notification only if user has enabled this type
          if (shouldSendEmail) {
            emailService.sendNotificationEmail({
              user,
              title: validatedData.title,
              message: validatedData.message,
              actionUrl: validatedData.actionUrl || undefined,
              type: emailType
            }).catch(error => {
              console.error('Failed to send email notification:', error);
            });
          }
        }
      }

      res.status(201).json(notification);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  protectedRouter.put("/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.markNotificationAsRead(id);
      if (!updated) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  protectedRouter.put("/notifications/read-all", async (req: any, res: Response) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const updated = await storage.markAllNotificationsAsRead(userId);
      res.json({ success: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  protectedRouter.delete("/notifications/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteNotification(id);
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Email notification endpoints
  protectedRouter.get("/notifications/email/status", async (req: any, res: Response) => {
    try {
      const status = {
        emailServiceReady: emailService.isReady(),
        timestamp: new Date().toISOString()
      };
      res.json(status);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get email service status" });
    }
  });

  protectedRouter.post("/notifications/email/test", async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const dbUser = await storage.getUser(userId);

      if (!dbUser || !dbUser.email) {
        return res.status(400).json({ error: "User email not available" });
      }

      if (!emailService.isReady()) {
        return res.status(503).json({ error: "Email service not available" });
      }

      const success = await emailService.sendNotificationEmail({
        user: dbUser,
        title: "Test Email Notification",
        message: "This is a test email to verify that the notification system is working correctly. If you receive this email, the system is configured properly.",
        type: 'system_update',
        actionUrl: `${req.protocol}://${req.get('host')}/settings`
      });

      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send test email" });
      }
    } catch (err) {
      console.error("Error sending test email:", err);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Support request endpoint
  protectedRouter.post("/support/request", async (req: any, res: Response) => {
    try {
      const { name, email, subject, priority, category, message } = req.body;

      // Validate required fields
      if (!name || !email || !subject || !priority || !category || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Validate email format
      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate priority and category
      const validPriorities = ["low", "medium", "high", "urgent"];
      const validCategories = ["technical", "billing", "feature", "bug", "general"];

      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ message: "Invalid priority level" });
      }

      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }

      // In a real application, this would save to database and send email
      // For now, we'll just log the request and return success
      console.log("Support request received:", {
        userId: (req.user as User)?.id,
        name,
        email,
        subject,
        priority,
        category,
        message,
        timestamp: new Date().toISOString()
      });

      res.json({
        message: "Support request submitted successfully",
        requestId: `SR-${Date.now()}`
      });
    } catch (error) {
      console.error("Error submitting support request:", error);
      res.status(500).json({ message: "Failed to submit support request" });
    }
  });

  // === Entity Detail APIs ===

  // Owner detail (admin)
  protectedRouter.get("/owners/:id/detail", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const owner = await storage.getOwner(id);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const ownerAircraft = await storage.getAircraftByOwnerId(id);
      const aircraftIds = ownerAircraft.map(ac => ac.id);

      // Bulk-fetch all leases for this owner's aircraft (single query)
      const allLeases = await storage.getLeasesByAircraftIds(aircraftIds);
      const leasesByAircraftId = new Map<number, typeof allLeases>();
      for (const lease of allLeases) {
        if (!leasesByAircraftId.has(lease.aircraftId)) leasesByAircraftId.set(lease.aircraftId, []);
        leasesByAircraftId.get(lease.aircraftId)!.push(lease);
      }

      // Bulk-fetch lessees for active leases
      const activeLesseeIds = Array.from(new Set(
        allLeases.filter(l => l.status === "Active").map(l => l.lesseeId)
      ));
      const lesseeList = activeLesseeIds.length > 0
        ? await Promise.all(activeLesseeIds.map(lid => storage.getLessee(lid)))
        : [];
      const lesseeById = new Map(lesseeList.filter(Boolean).map(l => [l!.id, l]));

      const aircraftWithLeases = ownerAircraft.map(ac => {
        const acLeases = leasesByAircraftId.get(ac.id) || [];
        const activeLease = acLeases.find(l => l.status === "Active");
        const lessee = activeLease ? lesseeById.get(activeLease.lesseeId) : undefined;
        return { ...ac, currentLease: activeLease ? { ...activeLease, lessee } : undefined };
      });

      // Bulk-fetch all payments for this owner's leases (single query)
      const allLeaseIds = allLeases.map(l => l.id);
      const allPayments = await storage.getPaymentsByLeaseIds(allLeaseIds);

      const docs = await storage.getDocumentsForEntity("owner", id);

      // Revenue summary: sum payments for owner's aircraft this month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      let grossThisMonth = 0, commissionThisMonth = 0, netThisMonth = 0;
      for (const p of allPayments) {
        if (p.period === currentMonth || p.period?.startsWith(currentMonth)) {
          grossThisMonth += p.grossAmount || p.amount || 0;
          commissionThisMonth += p.commissionAmount || 0;
          netThisMonth += p.netAmount || 0;
        }
      }

      res.json({
        owner,
        aircraft: aircraftWithLeases,
        documents: docs,
        revenue: { grossThisMonth, commissionThisMonth, netThisMonth },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch owner detail" });
    }
  });

  // Lessee detail (admin)
  protectedRouter.get("/lessees/:id/detail", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lessee = await storage.getLessee(id);
      if (!lessee) return res.status(404).json({ error: "Lessee not found" });

      const lesseeLeases = await storage.getLeasesForLessee(id);
      const leasesWithAircraft = await Promise.all(
        lesseeLeases.map(async (lease) => {
          const ac = await storage.getAircraft(lease.aircraftId);
          return { ...lease, aircraft: ac };
        })
      );

      const allPayments = await storage.getPaymentsForLessee(id);
      const flightLogs = await storage.getFlightHourLogsForLessee(id);
      const docs = await storage.getDocumentsForEntity("lessee", id);

      // Find the user account linked to this lessee
      const linkedUser = await storage.getUserByLesseeId(id);

      res.json({
        lessee,
        leases: leasesWithAircraft,
        payments: allPayments.sort((a, b) => {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const db2 = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return db2 - da;
        }),
        flightHourLogs: flightLogs,
        documents: docs,
        userAccount: linkedUser ? {
          status: linkedUser.status,
          lastLoginAt: linkedUser.lastLoginAt,
          role: linkedUser.role,
          email: linkedUser.email,
        } : null,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch lessee detail" });
    }
  });

  // === Asset Owner Portal Routes ===
  const ownerRouter = express.Router();
  ownerRouter.use(isAssetOwner);

  ownerRouter.get("/dashboard", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user.ownerId) return res.status(400).json({ error: "No owner profile linked" });

      const ownerAircraft = await storage.getAircraftByOwnerId(user.ownerId);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const aircraftIds = ownerAircraft.map(ac => ac.id);

      // Bulk fetch all leases and payments for this owner's aircraft
      const allLeases = await storage.getLeasesByAircraftIds(aircraftIds);
      const allLeaseIds = allLeases.map(l => l.id);
      const allPayments = await storage.getPaymentsByLeaseIds(allLeaseIds);

      // Build maps for O(1) lookup
      const leasesByAircraftId = new Map<number, typeof allLeases>();
      for (const lease of allLeases) {
        if (!leasesByAircraftId.has(lease.aircraftId)) leasesByAircraftId.set(lease.aircraftId, []);
        leasesByAircraftId.get(lease.aircraftId)!.push(lease);
      }
      const paymentsByLeaseId = new Map<number, typeof allPayments>();
      for (const p of allPayments) {
        if (!paymentsByLeaseId.has(p.leaseId)) paymentsByLeaseId.set(p.leaseId, []);
        paymentsByLeaseId.get(p.leaseId)!.push(p);
      }

      // Bulk fetch lessees for active leases
      const activeLeaseLesseeIds = Array.from(new Set(
        allLeases.filter(l => l.status === "Active").map(l => l.lesseeId)
      ));
      const lesseeList = await Promise.all(activeLeaseLesseeIds.map(id => storage.getLessee(id)));
      const lesseeById = new Map(lesseeList.filter(Boolean).map(l => [l!.id, l!]));

      // Build leaseById for enrichedRecent lookup
      const leaseById = new Map(allLeases.map(l => [l.id, l]));

      let grossThisMonth = 0, netThisMonth = 0;
      const recentPayments: any[] = [];
      let leasedCount = 0;

      for (const ac of ownerAircraft) {
        const acLeases = leasesByAircraftId.get(ac.id) || [];
        const activeLease = acLeases.find(l => l.status === "Active");
        if (activeLease) leasedCount++;

        for (const lease of acLeases) {
          const leasePayments = paymentsByLeaseId.get(lease.id) || [];
          for (const p of leasePayments) {
            if (p.period === currentMonth || p.period?.startsWith(currentMonth)) {
              grossThisMonth += p.grossAmount || p.amount || 0;
              netThisMonth += p.netAmount || 0;
            }
          }
          recentPayments.push(...leasePayments.map(p => ({ ...p, aircraftRegistration: ac.registration })));
        }
      }

      recentPayments.sort((a, b) => {
        const da = a.paidDate || a.dueDate || "";
        const db2 = b.paidDate || b.dueDate || "";
        return db2.localeCompare(da);
      });

      // Enrich recent payments with lessee name using pre-fetched maps
      const enrichedRecent = recentPayments.slice(0, 5).map((p) => {
        let lesseeName = "";
        if (p.leaseId) {
          const lease = leaseById.get(p.leaseId);
          if (lease) {
            const lessee = lesseeById.get(lease.lesseeId);
            lesseeName = lessee?.name || "";
          }
        }
        return { ...p, lesseeName };
      });

      res.json({
        totalAircraft: ownerAircraft.length,
        leasedAircraft: leasedCount,
        grossRevenueThisMonth: grossThisMonth,
        netRevenueThisMonth: netThisMonth,
        aircraft: ownerAircraft,
        recentPayments: enrichedRecent,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch owner dashboard" });
    }
  });

  ownerRouter.get("/aircraft", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user.ownerId) return res.status(400).json({ error: "No owner profile linked" });

      const ownerAircraft = await storage.getAircraftByOwnerId(user.ownerId);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const aircraftIds = ownerAircraft.map(ac => ac.id);

      // Bulk-fetch all leases, payments, and flight logs (3 queries total)
      const allLeases = await storage.getLeasesByAircraftIds(aircraftIds);
      const activeLeases = allLeases.filter(l => l.status === "Active");
      const activeLeaseIds = activeLeases.map(l => l.id);
      const activeLesseeIds = Array.from(new Set(activeLeases.map(l => l.lesseeId)));

      const [allPayments, allLogs, lesseeList] = await Promise.all([
        storage.getPaymentsByLeaseIds(activeLeaseIds),
        storage.getFlightHourLogsByLesseeIds(activeLesseeIds),
        Promise.all(activeLesseeIds.map(lid => storage.getLessee(lid))),
      ]);

      const leaseByAircraftId = new Map(activeLeases.map(l => [l.aircraftId, l]));
      const lesseeById = new Map(lesseeList.filter(Boolean).map(l => [l!.id, l]));

      // Group payments by leaseId
      const paymentsByLeaseId = new Map<number, typeof allPayments>();
      for (const p of allPayments) {
        if (!paymentsByLeaseId.has(p.leaseId)) paymentsByLeaseId.set(p.leaseId, []);
        paymentsByLeaseId.get(p.leaseId)!.push(p);
      }

      const result = ownerAircraft.map(ac => {
        const activeLease = leaseByAircraftId.get(ac.id);
        let lessee, hoursThisMonth = 0, grossThisMonth = 0, netThisMonth = 0;

        if (activeLease) {
          lessee = lesseeById.get(activeLease.lesseeId);
          const payments = paymentsByLeaseId.get(activeLease.id) || [];
          for (const p of payments) {
            if (p.period === currentMonth || p.period?.startsWith(currentMonth)) {
              grossThisMonth += p.grossAmount || p.amount || 0;
              netThisMonth += p.netAmount || 0;
            }
          }
          const monthLog = allLogs.find(l => l.aircraftId === ac.id && l.month === currentMonth);
          if (monthLog) hoursThisMonth = monthLog.reportedHours;
        }

        return {
          ...ac,
          activeLease: activeLease ? { ...activeLease, lessee } : undefined,
          monthStats: { hoursThisMonth, grossThisMonth, netThisMonth },
        };
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch owner aircraft" });
    }
  });

  ownerRouter.get("/aircraft/:id", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user.ownerId) return res.status(400).json({ error: "No owner profile linked" });

      const id = parseInt(req.params.id);
      const ac = await storage.getAircraft(id);
      if (!ac || ac.ownerId !== user.ownerId) {
        return res.status(404).json({ error: "Aircraft not found" });
      }

      const acLeases = await storage.getLeasesForAircraft(id);
      const activeLease = acLeases.find(l => l.status === "Active");
      const acLeaseIds = acLeases.map(l => l.id);
      const acLesseeIds = Array.from(new Set(acLeases.map(l => l.lesseeId)));

      // Bulk-fetch payments and logs (2 queries instead of up to 12)
      const [lessee, allPayments, allLogs, docs] = await Promise.all([
        activeLease ? storage.getLessee(activeLease.lesseeId) : Promise.resolve(undefined),
        storage.getPaymentsByLeaseIds(acLeaseIds),
        storage.getFlightHourLogsByLesseeIds(acLesseeIds),
        storage.getDocumentsForEntity("aircraft", id),
      ]);

      // Last 6 months performance
      const now = new Date();
      const monthlyPerformance = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        let hours = 0, gross = 0, net = 0;

        for (const p of allPayments) {
          if (p.period === month || p.period?.startsWith(month)) {
            gross += p.grossAmount || p.amount || 0;
            net += p.netAmount || 0;
          }
        }
        const log = allLogs.find(l => l.aircraftId === id && l.month === month);
        if (log) hours += log.reportedHours;

        monthlyPerformance.push({ month, hours, gross, platformFee: gross - net, net });
      }

      res.json({
        ...ac,
        currentLease: activeLease ? { ...activeLease } : undefined,
        lesseeName: lessee?.name || null,
        monthlyPerformance,
        documents: docs,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch aircraft detail" });
    }
  });

  ownerRouter.get("/revenue", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user.ownerId) return res.status(400).json({ error: "No owner profile linked" });

      // period: "current" | "last" | "quarter" | "all"
      const period = (req.query.period as string) || "all";
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const ym = (y: number, m: number) => `${y}-${pad(m + 1)}`;
      let startMonth = "", endMonth = "";
      if (period === "current") {
        startMonth = endMonth = ym(now.getFullYear(), now.getMonth());
      } else if (period === "last") {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startMonth = endMonth = ym(d.getFullYear(), d.getMonth());
      } else if (period === "quarter") {
        const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        startMonth = ym(d.getFullYear(), d.getMonth());
        endMonth = ym(now.getFullYear(), now.getMonth());
      }
      // "all" → no filter

      const ownerAircraft = await storage.getAircraftByOwnerId(user.ownerId);
      const aircraftIds = ownerAircraft.map(ac => ac.id);
      const aircraftById = new Map(ownerAircraft.map(ac => [ac.id, ac]));

      // Bulk-fetch all leases, payments, and flight logs (3 queries total)
      const allLeases = await storage.getLeasesByAircraftIds(aircraftIds);
      const leaseById = new Map(allLeases.map(l => [l.id, l]));
      const allLeaseIds = allLeases.map(l => l.id);
      const allLesseIds = Array.from(new Set(allLeases.map(l => l.lesseeId)));

      const [allPayments, allLogs] = await Promise.all([
        storage.getPaymentsByLeaseIds(allLeaseIds),
        storage.getFlightHourLogsByLesseeIds(allLesseIds),
      ]);

      let totalGross = 0, totalFee = 0, totalNet = 0;
      const byMonthMap: Record<string, { gross: number; fee: number; net: number; hours: number; aircraft: string }> = {};
      const byAircraftMap: Record<string, { registration: string; totalGross: number; totalFee: number; totalNet: number; totalHours: number }> = {};

      // Initialize byAircraftMap
      for (const ac of ownerAircraft) {
        byAircraftMap[String(ac.id)] = { registration: ac.registration, totalGross: 0, totalFee: 0, totalNet: 0, totalHours: 0 };
      }

      for (const p of allPayments) {
        const pPeriod = p.period || "";
        if (startMonth && pPeriod < startMonth) continue;
        if (endMonth && pPeriod > endMonth) continue;

        const lease = leaseById.get(p.leaseId);
        if (!lease) continue;
        const ac = aircraftById.get(lease.aircraftId);
        if (!ac) continue;

        const gross = p.grossAmount || p.amount || 0;
        const fee = p.commissionAmount || gross * 0.1;
        const net = p.netAmount || gross - fee;
        const log = allLogs.find(l => l.aircraftId === ac.id && l.month === pPeriod);
        const hours = log?.reportedHours || 0;

        totalGross += gross; totalFee += fee; totalNet += net;
        const acEntry = byAircraftMap[String(ac.id)];
        acEntry.totalGross += gross; acEntry.totalFee += fee; acEntry.totalNet += net; acEntry.totalHours += hours;

        const key = `${pPeriod}__${ac.id}`;
        if (!byMonthMap[key]) byMonthMap[key] = { gross: 0, fee: 0, net: 0, hours: 0, aircraft: ac.registration };
        byMonthMap[key].gross += gross;
        byMonthMap[key].fee += fee;
        byMonthMap[key].net += net;
        byMonthMap[key].hours += hours;
      }

      const monthlyBreakdown = Object.entries(byMonthMap)
        .map(([key, data]) => {
          const [month] = key.split("__");
          return { month, ...data };
        })
        .sort((a, b) => b.month.localeCompare(a.month));

      res.json({
        summary: { totalGross, platformFee: totalFee, totalNet },
        monthlyBreakdown,
        byAircraft: Object.values(byAircraftMap),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch revenue" });
    }
  });

  ownerRouter.get("/payouts", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user.ownerId) return res.status(400).json({ error: "No owner profile linked" });
      const ownerPayouts = await storage.getPayoutsByOwnerId(user.ownerId);
      res.json(ownerPayouts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  ownerRouter.get("/revenue/export", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user.ownerId) return res.status(400).json({ error: "No owner profile linked" });

      const ownerAircraft = await storage.getAircraftByOwnerId(user.ownerId);
      const aircraftIds = ownerAircraft.map(ac => ac.id);
      const aircraftById = new Map(ownerAircraft.map(ac => [ac.id, ac]));
      const allLeases = await storage.getLeasesByAircraftIds(aircraftIds);
      const leaseById = new Map(allLeases.map(l => [l.id, l]));
      const allPayments = await storage.getPaymentsByLeaseIds(allLeases.map(l => l.id));

      const rows: string[] = ["Period,Aircraft,Gross Amount,Platform Fee,Net Amount"];
      for (const p of allPayments) {
        const lease = leaseById.get(p.leaseId);
        const ac = lease ? aircraftById.get(lease.aircraftId) : undefined;
        const registration = ac?.registration || "Unknown";
        const gross = (p.grossAmount ?? p.amount ?? 0).toFixed(2);
        const fee = (p.commissionAmount ?? (p.grossAmount || p.amount || 0) * 0.1).toFixed(2);
        const net = (p.netAmount ?? (p.grossAmount || p.amount || 0) * 0.9).toFixed(2);
        const period = (p.period || "").replace(/,/g, " ");
        rows.push(`"${period}","${registration}",${gross},${fee},${net}`);
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="revenue-export.csv"');
      res.send(rows.join("\n"));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to export revenue" });
    }
  });

  ownerRouter.get("/documents", async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user.ownerId) return res.status(400).json({ error: "No owner profile linked" });

      const ownerAircraft = await storage.getAircraftByOwnerId(user.ownerId);
      const docs: any[] = [];

      // Owner docs
      const ownerDocs = await storage.getDocumentsForEntity("owner", user.ownerId);
      docs.push(...ownerDocs);

      // Aircraft docs
      for (const ac of ownerAircraft) {
        const acDocs = await storage.getDocumentsForEntity("aircraft", ac.id);
        docs.push(...acDocs);
      }

      res.json(docs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  protectedRouter.use("/owner", ownerRouter);

  // Portal: aircraft lease detail for flight school
  protectedRouter.get("/portal/aircraft/:id/lease", isFlightSchool, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      if (!user.lesseeId) return res.status(400).json({ error: "No lessee profile linked" });

      const id = parseInt(req.params.id);
      const acLeases = await storage.getLeasesForAircraft(id);
      const activeLease = acLeases.find(l => l.status === "Active" && l.lesseeId === user.lesseeId);

      if (!activeLease) {
        return res.status(404).json({ error: "No active lease found for this aircraft" });
      }

      const ac = await storage.getAircraft(id);
      res.json({ lease: activeLease, aircraft: ac });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch lease detail" });
    }
  });

  // Internal email queue processor (requires secret header)
  apiRouter.post("/internal/process-email-queue", async (req: Request, res: Response) => {
    const secret = req.headers["x-internal-secret"];
    if (secret !== (process.env.INTERNAL_SECRET || "dev-internal-secret")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const pending = await storage.getPendingEmails();
      let sent = 0;
      let failed = 0;

      for (const email of pending) {
        try {
          const td = (email.templateData as Record<string, any>) || {};
          const isInvite = email.templateType === "invite_school" ||
                           email.templateType === "invite_owner" ||
                           email.templateType === "invite_flight_school" ||
                           email.templateType === "invite_asset_owner" ||
                           email.templateType === "invite_resend_flight_school" ||
                           email.templateType === "invite_resend_asset_owner";

          let success = false;

          if (isInvite) {
            const role: 'flight_school' | 'asset_owner' =
              email.templateType.includes("owner") ? "asset_owner" : "flight_school";
            const inviteUrl = td.inviteUrl ||
              `${process.env.APP_URL || "http://localhost:6000"}/accept-invite?token=${td.token}`;
            success = await emailService.sendInviteEmail({
              to: email.to,
              firstName: td.name || "there",
              inviteUrl,
              role,
            });
          } else {
            // For non-invite emails, look up the user or build a minimal object
            let user = await storage.getUserByEmail(email.to);
            const minimalUser = user ?? { email: email.to, firstName: "there" } as any;

            if (email.templateType === "payment_due_soon") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "payment_due",
                title: `Payment Due Soon — ${td.period || ""}`,
                message: `Your payment of $${td.amount || "N/A"} for the period ${td.period || "N/A"} is due in 5 days. Please ensure your account is up to date.`,
              });
            } else if (email.templateType === "payment_overdue_7") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "payment_due",
                title: `Payment Overdue (7 days) — ${td.period || ""}`,
                message: `Your payment of $${td.amount || "N/A"} for the period ${td.period || "N/A"} is now 7 days overdue. Please make payment immediately to avoid further action.`,
              });
            } else if (email.templateType === "payment_overdue_30") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "payment_due",
                title: `Payment Severely Overdue (30 days) — ${td.period || ""}`,
                message: `Your payment of $${td.amount || "N/A"} for the period ${td.period || "N/A"} is 30 days overdue. This is an urgent notice — please contact us immediately.`,
              });
            } else if (email.templateType === "lease_expiry_60") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "lease_expiry",
                title: "Lease Expiring in 60 Days",
                message: `Your aircraft lease (ID: ${td.leaseId || "N/A"}) is set to expire on ${td.endDate ? new Date(td.endDate).toLocaleDateString() : "N/A"}. Please contact your administrator to discuss renewal options.`,
              });
            } else if (email.templateType === "lease_expiry_15") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "lease_expiry",
                title: "Lease Expiring in 15 Days — Action Required",
                message: `Your aircraft lease (ID: ${td.leaseId || "N/A"}) expires on ${td.endDate ? new Date(td.endDate).toLocaleDateString() : "N/A"} — in just 15 days. Please contact your administrator immediately to arrange renewal or return.`,
              });
            } else if (email.templateType === "monthly_hours_reminder") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "general",
                title: "Monthly Flight Hours Reminder",
                message: `This is your monthly reminder to log your flight hours in the AeroLease Wise portal. Accurate records are required by the end of the month. Please log in and submit your hours now.`,
              });
            } else if (email.templateType === "owner_monthly_summary") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "general",
                title: "Your Monthly Aircraft Summary Is Ready",
                message: `Your monthly summary for your aircraft portfolio is now available. Log in to the AeroLease Wise owner portal to review revenue, maintenance activity, and lease status for the past month.`,
              });
            } else if (email.templateType === "payment_overdue_admin_7") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "payment_due",
                title: `Payment Overdue 7 Days — ${td.lesseeName || ""} — ${td.period || ""}`,
                message: `${td.lesseeName || "A flight school"}'s payment of $${td.amount || "N/A"} for the period ${td.period || "N/A"} is 7 days overdue. Log in to the admin portal to review and follow up.`,
                actionUrl: "/payments",
              });
            } else if (email.templateType === "payment_overdue_admin_30") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "payment_due",
                title: `URGENT: Payment 30 Days Overdue — ${td.lesseeName || ""} — ${td.period || ""}`,
                message: `URGENT: ${td.lesseeName || "A flight school"}'s payment of $${td.amount || "N/A"} for the period ${td.period || "N/A"} is 30 days overdue. Immediate collection action is required.`,
                actionUrl: "/payments",
              });
            } else if (email.templateType === "monthly_hours_reminder_final") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "general",
                title: "Final Reminder: Log Your Flight Hours Before Month-End",
                message: `This is your final reminder to log your flight hours for ${td.currentMonth || "this month"} in the AeroLease Wise portal. Hours must be submitted before month-end. If you do not log hours, you may be billed at the minimum contracted hours.`,
                actionUrl: "/portal/hours",
              });
            } else if (email.templateType === "lease_expiry_admin") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "lease_expiry",
                title: `Lease Expiring in ${td.days || "N"} Days — ${td.registration || ""}`,
                message: `The lease for aircraft ${td.registration || "N/A"} (lessee: ${td.lesseeName || "N/A"}) expires on ${td.endDate ? new Date(td.endDate).toLocaleDateString() : "N/A"} — in ${td.days || "N"} days. Please follow up with the lessee about renewal.`,
                actionUrl: "/leases",
              });
            } else if (email.templateType === "lease_expiry_owner") {
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "lease_expiry",
                title: `Your Aircraft ${td.registration || ""} Lease Expires in ${td.days || "N"} Days`,
                message: `The lease on your aircraft ${td.registration || "N/A"} (leased by ${td.lesseeName || "N/A"}) expires on ${td.endDate ? new Date(td.endDate).toLocaleDateString() : "N/A"}. Revenue from this aircraft will stop when the lease ends. Please contact your administrator to arrange renewal.`,
                actionUrl: "/owner/dashboard",
              });
            } else {
              // Unknown template — send generic
              success = await emailService.sendNotificationEmail({
                user: minimalUser,
                type: "general",
                title: email.subject,
                message: `You have a new notification from AeroLease Wise. Please log in to your portal for details.`,
              });
            }
          }

          if (success) {
            await storage.updateEmailQueueStatus(email.id, "sent");
            sent++;
          } else {
            await storage.updateEmailQueueStatus(email.id, "failed", "Email service returned false");
            failed++;
          }
        } catch (err) {
          await storage.updateEmailQueueStatus(email.id, "failed", String(err));
          failed++;
        }
      }

      res.json({ processed: pending.length, sent, failed });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to process email queue" });
    }
  });

  // Mount API routes
  apiRouter.use(protectedRouter);
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
