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
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);

  const apiRouter = express.Router();

  // Error handling middleware
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ error: validationError.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  };

  // Authentication routes
  apiRouter.get('/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
      const userId = req.user.claims.sub;
      const notifications = await storage.getAllNotifications(userId);
      res.json(notifications);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  apiRouter.get("/notifications/unread", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  apiRouter.get("/notifications/count", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getNotificationCount(userId);
      res.json(count);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  apiRouter.post("/notifications", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertNotificationSchema.parse({ ...req.body, userId });
      const notification = await storage.createNotification(validatedData);
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
      const userId = req.user.claims.sub;
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

  // Mount API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
