import cron from "node-cron";
import { storage } from "./storage";
import { emailService } from "./emailService";

export function startScheduler() {
  console.log("[Scheduler] Starting scheduled jobs...");

  // Daily at 8am: check overdue payments, upcoming lease expiry, auto-mark overdue
  cron.schedule("0 8 * * *", async () => {
    console.log("[Scheduler] Running daily checks...");
    try {
      await autoMarkOverduePayments();
      await checkOverduePayments();
      await checkExpiringLeases();
    } catch (err) {
      console.error("[Scheduler] Daily check error:", err);
    }
  });

  // Every 5 minutes: process pending email queue
  cron.schedule("*/5 * * * *", async () => {
    try {
      await processEmailQueue();
    } catch (err) {
      console.error("[Scheduler] Email queue processing error:", err);
    }
  });

  // Monthly on the 1st at 8am: send hours reminders
  cron.schedule("0 8 1 * *", async () => {
    console.log("[Scheduler] Running monthly reminders (1st)...");
    try {
      await sendMonthlyReminders();
    } catch (err) {
      console.error("[Scheduler] Monthly reminder error:", err);
    }
  });

  // Monthly on the 10th at 8am: send owner monthly summary (after schools have had time to log hours)
  cron.schedule("0 8 10 * *", async () => {
    console.log("[Scheduler] Running owner monthly summary...");
    try {
      await sendOwnerMonthlySummary();
    } catch (err) {
      console.error("[Scheduler] Owner monthly summary error:", err);
    }
  });

  // Monthly on the 25th at 8am: final hours reminder for schools that haven't logged yet
  cron.schedule("0 8 25 * *", async () => {
    console.log("[Scheduler] Running final hours reminder (25th)...");
    try {
      await sendFinalHoursReminder();
    } catch (err) {
      console.error("[Scheduler] Final hours reminder error:", err);
    }
  });
}

async function autoMarkOverduePayments() {
  const allPayments = await storage.getAllPayments();
  const now = new Date();
  let overdueCount = 0;

  for (const payment of allPayments) {
    if (payment.status !== "Pending" && payment.status !== "Unpaid") continue;

    const dueDate = payment.dueDate
      ? new Date(payment.dueDate)
      : new Date(new Date(payment.dueDate || now).getTime() + 30 * 24 * 60 * 60 * 1000);

    if (dueDate < now) {
      await storage.updatePayment(payment.id, { status: "Overdue" });
      overdueCount++;
    }
  }

  if (overdueCount > 0) {
    console.log(`[Scheduler] Auto-marked ${overdueCount} payment(s) as Overdue`);
    const admins = await storage.getAdminUsers();
    for (const admin of admins) {
      await storage.createNotification({
        userId: admin.id,
        type: "payment",
        priority: "high",
        title: "Overdue Payments Detected",
        message: `${overdueCount} payment(s) have been automatically marked as overdue.`,
        relatedType: "payment",
        relatedId: null,
        actionUrl: "/payments",
      });
    }
  }
}

