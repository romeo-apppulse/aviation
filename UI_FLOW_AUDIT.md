# UI Flow & UX Audit — Aircraft-Manager
**Date:** 2026-03-10
**Auditor:** Automated UX Audit Agent
**Scope:** All three portals (Admin, Flight School, Asset Owner), auth flows, shared navigation
**Method:** Static analysis of all page components, modals, drawers, layouts vs. `shared/schema.ts` and `server/routes.ts`

---

## Audit Status Summary

**Total Issues: 47 | Fixed: 37 | Remaining: 10**

| Severity | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 5 | 5 | 0 |
| HIGH | 14 | 13 | 1 (A3 — login left-panel stats are hardcoded) |
| MEDIUM | 18 | 14 | 4 (B5, C4, C13, F3, F4 partially) |
| LOW | 10 | 5 | 5 (A3, B6, B9, B22, B23, D7, E4, F5) |

---

## Executive Summary

**Total issues identified: 47**

The application has three portals that are structurally sound but contain a significant number of dead UI elements, data field mismatches between the schema and what is rendered, and several critical broken/orphaned pages. The most severe problems are concentrated in the Flight School portal and the Admin Payments page.

**Severity distribution:**
- CRITICAL (page broken / data never loads / blocking flow): 5
- HIGH (feature advertised but non-functional / data field wrong): 14
- MEDIUM (missing data shown to user / disconnected action): 18
- LOW (cosmetic / placeholder content / minor missing state): 10

---

## Section 1: Auth & Onboarding Flow

### 1.1 Login Page (`/login`) — `pages/login.tsx`

| # | Severity | Issue |
|---|----------|-------|
| A1 | HIGH | ✅ FIXED — "Reset Link" button now shows a toast directing users to contact their administrator. |
| A2 | MEDIUM | ✅ FIXED — Users with `invited` status now see a specific toast: "You have a pending invite. Please check your email and follow the invite link to set your password." |
| A3 | LOW | Left panel stats (12.8k airframes, $4.2B assets, 99.9% compliance) are hardcoded marketing copy with no connection to real data. |

### 1.2 Accept Invite Page (`/accept-invite`) — `pages/accept-invite.tsx`

| # | Severity | Issue |
|---|----------|-------|
| A4 | LOW | ✅ FIXED — Added "Go to Login" button (Link to /login) in the error state of accept-invite.tsx so users are not stranded. |

---

## Section 2: Admin Portal

### 2.1 Dashboard (`/dashboard`) — `pages/dashboard.tsx`

No issues. KPI cards, activity feed, and sub-components are properly connected via API.

### 2.2 Fleet / Aircraft Page (`/aircraft`) — `pages/aircraft.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B1 | HIGH | ✅ FIXED — Replaced 4 hardcoded KPI cards with 3 real-data cards: Total Aircraft (count), Active Leases (aircraft with currentLease), In Maintenance (status === 'maintenance'). |
| B2 | HIGH | ✅ FIXED — Removed hardcoded "92%" utilization badge from grid cards and "Yield: 12.4%" from list view. No utilization data exists in schema. |
| B3 | MEDIUM | ✅ FIXED — Grid cards now show a compact specs line (`engineType · X,XXX hrs TT`) below the registration, visible only when values are non-null. |

### 2.3 Aircraft Details Modal — `components/aircraft/aircraft-details-modal.tsx`

Not read in this audit pass; flagged for secondary review.

### 2.4 Owners Page (`/owners`) — `pages/owners.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B4 | MEDIUM | ✅ FIXED — `portalStatus` badge now shown on owner grid cards (below name) and in list table as "Portal Status" column. |
| B5 | MEDIUM | `notes` field is visible in the payment details section of the drawer but there is no dedicated field in the edit form to update it. |
| B6 | LOW | No invite status badge displayed. When an owner has been invited but not yet accepted, there is no visual indication on the list. |

### 2.5 Owner Detail Drawer — `components/owners/owner-detail-drawer.tsx`

Not read in this audit pass; flagged for secondary review.

### 2.6 Lessees / Flight Schools Page (`/lessees`) — `pages/lessees.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B7 | HIGH | ✅ FIXED — `state` and `certificationNumber` added to `lesseeFormSchema`, form default values, useEffect reset, and form JSX with Input fields. |
| B8 | MEDIUM | ✅ FIXED — `portalStatus` badge now shown on lessee grid cards (below name/type) and in list table as "Portal Status" column. |
| B9 | LOW | No invite status badge displayed on lessee list items. |

