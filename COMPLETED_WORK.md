# COMPLETED_WORK.md
# AeroLease Wise — Platform Enhancement Build Summary
# Completed: March 5, 2026

---

## What Was Built

Full platform enhancement per BUILD_PLAN.md — 9 tasks completed across 3 parallel agents (backend-dev, frontend-admin, frontend-portals).

---

## Task Completion Summary

### Backend (backend-dev agent)

**Task #1 — Database Schema** ✅
- `users`: added `ownerId`, `inviteToken`, `inviteExpiresAt`, `invitedAt`, `lastLoginAt`
- `lessees`: added `state`, `certificationNumber`, `portalStatus`
- `owners`: added `portalStatus`
- `payments`: added `aircraftId`
- `flightHourLogs`: added `flightAwareHours`, `flightAwareCheckedAt`, `discrepancyFlagged`, `discrepancyNotes` (Phase 2 ready, stay null for now)
- New `emailQueue` table created
- All insert schemas and TypeScript types updated
- `npm run db:push` applied

**Task #2 — Auth & Middleware** ✅
- `isAssetOwner` middleware added to `server/auth.ts`
- `GET /api/auth/user` now returns `ownerId` + `lastLoginAt`
- `GET /api/auth/invite/validate?token=` — validates invite token
- `POST /api/auth/invite/accept` — sets password, activates account, auto-logs in
- Login returns specific message for `status="invited"` accounts
- `getUserByInviteToken` added to IStorage + DrizzleStorage

**Task #3 — Invite System Backend** ✅
- `POST /api/lessees/:id/invite` — creates flight_school user, queues invite email
- `POST /api/lessees/:id/resend-invite` — regenerates token, re-queues email
- `POST /api/owners/:id/invite` — creates asset_owner user, queues invite email
- `POST /api/owners/:id/resend-invite`
- `createEmailQueueEntry` added to storage
- Duplicate email returns 409

**Task #4 — Entity Detail APIs** ✅
- `GET /api/owners/:id/detail` — owner + aircraft + revenue summary + documents
- `GET /api/lessees/:id/detail` — lessee + leases + payments + hour logs + documents + user account info
- `GET /api/owner/dashboard` — stats scoped to req.user.ownerId
- `GET /api/owner/aircraft` — owner's fleet + active lease + monthly stats
- `GET /api/owner/aircraft/:id` — single aircraft + lease + 6-month performance + documents
- `GET /api/owner/revenue` — revenue scoped to owner's fleet (summary + byMonth + byAircraft)
- `GET /api/owner/documents` — docs for owner's aircraft + owner profile
- `GET /api/portal/aircraft/:id/lease` — current lease terms (school-scoped)
- `POST /api/portal/payments/pay` — simulated batch payment, marks Paid, notifies admin
- All `/api/owner/*` behind `isAssetOwner` middleware

**Task #5 — Notifications & Scheduler** ✅
- `server/scheduler.ts` created with two cron jobs:
  - Daily 8am: overdue payments (7-day + 30-day), due-soon (5-day), lease expiry (60-day + 15-day). Dedup via `hasEmailBeenQueued`
  - Monthly 1st 8am: `monthly_hours_reminder` to schools, `owner_monthly_summary` to owners
- In-app notification triggers added: hours submitted, payment confirmed, invite sent, account activated
- `POST /api/internal/process-email-queue` — stub processor (marks sent), protected by secret header
- Scheduler imported and started in `server/index.ts`
- Storage: `getPendingEmails`, `updateEmailQueueStatus`, `hasEmailBeenQueued`

---

### Frontend Admin (frontend-admin agent)

**Task #6 — Admin Portal Interconnectedness** ✅

New components created:
- `components/owners/owner-detail-drawer.tsx` — Sheet drawer: aircraft portfolio (clickable), revenue summary (gross/commission/net), documents, invite button
- `components/lessees/lessee-detail-drawer.tsx` — Sheet drawer: contact info, portal status + last login, active leases (clickable → aircraft), outstanding balance, payments, hour logs, documents, resend invite

Pages updated:
- `pages/owners.tsx` — "View Portfolio" button, aircraft count, active leases, revenue on each card
- `pages/lessees.tsx` — "View Profile" button, lease count, outstanding balance, portal status badge
- `components/aircraft/aircraft-details-modal.tsx` — owner name → Owner Drawer; lessee name → Lessee Drawer; Lease History tab; Payments tab; Documents tab
- `components/leases/lease-agreement-modal.tsx` — aircraft/lessee/owner names clickable; Payments tab; Hour Logs tab; Terminate + Renew actions
- `pages/payments.tsx` — Aircraft column (clickable → modal); School column (clickable → drawer); row expansion with gross/commission/net
- `pages/documents.tsx` — relatedType/relatedId renders as clickable entity links
- `pages/maintenance.tsx` — aircraft name clickable → Aircraft Detail Modal
- `pages/admin-users.tsx` — Linked Entity column, Last Login column, Portal Status badge
- `pages/aircraft.tsx` — owner/lessee drawers wired from aircraft modal
- Dashboard components: `aircraft-fleet.tsx`, `maintenance-schedule.tsx`, `payment-status.tsx`, `activity-feed.tsx` — all entity names/rows clickable

**Task #7 — Admin Revenue Page** ✅
- `pages/admin-revenue.tsx` — school names clickable → Lessee Drawer; aircraft registrations clickable → Aircraft Modal
- Timeframe filter and CSV export verified working

---

