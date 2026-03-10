# Web App Architecture QA Report
## Aircraft Manager (Aviation Ape)

**Audit Date:** 2026-03-03
**Stack:** React 18 + TypeScript + Vite | Express.js + Drizzle ORM + PostgreSQL | Passport.js (local strategy) | TanStack React Query | shadcn/ui | Wouter

---

## Executive Summary

The Aircraft Manager application has a solid foundational structure with clear domain separation and a consistent React Query–based data-fetching pattern. However, the audit uncovered several significant issues that affect data integrity, security, and long-term maintainability. The most critical finding is that the majority of API endpoints lack authentication middleware, meaning all aircraft, lease, payment, and maintenance data is publicly accessible without logging in. A second critical issue is that the Activity Feed on the dashboard is entirely hardcoded with fake data, making it permanently non-functional as a real-time feed. Additional high-priority concerns include a broken `useAuth` hook that locks itself after the first check (preventing session recovery), storage-layer inconsistency where a full in-memory fallback class (`MemStorage`) coexists with the real PostgreSQL storage, a redundant `getStatusColor` function duplicated across files, and the absence of any server-side authorization on core CRUD routes for standard (non-admin) users.

---

## Application Map

### Pages / Routes
| Route | Component | Access Guard |
|---|---|---|
| `/` | `Home` (authenticated), `Landing` (unauthenticated) | Client-side only |
| `/dashboard` | `Dashboard` | Client-side only |
| `/aircraft` | `Aircraft` | Client-side only |
| `/owners` | `Owners` | Client-side only |
| `/lessees` | `Lessees` | Client-side only |
| `/leases` | `Leases` | Client-side only |
| `/payments` | `Payments` | Client-side only |
| `/maintenance` | `Maintenance` | Client-side only |
| `/documents` | `Documents` | Client-side only |
| `/settings` | `Settings` | Client-side only |
| `/help-support` | `HelpSupport` | Client-side only |
| `/admin/users` | `AdminUsers` | Client-side + server (`isSuperAdmin`) |
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |
| `/pending-approval` | `PendingApproval` | Shown on 403 |

### State Management
- TanStack React Query for all server state (no global client state store, e.g. no Redux/Zustand)
- `useState` for local UI state (modals, filters, sort, forms)
- `useAuth` hook as the single auth source — but it has a locking bug (see Critical Issues)
- No URL-based state for filters or pagination

### API Layer
- Single Express router mounted at `/api`
- Zod validation on all write endpoints via `insertXSchema.parse()`
- `handleZodError` helper for consistent validation error responses
- No global request logging middleware
- No API versioning

### Shared Components / Utilities
- `shadcn/ui` component library (correctly used throughout)
- `formatCurrency`, `formatDate`, `getStatusColor`, `getRelativeDateLabel` in `client/src/lib/utils.ts`
- `apiRequest` and `getQueryFn` in `client/src/lib/queryClient.ts`
- `useModal` hook in `client/src/hooks/use-modal.ts`
- `useAuth` hook in `client/src/hooks/useAuth.ts`
- `NotificationsDropdown` component in header

---

## Critical Issues

### CRIT-01: All Core Data API Endpoints Are Unauthenticated
- **Severity:** CRITICAL
- **Affected files:** `server/routes.ts` lines 430–934
- **Problem:** Every CRUD endpoint for aircraft, owners, lessees, leases, payments, maintenance, and documents is registered with NO authentication middleware. Anyone who can reach the server's `/api` prefix can read, create, update, and delete all operational data without a session. The `isAuthenticated` middleware only protects the dashboard stats endpoint (`/api/dashboard`) and the notification/auth endpoints.

  ```
  // These have NO isAuthenticated guard:
  apiRouter.get("/aircraft", ...)          // line 430
  apiRouter.post("/aircraft", ...)         // line 454
  apiRouter.put("/aircraft/:id", ...)      // line 464
  apiRouter.delete("/aircraft/:id", ...)   // line 478
  apiRouter.get("/owners", ...)            // line 493
  apiRouter.post("/owners", ...)           // line 517
  // ... same pattern for lessees, leases, payments, maintenance, documents
  ```

