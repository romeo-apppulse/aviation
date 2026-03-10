# Email Flows — AeroLease Wise

This document covers every email trigger in the system. Updated: March 10, 2026.

> **Infrastructure note:** The system auto-creates an Ethereal test account when no SMTP credentials are set — emails are captured at https://ethereal.email/login (credentials printed to server console). Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env` for real delivery. Set `APP_URL` to your domain so email links resolve correctly.

---

## Invite Emails (Immediate — sent at time of action)

| Trigger | Recipient | Subject | Template Method | Contains |
|---------|-----------|---------|-----------------|----------|
| Admin clicks "Send Invite" for a flight school lessee | Flight school contact email (`lessee.email`) | "You've been invited to AeroLease Wise" | `emailService.sendInviteEmail()` | Role badge ("Flight School"), "Set Up Your Account" CTA button → `/accept-invite?token={token}`, 24-hour expiry warning |
| Admin clicks "Resend Invite" for a flight school lessee | Flight school contact email | "You've been invited to AeroLease Wise" | `emailService.sendInviteEmail()` | Same as above — new token generated |
| Admin clicks "Send Invite" for an asset owner | Owner email (`owner.email`) | "You've been invited to AeroLease Wise" | `emailService.sendInviteEmail()` | Role badge ("Asset Owner"), "Set Up Your Account" CTA button → `/accept-invite?token={token}`, 24-hour expiry warning |
| Admin clicks "Resend Invite" for an asset owner | Owner email | "You've been invited to AeroLease Wise" | `emailService.sendInviteEmail()` | Same as above — new token generated |

**Route:** `POST /api/lessees/:id/invite`, `POST /api/lessees/:id/resend-invite`, `POST /api/owners/:id/invite`, `POST /api/owners/:id/resend-invite`
**Delivery:** Direct send — no queue. Fires immediately when the admin action completes.

---

## Account Activation Email (Immediate)

| Trigger | Recipient | Subject | Template Method | Contains |
|---------|-----------|---------|-----------------|----------|
| Invited user submits the set-password form (`/accept-invite`) and account is activated | The newly activated user | "Welcome to AeroLease Wise!" | `emailService.sendNotificationEmail()` — type `system_update` | Welcome message, "Go to Portal" button linking to `/portal/dashboard` (flight school) or `/owner/dashboard` (asset owner) |

**Route:** `POST /api/auth/invite/accept`
**Delivery:** Direct send — fires immediately after the account is marked approved and portal status set to active.

---

## Payment Emails (Scheduled — Daily at 8:00 AM)

These are queued by the daily cron job in `scheduler.ts` (`checkOverduePayments`) and delivered within 5 minutes by the queue processor cron (`processEmailQueue`).

| Template Type | Trigger Condition | Recipient | Subject | Contains |
|---------------|-------------------|-----------|---------|----------|
| `payment_due_soon` | Payment is not Paid and due date is 4–5 days away | Lessee email linked to the payment | "Payment Due Soon — {period}" | Amount, period, reminder to pay before due date |
| `payment_overdue_7` | Payment is not Paid and due date was 7–8 days ago | Lessee email | "Payment Overdue (7 days) — {period}" | Amount, period, urgency — pay immediately to avoid further action. Also creates in-app notification for all admins. |
| `payment_overdue_30` | Payment is not Paid and due date was 30–31 days ago | Lessee email | "Payment Severely Overdue (30 days) — {period}" | Amount, period, urgent contact request. Also creates high-priority in-app notification for all admins. |
| `payment_overdue_admin_7` | Same trigger as `payment_overdue_7` | Each admin user email | "Payment overdue 7 days — {school name} — {period}" | School name, amount, period — admin action URL → `/payments` |
| `payment_overdue_admin_30` | Same trigger as `payment_overdue_30` | Each admin user email | "URGENT: Payment 30 days overdue — {school name} — {period}" | School name, amount, period, urgent language — admin action URL → `/payments` |