### Frontend Portals (frontend-portals agent)

**Task #8 — Flight School Portal Updates** ✅
- `App.tsx` — removed `/portal/browse` (redirects to `/portal`), removed `/register/school` (redirects to `/login`), added `/accept-invite` route, role-based post-login redirect
- `pages/accept-invite.tsx` — token validation, password setup form, auto-login, role-based redirect
- `components/layout/sidebar.tsx` — removed Browse Fleet from school nav; added asset_owner nav section
- `pages/portal/dashboard.tsx` — active leases summary cards with expiry warnings, quick action buttons
- `pages/portal/my-aircraft.tsx` — lease expiry banners (yellow <60 days, red <15 days), "Log Hours" shortcut, "View Invoices" button, "View Lease" read-only modal
- `pages/portal/hour-logging.tsx` — "Pay Minimum" shortcut button, live billing calculation (reported vs billable vs amount), inline minimum hours warning, history table shows both reported and billable hours
- `pages/portal/payments.tsx` — outstanding balance banner, simulated "Pay Now" modal with checkbox list, row expansion with gross/billable breakdown, invoice download

**Task #9 — Asset Owner Portal** ✅

New pages created (all read-only, post-10% financials):
- `pages/owner/dashboard.tsx` — stats row (total aircraft, leased, gross, net), portfolio cards per aircraft, recent payments
- `pages/owner/aircraft.tsx` — fleet list with lease info, hours this month, net revenue per aircraft
- `pages/owner/aircraft-detail.tsx` — specs, current lease (lessee name only, no contact), 6-month performance table (hours/gross/fee/net), documents
- `pages/owner/revenue.tsx` — date range filter, summary cards, monthly breakdown table, by-aircraft tab
- `pages/owner/documents.tsx` — searchable document table with download
- All `/owner/*` routes in `App.tsx` with `isAssetOwner || isAdmin` guard
- `useAuth.ts` updated with `isAssetOwner` and `ownerId`

---

## Three User Roles — Final State

| Role | Portal | Access |
|---|---|---|
| `admin` / `super_admin` | `/dashboard` | Full control, all pages, revenue analytics |
| `flight_school` | `/portal` | Own aircraft only, log hours, view/pay invoices |
| `asset_owner` | `/owner` | Own aircraft performance, post-10% revenue, contracts |

---

## QA Bug Fixes — March 10, 2026

Full QA audit run + 2 specialized agents deployed (backend + frontend). All critical and high-severity bugs fixed. Zero new TypeScript errors introduced.

### Backend Fixes ✅
- **Session table mismatch** — `server/auth.ts`: `tableName: 'session'` → `'sessions'`
- **Duplicate payment handler** — deleted dead `protectedRouter.post("/portal/payments/pay")` from `routes.ts`
- **Missing role guards** — `isAdmin` middleware added to all 21 write routes (POST/PUT/DELETE) for aircraft, owners, lessees, leases, payments, maintenance, documents
- **`getAdminUsers()`** — added to `IStorage` + `DrizzleStorage`; all `getAllUsers().filter()` admin lookups replaced (including residual at line 859)
- **N+1 query eliminated** — `getAllAircraftWithDetails()` rewritten as 3-query in-memory join
- **Pending approval bypass** — `GET /api/auth/user` now returns 403 for `pending`/`invited` users

### Performance Optimizations ✅
- **`ownerRouter.get('/revenue')` N+1 eliminated** — was: 1 + N_aircraft + N_leases + N_leases (per-lease payments + per-lease flight logs) sequential awaits inside nested loops. Now: 3 bulk queries (`getLeasesByAircraftIds`, `getPaymentsByLeaseIds`, `getFlightHourLogsByLesseeIds`) + in-memory join. Query count: O(1 + N_aircraft × N_leases × 2) → O(4).
- **`ownerRouter.get('/aircraft')` N+1 eliminated** — was: per-aircraft getLeasesForAircraft + getLessee + getPaymentsForLease + getFlightHourLogsForLessee inside a `Promise.all` map. Now: 3 bulk queries up-front + in-memory lookup via Maps. Query count: O(N_aircraft × 4) → O(4 + N_active_lessees).
- **`ownerRouter.get('/aircraft/:id')` N+1 eliminated** — was: per-lease getPaymentsForLease and getFlightHourLogsForLessee called inside a 6-iteration month loop. Now: 2 bulk queries (`getPaymentsByLeaseIds`, `getFlightHourLogsByLesseeIds`) fetched once before the loop, iterated in memory. Query count: O(N_leases × 6 × 2) → O(4).
- **`GET /owners/:id/detail` double-fetch eliminated** — was: `getLeasesForAircraft` called once in the `aircraftWithLeases` Promise.all, then called again per-aircraft in the revenue loop. Now: single `getLeasesByAircraftIds` bulk call used for both aircraft hydration and revenue accumulation. Query count reduced by N_aircraft repeated lease fetches.
- **New bulk storage methods added** — `getLeasesByAircraftIds(ids[])`, `getPaymentsByLeaseIds(ids[])`, `getFlightHourLogsByLesseeIds(ids[])` added to `IStorage` interface and implemented in `DatabaseStorage` using `inArray` (single SQL `WHERE id IN (...)` each).