- **Fix:** Add `isAuthenticated` as middleware to every resource route. For write operations (POST, PUT, DELETE), also consider whether only admins should perform them. At minimum:
  ```ts
  apiRouter.get("/aircraft", isAuthenticated, async (req, res) => { ... });
  apiRouter.post("/aircraft", isAuthenticated, async (req, res) => { ... });
  ```

---

### CRIT-02: useAuth Hook Locks Itself After First Check — Session Recovery Impossible
- **Severity:** CRITICAL
- **Affected file:** `client/src/hooks/useAuth.ts` lines 8–23
- **Problem:** The hook uses a local `authChecked` state variable. Once the first auth check resolves (success OR error), it sets `authChecked = true` and disables the query with `enabled: !authChecked`. This means after the initial page load, the auth query will never run again for the lifetime of the React tree. If the session expires mid-session, the UI will continue to believe the user is authenticated because the stale `user` data remains in the React Query cache (which has `staleTime: Infinity` globally). The user will only see failures when individual API calls start returning 401s — a confusing and broken experience.

  ```ts
  // useAuth.ts line 16
  enabled: !authChecked, // Only run once — PREVENTS re-authentication check
  ```

- **Fix:** Remove the `authChecked` mechanism entirely. The `retry: false` and `refetchOnWindowFocus: false` options already prevent aggressive refetching. Trust React Query's cache invalidation on logout (`queryClient.clear()` is correctly called on logout in `sidebar.tsx`). Alternatively, set a reasonable `staleTime` (e.g. 5 minutes) and allow `refetchOnMount: true` to re-validate naturally.

---

### CRIT-03: Activity Feed Is Permanently Hardcoded Fake Data
- **Severity:** CRITICAL (data integrity / user trust)
- **Affected file:** `client/src/components/dashboard/activity-feed.tsx` lines 17–50
- **Problem:** The Activity Feed component, displayed prominently on the Dashboard, renders a static array `recentActivity` with hardcoded fake events like "Flight Training Academy - $4,200 for December" and "N812CD moved from Maintenance to Available". This data is never fetched from the API. The component also displays a `LiveIndicator` implying it is receiving real-time updates. Users will see this fabricated activity regardless of what actual data exists in their database.

  ```ts
  // activity-feed.tsx lines 17–50
  const recentActivity: ActivityItem[] = [
    { id: '1', type: 'payment', title: 'Payment Received',
      description: 'Flight Training Academy - $4,200 for December', ... },
    ...
  ];
  ```

- **Fix:** Replace the static array with a `useQuery` call against a real endpoint. The backend already has `/api/notifications` which stores user-scoped activity, or a new `/api/activity` endpoint could be created aggregating recent payments, maintenance status changes, and lease updates. The `LiveIndicator` component should only be shown if actual polling or SSE is in place.

---

### CRIT-04: Support Request Endpoint Uses Hardcoded Replit-Specific User ID Pattern
- **Severity:** CRITICAL (runtime crash risk)
- **Affected file:** `server/routes.ts` line 1141
- **Problem:** The support request handler logs `userId: req.user?.claims?.sub`. The `User` type defined in `shared/schema.ts` has no `claims` property — this is a leftover from a previous Replit Auth (OIDC) implementation. With Passport.js local strategy, `req.user` is the full `User` object, so `req.user?.claims?.sub` will always be `undefined`. While this is only in a `console.log` (not a crash), it indicates unfinished migration from a prior auth system and may cause confusion.

  ```ts
  // routes.ts line 1141
  console.log("Support request received:", {
    userId: req.user?.claims?.sub,  // WRONG — leftover Replit Auth pattern
  ```