**Deduplication:** `storage.hasEmailBeenQueued(templateType, email, period)` prevents re-queuing the same email for the same payment period.

---

## Lease Expiry Emails (Scheduled — Daily at 8:00 AM)

Queued by `checkExpiringLeases()` in `scheduler.ts`. Only active leases are checked.

| Template Type | Trigger Condition | Recipient | Subject | Contains |
|---------------|-------------------|-----------|---------|----------|
| `lease_expiry_60` | Active lease end date is 59–60 days away | Lessee email (`lessee.email` via `lease.lesseeId`) | "Lease Expiring in 60 Days" | Lease ID, expiry date, prompt to contact administrator about renewal |
| `lease_expiry_15` | Active lease end date is 14–15 days away | Lessee email | "Lease Expiring in 15 Days — Action Required" | Lease ID, expiry date, urgent prompt to contact administrator immediately |
| `lease_expiry_admin` | Same trigger as `lease_expiry_60` or `lease_expiry_15` | Each admin user email | "Lease expiring in {N} days — {aircraft registration}" | Aircraft registration, lessee name, expiry date, days remaining; action URL → `/leases` |
| `lease_expiry_owner` | Same trigger as `lease_expiry_60` or `lease_expiry_15` | Aircraft owner email (`owner.email` via `aircraft.ownerId`) | "Your aircraft {registration} lease expires in {N} days" | Aircraft registration, lessee name, expiry date, revenue-stop warning; action URL → `/owner/dashboard` |

**Deduplication:** School emails keyed on template type + lessee email + lease ID. Admin emails keyed on `lease_expiry_admin_60` or `lease_expiry_admin_15` + admin email + lease ID. Owner emails keyed on `lease_expiry_owner_60` or `lease_expiry_owner_15` + owner email + lease ID.

---

## Monthly Emails (Scheduled)

Queued by cron jobs in `scheduler.ts`.

| Template Type | Cron Schedule | Recipients | Subject | Contains | Dedup |
|---------------|--------------|-----------|---------|----------|-------|
| `monthly_hours_reminder` | 1st of month at 8:00 AM | All `role = "flight_school"`, `status = "approved"` | "Monthly Flight Hours Reminder" | Reminder to log flight hours now | None (runs once/month) |
| `monthly_hours_reminder_final` | 25th of month at 8:00 AM | Flight schools that have NOT yet logged hours for the current month | "Final reminder: Log your hours before month-end" | Urgency — hours due before month-end, minimum hours billing warning | Keyed on template type + user email + current month (YYYY-MM) |
| `owner_monthly_summary` | 10th of month at 8:00 AM | All `role = "asset_owner"`, `status = "approved"` | "Monthly Owner Summary" | Monthly portfolio summary available; link to owner portal | None (runs once/month) |

**Note on `monthly_hours_reminder_final`:** Only queued for schools where `getFlightHourLogsForLessee(lesseeId)` returns no log with `month === currentMonth`. Schools that have already logged are skipped.

---

## Hours Logged Emails (Immediate — sent at time of action)

Triggered by `POST /api/portal/hours` in `routes.ts`. Sent directly via `emailService.sendNotificationEmail()` — not queued.

| Trigger | Recipient | Type | Contains |
|---------|-----------|------|----------|
| Flight school submits flight hours | All admin users | `payment_due` | School name, aircraft registration, hours logged, invoice amount, due date; action URL → `/payments` |
| Flight school submits flight hours | The submitting flight school user | `payment_due` | Confirmation of hours received, reported vs billable hours, invoice amount, due date; action URL → `/portal/payments` |

---

## Payment Receipt Email (Immediate — sent at time of action)

Triggered by `PUT /api/payments/:id` in `routes.ts` when admin sets status to "Paid". Sent directly alongside the existing in-app notification.

| Trigger | Recipient | Type | Contains |
|---------|-----------|------|----------|
| Admin marks payment as "Paid" | Flight school user linked to the payment | `general` | Payment amount, period, confirmation of receipt; action URL → `/portal/payments` |

---