### TypeScript Fixes ✅ — March 10, 2026
- **`server/storage.ts` — duplicate stub block removed** — In-memory `getNotification`, `getAllNotifications`, `getUnreadNotifications`, `createNotification`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, `getNotificationCount`, `initSampleNotifications`, `getUser`, `upsertUser` stubs (left over from an earlier InMemory phase) were pasted inside `DatabaseStorage`, causing 10+ TS2393 duplicate function errors. Entire stub block deleted.
- **`server/storage.ts` — `rowCount` null safety** — 8 occurrences of `result.rowCount > 0` replaced with `(result.rowCount ?? 0) > 0` (TS18047: possibly null).
- **`server/storage.ts` — `gte(maintenance.scheduledDate, today)`** — `scheduledDate` is `PgDateString`; `today` is `Date`. Fixed by converting to ISO date string: `today.toISOString().split('T')[0]`.
- **`server/storage.ts` — `upsertUser` missing `passwordHash`** — DB column is `notNull` but `UpsertUser` omits it. Fixed by providing `passwordHash: ""` default in the insert values.
- **`server/vite.ts` — `allowedHosts: true`** — `boolean` is not assignable to `true | string[] | undefined`. Fixed with `true as const`.
- **`client/src/components/aircraft/aircraft-details-modal.tsx`** — 10 errors: `null` values on `AircraftImage.src`, `Select.defaultValue`, `Input.value`, `Textarea.value`, and `getStatusColor()` arguments. Fixed with `?? undefined` / `?? ""` null coalescing.
- **`client/src/components/leases/lease-agreement-modal.tsx`** — 2 errors: `getStatusColor(lease.status)` and `getStatusColor(payment.status)` where status is `string | null`. Fixed with `?? ""`.
- **`client/src/pages/admin-users.tsx`** — `editForm.reset({ role: user.role || "user" })` produces `string` not the literal union. Fixed with `as "user" | "admin" | "super_admin"` / `as "pending" | "approved" | "blocked"`.
- **`client/src/pages/documents.tsx`** — Sort comparisons on nullable fields (TS18047) and `formatDate(document.uploadDate)` where uploadDate is `Date | null`. Fixed with `?? ""` in comparisons and `?? undefined` for formatDate.
- **`client/src/pages/help-support.tsx`** — `apiRequest` called with wrong argument order: `apiRequest(url, { method, body })` instead of `apiRequest(method, url, data)`. Fixed.
- **`client/src/pages/portal/hour-logging.tsx`** — `formatDate(log.submittedAt)` where submittedAt is `Date | null`. Fixed with `?? undefined`.
- **Final `npm run check` result: 0 errors.**

### Frontend Fixes ✅
- **Login double-redirect** — `login.tsx`: `setLocation("/dashboard")` → `setLocation("/")`
- **Inverted revenue guard** — `App.tsx`: `/admin/revenue` guard changed from `!isFlightSchool` → `isAdmin`
- **Dead route aliases** — removed `/portal/hours` and `/portal/aircraft` alias routes from `App.tsx`
- **Notifications double-fetch** — removed `/api/notifications/count` query; count derived from array
- **Local `loginSchema`** — removed, now imported from `@shared/schema`
- **Plain `user` role dead-end** — inline `AccessDeniedPage` added; `isPlainUser` guard on `/` and `/dashboard`
- **Broken `/register/school` link** — replaced with static invite-only instruction text
- **Dead `Home` import** — removed from `App.tsx`

---

## UI Flow Fixes — March 10, 2026

8 confirmed UI bugs from `UI_FLOW_AUDIT.md` fixed. Zero new TypeScript errors.

- **C1 (FIX 1)** — `owner/aircraft-detail.tsx`: `doc.fileUrl` → `doc.url` — document download buttons now render correctly for asset owners.
- **C2 (FIX 2)** — `owner/documents.tsx`: `doc.fileUrl` → `doc.url` — entire owner documents page download column restored.
- **C3 (FIX 3+4)** — `portal/hour-logging.tsx`: `(log as any).billableHours` → `log.verifiedHours ?? log.reportedHours`; column header renamed "Verified / Billed"; discrepancyFlagged shows red AlertTriangle badge and discrepancyNotes shown as sub-text in the cell.
- **C4 (FIX 5)** — `portal/payments.tsx`: `payMutation.onError` handler added — payment failures now toast "Payment failed / Please try again or contact support."
- **C5 (FIX 6)** — `portal/payments.tsx`: Fake VISA •••• 4242 card and "Add New Method" button removed; replaced with info note "Payments are processed by your fleet administrator." "Download Full Policy" button set to disabled with cursor-not-allowed.
- **C6 (FIX 7)** — `portal/aircraft-detail.tsx`: Back button changed from `/portal/browse` → `/portal/my-aircraft`; "Reserve Aircraft" / "Start Lease Process" buttons and LeaseModal entirely removed; all hardcoded fake specs (4 Adults, 120 KTAS, 8.0 GPH, G1000 Glass, equipment tags) removed; spec block now renders real `engineType`, `avionics`, `totalTime` from API or omits if null.
- **C7 (FIX 8)** — `portal/my-aircraft.tsx`: Dead "Scheduling" `<div>` wrapped in `<Link href="/portal/hour-logging?aircraftId=...">` — card now navigates to hour logging.

---

## UI Flow Fixes — March 10, 2026 (Final Pass: A1–A4)

### 4 remaining audit items fixed, 0 TypeScript errors

**FIX A1 — Documents "Related To" column resolves entity names (B15 — MEDIUM)** ✅
- `client/src/pages/documents.tsx`: owners/lessees queries changed from `enabled: addDocumentOpen` to always-on.
- Both grid card and list view "Related To" now resolve: aircraft → `Aircraft: N12345`, owner → `Owner: John Smith`, lessee → `School: ATP Academy`. Falls back to `#id` if entity not found.