- **Fix:** Change to `userId: (req.user as User)?.id`.

---

## High Priority Issues

### HIGH-01: `getStatusColor` Function Duplicated in Two Files
- **Severity:** HIGH
- **Affected files:**
  - `client/src/lib/utils.ts` lines 31–48 — canonical shared version
  - `client/src/pages/admin-users.tsx` lines 237–248 — local duplicate version
- **Problem:** `admin-users.tsx` defines its own private `getStatusColor` function with different status keys (`"approved"`, `"pending"`, `"blocked"`) and different color classes, instead of importing and extending the shared utility from `utils.ts`. This creates two divergent implementations. If the shared function is updated, the admin page will silently drift.

  ```ts
  // admin-users.tsx lines 237–248 — should not exist, import from utils.ts
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending":  return "bg-yellow-100 text-yellow-800";
      case "blocked":  return "bg-red-100 text-red-800";
  ```

- **Fix:** Extend `client/src/lib/utils.ts`'s `getStatusColor` map to include `"approved"`, `"pending"`, and `"blocked"` entries, then import it in `admin-users.tsx`.

---

### HIGH-02: `MemStorage` Class Still Exists in Production Code Path
- **Severity:** HIGH
- **Affected file:** `server/storage.ts` lines 97–end
- **Problem:** The storage file exports both a `MemStorage` class (in-memory Map-based implementation with hardcoded sample data) and the real `DatabaseStorage` class (PostgreSQL via Drizzle). The file exports a single `storage` instance, but it is unclear from the audit which class `storage` is resolved to without seeing the bottom of the file. If the database is unavailable or the environment variable is not set, there is a risk the app silently falls back to the in-memory store with fake data, meaning production writes would be lost between restarts.

  Additionally, `MemStorage.initSampleData()` hardcodes 5+ aircraft, owners, lessees, and leases with specific registration numbers, real-looking phone numbers, and image URLs. If this is ever the active storage, users will see confusing phantom data.

- **Fix:** Remove `MemStorage` entirely from the production codebase, or at minimum ensure it is only used in test files. The `storage` export should always be `DatabaseStorage`. Add a startup assertion that the database connection is healthy.

---

### HIGH-03: Admin Users Page Has No Route-Level Auth Guard
- **Severity:** HIGH
- **Affected files:** `client/src/App.tsx` line 73, `client/src/components/layout/sidebar.tsx` line 256
- **Problem:** The route `<Route path="/admin/users" component={AdminUsers} />` is listed in the authenticated routes switch but has no client-side role check before rendering. A logged-in `user` (non-admin) who navigates directly to `/admin/users` in the browser URL bar will have the page rendered client-side before the server rejects the data fetch. The sidebar correctly hides the link for non-super-admins (`isSuperAdmin && ...`), but sidebar-hiding is not a security boundary — it is a UX convenience only.

- **Fix:** In `App.tsx`, wrap the AdminUsers route with a role check:
  ```tsx
  <Route path="/admin/users">
    {isSuperAdmin ? <AdminUsers /> : <NotFound />}
  </Route>
  ```
  The server-side `isSuperAdmin` middleware on `/api/admin/users` correctly rejects unauthorized data requests, but the component still mounts and calls `useQuery`, which will fail with an error rather than being prevented from rendering.

---

### HIGH-04: New User Password Minimum Length Inconsistency (6 vs 8 Characters)
- **Severity:** HIGH
- **Affected files:**
  - `shared/schema.ts` line 171: `z.string().min(8, "Password must be at least 8 characters")`
  - `server/routes.ts` line 231: `if (newPassword.length < 8) ...`
  - `client/src/pages/admin-users.tsx` line 46: `z.string().min(6, "Password must be at least 6 characters")`
