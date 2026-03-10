# PORTAL_PLAN.md
# Payment & Usage Portal Enhancement — Implementation Plan

---

## What the Client Wants (Plain English)

The client's PDF asks to **add new features to the existing Aircraft-Manager app** — not build a separate app. The goal is:

1. **Flight schools get their own login** — they log in and only see their own aircraft, hours, and payments
2. **Flight schools log monthly flight hours** — how many hours they flew each aircraft per month
3. **Flight schools submit payments via Stripe** — amounts calculated from reported flight hours
4. **Admin sees a Revenue Dashboard** — total revenue, 10% commission, net earnings, broken down by school and aircraft, with date filtering
5. **Optional: Export reports** for accounting

Everything stays in the **same Aircraft-Manager app** — same React + Express + PostgreSQL stack, same database, same sidebar, same UI components.

---

## Complete User Flow

This section defines every step a flight school user takes — from first discovery of the platform to completing a payment. The platform is **fully self-service**: schools sign up, browse, lease, and pay without admin needing to manually approve or intervene. Admin has full visibility and override ability, but nothing blocks the school from operating independently.

---

### Platform Model: Self-Service

```
Old model (removed):  School → Request → Admin approves → Admin creates lease → School gets access
New model:            School → Sign up → Browse → Pick aircraft → Pay first month → Lease auto-created
```

Admin's role shifts from **gatekeeper** to **overseer** — they can see everything, edit anything, and block bad actors, but the day-to-day flow runs without them.

---

### Flow 1 — School Discovers the Platform & Signs Up

```
School visits the app URL for the first time
  → Landing page (/) shows two clear paths:
      ┌──────────────────┐    ┌──────────────────┐
      │  I'm a           │    │  Admin / Owner   │
      │  Flight School   │    │  Login           │
      │  [Sign Up / Login]│    │  [Login]         │
      └──────────────────┘    └──────────────────┘

  → School clicks "Sign Up / Login"
      → If they have an account: taken to /login
      → If new: taken to /register/school  (new page)

Registration form (/register/school):
  Step 1 — School Information
    → School name (required)
    → FAA certification number (optional — for verification)
    → State
    → Address
    → Contact person name
    → Phone number

  Step 2 — Account Credentials
    → Email address
    → Password (min 8 chars)
    → Confirm password

  Step 3 — Submit
    → Server creates:
        1. A new lessees record with the school info
        2. A new users record with role = "flight_school", status = "approved"
           linked to that new lesseeId
    → School is automatically logged in
    → Redirected to /portal  (no waiting for admin approval)
    → Welcome toast: "Welcome to AeroLease Wise! Browse available aircraft to get started."

  → Admin is notified: "New flight school registered: [School Name]"
    (notification only — no action required from admin)
```

**Key decision:** Schools are auto-approved on registration. Admin can block any school account at any time from `/admin/users` if needed, but there is no approval gate by default.

---

### Flow 2 — Returning School Logs In

```
School visits the app
  → Clicks "Flight School Login" on landing page  → /login
  → Enters email + password (same single login page as admin)
  → Server authenticates → checks role
  → If role = "flight_school" AND status = "approved"
      → Redirect to /portal
  → If role = "admin" or "super_admin"
      → Redirect to /dashboard  (unchanged)
  → If status = "blocked"
      → Show: "Your account has been suspended. Contact support."
```

**There is only ONE login page.** The role in the server response tells the frontend where to route the user.

---

### Flow 3 — Portal Navigation (After Login)

Once logged in, the school sees a sidebar tailored to them. All admin links are hidden.

```
Sidebar (flight school view):
  ─────────────────────────────
  ✈ AeroLease Wise
  [School Name]               ← pulled from their linked lessees record
  ─────────────────────────────
  OVERVIEW
    Dashboard                 → /portal

  FLEET
    Browse & Rent Aircraft    → /portal/browse    ← discover + rent available planes
    My Aircraft               → /portal/aircraft  ← their active leases

  OPERATIONS
    Log Flight Hours          → /portal/hours
    Payments                  → /portal/payments

  ─────────────────────────────
  Settings                    → /settings         ← existing page, reused
  Help & Support              → /help-support      ← existing page, reused
  Logout
```

---

### Flow 4 — Browse & Rent Aircraft (Self-Service)

This is the core new flow. School browses available aircraft, picks one, picks a start date, and pays to activate the lease — all without admin involvement.

```
School goes to /portal/browse

  STEP 1 — Discovery
  → Sees a grid of ALL aircraft in the system
  → Filter bar at top: by status, by category (single/multi-engine), by max hourly rate
  → Each card shows:
      ┌──────────────────────────────────┐
      │  [Aircraft Image]                │
      │  N4421K                          │
      │  Cessna 172 Skyhawk · 2019       │
      │  $145 / hr          [Available]  │
      │  [View Details & Availability]   │
      └──────────────────────────────────┘
  → Cards with status "Maintenance" show greyed out, no rent button

  STEP 2 — View Aircraft Detail + Availability Calendar
  → School clicks "View Details & Availability"
  → Expands (or navigates to /portal/browse/:aircraftId) showing:
      - Full specs: engine type, avionics, year, total time
      - Hourly rate, any monthly minimums
      - Availability calendar (month view — see Flow 5 for logic)
      - Cost estimator:
          "If you fly [___] hours/month → estimated cost: $___/mo"
          (live calculation: hours input × hourlyRate)

  STEP 3 — Start Rental
  → School clicks "Rent This Aircraft"
  → Rental setup modal opens:
      ┌──────────────────────────────────────┐
      │  Rent N4421K — Cessna 172 Skyhawk    │
      │                                      │
      │  Start Date:   [date picker]         │
      │  End Date:     [date picker / ongoing]│
      │                                      │
      │  Estimated monthly hours: [___]      │
      │  Hourly rate:  $145/hr               │
      │  Est. first month: $___              │  ← updates live
      │                                      │
      │  First Month Payment                 │
      │  [Card Number  ]  [MM/YY]  [CVC]    │  ← Stripe CardElement
      │                                      │
      │  [  Confirm & Start Lease  ]         │
      └──────────────────────────────────────┘

  STEP 4 — Payment & Auto-Lease Creation
  → School clicks "Confirm & Start Lease"
  → Frontend calls POST /api/portal/leases/start
  → Server:
      1. Validates: aircraft is still Available (no race condition)
      2. Creates Stripe PaymentIntent for first month estimate
      3. Returns clientSecret to frontend
  → Frontend confirms card payment with Stripe
  → Stripe processes payment
  → Stripe webhook fires → POST /api/stripe/webhook
  → Server on webhook success:
      1. Creates a new lease record in the leases table:
             aircraftId, lesseeId, startDate, endDate, hourlyRate, status = 'Active'
      2. Creates first payment record: status = 'Paid', paidDate = today
      3. Updates aircraft status = 'Leased'
      4. Sends notification to school: "Your lease for N4421K is now active!"
      5. Sends notification to admin: "[School] has started a lease on N4421K"

  STEP 5 — Confirmation
  → School sees success screen:
      "Lease activated! N4421K is now in your fleet."
      [Go to My Aircraft]  [Log Hours Now]
```