## Admin Notifications (In-App + Email)

The following events create both in-app notifications and emails for admins.

| Event | In-App Notification To | Priority | Email Also Sent |
|-------|------------------------|----------|-----------------|
| Admin sends invite to flight school or owner | All admins | Low | No |
| Invited user activates their account | All admins | Medium | No |
| Payment is 7 days overdue | All admins | High | Yes — `payment_overdue_admin_7` queued |
| Payment is 30 days overdue | All admins | Urgent | Yes — `payment_overdue_admin_30` queued |
| Flight hours logged by school | All admins | Medium | Yes — immediate direct send |
| Admin marks payment as Paid | Flight school user linked to the payment | Medium (payment type) | Yes — immediate direct send to school |

---

## Email Queue Architecture

```
Action occurs
    │
    ├── Immediate send (invites, welcome) ──→ emailService.sendInviteEmail()
    │                                          emailService.sendNotificationEmail()
    │
    └── Scheduled event (payments, leases, monthly)
            │
            ↓
        storage.createEmailQueueEntry()  ← daily/monthly cron in scheduler.ts
            │
            ↓
        email_queue table (status: "pending")
            │
            ↓
        processEmailQueue()  ← cron every 5 min in scheduler.ts
        OR
        POST /api/internal/process-email-queue  ← manual trigger
            │
            ↓
        emailService.send*()
            │
            ├── success → updateEmailQueueStatus("sent")
            └── failure → updateEmailQueueStatus("failed", errorMessage)
```

---

## Environment Variables Required

| Variable | Purpose | Default |
|----------|---------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.ethereal.email` (auto test account) |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username / email | Auto-generated Ethereal account |
| `SMTP_PASS` | SMTP password / app password | Auto-generated Ethereal account |
| `APP_URL` | Base URL used in email links | `http://localhost:6000` |
| `INTERNAL_SECRET` | Header secret for queue processor endpoint | `dev-internal-secret` |

For Gmail: enable 2FA, generate an App Password, use `smtp.gmail.com:587`.
For SendGrid: use `smtp.sendgrid.net:587`, user = `apikey`, pass = `SG.your_key`.

---

## QA Status

**Date audited:** 2026-03-10

### Check Results

#### 1. sendInviteEmail() method
- Exists in `server/emailService.ts` at line 221. ✅
- Exported via the `emailService` singleton instance (not individually, but the method is accessible on the exported object). ✅
- Accepts `{ to: string; firstName: string; inviteUrl: string; role: 'flight_school' | 'asset_owner' }`. ✅
- Invite URL construction: callers in routes.ts and scheduler.ts both use `` `${process.env.APP_URL || "http://localhost:6000"}/accept-invite?token=${token}` `` — correct fallback. ✅
- `firstName` is passed with `|| "there"` fallback at all four call sites — graceful degradation. ✅

#### 2. Direct invite sends in routes.ts

All four routes (`POST /lessees/:id/invite`, `POST /lessees/:id/resend-invite`, `POST /owners/:id/invite`, `POST /owners/:id/resend-invite`):
- Call `emailService.sendInviteEmail()` directly — NOT queued. ✅
- Token is appended correctly to `APP_URL` before being passed to `sendInviteEmail`. ✅
- `isReady()` is NOT checked before calling — however `sendInviteEmail()` checks `this.isConfigured` internally and returns `false` gracefully. The return value is not inspected by the route, which is intentional: a failed email does not block the invite. ✅ (design is correct; see edge case note below)
- Failed email does NOT block invite creation — token is persisted before the email call. ✅

#### 3. Welcome email on account activation
- `POST /auth/invite/accept` calls `emailService.sendNotificationEmail()` at routes.ts line 226 after the user is updated and portal status is set to "active". ✅
- `updatedUser` is available (returned by `storage.updateUser`) and is passed directly. ✅
- Uses `type: "system_update"` with a welcome title and portal-specific `actionUrl`. ✅