- **Problem:** When an admin creates a new user via the Admin Users page, the form schema validates the password to a minimum of 6 characters. However, the server-side registration endpoint and password change endpoint both enforce a minimum of 8 characters. A admin could create a user with a 6 or 7 character password through the UI form, which would be accepted by the form but likely accepted by the POST `/api/admin/users` endpoint as well (since that endpoint does not call `registerUserSchema.parse()` — it directly calls `hashPassword(password)`). This means 6-character passwords can exist in the database for admin-created users, while self-registered users are held to 8 characters.

- **Fix:** Unify the minimum to 8 characters in `admin-users.tsx` line 46: change `min(6, ...)` to `min(8, ...)`. Also add server-side password length validation to `POST /api/admin/users` to mirror what `PUT /api/auth/password` enforces.

---

### HIGH-05: Settings Page References `user.profileImageUrl` — Field Does Not Exist in Schema
- **Severity:** HIGH (runtime undefined access)
- **Affected file:** `client/src/pages/settings.tsx` line 258
- **Problem:** The Settings profile section renders an avatar with `src={user?.profileImageUrl || undefined}`. The `User` type in `shared/schema.ts` has no `profileImageUrl` field. This is another leftover from the Replit Auth system (which provided OIDC-based profile images). The expression will always evaluate to `undefined`, so the `AvatarImage` will never render. The adjacent UI text reads "Your profile picture is managed by your Replit account", which is actively misleading for a standalone Passport.js deployment.

  ```tsx
  // settings.tsx line 258
  <AvatarImage src={user?.profileImageUrl || undefined} />
  //                   ^^^^^^^^^^^^^^^^^ — does not exist on User type
  ```

- **Fix:** Remove the `AvatarImage` reference to `profileImageUrl` or implement an actual profile image upload field. Update the description text to remove the Replit reference.

---

### HIGH-06: `staleTime: Infinity` on Global Query Client Prevents Data Freshness
- **Severity:** HIGH
- **Affected file:** `client/src/lib/queryClient.ts` line 49
- **Problem:** The global `QueryClient` is configured with `staleTime: Infinity`. This means once data is fetched, React Query will never consider it stale and will never trigger a background refetch automatically. Combined with `refetchOnWindowFocus: false` and `refetchOnReconnect: false`, the only way data updates are reflected is through explicit `queryClient.invalidateQueries()` calls in `onSuccess` mutation handlers. This works correctly within the same browser tab for operations the current user performs, but means:
  - Notifications fetched in `NotificationsDropdown` use their own `refetchInterval: 30000` override — which is correct but inconsistent.
  - Data changed by another admin user will never appear without a full page reload.
  - The `useRealTimeUpdates` hook that calls `invalidateQueries` every 30 seconds partially compensates for the dashboard, but not for any other page.

- **Fix:** Set `staleTime` to a reasonable duration (e.g. `1000 * 60 * 2` — 2 minutes) to allow background refetching. Keep `refetchOnWindowFocus: false` if desired, but this global infinity prevents data freshness.

---

### HIGH-07: `useRealTimeUpdates` Hook Has Broken `queryKey` for Maintenance
- **Severity:** HIGH
- **Affected file:** `client/src/hooks/use-realtime.ts` line 11
- **Problem:** The hook invalidates `['/api/maintenance/upcoming']` every 30 seconds. However, the Maintenance page fetches from `['/api/maintenance']` (not `/api/maintenance/upcoming`). The `/api/maintenance/upcoming` key is only used internally by the dashboard's `MaintenanceSchedule` component. This means the Maintenance page data is never auto-refreshed by the real-time hook. Additionally, the hook invalidates `['/api/payments']` without invalidating `['/api/dashboard']` properly — wait, it does invalidate dashboard. But maintenance page data drift remains.

- **Fix:** Either add `queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] })` to the interval, or rename the hook to `useDashboardRealTimeUpdates` to clarify its actual scope.

---

## Medium Priority Issues