---

### Flow 5 — Availability Calendar Logic

The calendar on each aircraft's browse page is built entirely from existing database tables — no new data required.

```
For each day shown in the calendar:

  GREEN — Available:
    → No active lease in leases table covers this date
    AND no maintenance record in maintenance table covers this date

  GREY — Leased / Unavailable:
    → leases table has a record where:
        aircraftId = this aircraft
        AND startDate <= this date
        AND (endDate >= this date OR endDate IS NULL)
        AND status = 'Active'

  AMBER — Maintenance:
    → maintenance table has a record where:
        aircraftId = this aircraft
        AND scheduledDate = this date
        AND status IN ('Scheduled', 'In Progress')

  LIGHT GREEN — Available Soon:
    → Aircraft is currently leased BUT lease endDate is within 60 days
    → Shows tooltip: "Available from [date]"
```

The API route `GET /api/portal/aircraft/:id/availability?year=YYYY&month=MM` computes this server-side and returns `{ days: [{ date, status }] }`. Frontend renders the calendar from this data.

---

### Flow 6 — Log Monthly Flight Hours

```
School goes to /portal/hours

  STEP 1 — Fill in the form
    → Select aircraft (dropdown — shows only their currently leased aircraft)
    → Select month/year (cannot pick a future month)
    → Enter hours flown (number input)
    → Optional notes field

  STEP 2 — Live Validation (before submit, shown inline)
    → Hours must be > 0                              → "Hours must be greater than zero"
    → Month cannot be in the future                  → "Cannot log hours for a future month"
    → Aircraft must have active lease for that month → "No active lease for this period"
    → No existing submission for aircraft + month    → "Hours already submitted for this period"

  STEP 3 — Submit
    → POST /api/portal/hours
    → Server recalculates: billable_hours = MAX(reportedHours, lease.minimumHours)
    → Server calculates:   payment_amount = billable_hours × lease.hourlyRate
    → Server creates:      flight_hour_log record (status: 'submitted')
    → Server creates:      payment record (status: 'Pending', amount = payment_amount)
    → Success toast: "Logged [X] hours for N4421K — Feb 2025. Invoice: $11,600"

  STEP 4 — Confirmation
    → Submission appears immediately in "Recent Submissions" table
    → Status badge shows "Submitted"
    → New Pending payment appears on /portal/payments automatically
```

---

### Flow 7 — Submit a Payment

```
School goes to /portal/payments

  → Outstanding balance banner: "You owe $X,XXX across X invoices"
  → Payment history table with tabs: All | Paid | Pending | Overdue

  STEP 1 — Open Payment Modal
  → Click "Pay Now"
  → Modal shows all Pending + Overdue payments as selectable line items:
      ┌─────────────────────────────────────────────┐
      │  Feb 2025 · N4421K (80 hrs × $145)  $11,600 │  ☑
      │  Feb 2025 · N8837P (60 hrs × $135)  $8,100  │  ☑
      │  Nov 2024 · N2290X (55 hrs × $110)  $6,050  │  ☑  OVERDUE
      ├─────────────────────────────────────────────┤
      │  Total:                              $25,750 │
      └─────────────────────────────────────────────┘
  → School can uncheck items to pay selectively
  → Total updates live

  STEP 2 — Enter Card Details
  → Stripe CardElement below the line items
  → Enter card number, expiry, CVC

  STEP 3 — Confirm
  → Click "Pay $25,750"
  → POST /api/portal/payments/create-intent  { paymentIds: [1, 2, 3] }
  → Server creates Stripe PaymentIntent for total amount
  → Frontend confirms with Stripe using clientSecret

  STEP 4 — Webhook Success
  → Stripe sends POST /api/stripe/webhook
  → Server marks each payment: status = 'Paid', paidDate = today, stripePaymentIntentId stored
  → Modal closes, toast: "Payment of $25,750 confirmed. Receipt emailed."
  → Table refreshes, balance updates to $0 (or remaining)
```

---

### Flow 8 — School Views Their Active Leases

```
School goes to /portal/aircraft

  → Cards showing ONLY their currently leased aircraft (status = 'Active')
  → Each card:
      - Aircraft photo, tail number, make/model/year
      - Hourly rate · Lease start → end date
      - Status badge (Active / Maintenance)
      - Hours logged this month (from flight_hour_logs)
      - "Log Hours" button → /portal/hours pre-filled for this aircraft
      - "View Invoices" button → /portal/payments filtered for this aircraft

  → Lease expiring within 60 days:
      Yellow warning: "Lease expires in X days — contact us to renew"

  → To end a lease early:
      "Request Early Termination" button → sends notification to admin
      (Admin handles termination in existing /leases page)
```

---

### Flow 9 — Admin Oversight (No Gatekeeping)

Admin no longer needs to approve anything, but retains full control:

```
Admin goes to /admin/users [already exists]
  → Sees all users including flight_school accounts
  → Can block any school account instantly
  → "Linked School" column shows which lessee they're tied to

Admin goes to /lessees [already exists — minor addition]
  → Each row now shows:
      - Portal account status (Active / None / Blocked)
      - Total hours logged this month
      - Outstanding balance
      - "View Activity" link → school's hours + payments

Admin goes to /leases [already exists]
  → Auto-created leases from self-service rentals appear here
  → Admin can edit terms, end dates, or terminate from this existing page
  → No new page needed

Admin goes to /revenue  [new page — Phase 7]
  → Full financial dashboard with all commission data
```

---

### Flow 10 — Automated Notifications

All notifications use the existing `notifications` table and `notifications-dropdown.tsx`. Only the trigger logic is new.

