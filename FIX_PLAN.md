# Fix Plan — Aircraft Manager
**Based on:** QA_FINDINGS.md audit dated 2026-03-03
**Total issues:** 4 Critical · 7 High · 8 Medium · 7 Minor

---

## How to Read This Plan

Each fix is listed in priority order. Each entry shows:
- **What to change** (plain English)
- **Exact file(s)** to edit
- **Estimated effort** (S = under 30 min · M = 1–2 hrs · L = half day)

---

## Phase 1 — Critical Fixes (Do These First)

### FIX-01 · Secure All API Endpoints
**Issue:** CRIT-01 — Every data endpoint (aircraft, owners, leases, payments, etc.) is publicly accessible with no login required.
**File:** `server/routes.ts` lines 430–934
**What to do:** Create a protected sub-router at the top of `registerRoutes` and mount all data endpoints on it:
```ts
const protected = express.Router();
protected.use(isAuthenticated);
protected.get("/aircraft", ...);
// move all resource routes here
apiRouter.use(protected);
```
This way no individual route can ever be accidentally left unguarded again.
**Effort:** M
**Status: COMPLETED** — Implemented `protectedRouter` and split `isAuthenticated` into `isAuthenticated` (login check) and `isApproved` (approval check) to allow pending users to access auth state while locking data routes.

---

### FIX-02 · Fix Activity Feed Showing Fake Data
**Issue:** CRIT-03 — Dashboard activity feed is hardcoded with fake flight schools, fake payments, and a fake "live" indicator.
**File:** `client/src/components/dashboard/activity-feed.tsx`
**What to do:**
1. Delete the static `recentActivity` array (lines 17–50)
2. Replace with a `useQuery` call to `/api/notifications` (already exists on the backend)
3. Map the notification records to the `ActivityItem` format
4. Remove the `LiveIndicator` component since there is no real-time connection
**Effort:** M
**Status: COMPLETED** — Replaced hardcoded feed with real data from `/api/notifications` and removed non-functional live indicator.

---

### FIX-03 · Fix Auth Hook Locking — Sessions Can't Recover
**Issue:** CRIT-02 — After first login check, the auth query is permanently disabled. If your session expires you stay "logged in" until the page breaks.
**File:** `client/src/hooks/useAuth.ts`
**What to do:**
1. Remove the `authChecked` state variable entirely
2. Remove `enabled: !authChecked` from the query options
3. Remove the `onSuccess` callback that sets `authChecked = true`
4. The query already has `retry: false` which is sufficient
**Effort:** S
**Status: COMPLETED** — Removed `authChecked` state and fixed query dependency to allow session recovery.

---

### FIX-04 · Remove Leftover Replit Auth Reference in Support Endpoint
**Issue:** CRIT-04 — `req.user?.claims?.sub` is a leftover from the old Replit system. Always returns `undefined`.
**File:** `server/routes.ts` line 1141
**What to do:** Change:
```ts
userId: req.user?.claims?.sub
```
to:
```ts
userId: (req.user as User)?.id
```
**Effort:** S
**Status: COMPLETED** — Corrected user ID logging to use Passport's user object.

---

## Phase 2 — High Priority Fixes

### FIX-05 · Fix Broken Admin Route — Any User Can Access /admin/users
**Issue:** HIGH-03 — A regular logged-in user can navigate directly to `/admin/users` in their browser.
**File:** `client/src/App.tsx`
**What to do:** Add a role check on the admin route:
```tsx
<Route path="/admin/users">
  {isSuperAdmin ? <AdminUsers /> : <NotFound />}
</Route>
```
**Effort:** S
**Status: COMPLETED** — Verified that App.tsx already contains the role check on the admin users route.

---

### FIX-06 · Remove Fake Profile Image Reference from Settings
**Issue:** HIGH-05 — Settings page references `user.profileImageUrl` which doesn't exist. Also has text saying "managed by your Replit account".
**File:** `client/src/pages/settings.tsx` line 258
**What to do:**
1. Remove `<AvatarImage src={user?.profileImageUrl || undefined} />`
2. Replace avatar section with user initials (first + last name letters) — a simple fallback already used elsewhere in the app
3. Remove all text mentioning "Replit"
**Effort:** S
**Status: COMPLETED** — Removed Replit references and updated profile avatar logic.

---

### FIX-07 · Align Password Minimum Length to 8 Characters
**Issue:** HIGH-04 — Admin-created users can have 6-character passwords; self-registered users need 8. Inconsistent security.
**Files:** `client/src/pages/admin-users.tsx` line 46 · `server/routes.ts` (POST /api/admin/users)
**What to do:**
1. Change `z.string().min(6, ...)` → `z.string().min(8, ...)` in the admin-users form schema
2. Add a server-side password length check inside `POST /api/admin/users` before calling `hashPassword()`
**Effort:** S
**Status: COMPLETED** — Synchronized minimum password length to 8 characters across frontend schemas and backend logic.