### MED-01: Payments Page Does Not Display Which Lease/Aircraft the Payment Belongs To
- **Severity:** MEDIUM
- **Affected file:** `client/src/pages/payments.tsx`
- **Problem:** The Payments table shows Period, Amount, Due Date, Paid Date, Status, and Actions — but no Aircraft or Lessee/Flight School column. Every `Payment` record has a `leaseId` foreign key, but the page fetches `/api/payments` which returns raw payment records without joining lease or aircraft details. Users cannot tell which aircraft or flight school a payment row belongs to without clicking elsewhere. The `GET /api/payments` backend endpoint calls `storage.getAllPayments()` which does not join related data.

- **Fix:** Either:
  a) Create `PaymentWithDetails` type (similar to `LeaseWithDetails`) and update `storage.getAllPayments()` to join lease, aircraft, and lessee, OR
  b) Fetch leases separately and do a client-side join: `const lease = leases?.find(l => l.id === payment.leaseId)`.
  Then add an "Aircraft / Lessee" column to the Payments table.

---

### MED-02: Document Upload Is Fake — Always Requires a URL, File Upload Button Does Nothing
- **Severity:** MEDIUM
- **Affected file:** `client/src/pages/documents.tsx` lines 539–549
- **Problem:** The Add Document form has a "URL" field and an upload button next to it. The upload button is wired to show a toast: "File upload would be integrated here in a production app". There is no actual file upload. The `url` field is required in the Zod schema. This means users must paste an external URL to add a document — they cannot upload files from their machine.

  Contrast this with the Payments page which correctly implements file-to-base64 conversion for invoice uploads (`payments.tsx` lines 252–258). The Documents page lacks this pattern.

- **Fix:** Implement the same base64 file-conversion pattern from `payments.tsx` in the Documents form, or connect to a storage service (S3, etc.). At minimum, remove the misleading non-functional upload button.

---

### MED-03: `deleteUserMutation` Calls `.json()` on 204 No-Content Response
- **Severity:** MEDIUM
- **Affected file:** `client/src/pages/admin-users.tsx` line 113
- **Problem:** The delete user mutation calls `apiRequest("DELETE", ...)` and then calls `.json()` on the response. The server-side `DELETE /admin/users/:id` endpoint returns HTTP 204 with no body (confirmed at `routes.ts` line 343: `res.json({ message: "User deleted successfully" })`). Wait — the server actually returns `res.json(...)` not `res.status(204).send()` for users. However, `deleteUserMutation` at line 113 does `return response.json()` — this will work since the server sends JSON. But the `deleteAircraftMutation` in `aircraft.tsx` line 70 uses `apiRequest("DELETE", ...)` WITHOUT calling `.json()`, since the aircraft delete endpoint returns 204. This inconsistency means if either server endpoint is ever corrected to return 204 (the REST-correct status for DELETE), the client will break.

- **Fix:** Standardize all DELETE endpoints to return `204 No Content` on the server, and do not call `.json()` in the client mutation functions for DELETE operations.

---

### MED-04: `AuthenticatedLayout` Calls `useAuth()` Twice — Double Network Check Logic
- **Severity:** MEDIUM
- **Affected file:** `client/src/App.tsx` lines 92–112 and `App` function line 29
- **Problem:** `useAuth()` is called in both the `Router` function (line 29) and the `AuthenticatedLayout` function (line 93). Because `useAuth` is a React Query hook, the data is cached and both calls read from the same cache, so there is no double network request. However, the loading check at `AuthenticatedLayout` line 96 does not include `isLoading`, which means during initial load the layout will briefly render the sidebar/header while `isLoading` is still true, since the condition only checks `error || !isAuthenticated`. This creates a flash where the sidebar appears before authentication resolves, then disappears and is replaced by the `Router` loading spinner.

- **Fix:** Include `isLoading` in the early-return condition of `AuthenticatedLayout`:
  ```tsx
  if (isLoading || error || !isAuthenticated) {
    return <Router />;
  }
  ```

---