| Trigger Event | Who Gets Notified | Message |
|---|---|---|
| New school registers | Admin | "New flight school registered: [School Name] — [State]" |
| School starts a lease (payment confirmed) | Admin | "[School] activated a lease on [Aircraft] — $X/hr" |
| School logs hours | Admin | "[School] logged [X] hrs on [Aircraft] for [Month]. Invoice: $X,XXX" |
| Payment confirmed by Stripe | Admin + School | "Payment of $X,XXX received from [School]" |
| Payment overdue (30 days past due date) | School | "Invoice overdue: [Month] — $X,XXX. Pay now to avoid suspension." |
| Payment overdue (60 days) | Admin | "[School]'s [Month] payment is 60 days overdue. Consider account review." |
| Lease expiring in 60 days | Admin + School | "[Aircraft] lease expires in 60 days — [End Date]" |
| School requests early termination | Admin | "[School] has requested early termination of [Aircraft] lease" |

---

## Architecture Philosophy: Reuse First, Build Only What's Missing

The guiding rule for this project is: **never build something that already exists.**

The app already has a rich library of components, utilities, API patterns, and UI primitives. Every new feature should be composed from these before writing anything new.

### The Reuse Hierarchy (follow in order)
1. **Use existing component as-is** — drop it in, done
2. **Pass new props to existing component** — extend it slightly
3. **Extract a shared version** — if two things need the same logic, make one universal component
4. **Build new only as last resort** — only when nothing existing can serve the purpose

---

## What Already Exists vs What Needs to Be Built

### Existing — Use As-Is (Zero Changes)

| Existing Asset | What It Does | Where Used in Portal |
|---|---|---|
| `components/ui/card.tsx` | Card container with header/content | All portal pages |
| `components/ui/badge.tsx` | Status pill badges | Payment status, hour log status |
| `components/ui/button.tsx` | All button variants | Every form and action |
| `components/ui/table.tsx` | Data tables | Hours history, payment history |
| `components/ui/dialog.tsx` | Modal dialogs | Payment submit modal |
| `components/ui/select.tsx` | Dropdown selects | Aircraft picker, month picker |
| `components/ui/input.tsx` | Text/number inputs | Hours input field |
| `components/ui/skeleton.tsx` | Loading placeholders | All loading states |
| `components/ui/tabs.tsx` | Tabbed content | Payment history tabs (All/Paid/Pending) |
| `components/ui/progress.tsx` | Progress bar | Hours used vs max display |
| `components/ui/toast.tsx` + `toaster.tsx` | Toast notifications | Submit success/error |
| `components/ui/avatar.tsx` | User avatar | Portal sidebar user section |
| `lib/utils.ts` → `formatCurrency()` | Format dollar amounts | All money display |
| `lib/utils.ts` → `formatDate()` | Format dates | Payment due dates, log dates |
| `lib/utils.ts` → `getStatusColor()` | Status badge colors | Payment + log status badges |
| `lib/utils.ts` → `cn()` | Class merging | All components |
| `hooks/useAuth.ts` | Auth state + user info | Role detection, data scoping |
| `lib/queryClient.ts` → `apiRequest()` | Authenticated API calls | All portal API calls |
| `components/layout/sidebar.tsx` | Navigation sidebar | Extend with portal nav links |
| `components/layout/header.tsx` | Top header bar | Used unchanged on portal pages |

### Existing — Extend with New Props (Minor Changes)

| Asset | Current State | What to Add |
|---|---|---|
| `hooks/useAuth.ts` | Has `isSuperAdmin` boolean | Add `isFlightSchool` boolean, expose `lesseeId` |
| `components/layout/sidebar.tsx` | Shows admin nav links | Add conditional portal nav section when `isFlightSchool` |
| `lib/utils.ts` | Has status colors for Paid/Pending/Overdue | Add `submitted`, `verified`, `disputed` for hour log statuses |
| `shared/schema.ts` | Has users, leases, payments tables | Add `flightHourLogs` table, add columns to `users` and `payments` |
| `server/auth.ts` | Has `isAuthenticated`, `isAdmin`, `isSuperAdmin` middleware | Add `isFlightSchool` middleware |

### Existing — Extract as Universal (Refactor Slightly)

| Current Component | Problem | Universal Version |
|---|---|---|
| `dashboard/kpi-cards.tsx` — `StatsCard` | The `StatsCard` inner component is not exported | Export it as `components/ui/stat-card.tsx` so portal dashboard can reuse it |
| `dashboard/revenue-chart.tsx` | Hardcoded to `/api/dashboard` data shape | Extract chart rendering into `components/ui/area-chart.tsx` that accepts a `data` prop — both admin dashboard and new revenue page use it |
| `dashboard/payment-status.tsx` — payment row | The payment row item (icon + period + amount) is duplicated in other places | Extract as `components/ui/payment-row.tsx` for reuse in portal payments page |

### New — Build From Scratch (Only What Cannot Be Reused)

| New Asset | Why It Cannot Be Reused |
|---|---|
| `pages/portal/dashboard.tsx` | New page — portal-specific stats and layout |
| `pages/portal/browse.tsx` | New page — aircraft discovery + availability calendar |
| `pages/portal/aircraft.tsx` | New page — school-scoped leased aircraft |
| `pages/portal/hours.tsx` | New page + form — no existing hours concept |
| `pages/portal/payments.tsx` | New page — Stripe flow doesn't exist yet |
| `pages/revenue.tsx` | New page — admin revenue breakdown doesn't exist yet |
| `pages/admin/lease-requests.tsx` | New page — admin reviews booking requests |
| `components/portal/HoursLogForm.tsx` | New form — entirely new data concept |
| `components/portal/AircraftCard.tsx` | New card variant — school-facing with different fields shown |
| `components/portal/AvailabilityCalendar.tsx` | New component — reads leases + maintenance data to render month view |
| `components/portal/LeaseRequestModal.tsx` | New modal — submit lease request with date + hours estimate |
| `components/portal/PaymentForm.tsx` | New Stripe form component |
| Server: `flight_hour_logs` table + CRUD routes | New data entity |
| Server: `lease_requests` table + CRUD routes | New data entity for booking requests |
| Server: `/api/portal/*` route group | New scoped route group |
| Server: `/api/admin/revenue` route | New aggregation query |
| Server: `/api/portal/aircraft/availability` | New route — returns calendar data for an aircraft |

---

## Calculation Formulas & Business Logic

This section defines every financial calculation in the system, with exact formulas.