**FIX A2 — Owner revenue page now has AreaChart (D6 — MEDIUM)** ✅
- `client/src/pages/owner/revenue.tsx`: Imported `AreaChart` component. Added monthly aggregation (Map over `monthlyBreakdown`) to collapse per-aircraft rows into per-month gross/net totals. Rendered as `AreaChart` (gross=blue, net=green) using same component as admin revenue. Chart only renders when `chartData.length > 0`.

**FIX A3 — Admin revenue "By Owner" breakdown added (B18 — MEDIUM)** ✅
- `server/storage.ts`: `getRevenueStats` return type extended with `byOwner` array. Implementation: bulk-fetches owners via `inArray`, groups payments by aircraft.ownerId → accumulates gross/commission/net/aircraftCount. Returns sorted by gross desc.
- `client/src/pages/admin-revenue.tsx`: Added `breakdownTab` state. Replaced static "Top Performing Schools" side card with tabbed "Revenue Breakdown" card (By School / By Owner / By Aircraft). Owner rows are clickable → OwnerDetailDrawer. CSV export updated to include byOwner section.

**FIX A4 — Aircraft grid cards show engineType + totalTime (B3 — LOW)** ✅
- `client/src/pages/aircraft.tsx`: Added compact specs line below registration in grid card view. Shows `engineType · X,XXX hrs TT` using existing `Zap` icon import. Rendered only when at least one value is non-null.

**TypeScript check result:** `npm run check` — 0 errors.

---

## What Is NOT Done (Next Steps)

| Item | Status |
|---|---|
| Email sending (SendGrid/Resend) | Queue is built — plug in API key when ready |
| FlightAware API integration | DB columns ready — Phase 2 |
| Stripe payments | Simulated for now — Phase 2 |

---

## Key Files Reference

| File | Purpose |
|---|---|
| `shared/schema.ts` | Single source of truth for all DB tables + types |
| `server/routes.ts` | All API endpoints |
| `server/storage.ts` | All DB queries (IStorage interface) |
| `server/auth.ts` | Middleware: isAdmin, isFlightSchool, isAssetOwner |
| `server/scheduler.ts` | Cron jobs for notifications and email queue |
| `BUILD_PLAN.md` | Full detailed implementation plan |
| `PORTAL_PLAN.md` | Original portal plan (v1, pre-client-review) |

---

## To Start Dev Server

```bash
cd Aircraft-Manager
npm run dev
```

App runs on port 6000. Login routes to correct portal based on role.

---

## QA Bug Fixes — March 10, 2026

### Frontend Bugs Fixed (frontend-specialist agent)

**BUG 1 — Login double-redirect** ✅
- `client/src/pages/login.tsx`: Changed `setLocation("/dashboard")` → `setLocation("/")` after successful login. The router's existing role-based redirect logic at `/` now handles destination correctly for all roles.

**BUG 2 — `/admin/revenue` inverted role guard (SECURITY)** ✅
- `client/src/App.tsx`: Changed `{!isFlightSchool ? <AdminRevenue /> : <NotFound />}` → `{isAdmin ? <AdminRevenue /> : <NotFound />}`. Asset owners can no longer access admin revenue data.

**BUG 3 — Duplicate route aliases removed** ✅
- `client/src/App.tsx`: Removed `/portal/hours` (alias for `/portal/hour-logging`) and `/portal/aircraft` (alias for `/portal/my-aircraft`). Only canonical routes remain.

**BUG 4 — Notifications double-fetch eliminated** ✅
- `client/src/components/ui/notifications-dropdown.tsx`: Removed the separate `/api/notifications/count` query. Unread count is now derived from the notifications array (`notifications.filter(n => !n.read).length`). Also removed stale count cache invalidations from all three mutations.

**BUG 5 — `loginSchema` now imported from shared** ✅
- `client/src/pages/login.tsx`: Removed local `loginSchema` z.object definition. Now imports `loginSchema` and `LoginUser` type from `@shared/schema`. Also removed unused `z` import.

**BUG 6 — Plain `user` role dead-end resolved** ✅
- `client/src/App.tsx`: Added `AccessDeniedPage` inline component. Added `isPlainUser` flag derived from `user && !isAdmin && !isFlightSchool && !isAssetOwner`. Routes `/` and `/dashboard` now render `<AccessDeniedPage />` for plain users instead of showing the admin dashboard they cannot use.

**TypeScript check result:** All errors in `npm run check` output are pre-existing (in `aircraft-details-modal.tsx`, `lease-agreement-modal.tsx`, `admin-users.tsx`, `server/storage.ts`, `server/vite.ts`). Zero errors introduced by these fixes.

### Backend Bugs Fixed (backend-specialist agent)

**BUG 1 — Session table name mismatch (CRITICAL)** ✅
- `server/auth.ts`: Changed `tableName: 'session'` → `tableName: 'sessions'` to match the Drizzle schema declaration, fixing session persistence on fresh DB.

**BUG 2 — Duplicate payment handler (CRITICAL)** ✅
- `server/routes.ts`: Deleted the dead `protectedRouter.post("/portal/payments/pay", isFlightSchool, ...)` handler (~50 lines). The `portalRouter` version (more complete, includes user self-notification) is the only one that remains.