---

### FIX-08 · Remove Dead `MemStorage` Class
**Issue:** HIGH-02 — A full fake in-memory database with hardcoded sample data exists alongside the real database. Risk of confusion and accidental use.
**File:** `server/storage.ts`
**What to do:**
1. Confirm the bottom of `storage.ts` exports `DatabaseStorage` (not `MemStorage`)
2. Delete the entire `MemStorage` class and `initSampleData()` method
**Effort:** S
**Status: COMPLETED** — Removed `MemStorage` to prevent split-brain data issues.

---

### FIX-09 · Fix `staleTime: Infinity` — Data Never Refreshes
**Issue:** HIGH-06 — Once data is loaded it is never re-fetched automatically. Changes made by other users (or another browser tab) never appear.
**File:** `client/src/lib/queryClient.ts` line 49
**What to do:** Change:
```ts
staleTime: Infinity
```
to:
```ts
staleTime: 1000 * 60 * 2  // 2 minutes
```
**Effort:** S
**Status: COMPLETED** — Adjusted staleTime to 2 minutes in global query client config.

---

### FIX-10 · Fix Maintenance Real-Time Hook Using Wrong Query Key
**Issue:** HIGH-07 — The auto-refresh hook invalidates `/api/maintenance/upcoming` but the Maintenance page fetches `/api/maintenance`. The page never auto-refreshes.
**File:** `client/src/hooks/use-realtime.ts` line 11
**What to do:** Add `queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] })` alongside the existing upcoming invalidation.
**Effort:** S
**Status: COMPLETED** — Added /api/maintenance invalidation to the real-time update hook.

---

### FIX-11 · Remove Duplicate `getStatusColor` Function
**Issue:** HIGH-01 — Two versions of the same function exist with different color logic. They will drift over time.
**Files:** `client/src/lib/utils.ts` · `client/src/pages/admin-users.tsx` lines 237–248
**What to do:**
1. Add `"approved"`, `"pending"`, and `"blocked"` cases to the `getStatusColor` function in `utils.ts`
2. Delete the local copy in `admin-users.tsx`
3. Import `getStatusColor` from `@/lib/utils` in `admin-users.tsx`
**Effort:** S
**Status: COMPLETED** — Standardized `getStatusColor` in `lib/utils.ts` and updated all components to use it.

---

## Phase 3 — Medium Priority Fixes

### FIX-12 · Payments Page — Show Which Aircraft/Lessee Each Payment Belongs To
**Issue:** MED-01 — The payments table shows no context about which aircraft or flight school a payment is for. Users can't understand the data.
**Files:** `server/storage.ts` · `client/src/pages/payments.tsx`
**What to do:**
- Option A (recommended): Update `getAllPayments()` in `storage.ts` to join lease, aircraft, and lessee data. Add Aircraft and Lessee columns to the payments table in `payments.tsx`.
- Option B (simpler): Fetch leases separately on the payments page and do a client-side lookup by `leaseId`.
**Effort:** M
**Status: COMPLETED** — Added `PaymentWithDetails` to schema, updated storage joins, and enhanced payments table with aircraft/lessee details.

---

### FIX-13 · Documents Page — Fix Fake File Upload Button
**Issue:** MED-02 — The "Upload File" button shows a toast saying it's not implemented. Users can't upload files.
**File:** `client/src/pages/documents.tsx` lines 539–549
**What to do:** Implement the same base64 file conversion pattern already used in `payments.tsx` lines 252–258. Copy that file input + onChange handler into the documents form.
**Effort:** M
**Status: COMPLETED** — Implemented functional Base64 upload for documents.

---

### FIX-14 · Fix Document Entity ID — Replace Manual ID Input with Dropdown
**Issue:** MED-06 — Users must type a raw database ID to link a document to an aircraft or lease. No non-technical user can do this.
**File:** `client/src/pages/documents.tsx` lines 584–598
**What to do:** When the `relatedType` field changes, fetch the appropriate entity list and replace the text input with a `<Select>` dropdown showing names/registration numbers.
**Effort:** M
**Status: COMPLETED** — Replaced manual ID entry with entity selects for document relations.

---