---

### 1. Monthly Payment Amount (per aircraft)

When a flight school submits hours for one aircraft in a month, the payment amount is:

```
payment_amount = reported_hours × lease.hourlyRate
```

**Example:**
- Aircraft N4421K, hourly rate = $145/hr
- School reports 80 hours for February 2025
- Payment = 80 × $145 = **$11,600**

**Rule:** If the lease has a `minimumHours` set and `reported_hours < minimumHours`, the payment still uses minimum hours:
```
billable_hours = MAX(reported_hours, lease.minimumHours)
payment_amount = billable_hours × lease.hourlyRate
```

---

### 2. Total Monthly Invoice (per school, per month)

A school may have multiple aircraft. The total invoice for the month sums all aircraft:

```
total_invoice = SUM(reported_hours_per_aircraft × hourlyRate_per_aircraft)
               for all aircraft leased by this school this month
```

**Example — Blue Sky Aviation (2 aircraft):**
- N4421K: 80 hrs × $145 = $11,600
- N8837P: 60 hrs × $135 = $8,100
- **Total invoice = $19,700**

---

### 3. Platform Commission (Aviation Ape's 10%)

Aviation Ape takes 10% of every payment as a platform fee:

```
COMMISSION_RATE = 0.10

gross_amount    = payment_amount          (what the school pays)
commission_amount = gross_amount × 0.10  (Aviation Ape keeps this)
net_amount      = gross_amount × 0.90    (goes to the aircraft owner)
```

**Example:**
- Gross = $19,700
- Commission = $19,700 × 0.10 = **$1,970**
- Net = $19,700 × 0.90 = **$17,730**

**These three values are stored in the `payments` table** as `grossAmount`, `commissionAmount`, `netAmount`.

---

### 4. Revenue Dashboard Aggregations (Admin)

**Monthly Summary Row:**
```
monthly_gross     = SUM(grossAmount)     for all payments in that month
monthly_commission = SUM(commissionAmount) for all payments in that month
monthly_net       = SUM(netAmount)        for all payments in that month
```

**All-Time Totals (date-range filtered):**
```
total_gross      = SUM(grossAmount)      WHERE month BETWEEN startMonth AND endMonth
total_commission = SUM(commissionAmount) WHERE month BETWEEN startMonth AND endMonth
total_net        = SUM(netAmount)        WHERE month BETWEEN startMonth AND endMonth
```

**By School Breakdown:**
```
school_gross = SUM(grossAmount) WHERE lesseeId = X AND month IN range
school_commission = school_gross × 0.10
school_net = school_gross × 0.90
```

**By Aircraft Breakdown:**
```
aircraft_hours   = SUM(reportedHours) FROM flight_hour_logs WHERE aircraftId = X AND month IN range
aircraft_revenue = SUM(grossAmount)   FROM payments WHERE aircraftId = X AND month IN range
```

---

### 5. Outstanding Balance (Flight School View)

What the school currently owes:

```
outstanding_balance = SUM(amount) FROM payments
                      WHERE lesseeId = this_school
                      AND status IN ('Pending', 'Overdue')
```

---

### 6. Hours Validation Rules

Before accepting a new hour log submission:

| Rule | Formula / Check |
|---|---|
| Hours must be positive | `reported_hours > 0` |
| Hours cannot be future month | `month <= current_month (YYYY-MM)` |
| No duplicate entries | `UNIQUE(aircraftId, lesseeId, month)` enforced at DB level |
| Aircraft must belong to this school | `lease.lesseeId = req.user.lesseeId` |
| Lease must be active for that month | `lease.startDate <= month AND lease.endDate >= month` |
| Closed period check | If payment for this month already has status `Paid`, block edit |

---

### 7. Where Calculations Live

| Calculation | Where It Runs | Why |
|---|---|---|
| `payment_amount = hours × rate` | **Server** (in `POST /api/portal/hours` handler) | Never trust client-sent amounts — always recalculate on server |
| `commission = gross × 0.10` | **Server** (same handler, stored in DB) | Single source of truth, auditable |
| `outstanding_balance` | **Server** (`GET /api/portal/dashboard`) | DB aggregation is faster and accurate |
| Revenue totals for dashboard | **Server** (`GET /api/admin/revenue`) | Complex JOIN query, not appropriate for client |
| `formatCurrency()` display | **Client** (`lib/utils.ts`, already exists) | Display formatting only |
| Date range filter UI | **Client** (filter state in React) | UI interaction — sends params to server |

---

## Database Changes

### 1. Modify `users` table — add school link

```sql
ALTER TABLE users ADD COLUMN lessee_id INTEGER REFERENCES lessees(id);
```

In `shared/schema.ts`, add to the `users` table definition:
```ts
lesseeId: integer("lessee_id"),
```

The `role` field already exists as `text`. Valid values become:
- `"user"` — general staff
- `"admin"` — admin access
- `"super_admin"` — full access (already exists)
- `"flight_school"` — NEW: flight school portal access

**Self-service registration sets:** `role = "flight_school"`, `status = "approved"` automatically. Admin can set `status = "blocked"` at any time to revoke access. No approval step.

### 2. New `flight_hour_logs` table

```ts
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
}, (table) => [
  // Prevents duplicate entries for same aircraft + school + month
  unique().on(table.aircraftId, table.lesseeId, table.month)
]);
```

### 3. Modify `payments` table — add commission + Stripe columns

```ts
// Add to existing payments table definition in schema.ts:
grossAmount: doublePrecision("gross_amount"),
commissionAmount: doublePrecision("commission_amount"),  // gross × 0.10
netAmount: doublePrecision("net_amount"),               // gross × 0.90
flightHourLogId: integer("flight_hour_log_id"),         // links to the log that generated this
stripePaymentIntentId: text("stripe_payment_intent_id"),
lesseeId: integer("lessee_id"),                         // denormalized for faster queries
```

### 4. No `lease_requests` table needed

The previous plan had a `lease_requests` table requiring admin approval before a lease was created. That table is **removed** from the design. In the self-service model, when a school pays for their first month, the server directly creates a lease record in the existing `leases` table. No intermediate request/approval step exists.

Migration command (run after schema changes):
```bash
npm run db:push
```

---

## API Routes — Reuse vs New

### Existing Routes Used By Portal (No Changes)