**BUG 3 — No role guard on admin write routes (SECURITY)** ✅
- `server/routes.ts`: Added `isAdmin` middleware to all 21 write endpoints (POST/PUT/DELETE for aircraft, owners, lessees, leases, payments, maintenance, documents). Non-admin approved users can no longer mutate data via these routes.

**BUG 4 — `getAllUsers()` full table scan for admin lookup (PERFORMANCE)** ✅
- `server/storage.ts` `IStorage`: Added `getAdminUsers(): Promise<User[]>` to the interface.
- `server/storage.ts` `DatabaseStorage`: Implemented with `WHERE role IN ('admin', 'super_admin')`.
- `server/routes.ts`: Replaced all 5 occurrences of `(await storage.getAllUsers()).filter(u => u.role === "admin" || u.role === "super_admin")` (and the two-line variant) with `await storage.getAdminUsers()`.

**BUG 5 — N+1 query in `getAllAircraftWithDetails` (PERFORMANCE)** ✅
- `server/storage.ts`: Rewrote `getAllAircraftWithDetails` to use 3 total DB queries (all aircraft, all active leases, batch owner/lessee lookups via `inArray`) instead of O(n×3) per-aircraft queries. In-memory join assembles the result.

**BUG 6 — Pending approval bypass via session (SECURITY)** ✅
- `server/routes.ts` `GET /api/auth/user`: Added status check before returning user data. Returns `403 { message: "PENDING_APPROVAL" }` for non-approved users, and `403 { message: "INVITED" }` for invited-but-not-yet-activated users.

**TypeScript check result (backend bugs):** Zero new errors introduced. Pre-existing errors in `server/storage.ts` (in-memory stub block with duplicate implementations) and `server/vite.ts` remain unchanged.

---

## What Is NOT Done

- N+1 queries in owner revenue and aircraft routes — DONE. All 4 handlers optimized with bulk queries and in-memory joins (March 10, 2026).

### Round 2 Fixes ✅

**Dead page file cleanup (client/src/pages/portal/)** ✅
- Confirmed `browse.tsx` and `register-school.tsx` were unimported (no module imports found in `client/src/` — only unrelated API route strings reference "browse").
- Deleted both files per client request.
- `npm run check` after deletion: zero TypeScript errors.

**Round 2 Backend Security & Performance Fixes (March 10, 2026)** ✅

**FIX 1 — `isAdmin` added to lessee and owner invite routes (SECURITY)** ✅
- `server/routes.ts`: Added `isAdmin` as second middleware to `POST /lessees/:id/invite`, `POST /lessees/:id/resend-invite`, `POST /owners/:id/invite`, and `POST /owners/:id/resend-invite`. Non-admin approved users can no longer trigger account creation.

**FIX 2 — `isAdmin` added to owner and lessee detail GET routes (SECURITY)** ✅
- `server/routes.ts`: Added `isAdmin` as second middleware to `GET /owners/:id/detail` and `GET /lessees/:id/detail`. Sensitive financial detail data is now restricted to admin roles.

**FIX 3 — Targeted `getUserByLesseeId` query replaces full table scan (PERFORMANCE)** ✅
- `server/storage.ts` `IStorage`: Added `getUserByLesseeId(lesseeId: number): Promise<User | undefined>` to interface.
- `server/storage.ts` `DatabaseStorage`: Implemented with `WHERE lesseeId = ? LIMIT 1`.
- `server/routes.ts` `GET /lessees/:id/detail`: Replaced `getAllUsers().find(u => u.lesseeId === id)` with `await storage.getUserByLesseeId(id)`.

**TypeScript check result:** `npm run check` passes with zero errors.

---

## QA Bug Fixes — March 10, 2026

### Final Cleanup & Optimizations ✅

**FIX 1 — Deleted dead `home.tsx` file (CLEANUP)** ✅
- `client/src/pages/home.tsx`: Confirmed unimported anywhere. Deleted via bash rm.

**FIX 2 — Added "INVITED" to `isPendingApprovalError` (CORRECTNESS)** ✅
- `client/src/lib/authUtils.ts`: Added `|| error.message.includes("INVITED")` to the `isPendingApprovalError` check. Backend returns `{ message: "INVITED" }` with 403 for invited-but-not-activated users; they now correctly route to the pending approval screen instead of hitting the wrong error branch.

**FIX 3 — Bulk-optimized `ownerRouter.get("/dashboard")` (PERFORMANCE)** ✅
- `server/routes.ts`: Replaced serial for-loop N+1 pattern (per-aircraft `getLeasesForAircraft` + per-lease `getPaymentsForLease`) with:
  - `storage.getLeasesByAircraftIds(aircraftIds)` — single query for all leases
  - `storage.getPaymentsByLeaseIds(allLeaseIds)` — single query for all payments
  - `Promise.all` over unique lesseeIds for lessee names
  - In-memory Maps for O(1) lookups; `enrichedRecent` is now synchronous map, not async waterfall
  - Identical response shape preserved.

**FIX 4 — Bulk-optimized `getRevenueStats` in storage.ts (PERFORMANCE)** ✅
- `server/storage.ts`: Replaced per-payment `this.getLessee()` and `this.getLease()` calls in sequential for-loops with:
  - Collected unique lesseeIds and leaseIds from payments array
  - `Promise.all([inArray(lessees.id, ...), inArray(leases.id, ...)])` — two parallel bulk queries
  - Additional `inArray(aircraft.id, uniqueAircraftIds)` for aircraft bulk fetch
  - Built `lesseeById`, `leaseById`, `aircraftById` Maps; all loop lookups use Maps
  - Identical return value shape preserved.