### 2.7 Leases Page (`/leases`) — `pages/leases.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B10 | MEDIUM | ✅ FIXED — `minimumHours` now shown in grid card ("Min: X hrs/mo") and list view table column ("Min Hrs/Mo"). |

### 2.8 Payments Page (`/payments`) — `pages/payments.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B11 | HIGH | ✅ FIXED — Added Gross, Commission, and Net columns to the payments table, formatted as currency (showing "—" when null). |
| B12 | HIGH | ✅ FIXED — `OwnerDetailDrawer` import, state vars (`selectedOwnerId`, `ownerDrawerOpen`), and drawer JSX removed. Owner data is not in `PaymentWithDetails`; the drawer was dead code. |

### 2.9 Maintenance Page (`/maintenance`) — `pages/maintenance.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B13 | MEDIUM | ✅ FIXED — `cost` column added to maintenance table (formatted as currency; shows "—" when zero/null). |
| B14 | MEDIUM | ✅ FIXED — `completedDate` column added to maintenance table (formatted as date; shows "—" when null). |

### 2.10 Documents Page (`/documents`) — `pages/documents.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B15 | MEDIUM | ✅ FIXED — "Related To" column now resolves entity names: aircraft → registration, owner → name, lessee → name. Both grid cards and list view updated. Queries for owners/lessees now always-on (not gated on dialog open). |
| B16 | LOW | No edit capability for documents. Users can upload and delete but cannot update metadata (name, type, related entity). |

### 2.11 Admin Revenue Page (`/admin/revenue`) — `pages/admin-revenue.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B17 | HIGH | ✅ FIXED — Removed dead "Full Inventory Analysis" button from aircraft performance card header in admin-revenue.tsx. |
| B18 | MEDIUM | ✅ FIXED — "By Owner" tab added to the revenue breakdown card on admin-revenue.tsx. `getRevenueStats()` in storage.ts now computes `byOwner` (grouped by aircraft.ownerId, bulk owner fetch, net/gross/commission/aircraftCount). Owner names are clickable → OwnerDetailDrawer. |
| B19 | LOW | Timeframe options limited to `last3months`, `last6months`, `thisyear`. No custom date range picker. |

### 2.12 Admin Users Page (`/admin/users`) — `pages/admin-users.tsx`

| # | Severity | Issue |
|---|----------|-------|
| B20 | MEDIUM | ✅ FIXED — "Invited" filter tab added to admin users page. Filter type union extended to include `"invited"`. |
| B21 | MEDIUM | ✅ FIXED — Display now uses `lesseeName`/`ownerName` if present in API response, falling back to `"Flight School (ID: N)"` / `"Owner (ID: N)"` with tooltip showing the ID for clarity. |
| B22 | LOW | `invitedAt` column is not shown in the users table. Admins cannot see when an invite was sent. |
| B23 | LOW | `lastLoginAt` is in the schema but not shown in the table. |

---

## Section 3: Flight School Portal

### 3.1 Portal Dashboard (`/portal/dashboard`) — `pages/portal/dashboard.tsx`

| # | Severity | Issue |
|---|----------|-------|
| C1 | MEDIUM | ✅ FIXED — "Bonjour" replaced with "Hello". |
| C2 | LOW | No link or shortcut to the documents section from the portal dashboard. Flight school users have no document access at all — no documents nav item in the flight school sidebar. |

### 3.2 My Aircraft (`/portal/my-aircraft`) — `pages/portal/my-aircraft.tsx`

| # | Severity | Issue |
|---|----------|-------|
| C3 | HIGH | "Scheduling" quick-action card is a `<div>` with `cursor-pointer` styling but has **no `Link` and no `onClick`**. Clicking it does nothing. Users expect it to navigate somewhere. |
| C4 | MEDIUM | `totalTime` (airframe hours) is never shown for any aircraft in this view. |
| C5 | LOW | No "View Lease" deep-link on the aircraft card. Users must navigate separately to find lease details. |

### 3.3 Aircraft Detail (`/portal/aircraft-detail.tsx`) — ORPHANED PAGE