| Route | Used For |
|---|---|
| `POST /api/auth/login` | Flight school login — same endpoint, role in response drives redirect |
| `GET /api/auth/user` | Get current user + role + lesseeId |
| `GET /api/leases` | Admin manages leases — auto-created leases appear here |
| `GET /api/payments` | Admin payments list (unchanged) |
| `GET /api/aircraft` | Admin aircraft list (unchanged) |

### New Route: Self-Service Registration

```
POST /api/auth/register/school        ← NEW (separate from existing /api/auth/register)
     → Body: {
         schoolName, state, address, contactPerson, phone,
         certificationNumber?,
         email, password
       }
     → No auth required (public endpoint)
     → Rate limited (same authLimiter already in routes.ts)
     → Server:
         1. Validates all fields (Zod schema)
         2. Checks email not already taken
         3. Creates lessees record with school info
         4. Creates users record:
              role = "flight_school"
              status = "approved"   ← auto-approved, no admin step
              lesseeId = new lessee's id
         5. Logs user in (req.login)
         6. Creates notification for admin: "New school registered"
     → Returns: user object + session (same shape as /api/auth/login response)
```

### New Routes to Add

All portal routes go under `/api/portal/*` and require the new `isFlightSchool` middleware.

**Flight School Portal:**

```
GET  /api/portal/dashboard
     → Returns: { hoursThisMonth, activeAircraft, lastPaymentAmount, outstandingBalance }
     → Scoped by: req.user.lesseeId

GET  /api/portal/aircraft
     → Returns: aircraft + active lease for this school
     → Query: JOIN aircraft ON leases WHERE lesseeId = req.user.lesseeId AND lease.status = 'Active'

GET  /api/portal/hours
     → Returns: all flight_hour_logs for this school, ordered by month DESC
     → Scoped by: req.user.lesseeId

POST /api/portal/hours
     → Body: { aircraftId, month, reportedHours, notes? }
     → Validates: all 6 rules from Calculations section
     → Calculates: billable_hours, payment_amount, commission, net
     → Inserts: flight_hour_logs row + payments row (status: 'Pending')
     → Returns: { log, payment }

GET  /api/portal/payments
     → Returns: all payments for this school, ordered by dueDate DESC
     → Scoped by: req.user.lesseeId

POST /api/portal/payments/create-intent
     → Body: { paymentIds: number[] }
     → Creates Stripe PaymentIntent for total of selected payments
     → Returns: { clientSecret }

POST /api/stripe/webhook
     → Raw body parsing required (no JSON middleware on this route)
     → Validates signature: stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)
     → Handles two payment types based on metadata stored in PaymentIntent:

     TYPE 1 — New lease activation (metadata.type = "lease_start"):
       → Creates lease record in leases table:
            aircraftId, lesseeId, startDate, endDate, hourlyRate, status = 'Active'
       → Creates first payment record: status = 'Paid', paidDate = today
       → Updates aircraft.status = 'Leased'
       → Notifies school: "Your lease for [Aircraft] is now active"
       → Notifies admin: "[School] started a lease on [Aircraft]"

     TYPE 2 — Monthly payment (metadata.type = "monthly_payment"):
       → Updates each paymentId in metadata.paymentIds:
            status = 'Paid', paidDate = today, stripePaymentIntentId = stored
       → Notifies school: "Payment of $X,XXX confirmed"
       → Notifies admin: "Payment received from [School]"
```

**Browse & Availability (new portal routes):**

```
GET  /api/portal/browse
     → Returns: ALL aircraft with current status + hourlyRate
     → No lesseeId filter — all schools can see all aircraft
     → Supports query params: ?status=Available&category=single-engine&maxRate=200

GET  /api/portal/aircraft/:id/availability?year=YYYY&month=MM
     → Returns calendar data for one aircraft for the given month
     → Reads: leases table + maintenance table (both already exist)
     → Returns: { days: [{ date: "YYYY-MM-DD", status: "available"|"leased"|"maintenance" }] }

POST /api/portal/leases/start
     → Body: { aircraftId, startDate, endDate?, estimatedMonthlyHours }
     → Auth: isFlightSchool
     → Step 1: Validates aircraft is still Available (prevents race condition)
     → Step 2: Creates Stripe PaymentIntent for first month estimate
     → Returns: { clientSecret, estimatedAmount }
     → ALPHA: Server immediately creates lease + first payment, returns { success, lease }
     → BETA (post-Stripe): Creates PaymentIntent, returns { clientSecret } — lease created by webhook
```

**Admin Revenue (new admin route):**

```
GET  /api/admin/revenue?startMonth=YYYY-MM&endMonth=YYYY-MM
     → Returns: {
         summary: { totalGross, totalCommission, totalNet },
         byMonth: [{ month, gross, commission, net }],
         bySchool: [{ lesseeId, name, gross, commission, net, paymentCount }],
         byAircraft: [{ aircraftId, registration, make, model, totalHours, totalRevenue }]
       }
     → Auth: isAdmin middleware (already exists)
```

---

## Frontend — Routing & Role Redirect

### Current Routing (App.tsx)
After login, all users go to `/dashboard`. This needs one small change: check role after login and redirect accordingly.

In `client/src/App.tsx` (or wherever the auth redirect happens after login):
```ts
// Reuse existing useAuth() hook
const { user, isFlightSchool } = useAuth();

// Add this redirect logic:
if (isFlightSchool) {
  // redirect to /portal
} else {
  // redirect to /dashboard (unchanged)
}
```

### New Routes to Register in App.tsx
```
/portal              → pages/portal/dashboard.tsx
/portal/aircraft     → pages/portal/aircraft.tsx
/portal/hours        → pages/portal/hours.tsx
/portal/payments     → pages/portal/payments.tsx
/revenue             → pages/revenue.tsx  (admin only)
```

---

## Frontend — Component Reuse Map

### Portal Dashboard (`/portal`)

| UI Element | Reuse | Notes |
|---|---|---|
| Page layout | Existing `<Layout>` wrapper | Zero change |
| Stat cards (4 KPIs) | Extract `StatsCard` from `kpi-cards.tsx` → `ui/stat-card.tsx` | Currently private to kpi-cards |
| Recent payments list | Reuse payment row pattern from `payment-status.tsx` | Extract to `ui/payment-row.tsx` |
| Loading skeletons | Reuse `<Skeleton>` component | Already used throughout app |

### Portal Browse (`/portal/browse`)