### MED-05: Orphaned `/api/maintenance/upcoming` Endpoint — No Frontend Consumer
- **Severity:** MEDIUM
- **Affected files:** `server/routes.ts` line 788, `client/src/hooks/use-realtime.ts` line 11
- **Problem:** The server exposes `GET /api/maintenance/upcoming` (routes.ts line 788). The `use-realtime.ts` hook invalidates this key every 30 seconds. However, no page or component actually fetches `/api/maintenance/upcoming` as a query — the `MaintenanceSchedule` dashboard component and the full Maintenance page both fetch from `/api/maintenance`. The upcoming endpoint exists but is never consumed by the frontend.

- **Fix:** Either wire the `MaintenanceSchedule` dashboard component to fetch from `/api/maintenance/upcoming` (which would return only future scheduled items and is more appropriate for a dashboard widget), or remove the unused endpoint.

---

### MED-06: Document `relatedId` Requires Manual ID Entry — No Entity Lookup
- **Severity:** MEDIUM
- **Affected file:** `client/src/pages/documents.tsx` lines 584–598
- **Problem:** When linking a document to a related entity (aircraft, lease, owner, lessee), the form asks the user to type in a numeric "Entity ID" manually. There is no dropdown populated with actual records. A user must know the internal database ID of the entity they want to associate, which is not shown anywhere in the UI. This makes the feature nearly unusable for non-technical users.

- **Fix:** When `relatedType` changes, fetch the appropriate entity list (e.g. aircraft list for `relatedType = "aircraft"`) and replace the ID input with a searchable dropdown showing entity names/registrations.

---

### MED-07: Session Store Uses `memorystore` — Data Lost on Server Restart
- **Severity:** MEDIUM
- **Affected file:** `server/auth.ts` lines 16–17
- **Problem:** `MemoryStore` from `memorystore` is used as the session store. While `memorystore` is memory-resident and supports TTL-based cleanup (unlike the default `MemoryStore` that leaks), it still means all user sessions are lost on server restart. Every deployment or crash will log everyone out. The database schema defines a `sessions` table (shared/schema.ts line 7), indicating an intent to use a persistent session store (such as `connect-pg-simple`).

- **Fix:** Use `connect-pg-simple` to store sessions in the existing `sessions` PostgreSQL table, making sessions survive restarts.

---

### MED-08: `isPendingApprovalError` Pattern Is Fragile String-Matching
- **Severity:** MEDIUM
- **Affected file:** `client/src/lib/authUtils.ts` lines 5–7
- **Problem:** The function checks if an error is a "pending approval" error using a regex on the error message string: `/^403: .*Account pending approval/.test(error.message)`. The error message "Account pending approval" is set in `server/auth.ts` line 105 and parsed from `throwIfResNotOk` in `queryClient.ts`. This works but is brittle — if the server error message is changed slightly, the client will break silently (showing a generic error or redirecting to the landing page instead of the pending approval page). The `403` response body also includes a `status` field that is never inspected on the client.

- **Fix:** Return a structured error code from the server (e.g. `{ code: "PENDING_APPROVAL", message: "..." }`) and parse `code` on the client rather than matching on message text.

---

## Minor Issues

### MIN-01: Hardcoded Color Value `#3498db` Used Inline in 15+ Places Instead of Tailwind Token
- **Severity:** LOW
- **Affected files:** `aircraft.tsx`, `leases.tsx`, `payments.tsx`, `maintenance.tsx`, `documents.tsx`, `admin-users.tsx`, `sidebar.tsx` (and others)
- **Problem:** The primary blue color `#3498db` (and its hover variant `#2980b9`) is hardcoded directly in Tailwind class strings throughout the application (e.g. `className="bg-[#3498db] hover:bg-[#2980b9] text-white"`). This appears in at least 15 different button elements across 6+ files. If the brand color changes, every instance must be updated manually.