async function checkOverduePayments() {
  const allPayments = await storage.getAllPayments();
  const now = new Date();
  const admins = (await storage.getAllUsers()).filter(u => u.role === "admin" || u.role === "super_admin");

  for (const payment of allPayments) {
    if (payment.status === "Paid") continue;

    const dueDate = new Date(payment.dueDate);
    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilDue = -daysPastDue;

    // Get lessee email for dedup check
    let lesseeEmail = "";
    if (payment.lesseeId) {
      const lessee = await storage.getLessee(payment.lesseeId);
      if (lessee) lesseeEmail = lessee.email;
    }

    // Due in 5 days
    if (daysUntilDue >= 4 && daysUntilDue <= 5 && lesseeEmail) {
      const alreadyQueued = await storage.hasEmailBeenQueued("payment_due_soon", lesseeEmail, payment.period);
      if (!alreadyQueued) {
        await storage.createEmailQueueEntry({
          to: lesseeEmail,
          subject: `Payment due soon — ${payment.period}`,
          templateType: "payment_due_soon",
          templateData: { paymentId: payment.id, period: payment.period, amount: payment.amount },
        });
      }
    }

    // Overdue 7 days
    if (daysPastDue >= 7 && daysPastDue < 8 && lesseeEmail) {
      const alreadyQueued = await storage.hasEmailBeenQueued("payment_overdue_7", lesseeEmail, payment.period);
      if (!alreadyQueued) {
        // Get lessee name for admin emails
        const lessee = payment.lesseeId ? await storage.getLessee(payment.lesseeId) : null;
        const lesseeName = lessee?.name || "Flight School";

        await storage.createEmailQueueEntry({
          to: lesseeEmail,
          subject: `Payment overdue (7 days) — ${payment.period}`,
          templateType: "payment_overdue_7",
          templateData: { paymentId: payment.id, period: payment.period, amount: payment.amount },
        });

        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "payment",
            priority: "high",
            title: "Payment Overdue (7 days)",
            message: `Payment for ${payment.period} ($${payment.amount}) is 7 days overdue.`,
            relatedType: "payment",
            relatedId: payment.id,
            actionUrl: "/payments",
          });

          // Also email each admin
          const adminAlreadyQueued = await storage.hasEmailBeenQueued("payment_overdue_admin_7", admin.email, payment.period);
          if (!adminAlreadyQueued) {
            await storage.createEmailQueueEntry({
              to: admin.email,
              subject: `Payment overdue 7 days — ${lesseeName} — ${payment.period}`,
              templateType: "payment_overdue_admin_7",
              templateData: {
                paymentId: payment.id,
                period: payment.period,
                amount: payment.amount,
                lesseeName,
                daysOverdue: 7,
              },
            });
          }
        }
      }
    }

    // Overdue 30 days
    if (daysPastDue >= 30 && daysPastDue < 31 && lesseeEmail) {
      const alreadyQueued = await storage.hasEmailBeenQueued("payment_overdue_30", lesseeEmail, payment.period);
      if (!alreadyQueued) {
        const lessee = payment.lesseeId ? await storage.getLessee(payment.lesseeId) : null;
        const lesseeName = lessee?.name || "Flight School";

        await storage.createEmailQueueEntry({
          to: lesseeEmail,
          subject: `Payment severely overdue (30 days) — ${payment.period}`,
          templateType: "payment_overdue_30",
          templateData: { paymentId: payment.id, period: payment.period, amount: payment.amount },
        });

        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "payment",
            priority: "urgent",
            title: "Payment Overdue (30 days)",
            message: `Payment for ${payment.period} ($${payment.amount}) is 30 days overdue!`,
            relatedType: "payment",
            relatedId: payment.id,
            actionUrl: "/payments",
          });

          // Also email each admin
          const adminAlreadyQueued = await storage.hasEmailBeenQueued("payment_overdue_admin_30", admin.email, payment.period);
          if (!adminAlreadyQueued) {
            await storage.createEmailQueueEntry({
              to: admin.email,
              subject: `URGENT: Payment 30 days overdue — ${lesseeName} — ${payment.period}`,
              templateType: "payment_overdue_admin_30",
              templateData: {
                paymentId: payment.id,
                period: payment.period,
                amount: payment.amount,
                lesseeName,
                daysOverdue: 30,
              },
            });
          }
        }
      }
    }
  }
}