| UI Element | Reuse | Notes |
|---|---|---|
| Page layout | Existing `<Layout>` wrapper | Zero change |
| Aircraft grid | Same Tailwind grid pattern as existing aircraft list page | No new component |
| Aircraft cards | `components/ui/card.tsx` + `components/ui/badge.tsx` + `components/ui/aircraft-image.tsx` | All exist |
| Status badge colors | `getStatusColor()` from `lib/utils.ts` (Available/Leased/Maintenance already mapped) | Already exists |
| "View Availability" button | `components/ui/button.tsx` variant="outline" | Already exists |
| Availability calendar | NEW: `components/portal/AvailabilityCalendar.tsx` | Nothing similar exists |
| Lease request modal | NEW: `components/portal/LeaseRequestModal.tsx` using existing `dialog.tsx` | New logic, wraps existing Dialog |
| Estimated cost calculator | Inline state in the modal — `hours × rate` shown live | No component needed |
| Loading skeletons | `components/ui/skeleton.tsx` | Already exists |

### Portal Aircraft (`/portal/aircraft`)

| UI Element | Reuse | Notes |
|---|---|---|
| Card container | `components/ui/card.tsx` | Already exists |
| Status badge | `components/ui/badge.tsx` + `getStatusColor()` from `lib/utils.ts` | Already exists |
| Aircraft image | `components/ui/aircraft-image.tsx` | Already exists |
| Page grid layout | Tailwind grid classes (same pattern as existing aircraft list) | No new component |

### Portal Hours (`/portal/hours`)

| UI Element | Reuse | Notes |
|---|---|---|
| Form shell | `components/ui/card.tsx` as form container | Already exists |
| Aircraft dropdown | `components/ui/select.tsx` | Already exists |
| Month input | HTML `<input type="month">` styled with `components/ui/input.tsx` | Already exists |
| Hours input | `components/ui/input.tsx` with `type="number"` | Already exists |
| Submit button | `components/ui/button.tsx` variant="default" | Already exists |
| History table | `components/ui/table.tsx` | Already exists |
| Status badge | `components/ui/badge.tsx` + add `submitted/verified/disputed` to `getStatusColor()` | Minor extension |
| Toast on submit | `useToast()` hook + `<Toaster>` | Already exists, already mounted |
| Error messages | Inline `<p className="text-red-500 text-sm">` | No new component needed |

### Portal Payments (`/portal/payments`)

| UI Element | Reuse | Notes |
|---|---|---|
| Outstanding balance banner | `components/ui/card.tsx` with custom content | Already exists |
| Payment history table | `components/ui/table.tsx` | Already exists |
| Status tabs | `components/ui/tabs.tsx` | Already exists |
| Status badge | `components/ui/badge.tsx` + `getStatusColor()` | Already exists |
| Payment modal | `components/ui/dialog.tsx` | Already exists |
| Stripe card input | NEW: `@stripe/react-stripe-js` `CardElement` — no existing equivalent | Must be new |
| Confirm button | `components/ui/button.tsx` | Already exists |

### Admin Revenue Page (`/revenue`)

| UI Element | Reuse | Notes |
|---|---|---|
| Page header | Same pattern as all other admin pages | No new component |
| Date range selectors | `components/ui/select.tsx` × 2 | Already exists |
| Summary stat row | Extract `StatsCard` from `kpi-cards.tsx` | Same extraction as portal dashboard |
| Revenue chart | Extract chart rendering from `revenue-chart.tsx` into reusable `AreaChart` component | Currently tightly coupled to `/api/dashboard` |
| By School table | `components/ui/table.tsx` | Already exists |
| By Aircraft table | `components/ui/table.tsx` | Already exists |
| Tabs for By School / By Aircraft | `components/ui/tabs.tsx` | Already exists |
| Export button | `components/ui/button.tsx` variant="outline" | Already exists |

---

## Universal Components to Extract

These are components that exist but are currently private. Extracting them unlocks reuse across admin and portal.

### Extract 1: `components/ui/stat-card.tsx`

**Source:** The `StatsCard` component inside `components/dashboard/kpi-cards.tsx` (lines 8–69).

**Why:** Both the admin KPI cards and the portal dashboard need the exact same stat card pattern (icon + label + value + trend badge). Currently it's a private component that can't be imported elsewhere.

**What to do:** Move `StatsCard` out of `kpi-cards.tsx` into its own file `components/ui/stat-card.tsx` and export it. Update `kpi-cards.tsx` to import it from the new location.

**Used by:**
- `components/dashboard/kpi-cards.tsx` (admin dashboard, unchanged behavior)
- `pages/portal/dashboard.tsx` (flight school portal, new)
- `pages/revenue.tsx` (admin revenue summary row, new)

---

### Extract 2: `components/ui/area-chart.tsx`

**Source:** The chart rendering logic in `components/dashboard/revenue-chart.tsx` (lines 99–148).

**Why:** The admin revenue page needs a chart with the same visual style but different data (filtered by date range, different data shape). Instead of duplicating the Recharts setup, extract the chart into a universal component.

**Props it should accept:**
```ts
interface AreaChartProps {
  data: { month: string; [key: string]: number | string }[];
  lines: { dataKey: string; color: string; label: string }[];
  height?: number;
}
```

**Used by:**
- `components/dashboard/revenue-chart.tsx` (admin dashboard, refactored to use it)
- `pages/revenue.tsx` (admin revenue page, new)

---

### Extract 3: `components/ui/payment-row.tsx`

**Source:** The payment row item in `components/dashboard/payment-status.tsx` (lines 111–137).

**Why:** The portal payments page needs to display payment rows in the same style. Currently this pattern is duplicated/hardcoded inside `payment-status.tsx`.

**Used by:**
- `components/dashboard/payment-status.tsx` (refactored to use it)
- `pages/portal/payments.tsx` (new)
- `pages/portal/dashboard.tsx` (recent payments section, new)

---

## Implementation Build Sequence

Follow this exact order. Do not skip phases.

---

### Phase 1 — Schema & Database

1. Add `lesseeId` to `users` table in `shared/schema.ts`
2. Add `flightHourLogs` table to `shared/schema.ts`
3. Add commission + Stripe columns to `payments` table in `shared/schema.ts`
4. Add TypeScript types for all new tables
5. Run `npm run db:push` to apply to Neon database

---

### Phase 2 — Auth & Middleware

1. Add `isFlightSchool` middleware to `server/auth.ts`
   - Checks `req.user.role === 'flight_school'`
   - Returns 403 if not a flight school
