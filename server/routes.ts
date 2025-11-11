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
  insertNotificationSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated, isAdmin, isSuperAdmin, hashPassword } from "./auth";
import { registerUserSchema, loginSchema, type User } from "@shared/schema";
import passport from "passport";
import { emailService, type NotificationEmailData } from "./emailService";
import rateLimit from "express-rate-limit";

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

  apiRouter.get('/auth/user', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
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
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  apiRouter.put('/auth/email-preferences', isAuthenticated, async (req, res) => {
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

  apiRouter.put('/auth/user', isAuthenticated, async (req: any, res) => {
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

  apiRouter.put('/auth/password', isAuthenticated, async (req, res) => {
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
  apiRouter.get('/admin/users', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  apiRouter.get('/admin/users/pending', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  apiRouter.put('/admin/users/:id/approve', isSuperAdmin, async (req: any, res: Response) => {
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

  apiRouter.put('/admin/users/:id/block', isSuperAdmin, async (req: Request, res: Response) => {
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

  apiRouter.delete('/admin/users/:id', isSuperAdmin, async (req: Request, res: Response) => {
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
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Update user (edit user details)
  apiRouter.put('/admin/users/:id', isSuperAdmin, async (req: Request, res: Response) => {
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
  apiRouter.post('/admin/users', isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        password,
        role,
        status: 'approved' // New users created by admin are automatically approved
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Dashboard routes
  apiRouter.get("/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Aircraft routes
  apiRouter.get("/aircraft", async (req: Request, res: Response) => {
    try {
      const aircraft = await storage.getAllAircraftWithDetails();
      res.json(aircraft);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch aircraft" });
    }
  });

  apiRouter.get("/aircraft/:id", async (req: Request, res: Response) => {
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

  apiRouter.post("/aircraft", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAircraftSchema.parse(req.body);
      const aircraft = await storage.createAircraft(validatedData);
      res.status(201).json(aircraft);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.put("/aircraft/:id", async (req: Request, res: Response) => {
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

  apiRouter.delete("/aircraft/:id", async (req: Request, res: Response) => {
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
  apiRouter.get("/owners", async (req: Request, res: Response) => {
    try {
      const owners = await storage.getAllOwners();
      res.json(owners);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch owners" });
    }
  });

  apiRouter.get("/owners/:id", async (req: Request, res: Response) => {
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

  apiRouter.post("/owners", async (req: Request, res: Response) => {
    try {
      const validatedData = insertOwnerSchema.parse(req.body);
      const owner = await storage.createOwner(validatedData);
      res.status(201).json(owner);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.put("/owners/:id", async (req: Request, res: Response) => {
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

  apiRouter.delete("/owners/:id", async (req: Request, res: Response) => {
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
  apiRouter.get("/lessees", async (req: Request, res: Response) => {
    try {
      const lessees = await storage.getAllLessees();
      res.json(lessees);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch lessees" });
    }
  });

  apiRouter.get("/lessees/:id", async (req: Request, res: Response) => {
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

  apiRouter.post("/lessees", async (req: Request, res: Response) => {
    try {
      const validatedData = insertLesseeSchema.parse(req.body);
      const lessee = await storage.createLessee(validatedData);
      res.status(201).json(lessee);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.put("/lessees/:id", async (req: Request, res: Response) => {
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

  apiRouter.delete("/lessees/:id", async (req: Request, res: Response) => {
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

  // Lease routes
  apiRouter.get("/leases", async (req: Request, res: Response) => {
    try {
      const leases = await storage.getAllLeasesWithDetails();
      res.json(leases);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch leases" });
    }
  });

  apiRouter.get("/leases/:id", async (req: Request, res: Response) => {
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

  apiRouter.post("/leases", async (req: Request, res: Response) => {
    try {
      const validatedData = insertLeaseSchema.parse(req.body);
      const lease = await storage.createLease(validatedData);
      res.status(201).json(lease);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.put("/leases/:id", async (req: Request, res: Response) => {
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

  apiRouter.delete("/leases/:id", async (req: Request, res: Response) => {
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

  apiRouter.get("/aircraft/:id/leases", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const leases = await storage.getLeasesForAircraft(id);
      res.json(leases);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch leases for aircraft" });
    }
  });

  apiRouter.get("/lessees/:id/leases", async (req: Request, res: Response) => {
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
  apiRouter.get("/payments", async (req: Request, res: Response) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  apiRouter.get("/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch payment details" });
    }
  });

  apiRouter.post("/payments", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.put("/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(id, validatedData);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.delete("/payments/:id", async (req: Request, res: Response) => {
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

  apiRouter.get("/leases/:id/payments", async (req: Request, res: Response) => {
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
  apiRouter.get("/maintenance", async (req: Request, res: Response) => {
    try {
      const maintenance = await storage.getAllMaintenance();
      res.json(maintenance);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch maintenance records" });
    }
  });

  apiRouter.get("/maintenance/upcoming", async (req: Request, res: Response) => {
    try {
      const upcoming = await storage.getUpcomingMaintenance();
      res.json(upcoming);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch upcoming maintenance" });
    }
  });

  apiRouter.get("/maintenance/:id", async (req: Request, res: Response) => {
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

  apiRouter.post("/maintenance", async (req: Request, res: Response) => {
    try {
      const validatedData = insertMaintenanceSchema.parse(req.body);
      const maintenance = await storage.createMaintenance(validatedData);
      res.status(201).json(maintenance);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.put("/maintenance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMaintenanceSchema.partial().parse(req.body);
      const maintenance = await storage.updateMaintenance(id, validatedData);
      if (!maintenance) {
        return res.status(404).json({ error: "Maintenance record not found" });
      }
      res.json(maintenance);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.delete("/maintenance/:id", async (req: Request, res: Response) => {
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

  apiRouter.get("/aircraft/:id/maintenance", async (req: Request, res: Response) => {
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
  apiRouter.get("/documents", async (req: Request, res: Response) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  apiRouter.get("/documents/:id", async (req: Request, res: Response) => {
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

  apiRouter.post("/documents", async (req: Request, res: Response) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.put("/documents/:id", async (req: Request, res: Response) => {
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

  apiRouter.delete("/documents/:id", async (req: Request, res: Response) => {
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

  apiRouter.get("/entity/:type/:id/documents", async (req: Request, res: Response) => {
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
  apiRouter.get("/notifications", isAuthenticated, async (req: any, res: Response) => {
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

  apiRouter.get("/notifications/unread", isAuthenticated, async (req: any, res: Response) => {
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

  apiRouter.get("/notifications/count", isAuthenticated, async (req: any, res: Response) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const count = await storage.getNotificationCount(userId);
      res.json(count);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  apiRouter.post("/notifications", isAuthenticated, async (req: any, res: Response) => {
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
            shouldSendEmail = user.emailPaymentReminders;
          } else if (title.includes('maintenance')) {
            emailType = 'maintenance_reminder';
            shouldSendEmail = user.emailMaintenanceAlerts;
          } else if (title.includes('lease') && title.includes('expir')) {
            emailType = 'lease_expiry';
            shouldSendEmail = user.emailLeaseExpiry;
          } else if (title.includes('system') || title.includes('update')) {
            emailType = 'system_update';
            shouldSendEmail = user.emailSystemUpdates;
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

  apiRouter.put("/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
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

  apiRouter.put("/notifications/read-all", isAuthenticated, async (req: any, res: Response) => {
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

  apiRouter.delete("/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  apiRouter.get("/notifications/email/status", isAuthenticated, async (req: any, res: Response) => {
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

  apiRouter.post("/notifications/email/test", isAuthenticated, async (req, res) => {
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
  apiRouter.post("/support/request", isAuthenticated, async (req: any, res: Response) => {
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
        userId: req.user?.claims?.sub,
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

  // Mount API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
