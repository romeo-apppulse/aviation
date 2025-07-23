import { pgTable, text, serial, integer, boolean, timestamp, json, doublePrecision, date, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true),
  emailPaymentReminders: boolean("email_payment_reminders").default(true),
  emailMaintenanceAlerts: boolean("email_maintenance_alerts").default(true),
  emailLeaseExpiry: boolean("email_lease_expiry").default(true),
  emailSystemUpdates: boolean("email_system_updates").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Aircraft table
export const aircraft = pgTable("aircraft", {
  id: serial("id").primaryKey(),
  registration: text("registration").notNull().unique(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  engineType: text("engine_type"),
  totalTime: integer("total_time"),
  avionics: text("avionics"),
  image: text("image"),
  notes: text("notes"),
  ownerId: integer("owner_id"),
  status: text("status").default("Available"), // Available, Leased, Maintenance, etc.
});

// Owner table
export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  paymentDetails: text("payment_details"),
});

// Lessee table (Flight Schools)
export const lessees = pgTable("lessees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  contactPerson: text("contact_person"),
  notes: text("notes"),
});

// Lease Agreements
export const leases = pgTable("leases", {
  id: serial("id").primaryKey(),
  aircraftId: integer("aircraft_id").notNull(),
  lesseeId: integer("lessee_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  monthlyRate: doublePrecision("monthly_rate").notNull(),
  minimumHours: integer("minimum_hours").notNull(),
  hourlyRate: doublePrecision("hourly_rate").notNull(),
  maintenanceTerms: text("maintenance_terms"),
  notes: text("notes"),
  status: text("status").default("Active"), // Active, Expired, Terminated
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  leaseId: integer("lease_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  period: text("period").notNull(), // e.g., "January 2023"
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  status: text("status").default("Pending"), // Pending, Paid, Overdue
  notes: text("notes"),
  invoiceUrl: text("invoice_url"), // URL or base64 data for invoice
  invoiceNumber: text("invoice_number"), // Invoice number for tracking
});

// Maintenance Records
export const maintenance = pgTable("maintenance", {
  id: serial("id").primaryKey(),
  aircraftId: integer("aircraft_id").notNull(),
  type: text("type").notNull(), // e.g., "100 Hour Inspection", "Annual Inspection"
  scheduledDate: date("scheduled_date").notNull(),
  completedDate: date("completed_date"),
  cost: doublePrecision("cost"),
  status: text("status").default("Scheduled"), // Scheduled, Completed, Overdue
  notes: text("notes"),
  performedBy: text("performed_by"),
});

// Documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Lease, Registration, Insurance, etc.
  url: text("url").notNull(),
  relatedId: integer("related_id"), // Can be ID of aircraft, lease, etc.
  relatedType: text("related_type"), // "aircraft", "lease", "owner", etc.
  uploadDate: timestamp("upload_date").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'payment', 'maintenance', 'lease', 'document', 'system'
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  read: boolean("read").default(false),
  actionUrl: text("action_url"),
  relatedType: text("related_type"),
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Create insert schemas
export const insertAircraftSchema = createInsertSchema(aircraft).omit({ id: true });
export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true });
export const insertLesseeSchema = createInsertSchema(lessees).omit({ id: true });
export const insertLeaseSchema = createInsertSchema(leases).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertMaintenanceSchema = createInsertSchema(maintenance).omit({ id: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadDate: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, readAt: true });

// Create update schemas (allow partial updates)
export const updateAircraftSchema = insertAircraftSchema.partial();

// User authentication schemas
export const upsertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });

// Export types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type Aircraft = typeof aircraft.$inferSelect;
export type InsertAircraft = z.infer<typeof insertAircraftSchema>;
export type UpdateAircraft = z.infer<typeof updateAircraftSchema>;

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;

export type Lessee = typeof lessees.$inferSelect;
export type InsertLessee = z.infer<typeof insertLesseeSchema>;

export type Lease = typeof leases.$inferSelect;
export type InsertLease = z.infer<typeof insertLeaseSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Maintenance = typeof maintenance.$inferSelect;
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Dashboard Stats
export type DashboardStats = {
  totalAircraft: number;
  activeLeases: number;
  monthlyRevenue: number;
  managementFees: number;
  paymentStatus: {
    paid: number;
    pending: number;
    overdue: number;
  };
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    managementFee: number;
  }>;
};

// Combined types for UI
export type AircraftWithDetails = Aircraft & {
  owner?: Owner;
  currentLease?: Lease & { lessee?: Lessee };
};

export type LeaseWithDetails = Lease & {
  aircraft?: Aircraft;
  lessee?: Lessee;
  payments?: Payment[];
};

export type MaintenanceWithDetails = Maintenance & {
  aircraft?: Aircraft;
};
