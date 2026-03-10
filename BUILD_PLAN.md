# BUILD_PLAN.md
# AeroLease Wise — Full Platform Enhancement Plan
# Version 2.0 — Post Client Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [The Three Portals](#3-the-three-portals)
4. [Universal Entity Linking — The Core Problem](#4-universal-entity-linking--the-core-problem)
5. [Database Changes](#5-database-changes)
6. [Admin Portal — Full Interconnected Map](#6-admin-portal--full-interconnected-map)
7. [Flight School Portal](#7-flight-school-portal)
8. [Asset Owner Portal](#8-asset-owner-portal)
9. [Invite Flow (Replacing Self-Registration)](#9-invite-flow-replacing-self-registration)
10. [Automated Notifications & Email System](#10-automated-notifications--email-system)
11. [Minimum Hours Logic](#11-minimum-hours-logic)
12. [FlightAware Integration (Phase 2)](#12-flightaware-integration-phase-2)
13. [API Routes — Full Map](#13-api-routes--full-map)
14. [Frontend Routing — Full Map](#14-frontend-routing--full-map)
15. [Implementation Sequence](#15-implementation-sequence)
16. [Files Changed vs Created](#16-files-changed-vs-created)
17. [Verification Checklist](#17-verification-checklist)

---

## 1. Executive Summary

### What the Client Confirmed

- **Remove** self-service school registration — admin creates all profiles manually
- **Remove** browse/discover fleet from school portal — schools only see their own leased aircraft
- **Remove** self-service lease initiation — admin creates all leases
- **Add** asset owner portal — informational only (no financial transactions)
- **Add** invite-by-email flow for both flight schools and asset owners
- **Add** minimum hours logic on hour logging
- **Add** lease expiry notifications (to admin)
- **Add** monthly summary emails to asset owners
- **Keep** simulated payments (no Stripe for now)
- **FlightAware** integration deferred to Phase 2

### The Core Missing Feature: Everything Is Siloed

Right now, admins can view owners, aircraft, leases, lessees, and payments in separate pages but **cannot navigate between them**. If you're on the Owners page looking at "Delta Aviation Group" you cannot click their name and see which planes they own. If you're on an aircraft and see it's "Leased", you cannot click the lease to see who the lessee is. This must be fixed across the entire app.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ONE APP, THREE PORTALS                   │
│                                                                 │
│  ┌──────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │  ADMIN PORTAL    │  │  SCHOOL PORTAL  │  │  OWNER PORTAL │  │
│  │  /dashboard      │  │  /portal        │  │  /owner       │  │
│  │  role: admin     │  │  role:          │  │  role:        │  │
│  │  role: super_    │  │  flight_school  │  │  asset_owner  │  │
│  │  admin           │  │                 │  │               │  │
│  └──────────────────┘  └─────────────────┘  └───────────────┘  │
│                                                                 │
│                    SHARED DATABASE                              │
│  owners ← aircraft → leases → lessees → payments               │
│                ↓           ↓                                    │
│          maintenance   flight_hour_logs                         │
│                ↓           ↓                                    │
│            documents   notifications                            │
└─────────────────────────────────────────────────────────────────┘
```

### Role → Portal Routing (After Login)

```
Login → server checks role:
  "admin" or "super_admin"  → redirect to /dashboard
  "flight_school"           → redirect to /portal
  "asset_owner"             → redirect to /owner
  "pending"                 → redirect to /pending-approval
  "blocked"                 → show blocked message on login page
```

---

## 3. The Three Portals

### Portal 1: Admin (Zachary's Team)

Full access. Sees everything. Creates and manages all data.
Manages: aircraft, owners, lessees, leases, payments, maintenance, documents.
Sends invites to flight schools and asset owners.
Sees revenue analytics with 10% commission breakdown.

### Portal 2: Flight School

Restricted view. Sees only their own leased aircraft.
Can: log monthly flight hours, view their invoices, submit payments (simulated).
Cannot: browse the full fleet, create leases, see other schools' data.

### Portal 3: Asset Owner

Read-only financial dashboard scoped to their aircraft.
Can: see their aircraft's performance, hours flown, revenue (post-10% fee), associated contracts.
Cannot: modify any data.

---

## 4. Universal Entity Linking — The Core Problem

This is the most important section. Every entity in the system must be navigable from every related entity. The admin should never hit a dead end.

### The Entity Relationship Map

```
owners
  └── aircraft (one owner → many aircraft)
        ├── leases (one aircraft → many leases, one active at a time)
        │     ├── lessees (one lessee → many leases)
        │     │     └── users (one user account per lessee)
        │     ├── payments (one lease → many payments)
        │     └── flight_hour_logs (one lease → many logs)
        ├── maintenance (one aircraft → many records)
        └── documents (polymorphic → aircraft, owner, lessee, lease)
```

### Required Clickable Links (Admin Portal)

Every page must implement these cross-navigation links:

#### Owners Page (`/owners`)

**Current state:** Shows name, email, phone, address, notes. No links to anything.

**Required additions:**

- Each owner card/row must show:
  - Count of aircraft they own: "3 Aircraft"
  - Count of active leases across their fleet: "2 Active Leases"
  - Total monthly revenue from their aircraft: "$X,XXX/mo"
  - "View Portfolio" button → opens Owner Detail Drawer/Page showing:
    - Owner contact info (editable)
    - List of their aircraft (each clickable → Aircraft Detail)
    - List of all leases for their aircraft (each clickable → Lease Detail)
    - List of all documents tagged to this owner (each clickable → download)
    - Revenue summary (gross, 10% commission, net) across all their aircraft

#### Aircraft Page (`/aircraft`)

**Current state:** Shows aircraft cards with owner name (text only), status badge, and a modal with a Lease tab.

**Required additions:**

- Owner name must be a **clickable link** → Owner Detail Drawer
- "Leased" status badge must be **clickable** → Lease Detail Drawer showing who it's leased to
- Aircraft Details Modal enhancements:
  - **Owner section**: Owner name is a link → open Owner Detail inline or navigate to /owners?id=X
  - **Current Lease tab**: Lessee name is a link → open Lessee Detail; "View Full Lease" button → Lease Detail
  - **Lease History tab** (new): All past + current leases for this aircraft, each clickable
  - **Payments tab** (new): All payments for this aircraft's active lease, each with status
  - **Maintenance tab**: Already has maintenance records — keep, make aircraft filter clickable
  - **Documents tab** (new): All documents where relatedType='aircraft' AND relatedId=this aircraft

#### Leases Page (`/leases`)

**Current state:** Shows aircraft name + lessee name as text. Lease modal shows details.

**Required additions:**

- Aircraft name in lease row → clickable → Aircraft Detail
- Lessee name in lease row → clickable → Lessee Detail
- In LeaseAgreementModal:
  - Aircraft row: "View Aircraft" button → Aircraft Detail
  - Lessee row: "View School" button → Lessee Detail
  - Payments section: each payment row is clickable, shows status, "Mark Paid" button
  - Documents section: documents tagged to this lease, each downloadable
  - "View Portal Account" button → if lessee has a user account, show login status + last login

#### Lessees Page (`/lessees`)

**Current state:** Shows name, email, phone, contact person. No links to anything.

**Required additions:**

- Each lessee card/row must show:
  - Count of active leases: "2 Active Leases"
  - Total outstanding balance: "$X,XXX"
  - Portal account status badge: "Active" / "Invited" / "No Account"
  - "View Profile" button → opens Lessee Detail Drawer showing:
    - Contact info (editable)
    - Active leases (each clickable → Lease Detail, which links to Aircraft Detail)
    - Lease history (past leases)
    - Payment history (all payments, with status)
    - Flight hour logs (all submitted logs)
    - Documents tagged to this lessee
    - Portal account section: email, last login, status, "Resend Invite" button

#### Payments Page (`/payments`)

**Current state:** Shows lease, amount, period, status. Cannot navigate to the lease or aircraft.

**Required additions:**

- Aircraft name column (derived from lease) → clickable → Aircraft Detail
- Lessee name column (derived from lease) → clickable → Lessee Detail
- Lease reference → clickable → Lease Detail
- Payment row expansion (click row or expand icon):
  - Shows flight hour log that generated this payment (if applicable)
  - Shows gross, commission, net breakdown
  - "View Lease" button, "View School" button

#### Maintenance Page (`/maintenance`)

**Current state:** Shows aircraft name as text.

**Required additions:**

- Aircraft name → clickable → Aircraft Detail
- Aircraft detail opens with Maintenance tab active

#### Documents Page (`/documents`)

**Current state:** Shows relatedType and relatedId as raw data. Cannot navigate to the related entity.

**Required additions:**

- If relatedType='aircraft': show aircraft registration as link → Aircraft Detail
- If relatedType='owner': show owner name as link → Owner Detail
- If relatedType='lessee': show lessee name as link → Lessee Detail
- If relatedType='lease': show "Lease #ID / Aircraft reg" as link → Lease Detail
- Documents should appear in context panels on all other pages too (as listed above)

#### Admin Revenue Page (`/admin/revenue` or `/revenue`)

**Required additions:**

- "By School" table: school name → clickable → Lessee Detail
- "By Aircraft" table: aircraft registration → clickable → Aircraft Detail

#### Dashboard (`/dashboard`)

**Required additions:**

- AircraftFleet component: each aircraft row → Aircraft Detail
- MaintenanceSchedule component: each item → aircraft registration links to Aircraft Detail
- PaymentStatus component: recent payment rows → Lease/Payment Detail
- ActivityFeed component: notification items link to related entity

#### Admin Users Page (`/admin/users`)

**Required additions:**

- If user has `lesseeId`: show "Linked School" as clickable → Lessee Detail
- If user has `ownerId`: show "Linked Owner" as clickable → Owner Detail

---

## 5. Database Changes

### 5.1 Users Table — Add Owner Link + New Roles

```ts
// In shared/schema.ts — add to users table:
ownerId: integer("owner_id"),                    // NEW — links asset_owner user to owners table
inviteToken: text("invite_token"),               // NEW — for email invite flow
inviteExpiresAt: timestamp("invite_expires_at"), // NEW — token TTL (24 hours)
invitedAt: timestamp("invited_at"),              // NEW — when invite was sent
lastLoginAt: timestamp("last_login_at"),         // NEW — useful for admin oversight
```

New role values (extend existing `role` text field):
- `"flight_school"` — already added
- `"asset_owner"` — NEW

New status values (extend existing `status` text field):
- `"invited"` — NEW — user created, invite email queued, not yet logged in

Full status lifecycle:
```
invited → active (once they set password + log in)
active → blocked (admin blocks)
blocked → active (admin unblocks)
```

### 5.2 Lessees Table — Add Portal Metadata

```ts
// In shared/schema.ts — add to lessees table:
state: text("state"),                  // NEW — from client conversation
certificationNumber: text("certification_number"), // NEW — FAA cert, optional
portalStatus: text("portal_status").default("none"), // none, invited, active, blocked
```

### 5.3 Owners Table — Add Portal Metadata

```ts
// In shared/schema.ts — add to owners table:
portalStatus: text("portal_status").default("none"), // none, invited, active, blocked
```

### 5.4 Payments Table — Confirm All Columns Exist

Already in schema (confirmed):
- `grossAmount`, `commissionAmount`, `netAmount` ✓
- `flightHourLogId` ✓
- `stripePaymentIntentId` ✓
- `lesseeId` ✓

Add missing:
```ts
aircraftId: integer("aircraft_id"), // NEW — denormalized for faster revenue queries
```

### 5.5 Flight Hour Logs — Add FlightAware Column (Ready for Phase 2)

```ts
// Add to flightHourLogs table (nullable — Phase 2 populates it):
flightAwareHours: doublePrecision("flight_aware_hours"), // NEW — from FlightAware API
flightAwareCheckedAt: timestamp("flight_aware_checked_at"), // NEW
discrepancyFlagged: boolean("discrepancy_flagged").default(false), // NEW
discrepancyNotes: text("discrepancy_notes"), // NEW
```

These columns are added now and stay null until Phase 2 integration. No UI needed yet.

### 5.6 Leases Table — Confirm minimumHours Exists

Already in schema: `minimumHours: integer("minimum_hours").notNull()` ✓

### 5.7 Email Queue Table (New — for deferred email sending)

Since the email service (SendGrid/Resend) is not wired up yet, all outbound emails must be queued so they fire automatically once a key is added.

```ts
export const emailQueue = pgTable("email_queue", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  templateType: text("template_type").notNull(), // invite_school, invite_owner, monthly_summary, etc.
  templateData: jsonb("template_data").notNull(), // all dynamic data the template needs
  status: text("status").default("pending"),      // pending, sent, failed
  scheduledFor: timestamp("scheduled_for").defaultNow(),
  sentAt: timestamp("sent_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## 6. Admin Portal — Full Interconnected Map

### 6.1 Owner Detail — New Slide-Over / Drawer

**Route:** No new page needed. Use a drawer/sheet that opens on top of `/owners`.

**Triggered by:** "View Portfolio" button on owner card, or clicking owner name anywhere in the app.

**Content:**

```
┌─────────────────────────────────────────────────┐
│  OWNER: Delta Aviation Group            [Edit]  │
│  ─────────────────────────────────────────────  │
│  Email:   info@deltaaviation.com    [mailto:]   │
│  Phone:   +1 (555) 234-5678         [tel:]      │
│  Address: 1234 Airport Rd, TX                   │
│  Payment: Wire transfer details                 │
│  Notes:   ...                                   │
│  Portal:  [Active] / [Invite] / [No Account]    │
│                                                 │
│  ── AIRCRAFT PORTFOLIO ─────────────────────── │
│  N4421K  Cessna 172  [Available]   → click      │
│  N8837P  Piper PA28  [Leased]      → click      │
│  N2290X  Beechcraft  [Maintenance] → click      │
│                                                 │
│  ── REVENUE SUMMARY ────────────────────────── │
│  Gross Revenue (this month): $14,500            │
│  Platform Fee (10%):         $1,450             │
│  Net to Owner:               $13,050            │
│                                                 │
│  ── DOCUMENTS ──────────────────────────────── │
│  Aircraft Ownership - N4421K.pdf   [Download]   │
│  Insurance Certificate.pdf         [Download]   │
│  [Upload Document]                              │
└─────────────────────────────────────────────────┘
```

**API required:** `GET /api/owners/:id/detail` — returns owner + their aircraft + revenue summary + documents.

### 6.2 Aircraft Detail Modal — Enhanced

Existing modal has tabs. Enhance each:

**Overview Tab** (existing, enhance):
- Owner name → clicking opens Owner Detail Drawer
- Status badge → if "Leased", becomes a button that opens Lease Detail
- Add "Current Lessee" field showing who has it (if leased) → clickable

**Lease Tab** (existing, enhance):
- Show current lease terms
- Lessee name → clickable → Lessee Detail Drawer
- "View Full Lease Agreement" button → opens LeaseAgreementModal
- "View Payment History" button → scrolls to Payments tab

**Lease History Tab** (NEW):
- Table of ALL leases (active + past) for this aircraft
- Columns: Lessee, Start, End, Status, Monthly Rate
- Each row clickable → Lease Detail

**Payments Tab** (NEW):
- All payments for the current active lease
- Columns: Period, Hours, Amount, Status, Due Date, Paid Date
- "Mark as Paid" button on pending/overdue rows

**Maintenance Tab** (existing, keep):
- All maintenance records for this aircraft
- "Add Maintenance" button opens maintenance form pre-filled with this aircraft

**Documents Tab** (NEW):
- All documents where relatedType='aircraft' AND relatedId=this id
- "Upload Document" button pre-fills aircraft as the related entity

### 6.3 Lessee Detail — New Slide-Over / Drawer

**Route:** No new page. Drawer opens over `/lessees`.

**Triggered by:** "View Profile" button on lessee card, clicking lessee name anywhere in the app.

**Content:**

```
┌─────────────────────────────────────────────────┐
│  FLIGHT SCHOOL: Blue Sky Aviation       [Edit]  │
│  ─────────────────────────────────────────────  │
│  Contact:  John Smith                           │
│  Email:    john@bluesky.com         [mailto:]   │
│  Phone:    +1 (555) 123-4567        [tel:]      │
│  Address:  5678 Runway Blvd, FL                 │
│  State:    Florida                              │
│  FAA Cert: FAA-123456 (optional)                │
│  Notes:    ...                                  │
│                                                 │
│  ── PORTAL ACCOUNT ─────────────────────────── │
│  Status: Active  |  Last Login: Mar 1, 2026     │
│  [Resend Invite]  [Block Account]               │
│                                                 │
│  ── ACTIVE LEASES ──────────────────────────── │
│  N4421K  Cessna 172  $145/hr  Expires Jul 2026  │
│  [View Lease]  [View Aircraft]                  │
│                                                 │
│  ── OUTSTANDING BALANCE ────────────────────── │
│  $11,600  (Feb 2025 — N4421K)  [Pending]        │
│  [Mark Paid]                                    │
│                                                 │
│  ── FLIGHT HOUR LOGS ───────────────────────── │
│  Feb 2025  N4421K  80 hrs  $11,600  Submitted   │
│  Jan 2025  N4421K  72 hrs  $10,440  Paid        │
│                                                 │
│  ── DOCUMENTS ──────────────────────────────── │
│  Lease Agreement - N4421K.pdf    [Download]     │
│  [Upload Document]                              │
└─────────────────────────────────────────────────┘
```

**API required:** `GET /api/lessees/:id/detail` — returns lessee + leases + payments + hour logs + documents + user account status.

### 6.4 Lease Agreement Modal — Enhanced

**Triggered by:** Clicking lease in any context (leases page, aircraft detail, lessee detail, payments page).

**Current state:** Shows lease terms. Enhance with:

- Aircraft registration/name → button → Aircraft Detail
- Lessee name → button → Lessee Detail
- Lease document (documentUrl) → download button
- **Payments section** (new tab or expanded): all payments for this lease, each with status + "Mark Paid"
- **Hour Logs section** (new tab): all flight_hour_logs for this lease
- Status actions: "Terminate Lease" button (confirms, sets status='Terminated', updates aircraft status)
- "Renew Lease" button (opens new lease form pre-filled with same aircraft + lessee)

### 6.5 Payments Page — Enhanced

Add these columns to the payment table:
- Aircraft (from lease.aircraft.registration) — clickable → Aircraft Detail
- School (from lease.lessee.name) — clickable → Lessee Detail

Row expansion (click to expand):
- Shows: gross amount, commission (10%), net amount
- Shows: flight hour log that generated this payment (if linked) — with hours count
- Actions: "View Lease", "View School", "Download Invoice"

### 6.6 Documents Page — Enhanced

The `relatedType` + `relatedId` columns must render as clickable entity links:

| relatedType | Display | Link Action |
|---|---|---|
| `aircraft` | Aircraft registration | Open Aircraft Detail |
| `owner` | Owner name | Open Owner Detail Drawer |
| `lessee` | Lessee name | Open Lessee Detail Drawer |
| `lease` | "Lease: [Aircraft reg]" | Open Lease Agreement Modal |

Add "Upload Document" button that prompts for relatedType + relatedId (with dropdowns for each entity type).

### 6.7 Admin Users Page — Enhanced

Add columns:
- "Linked Entity": if `lesseeId` → "Flight School: [name]" (clickable → Lessee Detail); if `ownerId` → "Owner: [name]" (clickable → Owner Detail)
- "Last Login": show `lastLoginAt` from users table
- "Portal Status": Active / Invited / Blocked badge

### 6.8 Invite User Flow (Admin Action)

When admin wants to give a flight school or owner portal access:

**For Flight Schools (from Lessees page):**
1. Admin clicks "Invite to Portal" on a lessee that has `portalStatus = "none"`
2. Dialog opens: confirms email address (pre-filled from lessee.email)
3. Admin clicks "Send Invite"
4. Server creates user record: `role="flight_school"`, `status="invited"`, `lesseeId=X`, `inviteToken=<uuid>`, `inviteExpiresAt=+24hrs`
5. Email queued: invite link = `https://app.com/accept-invite?token=<uuid>`
6. Lessee `portalStatus` updated to `"invited"`
7. Toast: "Invite sent to john@bluesky.com"

**For Asset Owners (from Owners page):**
1. Admin clicks "Invite to Portal" on an owner with `portalStatus = "none"`
2. Same flow as above but `role="asset_owner"`, `ownerId=X`
3. Owner `portalStatus` updated to `"invited"`

**Accept Invite Page (`/accept-invite?token=X`):**
- Validates token (exists, not expired)
- Shows: "Welcome [name]! Set your password to activate your account."
- Form: password + confirm password
- On submit: sets passwordHash, status="active", clears inviteToken, sets lastLoginAt
- Auto-logs in, redirects to appropriate portal

---

## 7. Flight School Portal

### Portal Route: `/portal/*`

Middleware: `isFlightSchool` — blocks all non-flight_school roles.

All data scoped by: `req.user.lesseeId`

### 7.1 Portal Sidebar Navigation

```
─────────────────────────
✈ AeroLease Wise
[School Name]
─────────────────────────
OVERVIEW
  Dashboard              → /portal

FLEET
  My Aircraft            → /portal/aircraft

OPERATIONS
  Log Flight Hours       → /portal/hours
  Billing & Payments     → /portal/payments

─────────────────────────
Settings                 → /settings
Help & Support           → /help-support
Logout
```

Note: No "Browse Fleet" — removed per client direction.

### 7.2 Portal Dashboard (`/portal`)

**Stats:**
- Hours Logged This Month (across all their aircraft)
- Active Aircraft Count
- Outstanding Balance (sum of Pending + Overdue payments)
- Last Payment Amount + Date

**Quick Actions:**
- "Log Hours" button → `/portal/hours`
- "View Invoices" button → `/portal/payments`

**Active Leases Summary:**
- Card per aircraft: registration, make/model, lease expiry date, hourly rate
- Each card: "Log Hours" shortcut (pre-fills that aircraft on hours form)

**Recent Activity:**
- Last 5 payment records (period, amount, status)
- Last 5 hour log submissions

### 7.3 My Aircraft (`/portal/aircraft`)

Shows only aircraft currently leased by this school (active leases where lesseeId = this school).

**Each aircraft card shows:**
- Aircraft image
- Registration + Make/Model/Year
- Hourly rate
- Lease start → end date
- Minimum hours/month
- Hours logged this month
- Outstanding balance for this aircraft

**Actions on each card:**
- "Log Hours" → `/portal/hours?aircraftId=X` (pre-filled)
- "View Invoices" → `/portal/payments?aircraftId=X` (filtered)
- "View Lease" → opens lease detail (read-only — school can see their lease terms)

**Lease expiry warning:**
- Yellow banner if lease expires within 60 days: "Lease expires in X days"
- Yellow banner if lease expires within 15 days: "URGENT: Lease expires in X days — contact your account manager"

### 7.4 Log Flight Hours (`/portal/hours`)

**Form:**

```
┌────────────────────────────────────────────────┐
│  LOG FLIGHT HOURS                              │
│                                                │
│  Aircraft:    [Dropdown — their active leases] │
│  Month/Year:  [Month picker — no future dates] │
│  Hours Flown: [Number input]                   │
│               [or]                             │
│               [Pay Minimum Hours button]       │
│  Notes:       [Optional text area]             │
│                                                │
│  ─── LIVE CALCULATION ──────────────────────  │
│  Reported Hours:    80                         │
│  Minimum Required:  40                         │
│  Billable Hours:    80 (actual, above minimum) │
│  Hourly Rate:       $145/hr                    │
│  Amount Due:        $11,600                    │
│                                                │
│  [Submit Hours & Generate Invoice]             │
└────────────────────────────────────────────────┘
```

**Minimum Hours Button Logic:**
- Clicking "Pay Minimum Hours" fills the hours field with the lease's `minimumHours` value
- Live calculation updates instantly
- If school types a number lower than minimum, show: "Below minimum (40 hrs) — you will be billed for 40 hrs"
- Billable hours formula: `MAX(reportedHours, minimumHours)`
- Payment amount: `billableHours × lease.hourlyRate`

**Validation (client + server-side):**
- Aircraft must have an active lease for this school
- Month cannot be in the future
- Hours must be > 0
- No duplicate entry for same aircraft + month (DB unique constraint enforced)
- If this month's payment is already marked "Paid" → block submission

**Below form — submission history table:**

| Month | Aircraft | Reported | Billable | Amount | Status |
|---|---|---|---|---|---|
| Feb 2025 | N4421K | 80 hrs | 80 hrs | $11,600 | Submitted |
| Jan 2025 | N4421K | 20 hrs | 40 hrs (min) | $5,800 | Paid |

### 7.5 Billing & Payments (`/portal/payments`)

**Outstanding Balance Banner:**
```
You have $25,750 outstanding across 3 invoices
[Pay Now]
```

**Pay Now modal:**
- Lists all Pending + Overdue payments as selectable checkboxes
- Each item: Month, Aircraft, Hours, Amount
- Total updates live as items are checked/unchecked
- "Confirm Payment" button (simulated — marks all selected as Paid immediately)
- Toast: "Payment of $25,750 confirmed. Receipt has been recorded."

**Payment History Table with Tabs:**
- All | Paid | Pending | Overdue

**Columns:**
- Period (month + year)
- Aircraft
- Hours (reported / billable if different)
- Amount
- Due Date
- Paid Date
- Status badge

**Row expansion:**
- Gross amount breakdown (in case of minimum hours adjustment)
- Download invoice button (if invoiceUrl exists)

---

## 8. Asset Owner Portal

### Portal Route: `/owner/*`

Middleware: `isAssetOwner` — new middleware, blocks non-asset_owner roles.

All data scoped by: `req.user.ownerId`

### 8.1 Owner Sidebar Navigation

```
─────────────────────────
✈ AeroLease Wise
[Owner Name]
─────────────────────────
OVERVIEW
  Dashboard              → /owner

FLEET
  My Aircraft            → /owner/aircraft

FINANCIALS
  Revenue & Earnings     → /owner/revenue

DOCUMENTS
  Contracts & Files      → /owner/documents

─────────────────────────
Settings                 → /settings
Help & Support           → /help-support
Logout
```

### 8.2 Owner Dashboard (`/owner`)

**Stats row:**
- Total Aircraft in Portfolio
- Aircraft Currently Leased
- Gross Revenue (this month)
- Net Revenue After Fee (this month)

**Portfolio Overview:**
- Card per aircraft showing: registration, make/model, status badge, hours this month, gross revenue, net revenue
- Each card → `/owner/aircraft/:id` detail

**Recent Activity:**
- Last 5 payments received for their aircraft (month, aircraft, school, amount)

### 8.3 My Aircraft (`/owner/aircraft`)

List of all aircraft where `aircraft.ownerId = req.user.ownerId`.

**Each aircraft card:**
- Image, registration, make/model/year, status badge
- Current lessee name (if leased) — no link, just informational
- Lease period (start → end)
- Hours this month (from flight_hour_logs)
- Gross revenue this month
- Net revenue this month (after 10% fee)
- Lease expiry date (if active lease)

**Click → Aircraft Detail page for Owner (`/owner/aircraft/:id`):**

```
┌──────────────────────────────────────────────────┐
│  N4421K — Cessna 172 Skyhawk (2019)              │
│  Status: Leased  |  Owner: You                   │
│                                                  │
│  ── CURRENT LEASE ──────────────────────────── │
│  Leased to:   Blue Sky Aviation (read-only)      │
│  Lease term:  Jan 2025 → Dec 2026                │
│  Hourly rate: $145/hr                            │
│  Min hours:   40/mo                              │
│                                                  │
│  ── MONTHLY PERFORMANCE ────────────────────── │
│  Feb 2025: 80 hrs  |  Gross: $11,600  |  Net: $10,440 │
│  Jan 2025: 40 hrs  |  Gross: $5,800   |  Net: $5,220  │
│  (etc.)                                          │
│                                                  │
│  ── DOCUMENTS ──────────────────────────────── │
│  Aircraft Ownership Certificate.pdf  [Download] │
│  Lease Agreement - Blue Sky.pdf      [Download] │
│  Insurance Policy 2025.pdf           [Download] │
└──────────────────────────────────────────────────┘
```

**Important:** The owner sees **lessee name only** — no lessee contact details, no payment records, no flight logs beyond the hours count. The financials they see are always post-10% deduction.

### 8.4 Revenue & Earnings (`/owner/revenue`)

**Date range filter:** This Month / Last 3 Months / Last 6 Months / Custom

**Summary row:**
- Total Gross Revenue
- Platform Fee (10%)
- Your Net Revenue

**Monthly breakdown table:**

| Month | Aircraft | Hours | Gross | Platform Fee | Your Net |
|---|---|---|---|---|---|
| Feb 2025 | N4421K | 80 | $11,600 | $1,160 | $10,440 |
| Feb 2025 | N8837P | 60 | $8,100 | $810 | $7,290 |

**By Aircraft summary:**
- Each aircraft's total hours, gross, fee, net for the selected period

### 8.5 Contracts & Documents (`/owner/documents`)

All documents where `relatedType = 'aircraft'` AND aircraft belongs to this owner, OR `relatedType = 'owner'` AND `relatedId = req.user.ownerId`.

Columns: Document Name, Type, Related Aircraft, Upload Date, Download button.

---

## 9. Invite Flow (Replacing Self-Registration)

### 9.1 What Changes

- `POST /api/auth/register/school` — **REMOVE** (or disable)
- `GET /register/school` page — **REMOVE** (or redirect to login)
- Landing page — **REMOVE** "Flight School Sign Up" button, keep only "Login"
- Self-service onboarding flow — **REMOVE** entirely

### 9.2 New Flow

```
Admin creates lessee profile (existing /lessees page)
  → fills: school name, email, contact person, phone, address
  → clicks "Send Portal Invite" button on the lessee card
  → Dialog: confirm email, optional personal message
  → clicks "Send Invite"

Server:
  1. Generates a secure invite token (crypto.randomBytes(32).toString('hex'))
  2. Creates user record:
       email = lessee.email
       role = "flight_school"
       status = "invited"
       lesseeId = lessee.id
       inviteToken = token
       inviteExpiresAt = now + 24 hours
  3. Updates lessee.portalStatus = "invited"
  4. Queues email (emailQueue table):
       templateType = "invite_school"
       to = lessee.email
       templateData = { schoolName, contactPerson, inviteUrl, adminMessage? }
  5. Creates in-app notification for admin: "Invite sent to [School Name]"

School receives email (once email service is wired):
  → Clicks link: /accept-invite?token=<token>
  → Page validates token
  → Form: Set your password (min 8 chars) + confirm
  → On submit:
       passwordHash set
       status = "active"
       inviteToken = null
       inviteExpiresAt = null
       lastLoginAt = now
       lessee.portalStatus = "active"
  → Auto-login → redirect to /portal
  → Welcome toast: "Welcome to AeroLease Wise! Your fleet is ready."
```

### 9.3 Resend Invite

If token expires (after 24 hrs) or admin wants to resend:
- "Resend Invite" button on lessee card (visible if portalStatus = "invited")
- Generates new token, extends expiry, re-queues email
- Old token invalidated

### 9.4 Accept Invite Page (`/accept-invite`)

```
Route: /accept-invite?token=<token>

Validates:
  1. Token exists in users table
  2. Token not expired (inviteExpiresAt > now)
  3. Shows: "Welcome [name], set your password"

If invalid/expired:
  Shows: "This invite link has expired or is invalid. Contact your account manager."
```

---

## 10. Automated Notifications & Email System

### 10.1 Email Queue Architecture

Emails are queued to `emailQueue` table immediately when events fire. A background processor checks this table and sends via the configured provider (SendGrid/Resend). Until a provider is configured, emails stay in the queue and are marked `pending`.

This means: **all notification logic is built now, email sending is plugged in later with one config change.**

### 10.2 Email Templates Required

| Template Key | Trigger | Recipient | Content |
|---|---|---|---|
| `invite_school` | Admin invites a school | Flight school email | Welcome, portal link, password setup |
| `invite_owner` | Admin invites an owner | Owner email | Welcome, portal link, password setup |
| `monthly_hours_reminder` | 1st of every month | All active flight schools | Reminder to log hours + pay |
| `payment_due_soon` | 5 days before due date | Flight school | Invoice due soon, amount, pay link |
| `payment_overdue_7` | 7 days past due | Flight school | Overdue notice |
| `payment_overdue_30` | 30 days past due | Admin | School has unpaid invoice 30 days overdue |
| `lease_expiry_60` | 60 days before lease end | Admin | "[School] lease on [Aircraft] expires in 60 days" |
| `lease_expiry_15` | 15 days before lease end | Admin | "URGENT: [School] lease on [Aircraft] expires in 15 days" |
| `owner_monthly_summary` | 1st of every month | Asset owners | Summary of prior month hours + payments for their aircraft |
| `hours_submitted` | School submits hours | Admin | "[School] submitted [X] hours for [Aircraft] — Invoice: $X,XXX" |
| `payment_confirmed` | Payment marked Paid | Flight school + Admin | Payment confirmed, amount, receipt |

### 10.3 Scheduled Jobs (Server-Side Cron)

Use `node-cron` (already available or install):

```
Schedule: "0 8 1 * *"    (8am on the 1st of every month)
  → Send monthly_hours_reminder to all active flight_school users
  → Send owner_monthly_summary to all active asset_owner users (for prior month)

Schedule: "0 8 * * *"    (8am every day)
  → Check all payments where dueDate = today + 5 days → queue payment_due_soon
  → Check all payments where dueDate = today - 7 days AND status != 'Paid' → queue payment_overdue_7
  → Check all payments where dueDate = today - 30 days AND status != 'Paid' → queue payment_overdue_30
  → Check all leases where endDate = today + 60 days → queue lease_expiry_60
  → Check all leases where endDate = today + 15 days → queue lease_expiry_15
```

### 10.4 In-App Notifications (Already Exists — Extend Triggers)

The `notifications` table and `notifications-dropdown.tsx` already exist. Add new trigger points:

| Event | Notification to Admin | Notification to School |
|---|---|---|
| School submits hours | "Blue Sky logged 80 hrs on N4421K — $11,600 invoice generated" | ✗ (they did the action) |
| Payment marked paid | "Payment of $11,600 received from Blue Sky Aviation" | "Your payment of $11,600 has been confirmed" |
| New school invited | "Invite sent to Blue Sky Aviation (john@bluesky.com)" | ✗ |
| School accepts invite | "Blue Sky Aviation has activated their portal account" | ✗ |
| Owner accepts invite | "Delta Aviation Group has activated their owner portal" | ✗ |
| Lease expiry 60 days | "[Aircraft] lease to [School] expires in 60 days" | "Your lease on [Aircraft] expires in 60 days" |
| Lease expiry 15 days | "URGENT: [Aircraft] lease expires in 15 days" | "URGENT: Your lease on [Aircraft] expires in 15 days" |

---

## 11. Minimum Hours Logic

### 11.1 The Rule

Every lease has `minimumHours` (e.g., 40 hrs/month). Billing formula:

```
billableHours  = MAX(reportedHours, lease.minimumHours)
paymentAmount  = billableHours × lease.hourlyRate
grossAmount    = paymentAmount
commissionAmt  = grossAmount × 0.10
netAmount      = grossAmount × 0.90
```

### 11.2 UI Behavior (Hour Logging Form)

- School sees "Minimum hours: 40/mo" displayed clearly on the form
- "Pay Minimum" shortcut button: fills `reportedHours` with `minimumHours` value
- If school types hours < minimum:
  - Show yellow warning inline: "Below minimum — you'll be billed for 40 hours"
  - Billable hours display updates to show minimum, not typed value
- If school types hours > minimum:
  - Normal calculation: billable = typed value
- Server ALWAYS recalculates — never trusts client-sent amount

### 11.3 History Table Display

When billable hours differ from reported hours, show both:

```
Feb 2025  N4421K  Reported: 20 hrs  Billed: 40 hrs (minimum)  $5,800  Paid
Jan 2025  N4421K  Reported: 80 hrs  Billed: 80 hrs             $11,600  Paid
```

---

## 12. FlightAware Integration (Phase 2)

### 12.1 What the API Provides

- **Endpoint:** `GET /flights/{ident}/history` where `ident` = tail number (e.g., N4421K)
- **Returns:** All flight legs with departure time, arrival time, duration
- **Sum duration** for all flights in a month → estimated hours
- **Cost:** ~$100/month base (commercial use), low query volume at Zachary's scale

### 12.2 Phase 2 Build (Not in Phase 1)

When implemented:
1. Add `FLIGHTAWARE_API_KEY` to `.env`
2. New server function: `getFlightAwareHours(tailNumber, year, month)` → returns estimated hours
3. When admin views a flight hour log submission (in admin portal), show "FlightAware Estimate" alongside school-reported hours
4. Auto-flag discrepancies: if `abs(reportedHours - flightAwareHours) > 10` → set `discrepancyFlagged = true`, create admin notification
5. Admin can mark as "Verified" or "Disputed" on each log

### 12.3 What's Built Now (Phase 1 Prep)

DB columns are added in Phase 1 (Phase 5.5 above) and stay null. No UI needed. When Phase 2 starts, the columns are ready and only the API call + UI need to be added.

---

## 13. API Routes — Full Map

### New Routes (additions to existing server/routes.ts)

#### Owner Detail Routes

```
GET  /api/owners/:id/detail
     → Returns owner + their aircraft + revenue summary + documents
     → Auth: isAdmin

POST /api/owners/:id/invite
     → Creates user account (role=asset_owner) + queues invite email
     → Auth: isAdmin

POST /api/owners/:id/resend-invite
     → Generates new token, re-queues email
     → Auth: isAdmin
```

#### Lessee Detail Routes

```
GET  /api/lessees/:id/detail
     → Returns lessee + leases + payments + hour logs + documents + user account status
     → Auth: isAdmin

POST /api/lessees/:id/invite
     → Creates user account (role=flight_school) + queues invite email
     → Auth: isAdmin

POST /api/lessees/:id/resend-invite
     → Generates new token, re-queues email
     → Auth: isAdmin
```

#### Accept Invite Route (Public)

```
GET  /api/auth/invite/validate?token=<token>
     → Returns { valid: true/false, name, role, email } (no sensitive data)
     → Auth: none (public)

POST /api/auth/invite/accept
     → Body: { token, password }
     → Validates token, sets password, activates account, logs user in
     → Auth: none (public)
```

#### Asset Owner Portal Routes

```
GET  /api/owner/dashboard
     → Returns stats scoped to req.user.ownerId
     → Auth: isAssetOwner (new middleware)

GET  /api/owner/aircraft
     → Returns all aircraft where ownerId = req.user.ownerId + their active leases + month stats
     → Auth: isAssetOwner

GET  /api/owner/aircraft/:id
     → Returns single aircraft detail + lease + monthly performance + documents
     → Validates aircraft.ownerId = req.user.ownerId
     → Auth: isAssetOwner

GET  /api/owner/revenue?startMonth=YYYY-MM&endMonth=YYYY-MM
     → Returns revenue breakdown scoped to owner's aircraft
     → Auth: isAssetOwner

GET  /api/owner/documents
     → Returns documents for owner's aircraft + owner entity
     → Auth: isAssetOwner
```

#### Portal Routes — Additions

```
GET  /api/portal/aircraft/:id/lease
     → Returns current lease terms for this aircraft (read-only, school must own this lease)
     → Auth: isFlightSchool

POST /api/portal/payments/pay
     → Body: { paymentIds: number[] }
     → Simulated: marks all selected payments as Paid immediately
     → Auth: isFlightSchool
```

#### Admin Revenue Route (already exists, verify)

```
GET  /api/admin/revenue?startMonth=YYYY-MM&endMonth=YYYY-MM
     → Already built — verify it includes bySchool and byAircraft breakdowns
     → Auth: isAdmin
```

#### Notification/Cron Trigger Routes

```
POST /api/internal/process-email-queue
     → Processes pending emails (called by cron or manually by admin)
     → Auth: internal only (no external access — check origin or use secret header)

POST /api/internal/run-scheduled-checks
     → Runs all daily scheduled checks (lease expiry, overdue payments)
     → Auth: internal only
```

---

## 14. Frontend Routing — Full Map

### Current Routes (App.tsx) — Keep All

```
/                    → landing.tsx
/login               → login.tsx
/register            → register.tsx
/pending-approval    → pending-approval.tsx
/home                → home.tsx
/dashboard           → dashboard.tsx
/aircraft            → aircraft.tsx
/owners              → owners.tsx
/lessees             → lessees.tsx
/leases              → leases.tsx
/payments            → payments.tsx
/maintenance         → maintenance.tsx
/documents           → documents.tsx
/settings            → settings.tsx
/help-support        → help-support.tsx
/admin/users         → admin-users.tsx
/revenue             → admin-revenue.tsx
/portal              → portal/dashboard.tsx
/portal/browse       → portal/browse.tsx (REMOVE or redirect — school no longer browses)
/portal/aircraft     → portal/my-aircraft.tsx (RENAME from my-aircraft)
/portal/hours        → portal/hour-logging.tsx
/portal/payments     → portal/payments.tsx
/register/school     → register-school.tsx (REMOVE or redirect to /login)
```

### New Routes to Add

```
/accept-invite       → accept-invite.tsx (NEW — public, handles both school + owner invites)
/owner               → owner/dashboard.tsx (NEW)
/owner/aircraft      → owner/aircraft.tsx (NEW)
/owner/aircraft/:id  → owner/aircraft-detail.tsx (NEW)
/owner/revenue       → owner/revenue.tsx (NEW)
/owner/documents     → owner/documents.tsx (NEW)
```

### Routes to Remove / Redirect

```
/portal/browse       → redirect to /portal (schools don't browse anymore)
/register/school     → redirect to /login (registration is now invite-only)
```

### Login Page — Role-Based Redirect (Update)

```ts
// After successful login, check role:
if (role === 'flight_school') navigate('/portal');
else if (role === 'asset_owner') navigate('/owner');
else if (role === 'admin' || role === 'super_admin') navigate('/dashboard');
```

### Sidebar — Conditional Nav Sections (Update sidebar.tsx)

The sidebar already has conditional logic. Extend:

```ts
// Admin section: same as now
// Flight school section: same as now EXCEPT remove "Browse Fleet" link
// Asset owner section (NEW):
if (isAssetOwner) {
  show: Dashboard (/owner), My Aircraft (/owner/aircraft), Revenue (/owner/revenue), Documents (/owner/documents)
  hide: all admin links
}
```

---

## 15. Implementation Sequence

Follow this order strictly. Each phase builds on the previous.

---

### Phase 1 — Database Schema Updates

1. Add to `users` table: `ownerId`, `inviteToken`, `inviteExpiresAt`, `invitedAt`, `lastLoginAt`
2. Add to `lessees` table: `state`, `certificationNumber`, `portalStatus`
3. Add to `owners` table: `portalStatus`
4. Add to `payments` table: `aircraftId`
5. Add to `flightHourLogs` table: `flightAwareHours`, `flightAwareCheckedAt`, `discrepancyFlagged`, `discrepancyNotes`
6. Create `emailQueue` table
7. Run `npm run db:push`
8. Update all TypeScript types and insert schemas

---

### Phase 2 — Auth & Middleware

1. Add `isAssetOwner` middleware to `server/auth.ts`
2. Add `isFlightSchool` middleware (if not already present)
3. Update `GET /api/auth/user` to include `ownerId`, `lesseeId`, `role`, `lastLoginAt`
4. Build `POST /api/auth/invite/accept` endpoint
5. Build `GET /api/auth/invite/validate` endpoint
6. Update login response to include role for frontend redirect

---

### Phase 3 — Invite System (Backend)

1. Build `POST /api/owners/:id/invite`
2. Build `POST /api/lessees/:id/invite`
3. Build `POST /api/owners/:id/resend-invite`
4. Build `POST /api/lessees/:id/resend-invite`
5. Build `emailQueue` insertion logic (no sending yet, just queuing)
6. Build `/accept-invite` page (frontend)
7. Update login page to handle `status="invited"` gracefully

---

### Phase 4 — Entity Detail APIs (Backend)

1. Build `GET /api/owners/:id/detail`
2. Build `GET /api/lessees/:id/detail`
3. Build or verify `GET /api/admin/revenue` (ensure bySchool + byAircraft breakdowns)
4. Build all new `/api/owner/*` routes
5. Build `POST /api/portal/payments/pay` (simulated)
6. Build `GET /api/portal/aircraft/:id/lease`

---

### Phase 5 — Admin Portal Interconnectedness (Frontend)

This is the largest frontend phase. Work page by page.

1. **Owner Detail Drawer** (`components/owners/owner-detail-drawer.tsx`):
   - Aircraft portfolio list with links
   - Revenue summary
   - Documents list
   - "Invite to Portal" / "Resend Invite" button

2. **Owners Page** (`pages/owners.tsx`) — update:
   - Add aircraft count, active leases, revenue to each card
   - "View Portfolio" button opens Owner Detail Drawer

3. **Lessee Detail Drawer** (`components/lessees/lessee-detail-drawer.tsx`):
   - Active leases with links to aircraft
   - Outstanding balance
   - Hour logs table
   - Documents
   - Portal account status

4. **Lessees Page** (`pages/lessees.tsx`) — update:
   - Add active leases count, outstanding balance, portal status to each card
   - "View Profile" button opens Lessee Detail Drawer

5. **Aircraft Details Modal** (`components/aircraft/aircraft-details-modal.tsx`) — update:
   - Owner name → clickable (opens Owner Detail Drawer)
   - Lessee name → clickable (opens Lessee Detail Drawer)
   - Add Lease History tab
   - Add Payments tab
   - Add Documents tab

6. **Lease Agreement Modal** (`components/leases/lease-agreement-modal.tsx`) — update:
   - Aircraft name → opens Aircraft Detail Modal
   - Lessee name → opens Lessee Detail Drawer
   - Add Payments tab
   - Add Hour Logs tab
   - Add "Terminate" and "Renew" actions

7. **Payments Page** (`pages/payments.tsx`) — update:
   - Add Aircraft column (clickable)
   - Add School column (clickable)
   - Add row expansion with gross/commission/net breakdown

8. **Documents Page** (`pages/documents.tsx`) — update:
   - relatedType + relatedId → clickable entity links

9. **Maintenance Page** (`pages/maintenance.tsx`) — update:
   - Aircraft name → clickable → Aircraft Detail

10. **Admin Users Page** (`pages/admin-users.tsx`) — update:
    - Add Linked Entity column
    - Add Last Login column
    - Add Portal Status badge

11. **Dashboard Components** — update:
    - aircraft-fleet.tsx: aircraft rows → links
    - maintenance-schedule.tsx: aircraft names → links
    - payment-status.tsx: payment rows → links
    - activity-feed.tsx: notification items → links

---

### Phase 6 — Flight School Portal (Frontend)

1. Remove "Browse Fleet" from sidebar and portal routes
2. Remove/redirect `/register/school`
3. Update portal sidebar to final nav structure
4. Update `portal/dashboard.tsx` — add active leases summary + quick action cards
5. Update `portal/my-aircraft.tsx` — add lease expiry warnings, "Log Hours" shortcut, "View Lease" button
6. Update `portal/hour-logging.tsx`:
   - Add "Pay Minimum" shortcut button
   - Add live calculation display (reported vs billable vs amount)
   - Add inline minimum hours warning
   - Update history table to show reported vs billable hours separately
7. Update `portal/payments.tsx`:
   - Add outstanding balance banner
   - Add "Pay Now" modal with checkbox list (simulated)
   - Add gross/billable/commission breakdown on row expansion

---

### Phase 7 — Asset Owner Portal (Frontend)

1. Create `pages/owner/dashboard.tsx`
2. Create `pages/owner/aircraft.tsx`
3. Create `pages/owner/aircraft-detail.tsx`
4. Create `pages/owner/revenue.tsx`
5. Create `pages/owner/documents.tsx`
6. Add `/owner/*` routes to `App.tsx`
7. Add `isAssetOwner` to `useAuth.ts` hook
8. Extend sidebar with asset_owner nav section

---

### Phase 8 — Notifications & Scheduled Jobs (Backend)

1. Add `node-cron` (or use `setInterval` for simple cases)
2. Build daily cron job: checks payment overdue + lease expiry → queues emails + in-app notifications
3. Build monthly cron job: queues monthly reminder emails
4. Add all new in-app notification trigger points in routes.ts
5. Build `POST /api/internal/process-email-queue` (ready for when email provider is added)
6. Build email template structure (HTML templates or plain text) for all 11 template types

---

### Phase 9 — Admin Revenue Page (Frontend)

1. Update `/revenue` page:
   - Verify timeframe filter works
   - Ensure "By School" school names are clickable → Lessee Detail Drawer
   - Ensure "By Aircraft" registrations are clickable → Aircraft Detail
   - Export CSV button

---

### Phase 10 — Email Provider Integration (When Ready)

1. Add `SENDGRID_API_KEY` (or `RESEND_API_KEY`) to `.env`
2. Build `server/emailService.ts` with one `sendEmail(templateType, to, data)` function
3. Connect `process-email-queue` to this function
4. Test all 11 templates
5. Enable cron jobs to run the queue processor

---

## 16. Files Changed vs Created

### Modified (Existing Files)

| File | Changes |
|---|---|
| `shared/schema.ts` | Add columns to users, lessees, owners, payments, flightHourLogs; add emailQueue table |
| `server/auth.ts` | Add `isAssetOwner` middleware, update `isFlightSchool` if needed |
| `server/routes.ts` | Add all new API routes listed in Section 13 |
| `server/storage.ts` | Add all new DB query methods for detail endpoints |
| `server/emailService.ts` | Refactor to support email queue architecture |
| `client/src/App.tsx` | Add new routes, remove/redirect old ones, update login redirect logic |
| `client/src/hooks/useAuth.ts` | Add `isAssetOwner`, `ownerId` |
| `components/layout/sidebar.tsx` | Add asset_owner nav section; remove Browse from school nav |
| `pages/owners.tsx` | Add portfolio stats, "View Portfolio" button, Owner Detail Drawer trigger |
| `pages/lessees.tsx` | Add stats, portal status, "View Profile" button, Lessee Detail Drawer trigger |
| `pages/payments.tsx` | Add aircraft + school columns, row expansion |
| `pages/maintenance.tsx` | Make aircraft name clickable |
| `pages/documents.tsx` | Make relatedType/relatedId into clickable entity links |
| `pages/admin-users.tsx` | Add linked entity column, last login, portal status |
| `pages/admin-revenue.tsx` | Make school + aircraft names clickable |
| `pages/landing.tsx` | Remove school self-signup CTA |
| `pages/login.tsx` | Update post-login redirect to be role-aware |
| `pages/portal/dashboard.tsx` | Add leases summary, quick action cards |
| `pages/portal/my-aircraft.tsx` | Add expiry warnings, "Log Hours" shortcut, "View Lease" button |
| `pages/portal/hour-logging.tsx` | Add "Pay Minimum" button, live calculation, history table improvements |
| `pages/portal/payments.tsx` | Add balance banner, simulated Pay Now modal, row expansion |
| `components/aircraft/aircraft-details-modal.tsx` | Add clickable owner/lessee, Lease History tab, Payments tab, Documents tab |
| `components/leases/lease-agreement-modal.tsx` | Add clickable aircraft/lessee, Payments tab, Hour Logs tab, Terminate/Renew actions |
| `components/dashboard/aircraft-fleet.tsx` | Make aircraft rows clickable |
| `components/dashboard/maintenance-schedule.tsx` | Make aircraft names clickable |
| `components/dashboard/payment-status.tsx` | Make payment rows clickable |
| `components/dashboard/activity-feed.tsx` | Make notification items link to entities |

### Created (New Files)

| File | Purpose |
|---|---|
| `pages/accept-invite.tsx` | Password setup for invited users (school + owner) |
| `pages/owner/dashboard.tsx` | Asset owner overview dashboard |
| `pages/owner/aircraft.tsx` | Owner's aircraft portfolio list |
| `pages/owner/aircraft-detail.tsx` | Single aircraft detail for owner (read-only) |
| `pages/owner/revenue.tsx` | Owner revenue breakdown with date filter |
| `pages/owner/documents.tsx` | Owner's contracts and documents |
| `components/owners/owner-detail-drawer.tsx` | Slide-over panel: aircraft, revenue, documents for an owner |
| `components/lessees/lessee-detail-drawer.tsx` | Slide-over panel: leases, payments, hours, docs for a school |

### Deleted / Redirected

| File | Action |
|---|---|
| `pages/register-school.tsx` | Redirect to `/login` — self-registration removed |
| `pages/portal/browse.tsx` | Redirect to `/portal` — schools no longer browse |

---

## 17. Verification Checklist

### Universal Navigation (Admin)
- [ ] Owner card → "View Portfolio" opens Owner Detail Drawer
- [ ] Owner Detail Drawer → aircraft registration → opens Aircraft Detail Modal
- [ ] Aircraft Detail Modal → owner name → opens Owner Detail Drawer
- [ ] Aircraft Detail Modal → lessee name (if leased) → opens Lessee Detail Drawer
- [ ] Aircraft Detail Modal → Lease tab → "View Full Lease" → opens Lease Modal
- [ ] Aircraft Detail Modal → Lease History tab → past leases, each opens Lease Modal
- [ ] Aircraft Detail Modal → Payments tab → shows all payments with status
- [ ] Aircraft Detail Modal → Documents tab → shows related docs, downloadable
- [ ] Lease Modal → aircraft name → opens Aircraft Detail Modal
- [ ] Lease Modal → lessee name → opens Lessee Detail Drawer
- [ ] Lease Modal → Payments tab → all payments, "Mark Paid" works
- [ ] Lessee card → "View Profile" opens Lessee Detail Drawer
- [ ] Lessee Detail Drawer → active lease → opens Lease Modal
- [ ] Lessee Detail Drawer → aircraft in lease → opens Aircraft Detail
- [ ] Lessee Detail Drawer → payment row → "Mark Paid" works
- [ ] Lessee Detail Drawer → "Invite to Portal" sends invite (queues email)
- [ ] Payments page → aircraft column → clickable → Aircraft Detail
- [ ] Payments page → school column → clickable → Lessee Detail
- [ ] Documents page → related entity → clickable → correct detail panel
- [ ] Revenue page → school name → clickable → Lessee Detail
- [ ] Revenue page → aircraft → clickable → Aircraft Detail

### Invite Flow
- [ ] Admin invites lessee → user record created with role=flight_school, status=invited
- [ ] Admin invites owner → user record created with role=asset_owner, status=invited
- [ ] Invite email queued in emailQueue table
- [ ] `/accept-invite?token=X` validates token correctly
- [ ] Expired token shows appropriate error message
- [ ] Setting password activates account, clears token, auto-logs in
- [ ] Flight school after accept → redirects to /portal
- [ ] Owner after accept → redirects to /owner
- [ ] "Resend Invite" generates new token, invalidates old one

### Minimum Hours Logic
- [ ] "Pay Minimum" button fills hours field with lease.minimumHours
- [ ] Typing hours below minimum shows yellow warning
- [ ] Billable hours calculation shows correct value (MAX of reported vs minimum)
- [ ] Server recalculates billable hours independently (does not trust client)
- [ ] Payment record stores gross, commission (10%), net correctly
- [ ] History table shows both reported and billable when they differ

### Flight School Portal
- [ ] Login with flight_school role → redirects to /portal (not /dashboard)
- [ ] Sidebar shows only portal nav links
- [ ] My Aircraft shows only this school's leased aircraft
- [ ] Hour logging form only shows aircraft this school has active leases for
- [ ] Cannot log hours for future months
- [ ] Cannot log duplicate hours for same aircraft + month
- [ ] Pay Now modal lists all pending + overdue payments as checkboxes
- [ ] Simulated payment marks selected payments as Paid immediately
- [ ] "View Lease" on My Aircraft shows read-only lease terms

### Asset Owner Portal
- [ ] Login with asset_owner role → redirects to /owner (not /dashboard)
- [ ] Sidebar shows only owner nav links
- [ ] Owner sees only their own aircraft
- [ ] Revenue figures always show post-10% deduction (net amounts)
- [ ] Cannot see lessee contact details
- [ ] Cannot modify any data
- [ ] Documents page shows only docs related to their aircraft or their owner profile

### Notifications
- [ ] Submitting hours → in-app notification to admin
- [ ] Marking payment Paid → in-app notification to school
- [ ] Lease expiry 60 days → in-app notification to admin
- [ ] All notification triggers queue email in emailQueue table
- [ ] Email queue table has correct data for each email type

### Regression (Nothing Broken)
- [ ] Admin dashboard shows correct KPIs
- [ ] Aircraft CRUD (add/edit/delete) still works
- [ ] Owner CRUD still works
- [ ] Lessee CRUD still works
- [ ] Lease CRUD still works
- [ ] Payment CRUD still works
- [ ] Maintenance CRUD still works
- [ ] Documents upload/download still works
- [ ] `npm run check` passes with no TypeScript errors
- [ ] `npm run build` completes successfully

---

*Plan version: 2.0 | Date: March 2026 | Status: Ready for Implementation*