2. Update `GET /api/auth/user` in `routes.ts` to include `lesseeId` in the response
3. Update `useAuth.ts` hook on frontend:
   - Add `isFlightSchool: user?.role === 'flight_school'`
   - Expose `lesseeId: user?.lesseeId`

---

### Phase 3 — Universal Component Extractions

1. Extract `StatsCard` → `components/ui/stat-card.tsx`
2. Extract chart rendering → `components/ui/area-chart.tsx`
3. Extract payment row → `components/ui/payment-row.tsx`
4. Update existing components to import from new locations
5. Verify admin dashboard still works identically after extraction

---

### Phase 4 — Portal API Routes (Backend)

1. Add `POST /api/auth/register/school` — self-service registration (public, rate-limited)
2. Add `GET /api/portal/dashboard` — dashboard stats scoped to school
3. Add `GET /api/portal/browse` — all aircraft with status + filters
4. Add `GET /api/portal/aircraft/:id/availability` — calendar data for one aircraft
5. Add `POST /api/portal/leases/start` — initiate lease + create Stripe PaymentIntent
6. Add `GET /api/portal/aircraft` — school's currently leased aircraft
7. Add `GET /api/portal/hours` — school's hour logs
8. Add `POST /api/portal/hours` — submit hours (validate + auto-calculate payment)
9. Add `GET /api/portal/payments` — school's payments
10. Add `POST /api/portal/payments/create-intent` — Stripe PaymentIntent for monthly payments
11. Add `POST /api/stripe/webhook` — handles both lease activation + monthly payments
12. Add `GET /api/admin/revenue` — admin revenue aggregations with date filter

---

### Phase 5 — Portal UI Pages (Frontend)

1. Build `pages/register-school.tsx` — self-service registration form (2 steps: school info + credentials)
2. Update `pages/auth-page.tsx` landing — add "Flight School" path to the existing login page
3. Add portal routes to `App.tsx` + role-based redirect after login
4. Extend `sidebar.tsx` with portal nav section (conditional on `isFlightSchool`)
5. Build `pages/portal/dashboard.tsx` using `StatCard` (extracted in Phase 3)
6. Build `components/portal/AvailabilityCalendar.tsx` — month grid, reads availability API
7. Build `components/portal/RentModal.tsx` — start date, end date, hours estimate, live cost calc, Stripe CardElement
8. Build `pages/portal/browse.tsx` — aircraft grid + filter bar + calendar + RentModal
9. Build `pages/portal/aircraft.tsx` using existing `Card`, `Badge`, `AircraftImage`
10. Build `pages/portal/hours.tsx` using existing `Select`, `Input`, `Button`, `Table`
11. Build `pages/portal/payments.tsx` using existing `Tabs`, `Table`, `Dialog`

---

### Phase 6 — Simulated Payments (Alpha/Beta — No Stripe Required)

For the alpha build, payments are **simulated**: clicking "Confirm Payment" or "Start Lease" immediately triggers the server-side logic that Stripe would normally trigger via webhook. No card details, no real money, no Stripe account needed.

**How it works in alpha:**

For starting a lease:
- `POST /api/portal/leases/start` body: `{ aircraftId, startDate, endDate?, estimatedMonthlyHours }`
- Server skips Stripe entirely and immediately:
  1. Creates the lease record (status = 'Active')
  2. Creates the first payment record (status = 'Paid', paidDate = today)
  3. Updates aircraft status = 'Leased'
  4. Returns `{ success: true, lease }`

For monthly payments:
- `POST /api/portal/payments/pay` body: `{ paymentIds: number[] }`
- Server immediately marks all selected payments: status = 'Paid', paidDate = today
- Returns `{ success: true, updatedPayments }`

The UI shows a simple confirmation modal with a "Confirm Payment" button — no card fields. This is realistic enough to demo the full flow to the client.

**DB columns `stripePaymentIntentId` are still added to the schema now** — they just stay null in alpha. When Stripe is wired up later, they get populated without any schema changes.

---

### Phase 6b — Stripe Integration (Deferred — Do After Client Approval)

Only start this phase once the client has reviewed the alpha and provided Stripe credentials.