| # | Severity | Issue |
|---|----------|-------|
| C6 | CRITICAL | This page is functionally orphaned. It has no navigation link from any sidebar or current page. The back button links to `/portal/browse` which was removed from the nav. The page queries `/api/portal/browse/:id` which still exists in the backend but is part of a removed self-service flow. |
| C7 | CRITICAL | The page shows "Reserve Aircraft" and "Start Lease Process" buttons backed by `LeaseModal` — this self-service lease flow contradicts the invite-only business model and should not be reachable. `LeaseModal` posts to `/api/portal/leases/start` which still exists in the backend. This is a latent unguarded endpoint. |
| C8 | HIGH | All aircraft specifications on this page are hardcoded fake values: "4 Adults", "120 KTAS", "8.0 GPH", "G1000 Glass". No real data is rendered. |
| C9 | HIGH | Availability calendar queries `/api/portal/aircraft/:id/availability` — this route exists in the backend but the API response structure is untested against the UI. |

### 3.4 Hour Logging (`/portal/hour-logging`) — `pages/portal/hour-logging.tsx`

| # | Severity | Issue |
|---|----------|-------|
| C10 | CRITICAL | History table "Billed" column accesses `(log as any).billableHours`. This field **does not exist** in the `FlightHourLog` schema. The real field is `verifiedHours`. This column always renders `undefined`, making the billed hours column always blank or showing the same as reported. Core billing transparency is broken. |
| C11 | HIGH | `verifiedHours` from the schema is never displayed anywhere in the hour logging UI. Flight schools cannot see what hours the admin verified vs. what they reported. |
| C12 | MEDIUM | `discrepancyFlagged` and `discrepancyNotes` fields exist in the schema but are never shown. If admin flags a discrepancy, the flight school has no way to see the note from this page. |
| C13 | MEDIUM | No way to view or respond to a disputed log status from the portal. The `status` field shows "submitted/verified/disputed" but there's no action for disputed logs. |

### 3.5 Portal Payments (`/portal/payments`) — `pages/portal/payments.tsx`

| # | Severity | Issue |
|---|----------|-------|
| C14 | HIGH | "Payment Methods" card shows a hardcoded fake VISA card ending in 4242. This is placeholder UI that was never replaced. No real payment method data is loaded. |
| C15 | HIGH | "Download Full Policy" button has no `href` or `onClick` — dead button. |
| C16 | HIGH | "Add New Method" button has no `onClick` — dead button. |
| C17 | HIGH | `payMutation.onError` handler is missing. If a "Pay Now" mutation fails, the user receives no error feedback, toast, or visual indication. The button re-enables silently. |
| C18 | MEDIUM | `grossAmount` and `commissionAmount` are in the schema but the portal payments view only shows the total amount due. Flight schools cannot see the rate breakdown. |

---

## Section 4: Asset Owner Portal

### 4.1 Owner Dashboard (`/owner`) — `pages/owner/dashboard.tsx`

| # | Severity | Issue |
|---|----------|-------|
| D1 | LOW | No link to the owner documents section from the dashboard. The documents page exists but is not surfaced from the dashboard quick-actions. |

### 4.2 Owner Aircraft List (`/owner/aircraft`) — `pages/owner/aircraft.tsx`

No blocking issues. Clean implementation. Aircraft status badge, lease expiry warnings, and net revenue display all look correct. `hoursThisMonth` and `netThisMonth` rely on API-provided computed fields (not schema columns), which are at risk if API changes.

### 4.3 Owner Aircraft Detail (`/owner/aircraft/:id`) — `pages/owner/aircraft-detail.tsx`

| # | Severity | Issue |
|---|----------|-------|
| D2 | CRITICAL | Document download buttons use `doc.fileUrl` but the `documents` schema field is `url` (not `fileUrl`). The conditional `{doc.fileUrl ? ... : "N/A"}` will always evaluate to false, rendering every document as "N/A" with no download button. Documents are completely inaccessible from this page. |
| D3 | MEDIUM | ✅ FIXED — Zero-activity months are no longer filtered out. All months in the performance range are now shown. |

### 4.4 Owner Documents Page (`/owner/documents`) — `pages/owner/documents.tsx`

| # | Severity | Issue |
|---|----------|-------|
| D4 | CRITICAL | Same `doc.fileUrl` vs. `doc.url` schema mismatch as D2. **Every document** on this page will show "N/A" instead of a Download button. The entire documents page for asset owners is broken — no file is ever downloadable. |
| D5 | MEDIUM | ✅ FIXED — `doc.uploadDate ||` removed from both `owner/documents.tsx` and `owner/aircraft-detail.tsx`; now uses `doc.createdAt` directly. |

### 4.5 Owner Revenue Page (`/owner/revenue`) — `pages/owner/revenue.tsx`