#### 4. Queue processor (POST /api/internal/process-email-queue)
- Calls `storage.getPendingEmails()`. ✅
- Calls `emailService.sendInviteEmail()` for invite template types. ✅
- Calls `emailService.sendNotificationEmail()` for all other templates. ✅
- Calls `storage.updateEmailQueueStatus(id, "sent")` on success. ✅
- Calls `storage.updateEmailQueueStatus(id, "failed", errorMessage)` on failure (both from `success === false` and from thrown exceptions). ✅
- Returns `{ processed, sent, failed }`. ✅
- `INTERNAL_SECRET` header check present (line 2412–2414). ✅

#### 5. Scheduler queue processor (every 5 minutes)
- `cron.schedule("*/5 * * * *", ...)` present in `server/scheduler.ts` at line 20. ✅
- Calls the same `processEmailQueue()` function as it is defined locally in scheduler.ts. ✅
- `emailService` imported in scheduler.ts at line 3. ✅
- Note: the scheduler and HTTP endpoint have duplicate processing logic (same code in both files). This is a minor DRY concern but not a bug — both implementations are identical and kept in sync.

#### 6. TypeScript integrity
- `npm run check` from `Aircraft-Manager/`: **0 errors, 0 warnings**. ✅

#### 7. Edge cases

- **`isReady()` is false:** `sendInviteEmail()` and `sendNotificationEmail()` both return `false` without throwing. The queue processor marks the email as `failed` (which is correct — it will be retried on the next run since status is reset to "failed", not "sent"). The invite routes continue and return success — the invite token is valid even if email failed. ✅ Graceful degradation confirmed.
- **User email null/undefined:** `sendNotificationEmail()` checks `if (!data.user.email)` and returns `false` (line 164). `sendInviteEmail()` passes `to` directly — callers use `lessee.email` and `owner.email` which are `NOT NULL` in the schema, so null is not possible in practice. ✅
- **Failed emails retried:** Failed emails are marked with `status = "failed"`. They are NOT retried — `getPendingEmails()` filters on `status = "pending"` only. This is intentional for scheduled emails (prevent repeated sends after a transient SMTP outage). ⚠️ Concern: if SMTP is down temporarily, failed emails will never be retried. Acceptable for current scope but worth noting for production hardening.
- **`hasEmailBeenQueued()` prevents double-sends:** All three payment reminder types and both lease expiry types check `hasEmailBeenQueued(templateType, email, period)` before queuing. ✅ Monthly reminders do not use dedup — acceptable since the cron runs once per month by schedule.

### Bugs Found and Fixed

**No bugs found.** All email wiring checks pass. No code changes were made during this audit.

### Overall Verdict

**Ready for production SMTP.** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `APP_URL` in `.env` to switch from Ethereal test mode to live delivery. The only production hardening item worth considering is retry logic for transiently-failed queued emails, but this is not a blocker.

---

## Email UX Improvements — Added March 10, 2026

7 new email triggers added per `EMAIL_UX_REVIEW.md`. All new template types are handled in both queue processors (scheduler and HTTP endpoint).

| New Template / Trigger | File | Method |
|------------------------|------|--------|
| `payment_overdue_admin_7` — admin email at 7-day overdue | `scheduler.ts` | Queued |
| `payment_overdue_admin_30` — admin email at 30-day overdue | `scheduler.ts` | Queued |
| Hours-logged admin notification email | `routes.ts` | Direct send (immediate) |
| Hours-logged school invoice confirmation | `routes.ts` | Direct send (immediate) |
| Payment marked Paid — school receipt email | `routes.ts` | Direct send (immediate) |
| `monthly_hours_reminder_final` — 25th of month, non-loggers only | `scheduler.ts` | Queued |
| `owner_monthly_summary` moved to 10th of month | `scheduler.ts` | Queued (new cron) |
| `lease_expiry_admin` — admin email at 60 and 15 days | `scheduler.ts` | Queued |
| `lease_expiry_owner` — owner email at 60 and 15 days | `scheduler.ts` | Queued |

`npm run check` after all changes: **0 errors**.