**FIX 5 — Removed unused `GET /notifications/count` endpoint (CLEANUP)** ✅
- `server/routes.ts`: Deleted the `protectedRouter.get("/notifications/count", ...)` handler (~11 lines). Count is derived client-side from the notifications array; no frontend consumer existed.

**TypeScript check result:** `npm run check` — 0 errors. App is production-ready, full QA pass complete.

---

## UI Flow Fixes — March 10, 2026

Eight confirmed UI bugs fixed from the UI Flow Audit (UI_FLOW_AUDIT.md).

**FIX 1 — Password reset button now has handler (A1 — HIGH)** ✅
- `client/src/pages/login.tsx`: Added `onClick` to "Reset Link" button — shows toast directing users to contact their administrator.

**FIX 2 — Invited user login message corrected (A2 — MEDIUM)** ✅
- `client/src/pages/login.tsx`: Added a check for `data.status === "invited"` in `onSuccess` — shows specific toast: "You have a pending invite. Please check your email and follow the invite link to set your password."

**FIX 3 — "Bonjour" replaced with "Hello" in portal dashboard (C1 — MEDIUM)** ✅
- `client/src/pages/portal/dashboard.tsx`: Line 54 — replaced "Bonjour" with "Hello".

**FIX 4 — minimumHours now shown in leases list and grid (B10 — MEDIUM)** ✅
- `client/src/pages/leases.tsx`: Grid card shows "Min: X hrs/mo" line. List view has a new "Min Hrs/Mo" column with `— ` fallback for null.

**FIX 5 — uploadDate ghost field removed from owner/documents.tsx (D5 — LOW)** ✅
- `client/src/pages/owner/documents.tsx`: `doc.uploadDate ||` removed; now uses `doc.createdAt` directly.

**FIX 6 — uploadDate ghost field removed from owner/aircraft-detail.tsx (D5 — LOW)** ✅
- `client/src/pages/owner/aircraft-detail.tsx`: `doc.uploadDate ||` removed; now uses `doc.createdAt` directly.

**FIX 7 — Unused Bell and Inbox imports removed from sidebar (E3 — LOW)** ✅
- `client/src/components/layout/sidebar.tsx`: Removed `Bell` and `Inbox` from lucide-react import block.

**FIX 8 — Zero-activity months now shown in owner performance table (D3 — MEDIUM)** ✅
- `client/src/pages/owner/aircraft-detail.tsx`: Removed `.filter((r: any) => r.gross > 0 || r.hours > 0)` — all months in the 6-month range now render.

**TypeScript check result:** `npm run check` — 0 errors.

---

## UI Flow Fixes — March 10, 2026

### Admin Portal Data Gap Fixes (8 fixes, 0 TypeScript errors)

**FIX 1 — `state` and `certificationNumber` added to lessee form (B7 — HIGH)** ✅
- `client/src/pages/lessees.tsx`: Added both fields to `lesseeFormSchema`, `defaultValues`, `useEffect` reset, and form JSX (Input components placed after Address field).

**FIX 2 — Gross / Commission / Net columns added to payments table (B11 — HIGH)** ✅
- `client/src/pages/payments.tsx`: Added three new `<TableHead>` headers (Gross, Commission, Net) and corresponding `<TableCell>` cells using `formatCurrency()`, showing "—" when null.

**FIX 3 — Dead `OwnerDetailDrawer` removed from payments page (B12 — HIGH)** ✅
- `client/src/pages/payments.tsx`: Removed `OwnerDetailDrawer` import, `selectedOwnerId`/`ownerDrawerOpen` state, `onViewOwner` prop from `AircraftDetailsModal`, and the dead drawer JSX. Owner data is not in `PaymentWithDetails`; the drawer was unreachable.

**FIX 4 — `portalStatus` badge added to owners list (B4 — MEDIUM)** ✅
- `client/src/pages/owners.tsx`: Added `Badge` import. Grid cards show colored badge inline with "Owner" label. List table has new "Portal Status" column. Colors: active=green, invited=blue, other=gray.

**FIX 5 — `portalStatus` badge added to lessees list (B8 — MEDIUM)** ✅
- `client/src/pages/lessees.tsx`: Same badge pattern as owners. Grid cards and list table both show portalStatus. Badge suppressed when value is "none".

**FIX 6 — `cost` and `completedDate` columns added to maintenance table (B13, B14 — MEDIUM)** ✅
- `client/src/pages/maintenance.tsx`: Added Cost column (`formatCurrency()`, "—" for zero/null) and Completed Date column (`formatDate()`, "—" for null) after "Performed By".

**FIX 7 — "Invited" filter tab added to admin users page (B20 — MEDIUM)** ✅
- `client/src/pages/admin-users.tsx`: Filter state type extended to include `"invited"`. New "Invited" button added after "Blocked" tab. `getStatusIcon()` now handles `"invited"` status.

**FIX 8 — Entity name display improved on admin users page (B21 — MEDIUM)** ✅
- `client/src/pages/admin-users.tsx`: Display now uses `lesseeName`/`ownerName` if present in API response (future-proofed). Falls back to `"Flight School (ID: N)"` / `"Owner (ID: N)"` with tooltip — clearer than the previous `#N` format.

**TypeScript check result:** `npm run check` — 0 errors.

## UI Flow Fixes — March 10, 2026 (Notifications Pass)