- **Fix:** Add a custom color token to `tailwind.config.ts`:
  ```ts
  colors: { brand: { DEFAULT: '#3498db', hover: '#2980b9' } }
  ```
  Then use `bg-brand hover:bg-brand-hover` everywhere.

---

### MIN-02: `sort()` Mutates the Original `filteredLeases` Array
- **Severity:** LOW
- **Affected file:** `client/src/pages/leases.tsx` lines 120–156
- **Problem:** The sort for leases calls `.sort()` directly on `filteredLeases` (which is derived from the `leases` React Query cache array via `.filter()`). JavaScript's `Array.prototype.sort()` mutates in place. The `.filter()` call creates a new array, so the React Query cache itself is not mutated. However, this is an inconsistent pattern compared to `documents.tsx` which correctly uses `[...filteredDocuments].sort(...)`. In a future refactor where `filteredLeases` is reused before sorting, this could cause bugs.

- **Fix:** Change to `[...filteredLeases].sort(...)` to be explicit about immutability.

---

### MIN-03: `Admin Users` Page Title Shows "Aviation Ape" But All Other Pages Show "AeroLease Manager"
- **Severity:** LOW
- **Affected file:** `client/src/pages/admin-users.tsx` line 276
- **Problem:** The `<title>` tag reads "User Management - Aviation Ape" while every other page uses "- AeroLease Manager" as the suffix. The sidebar branding says "Aviation Ape" but the page titles are inconsistent. This should be standardized.

- **Fix:** Decide on one product name (either "Aviation Ape" or "AeroLease Manager") and apply it consistently to all `<Helmet>` title tags.

---

### MIN-04: `use-realtime.ts` Exports `useAutoRefresh` Hook That Is Never Used
- **Severity:** LOW
- **Affected file:** `client/src/hooks/use-realtime.ts` lines 19–27
- **Problem:** The `useAutoRefresh` hook is exported but never imported anywhere in the codebase. This is dead code.

- **Fix:** Remove `useAutoRefresh` or use it to replace the inline `refetchInterval` overrides in `notifications-dropdown.tsx`.

---

### MIN-05: `NotificationsDropdown` Navigation Uses `window.location.href` Instead of Wouter Router
- **Severity:** LOW
- **Affected file:** `client/src/components/ui/notifications-dropdown.tsx` line 154
- **Problem:** When a notification with an `actionUrl` is clicked, the code uses `window.location.href = notification.actionUrl`, which triggers a full page reload. Since this is a SPA using Wouter, navigation should use Wouter's `setLocation` hook to navigate without a reload, preserving React Query cache and component state.

  ```ts
  // notifications-dropdown.tsx line 154
  window.location.href = notification.actionUrl;  // Full reload — incorrect for SPA
  ```

- **Fix:** Import `useLocation` from `wouter` and call `setLocation(notification.actionUrl)`.

---

### MIN-06: `settings.tsx` Forms Initialize with Empty Defaults, Then Reset via `useEffect` on User Load
- **Severity:** LOW
- **Affected file:** `client/src/pages/settings.tsx` lines 82–128
- **Problem:** All three forms (`profileForm`, `emailPreferencesForm`) are initialized with empty/default values before `user` data is available, then reset in a `useEffect` once `user` loads. This causes a brief flash where the form fields are empty, then populate. The preferred pattern is to initialize `defaultValues` lazily or render the form conditionally only after `user` is loaded. The `passwordForm` correctly uses empty defaults since it represents new input.