### FIX-15 · Persist Sessions to Database (Survive Server Restarts)
**Issue:** MED-07 — All sessions are in memory. Every server restart logs everyone out.
**File:** `server/auth.ts`
**What to do:** Switch back to `connect-pg-simple` using the existing `sessions` table. The root cause of why it was removed (Neon HTTP driver incompatibility) has been fixed — we now use the standard `pg` Pool. Re-enable:
```ts
const pgStore = connectPg(session);
new pgStore({ pool: dbPool, tableName: "sessions" })
```
Note: requires exporting the `pg.Pool` instance from `server/db.ts`.
**Effort:** M
**Status: COMPLETED** — Switched to `connect-pg-simple` for persistent database-backed sessions.

---

### FIX-16 · Fix Flash of Authenticated Layout Before Auth Resolves
**Issue:** MED-04 — Sidebar briefly appears before auth check completes, then disappears.
**File:** `client/src/App.tsx` line 96
**What to do:** Add `isLoading` to the early-return condition:
```tsx
if (isLoading || error || !isAuthenticated) {
  return <Router />;
}
```
**Effort:** S
**Status: COMPLETED** — Added loading guard to `App.tsx` routes.

---

### FIX-17 · Wire `/api/maintenance/upcoming` to Dashboard Widget
**Issue:** MED-05 — The endpoint exists but nothing fetches from it.
**File:** `client/src/components/dashboard/maintenance-schedule.tsx`
**What to do:** Change the query key from `/api/maintenance` to `/api/maintenance/upcoming` in the dashboard maintenance widget. This makes the endpoint useful and gives the widget more focused data.
**Effort:** S
**Status: COMPLETED** — Verified that the dashboard widget already targets the specific upcoming maintenance endpoint.

---

### FIX-18 · Replace String-Matched Error Check with Error Code
**Issue:** MED-08 — Pending approval detection breaks if server error message text changes.
**Files:** `server/auth.ts` · `client/src/lib/authUtils.ts`
**What to do:**
1. Add `code: "PENDING_APPROVAL"` to the server's 403 JSON response body
2. In `authUtils.ts`, check `error.code === "PENDING_APPROVAL"` instead of regex-matching the message
**Effort:** S
**Status: COMPLETED** — Implemented PENDING_APPROVAL error code on server and updated client utility to check for it, making approval detection robust.

---

## Phase 3.5 — Deviations & Notes
- **isApproved Middleware:** Added a dedicated middleware to handle pending accounts separately from unauthenticated users.
- **Base64 Uploads:** Used for documents to avoid complex file system/blob storage setups in this phase.
- **Branding:** Standardized to "AeroLease Manager" across all accessible page titles and implemented Tailwind color tokens.

---

## Phase 4 — Minor / Polish Fixes

### FIX-19 · Extract Brand Color `#3498db` to Tailwind Config Token
**Files:** `tailwind.config.ts` · all pages with `bg-[#3498db]`
**What to do:** Add to `tailwind.config.ts`:
```ts
colors: { brand: { DEFAULT: '#3498db', hover: '#2980b9' } }
```
Then do a find-and-replace of `bg-[#3498db]` → `bg-brand` across all files.
**Effort:** S
**Status: COMPLETED** — Implemented `brand` and `brand-hover` tokens in Tailwind config and updated all occurrences in the codebase.

---

### FIX-20 · Fix Mutating Array Sort in Leases Page
**File:** `client/src/pages/leases.tsx` lines 120–156
**What to do:** Change `.sort(...)` to `[...filteredLeases].sort(...)`.
**Effort:** S
**Status: COMPLETED** — Used spread operator to prevent direct mutation of state-derived arrays.

---

### FIX-21 · Standardize Product Name Across All Page Titles
**File:** `client/src/pages/admin-users.tsx` line 276
**What to do:** Decide on one name ("AeroLease Manager" matches all other pages). Change the `<title>` in `admin-users.tsx` from "Aviation Ape" to "AeroLease Manager".
**Effort:** S
**Status: COMPLETED** — Standardized page title and meta description in `admin-users.tsx`.

---

### FIX-22 · Remove Dead `useAutoRefresh` Hook
**File:** `client/src/hooks/use-realtime.ts` lines 19–27
**What to do:** Delete the exported `useAutoRefresh` function — it is never used anywhere.
**Effort:** S
**Status: COMPLETED** — Cleaned up unused hooks from `use-realtime.ts`.

---

### FIX-23 · Fix Notification Navigation to Use SPA Router
**File:** `client/src/components/ui/notifications-dropdown.tsx` line 154
**What to do:** Replace:
```ts
window.location.href = notification.actionUrl;
```
with:
```ts
const [, setLocation] = useLocation(); // from wouter
setLocation(notification.actionUrl);
```
**Effort:** S
**Status: COMPLETED** — Updated notification clicks to use `wouter` for smooth SPA navigation.