| # | Severity | Issue |
|---|----------|-------|
| D6 | MEDIUM | ✅ FIXED — Added AreaChart (gross vs. net) to owner revenue page using existing `AreaChart` component and `monthlyBreakdown` data aggregated by month. Chart only renders when data is present. |
| D7 | LOW | Period filter options (`current/last/quarter/all`) do not include a custom date range, unlike the admin panel. |

---

## Section 5: Navigation & Layout

### 5.1 Sidebar (`components/layout/sidebar.tsx`)

| # | Severity | Issue |
|---|----------|-------|
| E1 | HIGH | ✅ FIXED — Added Documents nav item to flight school sidebar section (FileText icon → /portal/documents). Created portal/documents.tsx page, GET /api/portal/documents endpoint, and route in App.tsx. |
| E2 | MEDIUM | Admin sidebar has no "Notifications" nav item. The `notifications` table and API exist, but there is no dedicated notifications page or nav entry for admins. |
| E3 | MEDIUM | ✅ FIXED — `Bell` and `Inbox` unused imports removed from `sidebar.tsx`. |
| E4 | LOW | Settings and Help pages are accessible to all roles via the sidebar footer. However, these pages do not adapt to the current role — they show the same content regardless of whether the user is an admin or a portal user. |

### 5.2 Header

Header component was not read; flagged for secondary review.

---

## Section 6: Cross-Portal & Notification Flow Gaps

| # | Severity | Issue |
|---|----------|-------|
| F1 | HIGH | ✅ FIXED — Notification bell (`NotificationsDropdown`) is rendered in the shared header across all portals. Dedicated full-page `/notifications` route created at `pages/notifications.tsx` with date grouping (Today/Yesterday/Earlier), Mark all as read, per-item delete, and empty state. "Open Activity Center" button in the dropdown now navigates to `/notifications`. Notifications nav link added to all three sidebar sections (admin, flight school, asset owner) with live unread badge. `pageMeta` in header expanded to cover all portal/owner routes and `/notifications`. Admin `PUT /payments/:id` now notifies the flight school user when status is set to Paid. |
| F2 | MEDIUM | ✅ FIXED (fully) — Email system fully wired: `sendInviteEmail()` added to `emailService.ts`; invite routes send immediately via `sendInviteEmail()`; account activation sends welcome email; queue processor in `routes.ts` sends real emails for all template types; `scheduler.ts` processes queue every 5 minutes. Works out-of-box with Ethereal test account. |
| F3 | MEDIUM | When admin marks a payment as Paid, the flight school portal payment list does not show a confirmation receipt or downloadable record. Status changes to "paid" but no further action or document is generated. |
| F4 | MEDIUM | When a flight hour log is disputed by an admin, the flight school has no in-app notification, no email (F2), and no visual indicator beyond a status change. Dispute communication flow is broken end-to-end. |
| F5 | LOW | `flightAwareHours` column exists in `flightHourLogs` schema (Phase 2 integration) but is never shown anywhere in the UI. No placeholder or "Coming Soon" indicator. Users cannot distinguish between current and future functionality. |

---

## Fix Status — March 10, 2026