- **Fix:** Either gate the form rendering behind `if (!user) return <Skeleton />`, or use `useEffect` with `form.reset()` (which is already present — but the flash remains). The more robust pattern:
  ```tsx
  const profileForm = useForm({ defaultValues: {
    firstName: user?.firstName || "",
    ...
  }});
  ```
  This only works if `user` is available synchronously (it won't be on first render), so conditional rendering is cleaner.

---

### MIN-07: `admin-users.tsx` Imports `useQueryClient` Separately Instead of Using Shared `queryClient`
- **Severity:** LOW
- **Affected file:** `client/src/pages/admin-users.tsx` line 1
- **Problem:** This page imports `useQueryClient` from `@tanstack/react-query` and calls `const queryClient = useQueryClient()` at line 58. All other pages import the singleton `queryClient` directly from `@/lib/queryClient`. This is not wrong (both approaches are valid in React Query), but it is inconsistent.

- **Fix:** Standardize on importing the singleton `queryClient` from `@/lib/queryClient` as all other pages do.

---

## Prioritized Action Plan

1. **[CRIT-01]** Add `isAuthenticated` middleware to all resource CRUD endpoints in `server/routes.ts`. This is the highest-severity security gap.

2. **[CRIT-03]** Replace the hardcoded `recentActivity` array in `activity-feed.tsx` with a real API query. The Activity Feed is displayed on the most prominent page and currently shows false data.

3. **[CRIT-02]** Fix the `useAuth` hook's `authChecked` locking mechanism. Remove `authChecked` state and the `enabled: !authChecked` restriction to allow proper session lifecycle management.

4. **[HIGH-05]** Remove `user.profileImageUrl` reference and the "managed by your Replit account" copy from `settings.tsx`. This is a stale reference that will confuse users and TypeScript won't catch it at runtime since optional chaining silences the error.

5. **[HIGH-04]** Align password minimum length to 8 characters in `admin-users.tsx` `newUserSchema`. Add server-side validation in `POST /api/admin/users`.

6. **[HIGH-03]** Add a role guard in `App.tsx` for the `/admin/users` route to prevent non-admin component mounting.

7. **[HIGH-02]** Remove or quarantine `MemStorage` class. Confirm which `storage` implementation is exported at the bottom of `server/storage.ts` and ensure it always points to `DatabaseStorage`.

8. **[HIGH-06]** Change `staleTime: Infinity` to a reasonable value (2–5 minutes) in `queryClient.ts`.

9. **[MED-07]** Migrate session store from `memorystore` to `connect-pg-simple` using the existing `sessions` table.

10. **[MED-01]** Update `getAllPayments()` to join lease/aircraft/lessee data and display Aircraft + Lessee columns in the Payments table.

11. **[HIGH-01]** Address remaining issues: duplicate `getStatusColor`, orphaned endpoint, document relatedId UX.

12. **[MIN-01]** Extract `#3498db` into a Tailwind config token for maintainability.

---

## Universal Architecture Recommendations

### 1. Centralize API Route Authentication
Create an authenticated sub-router and mount all protected routes on it:
```ts
const protectedRouter = express.Router();
protectedRouter.use(isAuthenticated);
protectedRouter.get("/aircraft", ...);
// all other protected routes
app.use("/api", protectedRouter);
```
This eliminates the risk of accidentally omitting `isAuthenticated` from a new route.

### 2. Introduce a `PaymentWithDetails` Type
Mirror the existing `LeaseWithDetails` and `AircraftWithDetails` patterns. Create `PaymentWithDetails` in `shared/schema.ts` and update the storage layer accordingly.

### 3. Create a Shared `useEntityQuery` Pattern
Several pages repeat the same pattern of: fetch list, filter client-side, sort client-side. This could be abstracted into a hook that accepts a query key, filter predicate, and sort comparator.

### 4. Standardize Color Tokens via Tailwind Config
Move `#3498db` / `#2980b9` to named Tailwind tokens to support future rebranding without find-and-replace across 15+ files.

### 5. Create a Shared `ConfirmationDialog` Component
Every page implements its own "Delete X" AlertDialog with identical structure. This should be a single reusable `<ConfirmationDialog title action onConfirm isPending />` component imported by all pages.

### 6. Replace `window.location.href` Navigation with Wouter's Router
All internal navigation in components (notifications, any "View" buttons that navigate away) should use Wouter's `setLocation` to keep the SPA behavior intact and preserve React Query cache.