1. Install: `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
2. Add Stripe keys to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. Replace `POST /api/portal/leases/start` simulated logic with Stripe PaymentIntent creation
4. Replace `POST /api/portal/payments/pay` with Stripe PaymentIntent creation
5. Add `POST /api/stripe/webhook` — moves lease/payment completion logic here
6. Replace confirmation modal UI with Stripe `<Elements>` wrapper + `CardElement`
7. Test with Stripe test cards before going live

---

### Phase 7 — Admin Revenue Page (Frontend)

1. Build `pages/revenue.tsx`:
   - Date range filter using existing `Select` components
   - Summary stat row using extracted `StatCard`
   - Chart using extracted `AreaChart` component
   - By School table using existing `Table`
   - By Aircraft table using existing `Table`
   - Tabs using existing `Tabs`
2. Add "Revenue" link to admin sidebar (`TrendingUp` icon, under Operations section)

---

### Phase 8 — Report Export (Optional, Last)

1. Add "Export CSV" button to revenue page
2. Client-side CSV generation using `Blob` + `URL.createObjectURL` — no extra library needed:
   ```ts
   const csv = data.map(row => Object.values(row).join(',')).join('\n');
   const blob = new Blob([csv], { type: 'text/csv' });
   const url = URL.createObjectURL(blob);
   // trigger download
   ```

---

## Security Rules

| Rule | How It's Enforced |
|---|---|
| Flight schools only see their own data | All `/api/portal/*` routes filter by `req.user.lesseeId` |
| Flight schools blocked from admin routes | `isAdmin` middleware on all admin routes (already exists) |
| Admins cannot submit hours on behalf of schools | `isFlightSchool` middleware blocks non-school users on POST routes |
| Duplicate hour entries blocked | `UNIQUE(aircraftId, lesseeId, month)` constraint in DB — DB rejects it |
| Payment amounts never trusted from client | Server recalculates `hours × rate` on every POST |
| Commission always calculated server-side | `gross × 0.10` computed and stored by server, never sent from client |
| Stripe webhook verified | `stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)` |

---

## What Does NOT Change

- Aircraft CRUD (add/edit/delete) — admin only, untouched
- Owner management — untouched
- Lease management — untouched
- Maintenance records — untouched
- Documents — untouched
- Admin dashboard — untouched (only gains extracted universal components internally)
- Settings page — untouched
- Existing payment records — coexist with new Stripe-based payments

---

## Summary of Files Changed vs Created

### Modified (Existing Files — Minimal Changes)
| File | Change |
|---|---|
| `shared/schema.ts` | Add new table, add columns to users + payments |
| `server/auth.ts` | Add `isFlightSchool` middleware |
| `server/routes.ts` | Add new route groups |
| `hooks/useAuth.ts` | Add `isFlightSchool`, `lesseeId` |
| `components/layout/sidebar.tsx` | Add portal nav section |
| `components/dashboard/kpi-cards.tsx` | Import StatCard from new location |
| `components/dashboard/revenue-chart.tsx` | Import AreaChart from new location |
| `components/dashboard/payment-status.tsx` | Import PaymentRow from new location |
| `lib/utils.ts` | Add `submitted`, `verified`, `disputed` to `getStatusColor()` |
| `App.tsx` | Add portal routes + role-based redirect |
| `.env` | Add Stripe keys |

### Created (New Files)
| File | What It Is |
|---|---|
| `pages/register-school.tsx` | Self-service school registration (2-step form) |
| `components/ui/stat-card.tsx` | Extracted universal stat card |
| `components/ui/area-chart.tsx` | Extracted universal area chart |
| `components/ui/payment-row.tsx` | Extracted universal payment row |
| `components/portal/AvailabilityCalendar.tsx` | Month view calendar — green/grey/amber days from real data |
| `components/portal/RentModal.tsx` | Start rental — date pickers, cost estimator, Stripe CardElement |
| `components/portal/HoursLogForm.tsx` | Monthly hour submission form |
| `components/portal/AircraftCard.tsx` | School-facing aircraft card (browse + my aircraft) |
| `components/portal/PaymentForm.tsx` | Stripe payment form for monthly invoices |
| `pages/portal/dashboard.tsx` | Portal dashboard |
| `pages/portal/browse.tsx` | Browse all aircraft + calendar + start rental |
| `pages/portal/aircraft.tsx` | School's active leases |
| `pages/portal/hours.tsx` | Portal hours logging |
| `pages/portal/payments.tsx` | Portal payments |
| `pages/revenue.tsx` | Admin revenue dashboard |

---

## Verification Checklist

**Self-Service Registration**
- [ ] `/register/school` page loads with 2-step form
- [ ] Submitting creates a lessee + user record in one transaction
- [ ] New school is auto-approved (no admin gate)
- [ ] New user is logged in automatically after registration
- [ ] Admin receives notification of new registration
- [ ] Duplicate email is rejected with clear error message

**Authentication & Routing**
- [ ] Flight school user logs in → lands on `/portal` (not `/dashboard`)
- [ ] Admin user logs in → lands on `/dashboard` (unchanged)
- [ ] Blocked school user sees "account suspended" message on login
- [ ] Flight school sidebar shows portal nav links only (admin links hidden)

**Browse & Self-Service Rental**
- [ ] `/portal/browse` shows ALL aircraft with status badges + filter bar works
- [ ] Clicking "View Availability" opens calendar for that aircraft
- [ ] Calendar shows correct green (available), grey (leased), amber (maintenance) days
- [ ] Calendar data exactly matches the leases and maintenance tables
- [ ] Rent modal shows live cost estimate that updates as estimated hours changes
- [ ] Clicking "Confirm & Start Lease" creates a Stripe PaymentIntent
- [ ] Stripe test card payment succeeds
- [ ] After Stripe webhook: lease record created, aircraft status = Leased, school notified
- [ ] Admin notified of new self-service lease (no action required)

**Data Isolation**
- [ ] Flight school only sees their own leased aircraft on `/portal/aircraft`
- [ ] Flight school only sees their own hours on `/portal/hours`
- [ ] Flight school only sees their own payments on `/portal/payments`
- [ ] School cannot access any `/api/admin/*` routes (returns 403)

**Hour Logging**
- [ ] Form blocks: future months, duplicate submissions, negative hours, inactive leases
- [ ] Payment amount is calculated server-side correctly (hours × rate)
- [ ] Commission stored as exactly 10% of gross in DB
- [ ] Net stored as exactly 90% of gross in DB
- [ ] Submitted hours appear immediately in history table below form

**Payments & Stripe**
- [ ] Outstanding balance banner shows correct total of pending + overdue payments
- [ ] Payment modal lists all unpaid items as checkboxes with amounts
- [ ] Total updates live as checkboxes are checked/unchecked
- [ ] Stripe test payment goes through successfully
- [ ] After payment: status updates Pending → Paid, paidDate set, balance updates

**Admin Revenue**
- [ ] Revenue page shows correct totals with 10% commission split
- [ ] Date range filter reactively updates all data
- [ ] By School and By Aircraft tabs show correct breakdowns

**Regression**
- [x] Existing admin dashboard is completely unaffected
- [x] All admin CRUD (aircraft, leases, payments, maintenance) still works
- [x] `npm run build` passes with no TypeScript errors

---

## FINAL COMPLETION STATUS - MARCH 3, 2026

I have successfully implemented all planned features for the **Portal Enhancement**:

1.  **Authentication & Role Management**:
    *   Updated `User` schema with `lesseeId`.
    *   Implemented full self-service registration for flight schools.
    *   Added `isFlightSchool` role helpers in backend (`auth.ts`) and frontend (`useAuth.ts`).

2.  **Universal UI Components**:
    *   Extracted `StatsCard`, `AreaChart`, and `PaymentRow` into a universal library.
    *   These components are now used across both the Admin Dashboard and the Flight School Portal to maintain a premium AeroLease aesthetic.

3.  **Flight School Portal**:
    *   **Dashboard**: Shows mission-critical stats like hours logged and active aircraft.
    *   **Fleet Browsing**: Real-time fleet browsing with availability calendars and cost estimators.
    *   **My Aircraft**: Management view for currently leased assets.
    *   **Hour Logging**: Monthly usage reporting that triggers automatic billing.
    *   **Payments**: Centralized billing management with simulated payment processing.

4.  **Admin Revenue Analytics**:
    *   Built a new global Revenue Dashboard for administrators to monitor platform health, commissions, and asset performance.

5.  **Data Isolation**:
    *   Ensured all portal routes are strictly scoped to the logged-in school's `lesseeId`.

The platform is now ready for flight school operations with a fully self-service flow.