### Notifications Experience Completion (5 fixes, 0 TypeScript errors)

**FIX 1 — "Open Activity Center" button wired + dedicated Notifications page created (F1 — HIGH)** ✅
- `client/src/components/ui/notifications-dropdown.tsx`: Added `onClick={() => { setIsOpen(false); setLocation("/notifications"); }}` to the footer button.
- `client/src/pages/notifications.tsx`: New full-page notifications view. Fetches `/api/notifications`, groups entries by Today/Yesterday/Earlier using `date-fns`, shows per-item delete and mark-as-read buttons, "Mark all as read" header button, and an empty state with Sparkles icon. Reuses same priority config and type icon patterns as the dropdown.

**FIX 2 — `/notifications` route added to App.tsx (MEDIUM)** ✅
- `client/src/App.tsx`: Imported `NotificationsPage`. Added `<Route path="/notifications" component={NotificationsPage} />` inside the authenticated section, accessible to all roles.

**FIX 3 — `pageMeta` in header expanded to cover all portal/owner routes (MEDIUM)** ✅
- `client/src/components/layout/header.tsx`: Added entries for `/portal/dashboard`, `/portal/my-aircraft`, `/portal/hour-logging`, `/portal/payments`, `/owner`, `/owner/dashboard`, `/owner/aircraft`, `/owner/revenue`, `/owner/documents`, `/notifications`, `/admin/revenue`. Added `getDynamicMeta()` helper using `startsWith` for `/portal/aircraft/:id` and `/owner/aircraft/:id` dynamic routes.

**FIX 4 — Notifications nav link added to sidebar for all portals (MEDIUM)** ✅
- `client/src/components/layout/sidebar.tsx`: Added `Bell` icon import, `useQuery` + `Notification` type import. Added `unreadCount` derived from `/api/notifications` query (30s refetch). Added "Alerts" nav section with `NavLink` to `/notifications` at bottom of nav — visible to all roles, badge shows live unread count.

**FIX 5 — Admin `PUT /payments/:id` now notifies flight school on Paid status (MEDIUM)** ✅
- `server/routes.ts`: After updating payment, if `validatedData.status === "Paid"` and `payment.lesseeId` is set, calls `storage.getUserByLesseeId()` and creates a `payment` notification for that user linking to `/portal/payments`.

**TypeScript check result:** `npm run check` — 0 errors.

---

## UI Flow Fixes — March 10, 2026 (Audit Pass 3: Data Integrity + Portal Documents)

### 5 fixes applied, 0 TypeScript errors

**FIX 1 — Remove hardcoded KPI cards on Aircraft page (B1, B2 — HIGH)** ✅
- `client/src/pages/aircraft.tsx`: Replaced the 4 hardcoded KPI cards ("Total Valuation: $84.2M", "Global Yield: 12.8%", "Maintenance: 3 Tasks", "Compliance: 98.2%") with 3 real-data cards computed from the aircraft array already in scope: Total Aircraft (array count), Active Leases (count of aircraft with currentLease), In Maintenance (count with status === 'maintenance'). Cards only render when aircraft data is loaded. Removed the hardcoded "92%" utilization badge from each grid card and the "Yield: 12.4%" line from the list view. No utilization data exists in the schema; no replacement shown.

**FIX 2 — Remove dead "Full Inventory Analysis" button on admin revenue page (B17 — HIGH)** ✅
- `client/src/pages/admin-revenue.tsx`: Removed the dead `<Button variant="ghost">Full Inventory Analysis</Button>` from the aircraft performance card header. It had no onClick handler.

**FIX 3 — Flight School Documents page and full feature wiring (E1 — HIGH)** ✅
- `server/routes.ts`: Added `GET /api/portal/documents` on the portalRouter. Fetches lessee-level documents via `storage.getDocumentsForEntity("lessee", user.lesseeId)` plus aircraft documents for all leases. Guarded by existing `isFlightSchool` middleware.
- `client/src/pages/portal/documents.tsx`: New page created. Fetches `/api/portal/documents`, shows searchable table (name, type, related entity, upload date, download link using `doc.url`). Empty state when no documents. Pattern mirrors `owner/documents.tsx`.
- `client/src/App.tsx`: Added `PortalDocuments` import and `<Route path="/portal/documents">` inside the flight school portal section.
- `client/src/components/layout/sidebar.tsx`: Added "Documents" NavLink (FileText icon → `/portal/documents`) in the flight school Operations nav section.

**FIX 4 — Email notification pending indicator (F2 — MEDIUM)** ✅
- `client/src/pages/help-support.tsx`: Added `Info` icon import. Added an unobtrusive info callout banner below the page heading: "Email notifications are currently being configured. In-app notifications are active. Contact your administrator for updates."

**FIX 5 — Accept Invite back-navigation for already-activated users (A4 — LOW)** ✅
- `client/src/pages/accept-invite.tsx`: Added `Link` import from wouter. Added a "Go to Login" `<Button>` wrapped in a `<Link href="/login">` in the error/expired state, so users are no longer stranded on the error page.

**TypeScript check result:** `npm run check` — 0 errors.

---

## Email System Wiring — March 10, 2026

### System now fully operational. Works TODAY with Ethereal test account (no env vars needed). Set SMTP_* vars in .env for production sending.