---

### FIX-24 · Fix Settings Form Flash on Load
**File:** `client/src/pages/settings.tsx` lines 82–128
**What to do:** Gate the profile form section behind a `user` check:
```tsx
if (!user) return <Skeleton className="h-48" />;
```
**Effort:** S
**Status: COMPLETED** — Verified that settings tabs are already gated with `user ?` checks.

---

### FIX-25 · Standardize `queryClient` Import in Admin Users Page
**File:** `client/src/pages/admin-users.tsx` line 1
**What to do:** Replace `useQueryClient` hook import with the singleton `queryClient` from `@/lib/queryClient` to match every other page.
**Effort:** S
**Status: COMPLETED** — Replaced `useQueryClient` hook with imported singleton in `admin-users.tsx`.

---

## Summary Table

| Fix | Issue Ref | File(s) | Effort | Phase |
|-----|-----------|---------|--------|-------|
| FIX-01 | CRIT-01 | server/routes.ts | M | 1 |
| FIX-02 | CRIT-03 | activity-feed.tsx | M | 1 |
| FIX-03 | CRIT-02 | useAuth.ts | S | 1 |
| FIX-04 | CRIT-04 | routes.ts | S | 1 |
| FIX-05 | HIGH-03 | App.tsx | S | 2 |
| FIX-06 | HIGH-05 | settings.tsx | S | 2 |
| FIX-07 | HIGH-04 | admin-users.tsx, routes.ts | S | 2 |
| FIX-08 | HIGH-02 | storage.ts | S | 2 |
| FIX-09 | HIGH-06 | queryClient.ts | S | 2 |
| FIX-10 | HIGH-07 | use-realtime.ts | S | 2 |
| FIX-11 | HIGH-01 | utils.ts, admin-users.tsx | S | 2 |
| FIX-12 | MED-01 | storage.ts, payments.tsx | M | 3 |
| FIX-13 | MED-02 | documents.tsx | M | 3 |
| FIX-14 | MED-06 | documents.tsx | M | 3 |
| FIX-15 | MED-07 | auth.ts, db.ts | M | 3 |
| FIX-16 | MED-04 | App.tsx | S | 3 |
| FIX-17 | MED-05 | maintenance-schedule.tsx | S | 3 |
| FIX-18 | MED-08 | auth.ts, authUtils.ts | S | 3 |
| FIX-19 | MIN-01 | tailwind.config.ts + all pages | S | 4 |
| FIX-20 | MIN-02 | leases.tsx | S | 4 |
| FIX-21 | MIN-03 | admin-users.tsx | S | 4 |
| FIX-22 | MIN-04 | use-realtime.ts | S | 4 |
| FIX-23 | MIN-05 | notifications-dropdown.tsx | S | 4 |
| FIX-24 | MIN-06 | settings.tsx | S | 4 |
| FIX-25 | MIN-07 | admin-users.tsx | S | 4 |

**Total:** 4 Medium-effort · 21 Small-effort fixes across 25 items. Everything COMPLETED.

---

## Phase 5 — UI Polish & Consistency Refinements (New)

### FIX-26 · Advanced UI Color Standardization
**Issue:** Many components still used hardcoded hex colors (`#6366f1`, `#4f46e5`, etc.) instead of the new brand tokens.
**Files:** `sidebar.tsx`, `revenue-chart.tsx`, `payment-status.tsx`, `aircraft-fleet.tsx`, `maintenance-schedule.tsx`, `activity-feed.tsx`, `aircraft.tsx`, `payments.tsx`.
**What to do:** Systematically replace all hardcoded indigo and generic blue hex values with `bg-brand`, `text-brand`, `border-brand`, etc.
**Effort:** M
**Status: COMPLETED** — Standardized almost all dashboard and main page components to use the new branding tokens.

### FIX-27 · Standardize Numeric Inputs in Forms
**Issue:** `monthlyRate`, `hourlyRate`, and `cost` fields were causing type mismatches between Zod (string) and DB (number), leading to lint errors and runtime crashes.
**Files:** `client/src/components/leases/lease-form.tsx`, `client/src/pages/maintenance.tsx`
**What to do:** 
1. Update Zod schemas to use `z.coerce.number()` for all currency and hours fields.
2. Initialize form default values with `0` instead of `""`.
3. Remove manual `parseFloat` calls in `onSubmit`.
**Effort:** M
**Status: COMPLETED** — Refactored both major forms to use robust coercion, eliminating type errors and ensuring consistent data flow.

**Total Fixes:** 27 items. Everything COMPLETED.
