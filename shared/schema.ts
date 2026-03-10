import { sql } from 'drizzle-orm';
import { pgTable, text, integer, boolean, timestamp, jsonb, doublePrecision, date, varchar, index, serial, unique } from "drizzle-orm/pg-core";
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true),
  emailPaymentReminders: boolean("email_payment_reminders").default(true),
  emailMaintenanceAlerts: boolean("email_maintenance_alerts").default(true),
  emailLeaseExpiry: boolean("email_lease_expiry").default(true),
  emailSystemUpdates: boolean("email_system_updates").default(true),
  status: text("status").default("pending"), // pending, approved, blocked
  role: text("role").default("user"), // user, admin, super_admin
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lesseeId: integer("lessee_id"),
  ownerId: integer("owner_id"),
  inviteToken: text("invite_token"),
  inviteExpiresAt: timestamp("invite_expires_at"),
  invitedAt: timestamp("invited_at"),
  lastLoginAt: timestamp("last_login_at"),
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
  hourlyRate: doublePrecision("hourly_rate").default(0),
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
  portalStatus: text("portal_status").default("none"),
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
  state: text("state"),
  certificationNumber: text("certification_number"),
  portalStatus: text("portal_status").default("none"),
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
  status: text("status").default("Active"), // Active, Expired, Terminated, Suspended
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  terminationReason: text("termination_reason"),
  terminationDate: date("termination_date"),
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: text("suspended_reason"),
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
  grossAmount: doublePrecision("gross_amount"),
  commissionAmount: doublePrecision("commission_amount"),  // gross × 0.10
  netAmount: doublePrecision("net_amount"),               // gross × 0.90
  flightHourLogId: integer("flight_hour_log_id"),         // links to the log that generated this
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  lesseeId: integer("lessee_id"),                         // denormalized for faster queries
  aircraftId: integer("aircraft_id"),
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
  reportedByLesseeId: integer("reported_by_lessee_id"),
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

// Flight Hour Logs
export const flightHourLogs = pgTable("flight_hour_logs", {
  id: serial("id").primaryKey(),
  aircraftId: integer("aircraft_id").notNull(),
  lesseeId: integer("lessee_id").notNull(),
  leaseId: integer("lease_id").notNull(),
  month: text("month").notNull(),             // "YYYY-MM"
  reportedHours: doublePrecision("reported_hours").notNull(),
  verifiedHours: doublePrecision("verified_hours"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  status: text("status").default("submitted"), // submitted, verified, disputed
  notes: text("notes"),
  flightAwareHours: doublePrecision("flight_aware_hours"),
  flightAwareCheckedAt: timestamp("flight_aware_checked_at"),
  discrepancyFlagged: boolean("discrepancy_flagged").default(false),
  discrepancyNotes: text("discrepancy_notes"),
}, (table) => [
  unique().on(table.aircraftId, table.lesseeId, table.month)
]);

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

// Email Queue
export const emailQueue = pgTable("email_queue", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  templateType: text("template_type").notNull(),
  templateData: jsonb("template_data"),
  status: text("status").default("pending"), // pending, sent, failed
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payouts
export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  period: text("period").notNull(), // e.g. "March 2026"
  status: text("status").default("pending"), // pending, processing, completed
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;
export const insertPayoutSchema = createInsertSchema(payouts).omit({ id: true, createdAt: true });

// Create insert schemas
export const insertAircraftSchema = createInsertSchema(aircraft).omit({ id: true });
export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true });
export const insertLesseeSchema = createInsertSchema(lessees).omit({ id: true });
export const insertLeaseSchema = createInsertSchema(leases).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertMaintenanceSchema = createInsertSchema(maintenance).omit({ id: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadDate: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, readAt: true });
export const insertFlightHourLogSchema = createInsertSchema(flightHourLogs).omit({ id: true, submittedAt: true });
export const insertEmailQueueSchema = createInsertSchema(emailQueue).omit({ id: true, createdAt: true });

// Create update schemas (allow partial updates)
export const updateAircraftSchema = insertAircraftSchema.partial();

// User authentication schemas  
export const upsertUserSchema = createInsertSchema(users).omit({
  passwordHash: true,
  createdAt: true,
  updatedAt: true
});
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Export types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;

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

export type FlightHourLog = typeof flightHourLogs.$inferSelect;
export type InsertFlightHourLog = z.infer<typeof insertFlightHourLogSchema>;

export type EmailQueue = typeof emailQueue.$inferSelect;
export type InsertEmailQueue = z.infer<typeof insertEmailQueueSchema>;

export type FlightHourLogWithDetails = FlightHourLog & {
  aircraftRegistration?: string | null;
  lesseeName?: string | null;
};

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
  trends?: {
    aircraft: string;
    leases: string;
    revenue: string;
    fees: string;
  };
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
  reportedByLessee?: { id: number; name: string } | null;
};

export type PaymentWithDetails = Payment & {
  lease?: Lease & {
    aircraft?: Aircraft;
    lessee?: Lessee;
  };
};