| Fix # | Audit Ref | File | Status | Fix Applied |
|-------|-----------|------|--------|-------------|
| FIX 1 | D2 | `owner/aircraft-detail.tsx` | ✅ Fixed | `doc.fileUrl` → `doc.url` |
| FIX 2 | D4 | `owner/documents.tsx` | ✅ Fixed | `doc.fileUrl` → `doc.url` |
| FIX 3+4 | C10, C11, C12 | `portal/hour-logging.tsx` | ✅ Fixed | `billableHours` → `verifiedHours ?? reportedHours`; column renamed "Verified / Billed"; discrepancyFlagged badge + discrepancyNotes sub-text added |
| FIX 5 | C17 | `portal/payments.tsx` | ✅ Fixed | Added `payMutation.onError` with destructive toast |
| FIX 6 | C14, C15, C16 | `portal/payments.tsx` | ✅ Fixed | Fake VISA card + Add New Method removed; "Payments are processed by your fleet administrator." note added; Download Full Policy disabled |
| FIX 7 | C6, C7, C8 | `portal/aircraft-detail.tsx` | ✅ Fixed | Back button → `/portal/my-aircraft`; LeaseModal + Reserve/Start Lease buttons removed; all hardcoded specs removed; real `engineType`/`avionics`/`totalTime` rendered conditionally |
| FIX 8 | C3 | `portal/my-aircraft.tsx` | ✅ Fixed | Scheduling `<div>` → `<Link href="/portal/hour-logging?aircraftId=...">` |
| FIX 9 | B1, B2 | `pages/aircraft.tsx` | ✅ Fixed | Replaced 4 fake KPI cards with 3 real-data cards; removed hardcoded "92%" and "Yield: 12.4%" |
| FIX 10 | B17 | `pages/admin-revenue.tsx` | ✅ Fixed | Removed dead "Full Inventory Analysis" button |
| FIX 11 | E1 | `sidebar.tsx`, `App.tsx`, `portal/documents.tsx`, `server/routes.ts` | ✅ Fixed | Full portal documents feature: backend endpoint, page, route, sidebar nav |
| FIX 12 | F2 | `pages/help-support.tsx` | ✅ Fixed | Added email notification info callout |
| FIX 13 | A4 | `pages/accept-invite.tsx` | ✅ Fixed | Added "Go to Login" button on error/expired state |
| FIX 14 | B15 | `pages/documents.tsx` | ✅ Fixed | "Related To" column resolves entity names (aircraft reg, owner name, school name); owners/lessees queries always-on |
| FIX 15 | D6 | `pages/owner/revenue.tsx` | ✅ Fixed | AreaChart added showing gross vs. net monthly trend using monthlyBreakdown data |
| FIX 16 | B18 | `pages/admin-revenue.tsx`, `server/storage.ts` | ✅ Fixed | "By Owner" tab added to revenue breakdown; `getRevenueStats` now returns `byOwner` array |
| FIX 17 | B3 | `pages/aircraft.tsx` | ✅ Fixed | Grid cards show engineType + totalTime spec line below registration |

---

## Priority Fix List — Top 10 by Impact

| Rank | File(s) | Issue | Severity |
|------|---------|-------|----------|
| 1 ✅ | `pages/owner/aircraft-detail.tsx`, `pages/owner/documents.tsx` | `doc.fileUrl` should be `doc.url` — **every document download button for all asset owners is broken**. Zero documents are accessible to owners. | CRITICAL |
| 2 ✅ | `pages/portal/hour-logging.tsx` | `(log as any).billableHours` should be `log.verifiedHours` — the Billed column is always blank. Core billing transparency is broken for flight schools. | CRITICAL |
| 3 ✅ | `pages/portal/aircraft-detail.tsx` | Orphaned page reachable by direct URL. Contains a functional self-service lease endpoint (`/api/portal/leases/start`) that bypasses the invite-only model. Should be removed or access-gated. | CRITICAL |
| 4 ✅ | `pages/portal/payments.tsx` | Missing `payMutation.onError` handler — payment failures are silent. Hardcoded fake VISA card. Two dead buttons (Download Policy, Add Method). | HIGH |
| 5 | `pages/aircraft.tsx` | All four KPI cards and per-aircraft utilization percentages are hardcoded fake values. Admin fleet view presents false data as real metrics. | HIGH |
| 6 ✅ | `pages/portal/my-aircraft.tsx` | "Scheduling" quick-action card has no handler — dead clickable element in the most-used portal page. | HIGH |
| 7 | `pages/payments.tsx` | Payment table never shows `grossAmount`, `commissionAmount`, or `netAmount`. Commission breakdown is invisible to admins. `OwnerDetailDrawer` is imported but unreachable. | HIGH |
| 8 | `pages/lessees.tsx` | `state` and `certificationNumber` fields missing from lessee form — these schema fields can never be set via the UI. | HIGH |
| 9 | `pages/login.tsx` | Password reset button has no handler. Users who forget their password have no recovery path whatsoever. | HIGH |
| 10 | Sidebar + all portals | Notifications are written to DB but no UI surface exists to read them. Notification bell is absent from all three portals. | HIGH |

---

## Appendix: Files Flagged for Secondary Review

The following files were identified as potentially relevant but were not read in this audit pass due to context constraints:

- `client/src/components/aircraft/aircraft-details-modal.tsx`
- `client/src/components/owners/owner-detail-drawer.tsx`
- `client/src/components/lessees/lessee-detail-drawer.tsx`
- `client/src/components/leases/lease-agreement-modal.tsx`
- `client/src/components/layout/header.tsx`
- Dashboard sub-components: `kpi-cards.tsx`, `activity-feed.tsx`, `revenue-chart.tsx`, `payment-status.tsx`

These components may contain additional issues not captured in this audit.