async function checkExpiringLeases() {
  const allLeases = await storage.getAllLeases();
  const now = new Date();
  const admins = await storage.getAdminUsers();

  for (const lease of allLeases) {
    if (lease.status !== "Active") continue;

    const endDate = new Date(lease.endDate);
    const daysUntilExpiry = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const lessee = await storage.getLessee(lease.lesseeId);
    if (!lessee) continue;

    // Look up aircraft and owner for admin/owner notifications
    const ac = await storage.getAircraft(lease.aircraftId);
    const registration = ac?.registration || `Aircraft #${lease.aircraftId}`;
    const owner = ac?.ownerId ? await storage.getOwner(ac.ownerId) : null;

    // 60 days
    if (daysUntilExpiry >= 59 && daysUntilExpiry <= 60) {
      const alreadyQueued = await storage.hasEmailBeenQueued("lease_expiry_60", lessee.email, String(lease.id));
      if (!alreadyQueued) {
        await storage.createEmailQueueEntry({
          to: lessee.email,
          subject: `Lease expiring in 60 days`,
          templateType: "lease_expiry_60",
          templateData: { leaseId: lease.id, period: String(lease.id), endDate: lease.endDate, registration },
        });
      }

      // Notify admins
      for (const admin of admins) {
        const adminAlreadyQueued = await storage.hasEmailBeenQueued("lease_expiry_admin_60", admin.email, String(lease.id));
        if (!adminAlreadyQueued) {
          await storage.createEmailQueueEntry({
            to: admin.email,
            subject: `Lease expiring in 60 days — ${registration}`,
            templateType: "lease_expiry_admin",
            templateData: { leaseId: lease.id, endDate: lease.endDate, registration, lesseeName: lessee.name, days: 60 },
          });
        }
      }

      // Notify aircraft owner
      if (owner?.email) {
        const ownerAlreadyQueued = await storage.hasEmailBeenQueued("lease_expiry_owner_60", owner.email, String(lease.id));
        if (!ownerAlreadyQueued) {
          await storage.createEmailQueueEntry({
            to: owner.email,
            subject: `Your aircraft ${registration} lease expires in 60 days`,
            templateType: "lease_expiry_owner",
            templateData: { leaseId: lease.id, endDate: lease.endDate, registration, lesseeName: lessee.name, days: 60 },
          });
        }
      }
    }

    // 15 days
    if (daysUntilExpiry >= 14 && daysUntilExpiry <= 15) {
      const alreadyQueued = await storage.hasEmailBeenQueued("lease_expiry_15", lessee.email, String(lease.id));
      if (!alreadyQueued) {
        await storage.createEmailQueueEntry({
          to: lessee.email,
          subject: `Lease expiring in 15 days`,
          templateType: "lease_expiry_15",
          templateData: { leaseId: lease.id, period: String(lease.id), endDate: lease.endDate, registration },
        });
      }

      // Notify admins
      for (const admin of admins) {
        const adminAlreadyQueued = await storage.hasEmailBeenQueued("lease_expiry_admin_15", admin.email, String(lease.id));
        if (!adminAlreadyQueued) {
          await storage.createEmailQueueEntry({
            to: admin.email,
            subject: `Lease expiring in 15 days — ${registration}`,
            templateType: "lease_expiry_admin",
            templateData: { leaseId: lease.id, endDate: lease.endDate, registration, lesseeName: lessee.name, days: 15 },
          });
        }
      }

      // Notify aircraft owner
      if (owner?.email) {
        const ownerAlreadyQueued = await storage.hasEmailBeenQueued("lease_expiry_owner_15", owner.email, String(lease.id));
        if (!ownerAlreadyQueued) {
          await storage.createEmailQueueEntry({
            to: owner.email,
            subject: `Your aircraft ${registration} lease expires in 15 days`,
            templateType: "lease_expiry_owner",
            templateData: { leaseId: lease.id, endDate: lease.endDate, registration, lesseeName: lessee.name, days: 15 },
          });
        }
      }
    }
  }
}

async function processEmailQueue() {
  const pending = await storage.getPendingEmails();
  if (pending.length === 0) return;
  console.log(`[Scheduler] Processing ${pending.length} pending email(s)...`);

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
        const user = await storage.getUserByEmail(email.to);
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
            message: `This is your monthly reminder to log your flight hours in the AeroLease Wise portal. Please log in and submit your hours now.`,
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

  console.log(`[Scheduler] Email queue: ${sent} sent, ${failed} failed.`);
}

async function sendMonthlyReminders() {
  const allUsers = await storage.getAllUsers();

  // Remind flight schools to log hours (1st of month)
  const flightSchoolUsers = allUsers.filter(u => u.role === "flight_school" && u.status === "approved");
  for (const user of flightSchoolUsers) {
    await storage.createEmailQueueEntry({
      to: user.email,
      subject: "Monthly Flight Hours Reminder",
      templateType: "monthly_hours_reminder",
      templateData: { name: user.firstName },
    });
  }
}

async function sendOwnerMonthlySummary() {
  const allUsers = await storage.getAllUsers();

  // Send owner monthly summary on the 10th so schools have had time to log hours
  const ownerUsers = allUsers.filter(u => u.role === "asset_owner" && u.status === "approved");
  for (const user of ownerUsers) {
    await storage.createEmailQueueEntry({
      to: user.email,
      subject: "Monthly Owner Summary",
      templateType: "owner_monthly_summary",
      templateData: { name: user.firstName, ownerId: user.ownerId },
    });
  }
}

async function sendFinalHoursReminder() {
  const now = new Date();
  // Current month in YYYY-MM format
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const allUsers = await storage.getAllUsers();
  const flightSchoolUsers = allUsers.filter(u => u.role === "flight_school" && u.status === "approved");

  for (const user of flightSchoolUsers) {
    if (!user.lesseeId) continue;

    // Check if the school has already logged hours for the current month
    const logs = await storage.getFlightHourLogsForLessee(user.lesseeId);
    const hasLoggedThisMonth = logs.some(log => log.month === currentMonth);

    if (!hasLoggedThisMonth) {
      const alreadyQueued = await storage.hasEmailBeenQueued("monthly_hours_reminder_final", user.email, currentMonth);
      if (!alreadyQueued) {
        await storage.createEmailQueueEntry({
          to: user.email,
          subject: "Final reminder: Log your hours before month-end",
          templateType: "monthly_hours_reminder_final",
          templateData: { name: user.firstName, currentMonth },
        });
      }
    }
  }
}