**TASK 1 — Queue processor wired (server/routes.ts)** ✅
- `POST /api/internal/process-email-queue`: Replaced stub with real processing loop.
- For each pending email: looks up user by `to` address (or builds minimal `{ email, firstName }` object for invited users without accounts yet).
- Routes to `emailService.sendInviteEmail()` for all invite template types.
- Routes to `emailService.sendNotificationEmail()` for payment, lease, reminder, and summary templates — each with appropriate `type`, `title`, and `message`.
- On success: marks `sent`. On failure: marks `failed` with error message.
- Returns `{ processed, sent, failed }` summary.

**TASK 2 — Scheduler processes queue every 5 minutes (server/scheduler.ts)** ✅
- Added `import { emailService }` to scheduler.
- Added `cron.schedule("*/5 * * * *", ...)` job calling `processEmailQueue()`.
- Extracted `processEmailQueue()` as a standalone async function containing the same routing logic as the HTTP endpoint — DRY across both.

**TASK 3 — Invite-specific email template added (server/emailService.ts)** ✅
- New method `sendInviteEmail({ to, firstName, inviteUrl, role })` on the `EmailService` class.
- Subject: "You've been invited to AeroLease Wise".
- Indigo/purple brand color (`#5856D6`), prominent "Set Up Your Account" CTA button.
- Role label shown as "Flight School" or "Asset Owner".
- 24-hour expiry warning included. Plain-text fallback included.

**TASK 4 — .env.example updated** ✅
- Added `APP_URL` (used to build invite/portal links in emails).
- Added `INTERNAL_SECRET` (authenticates the queue processor endpoint).
- Both documented with generation instructions.

**TASK 5 — Direct send for critical events (server/routes.ts)** ✅
- `POST /lessees/:id/invite`: Now calls `emailService.sendInviteEmail()` immediately (removed `createEmailQueueEntry`).
- `POST /lessees/:id/resend-invite`: Same — direct send.
- `POST /owners/:id/invite`: Same — direct send.
- `POST /owners/:id/resend-invite`: Same — direct send.
- `POST /auth/invite/accept`: Now sends welcome email via `emailService.sendNotificationEmail()` immediately after account activation.

**Email System QA Audit completed March 10, 2026 — no bugs found. Full results in EMAIL_FLOWS.md QA Status section. Verdict: Ready for production SMTP.**

### All email triggers in the system:

| Trigger | Recipient | When | Template |
|---------|-----------|------|----------|
| Admin sends invite to flight school | Flight school contact email | Immediate | `sendInviteEmail` (flight_school) |
| Admin resends invite to flight school | Flight school contact email | Immediate | `sendInviteEmail` (flight_school) |
| Admin sends invite to asset owner | Owner email | Immediate | `sendInviteEmail` (asset_owner) |
| Admin resends invite to asset owner | Owner email | Immediate | `sendInviteEmail` (asset_owner) |
| User accepts invite & sets password | Activated user | Immediate | Welcome — `system_update` |
| Payment due in 5 days | Lessee email | Daily 8am (queued) | `payment_due_soon` |
| Payment 7 days overdue | Lessee email | Daily 8am (queued) | `payment_overdue_7` |
| Payment 30 days overdue | Lessee email | Daily 8am (queued) | `payment_overdue_30` |
| Lease expiring in 60 days | Lessee email | Daily 8am (queued) | `lease_expiry_60` |
| Lease expiring in 15 days | Lessee email | Daily 8am (queued) | `lease_expiry_15` |
| Monthly hours reminder | All flight school users | 1st of month 8am (queued) | `monthly_hours_reminder` |
| Monthly owner summary | All asset owner users | 1st of month 8am (queued) | `owner_monthly_summary` |

**TypeScript check result:** `npm run check` — 0 errors.

---

## Email UX Improvements — March 10, 2026

7 email notification improvements implemented per `EMAIL_UX_REVIEW.md` recommendations.

**Files changed:** `server/scheduler.ts`, `server/routes.ts`

| # | Change | Summary |
|---|--------|---------|
| 1 | Admin email on payment overdue | `checkOverduePayments()` now queues `payment_overdue_admin_7` and `payment_overdue_admin_30` to each admin alongside the existing in-app notification, with school name, amount, and period in subject line |
| 2 | Admin email when hours logged | `POST /api/portal/hours` sends immediate `sendNotificationEmail` to all admins after in-app notification block; includes school name, aircraft registration, hours, amount, due date |
| 3 | Invoice confirmation to school when hours logged | Same route now sends immediate `sendNotificationEmail` to the submitting flight school user confirming hours received, billable hours, invoice amount, and due date |
| 4 | Payment receipt email to school when admin marks Paid | `PUT /api/payments/:id` now calls `sendNotificationEmail` to the flight school user alongside the existing in-app notification |
| 5 | Second monthly hours reminder on 25th | New `sendFinalHoursReminder()` cron at `0 8 25 * *`; only sends to schools that have not logged hours for the current month; uses dedup key `monthly_hours_reminder_final` + current month |
| 6 | Owner monthly summary moved to 10th | Separated owner summary into `sendOwnerMonthlySummary()` on its own `0 8 10 * *` cron; original 1st-of-month cron now only sends hours reminders |
| 7 | Lease expiry emails to admin + owner | `checkExpiringLeases()` now queues `lease_expiry_admin` (to all admins) and `lease_expiry_owner` (to aircraft owner) for both 60-day and 15-day windows; all six dedup keys are unique per lease ID |

All new template types added to both queue processors (`scheduler.ts::processEmailQueue` and `routes.ts` internal endpoint). `npm run check` — 0 errors.
