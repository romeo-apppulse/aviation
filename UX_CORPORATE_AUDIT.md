# UX Corporate Audit — AeroLease Wise
_Date: 2026-03-11_
_Auditor: Senior UX Strategist (Claude Code)_

---

## Executive Summary

AeroLease Wise is a well-structured three-portal aviation fleet management platform with solid foundational data flows and a polished visual design. However, several critical gaps block real corporate usage:

**Top 3 Biggest Gaps:**

1. **No lease lifecycle management** — Leases can only be created or hard-deleted. There is no "Terminate", "Renew", "Suspend", or "Amend" action anywhere in the system. For a contract-heavy aviation finance platform, this is a Category 1 blocker. Real users will ask for it from day one.

2. **Invite flow has no tracking or resend capability** — Admin can invite owners and lessees via email, but once sent, there is no way to see when an invite was sent, resend it, copy the invite link, or cancel a pending invite. The `portalStatus: "invited"` badge exists in the UI but clicking it does nothing. This creates real operational dead ends.

3. **Asset Owner portal shows revenue data with no actionable financial outputs** — Owners can see their net revenue figures, but there is no way to export a revenue statement, no payment receipt history they control, no way to raise a dispute, and no understanding of when they will actually receive a payout. For a finance-adjacent platform managing millions in assets, this is a significant trust gap.

**Overall UX Health:** 6/10. The admin portal is operationally capable for basic day-to-day use. The portal and owner portals are functional but feel like read-only dashboards with limited agency. The information architecture is generally logical, though some cross-portal inconsistencies cause confusion.

---

## Critical Journey Gaps (Blocking Real Usage)

### Journey 1: Lease Termination / Amendment
- **Current flow:** Admin navigates to Leases → opens a lease → can view details or delete (hard delete with no cascade warning beyond "associated payments will also be deleted").
- **Gap:** No "Terminate" action that sets status to `Terminated` without destroying historical data. No "Amend" action to adjust terms mid-lease (rate changes, date extensions). No "Renew" shortcut that pre-populates a new lease form from an expiring one.
- **Impact:** Admin must hard-delete and recreate leases to handle normal lifecycle events, destroying payment history and audit trail. In a real operation, lease terminations are legal events that must be recorded, not erased. This is a compliance risk.
- **Recommended fix:** Replace the Delete action with a set of lifecycle actions: Terminate (with reason + effective date), Renew (clone with new dates), and Amend (edit active terms with a change log). Move hard-delete to a superadmin-only emergency action.

### Journey 2: Portal Invite → Resend / Cancel
- **Current flow:** Admin goes to Owners or Lessees list → owner/lessee card shows a `portalStatus: "invited"` badge → no further action available from that screen. The invite must have been sent from a detail drawer, but there is no visible "Resend Invite" button on the card or list.
- **Gap:** Once an invite is marked "invited", admin cannot: resend it if the email was missed, copy the invite link manually, see when the invite expires, or cancel it. A user in `invited` status who tries to log in gets a toast message saying "check your email" — but if the invite link expired, they are permanently locked out with no self-serve recovery.
- **Impact:** Operationally embarrassing. In a corporate B2B setting, invites routinely need resending. Support burden falls entirely on the admin.
- **Recommended fix:** Add "Resend Invite" and "Copy Invite Link" buttons to the owner/lessee card when `portalStatus === "invited"`. Add an invite expiry timestamp and a clear "Expired" badge state. Add a "Revoke Invite" option.

### Journey 3: Flight School Hour Submission → Admin Verification
- **Current flow:** Flight school submits hours via Hour Logging page → a payment is automatically generated → admin can view the payment in the Payments page. The hour log shows a `verifiedHours` field and `discrepancyFlagged` flag in the submission history table.
- **Gap:** There is no admin-facing UI to actually verify or dispute submitted hours. The `verifiedHours` field exists in the schema and is displayed in the portal, but admin has no page or action to set it. The workflow ends at "hours submitted" with no approval step visible to admin.
- **Impact:** The verification workflow is half-built. Admins cannot exercise the oversight implied by the system, and schools see "Verified" status that may never actually change.
- **Recommended fix:** Add an "Hour Submissions" section to the admin Maintenance or a dedicated review page. Show pending submissions with an "Approve" action that sets `verifiedHours` and optionally a "Flag Discrepancy" action that sets `discrepancyFlagged` and sends a notification.

### Journey 4: New Admin Registration → Account Approval
- **Current flow:** A new admin registers via `/register` → sees "Request Logged" success screen → redirected to login → gets "Account Pending" toast → can log in but is shown `PendingApproval` page → must wait for a super admin to approve them in `/admin/users`.
- **Gap:** There is no email notification to the approving admin. The pending user has no estimated timeline, no way to contact anyone, and no way to know their request was even received by a human. The "pending approval" page is a dead end with no information.
- **Impact:** New admin onboarding is invisible. A user could register, wait days, and never know whether to follow up or re-register.
- **Recommended fix:** On the Pending Approval page, show "Your request was received on [date]. You will receive an email notification when approved." Add a notification or email to existing admins/super admins when a new registration arrives.

### Journey 5: Aircraft Added → Lease Created → Payment Generated
- **Current flow (happy path):** Add aircraft → Add Owner → Add Flight School → Create Lease → (hourly flow) Log Hours → Payment auto-generated, OR (admin flow) Record Payment manually.
- **Gap:** The system has two parallel payment creation mechanisms (manual "Record Payment" and auto-generated from hour logs) with no clear guidance on which one to use and no deduplication check. A payment for "January 2025" could be created both manually and auto-generated, resulting in doubled invoices. The flight school portal shows all payments regardless of origin.
- **Impact:** Data integrity risk. In production, doubled invoices would cause payment disputes.
- **Recommended fix:** Add a uniqueness constraint UI warning: before creating a manual payment, check if one already exists for that lease + period and show a "Payment already exists for this period" warning. Clearly label auto-generated payments differently from manually recorded ones.

---

## Per-Role Experience Analysis

### Admin Experience

**Strengths:**
- Comprehensive CRUD across all major entities (aircraft, owners, lessees, leases, payments, maintenance, documents).
- Good cross-linking: clicking aircraft on the payments page opens the aircraft detail modal; clicking the lessee opens the lessee drawer. This reduces context switching.
- Grid/list view toggle on most entity pages is a genuine power-user feature.
- Delete confirmations with AlertDialog are consistently implemented across all destructive actions.
- The Revenue Analytics page (`/admin/revenue`) is well-designed with time-range filtering, multi-tab breakdown (by school, owner, aircraft), and CSV export. This is the platform's strongest page.
- Skeleton loading states are present throughout — no jarring empty flashes.

**Gaps and Missing Actions:**
- **No lease status change actions** (terminate, renew, suspend). Delete is the only lifecycle action.
- **No bulk actions anywhere.** Cannot bulk-approve payments, bulk-mark maintenance complete, or bulk-archive leases. This becomes painful with scale.
- **No date range filter on payments page.** The payments list can grow very large; filtering by status is available but no date range filter exists. An admin looking for "all overdue payments in Q1 2025" has no direct path.
- **No "Overdue" automation.** Payments are manually set to "Overdue" — there is no system that automatically transitions Pending payments past their due date to Overdue. Admin must manually identify and update them.
- **Document upload is present but has no visibility.** There is a `/documents` page but no audit trail of who uploaded what and when. There is also no way for the admin to see which aircraft or lessees are missing required documents.
- **Password reset tells users to "contact your administrator."** For a platform where admin users self-register, this creates a circular dependency — if the only admin forgets their password, there is no recovery path visible.
- **The sidebar navigation is role-aware but admin portal items for `/admin/users` are only visible to `super_admin`**, while regular `admin` cannot access it. A regular admin has no way to invite portal users without super admin access, which is a significant workflow gap if the roles are designed with a separation of concerns.
- **Settings page** — not audited in detail but referenced in navigation. Settings for notification preferences, platform fee rates, or billing cycles are expected here by corporate users.

### Flight School (Lessee) Experience

**Strengths:**
- The dashboard is clean, well-organized, and shows the 4 most important metrics immediately: hours logged, active aircraft, last payment, and outstanding balance.
- Lease expiry warnings (15-day urgent, 60-day caution) are a strong proactive UX pattern.
- The live invoice preview during hour logging (showing billable hours, rate, and estimated amount) is excellent UX that reduces billing surprises.
- "Pay Minimum (X hrs)" shortcut button in the hour logging form is a thoughtful affordance.
- PDF invoice download with jsPDF is a genuinely useful self-serve capability.
- The "Scheduling" quick link on My Fleet page, while currently linking to hour-logging (not a calendar), establishes the right mental model.
- The portal's maintenance page allows schools to log, edit, and track maintenance records — full CRUD is a significant differentiator.

**Gaps and Missing Actions:**
- **No ability to view or respond to discrepancy flags.** The submission history shows `discrepancyFlagged` and `discrepancyNotes`, but the school has no action path when flagged. They can see the flag but cannot dispute it, acknowledge it, or submit corrected hours.
- **The "Scheduling" button on My Fleet links to `/portal/hour-logging?aircraftId=X`.** This is mislabeled — it says "View maintenance & usage" but doesn't navigate to maintenance. This will confuse users who expect to see a calendar or maintenance schedule.
- **Documents page is completely passive.** Lessees cannot upload any documents — not even their own compliance certificates or maintenance logs. All document visibility is dependent on admin upload. In a corporate aviation context, schools will want to upload their own documents.
- **No in-app payment confirmation or receipt.** After clicking "Pay Now," a toast appears saying "Your simulated payment has been processed." The word "simulated" will cause confusion in production — users won't know if the payment is real. There is also no email confirmation or printable receipt for paid invoices beyond downloading the PDF.
- **Payments page sidebar says "Download Full Policy" but the button is `disabled` with `cursor-not-allowed`.** This is a dead-end UI element that should either link to an actual policy or be removed.
- **No way to contact the admin from the portal.** If a flight school has a billing question, payment dispute, or maintenance coordination need, there is no in-app messaging or contact mechanism. The only implicit path is email, which is outside the platform.
- **The portal header/sidebar gives no clear role indicator.** A flight school user sees the same generic header as all roles. There is no "You are logged in as [School Name]" context indicator.

### Asset Owner Experience

**Strengths:**
- Dashboard is well-designed with 4 KPI cards, portfolio overview with per-aircraft gross/net breakdown, and recent activity feed.
- Revenue page with period filtering (this month, last month, last 3 months, all time), area chart, and both monthly and per-aircraft breakdowns is strong.
- Platform fee transparency (clearly showing 10% deduction) builds trust.
- Aircraft detail pages with lease information and maintenance history give owners meaningful visibility.
- Clicking through from Dashboard to aircraft detail works cleanly.

**Gaps and Missing Actions:**
- **Owners cannot see which flight school is operating their aircraft in real-time.** The aircraft detail shows the `currentLease` with lessee info, but if an owner wants to know "who is flying my aircraft RIGHT NOW and how many hours have they logged this month," there is no direct view. The revenue page shows past payments but not live utilization.
- **No revenue export for owners.** The revenue page has no export/download button. An asset owner managing a portfolio of aircraft for tax or financial reporting purposes needs to extract this data. The admin revenue page has CSV export, but owners cannot access that.
- **Owner revenue shows "Platform Fee (10%)" as a hardcoded label.** If the actual commission rate changes per lease or per owner, this label will be incorrect. There is no lease-specific rate visibility.
- **Documents page is read-only.** Owners cannot upload their own aircraft certificates, airworthiness documents, or ownership titles. For corporate asset owners with compliance obligations, this is a gap.
- **No maintenance cost visibility at portfolio level.** Individual aircraft maintenance is visible on the aircraft detail page, but there is no aggregated "total maintenance costs this quarter across my portfolio" view on the revenue or dashboard pages. For owners, maintenance costs directly affect net returns.
- **Owner dashboard shows "net revenue" but there is no payout/disbursement tracking.** An owner knows they are owed $X, but cannot see when the platform will actually transfer those funds, whether a transfer has been initiated, or what the banking details on file are.
- **The owner portal has no notifications page.** The `/notifications` route is accessible (it's not role-restricted in App.tsx), but the owner portal sidebar may not include it. Owners would reasonably want notifications for new payments, maintenance alerts on their aircraft, or lease expirations.

---

## Information Architecture Issues

### Issue 1: Dual "Maintenance" Surfaces with Different Scopes
The admin `/maintenance` page shows ALL maintenance across the entire fleet, attributed to who reported it (admin or lessee). The portal `/portal/maintenance` shows only the lessee's own records and allows full CRUD. These are the same data but with different scopes and capability sets. There is no UI indication to either user that both views share a database — a lessee cannot tell that the admin can see their maintenance records, and an admin cannot easily distinguish admin-created from lessee-created records in the main view. The `reportedByLessee` column exists in the admin table, which is good, but it just shows "Admin" as a fallback rather than "You (Admin)."

### Issue 2: "Payments" Means Different Things to Different Users
- **Admin payments page:** Records ALL payments across all leases, can create manual payment records, mark as paid, delete records. This is a ledger management tool.
- **Portal payments page:** Shows only the lessee's invoices, allows selection + "Pay Now" (simulated). This is a bill-pay interface.
- **Owner revenue page:** Shows net amounts per aircraft. This is a royalty statement.
These are three very different concepts using the same word. Navigation labels across portals should be more differentiated: admin = "Ledger" or "Billing Records", portal = "My Invoices", owner = "Earnings".

### Issue 3: Admin Can Preview Both Portals, But Without Context
In `App.tsx`, `isAdmin || isFlightSchool` can access portal routes, and `isAdmin || isAssetOwner` can access owner routes. This means an admin who navigates to `/portal/dashboard` or `/owner/dashboard` will see the portal — but scoped to their own `lesseeId` / `ownerId`, which for an admin is likely `null`. The admin will see "No aircraft leased yet" or "No aircraft in portfolio" — not a preview of the portal as their client sees it. There is no "Preview as [lessee name]" administrative capability.

### Issue 4: Documents Have No Structured Type Taxonomy
The Documents page (`/documents` admin) shows documents with a "type" field. Documents are linked to aircraft or leases. But the system has no enforced document types (e.g., Airworthiness Certificate, Annual Inspection Report, Lease Agreement PDF, Insurance Certificate). Without a taxonomy, users cannot filter for compliance-critical documents or know which documents are required vs optional.

### Issue 5: Notifications Are Not Role-Scoped in UI
The `/notifications` page is navigable by all roles (there is no role guard in App.tsx for that route). However, it is unclear whether notifications are scoped to the logged-in user's role. An admin managing 50 lessees may see all system notifications; a flight school user should only see their own. The UI doesn't indicate notification source or recipient scope.

---

## Zero-State and Onboarding Gaps

### Gap 1: Empty Admin Dashboard — No Guided Onboarding
When an admin logs in for the first time with zero data, the dashboard renders KPI cards with `0` values and empty charts. There is no "Get Started" panel, no onboarding checklist (Add your first aircraft → Add an owner → Create a lease), and no contextual prompts explaining what to do next. A new admin would be unsure where to begin.

**Recommended fix:** Add a "Setup Checklist" banner on the dashboard that appears until the admin has at least one aircraft, one owner, one lessee, and one lease. Each item should be a direct link to the creation flow.

### Gap 2: Flight School Portal with No Aircraft
When a flight school user logs in but has no active lease (i.e., `lesseeId` is linked to a lessee with no current lease), the My Fleet page shows a dashed-border empty state: "No aircraft leased yet. Contact your account manager to set up a lease." This is reasonable, but the dashboard still shows 4 stat cards all at 0/null. The visual hierarchy implies there should be data, making the experience feel broken rather than empty-by-design.

**Recommended fix:** When no leases exist, replace the KPI cards with a single contextual message: "Your fleet access will appear here once your lease is configured. Contact [admin name or email] to get started." Show the admin contact details.

### Gap 3: Asset Owner with No Aircraft
Similarly, the owner dashboard with no aircraft shows an empty portfolio grid with "No aircraft in portfolio. Contact your account manager to add aircraft." The 4 KPI cards all show 0. Same issue as the flight school — the zero state is cold and gives no next steps.

### Gap 4: The `PendingApproval` Page is a Dead End
After registering, a user in `pending` status sees only a "Your account is pending approval" message. There is no:
- Estimate of review time
- Admin contact information
- Ability to cancel the registration
- Any information about what "approval" involves or who reviews it
- No link to check status again without logging back in

### Gap 5: Accept Invite Page Has No Branding Context
The `/accept-invite` page shows the invite form without explaining what AeroLease Wise is, what the invitee's role will be, or what they can do after activating. For a first-time asset owner or flight school operator receiving an invite, this page provides no orientation. The page does show the user's name and email, which is good — but role context ("You are being invited as an Asset Owner") is absent.

---

## Missing Features (High Business Value)

| Feature | Affected Role(s) | Business Impact | Notes |
|---|---|---|---|
| Lease Termination / Renewal / Amendment workflow | Admin | Critical — legal and financial accuracy | No lifecycle actions beyond Create and hard-Delete |
| Invite resend / copy link / expiry tracking | Admin | High — operational blocker for onboarding | `portalStatus: "invited"` is a dead-end badge |
| Hour submission admin verification UI | Admin | High — verification workflow is half-built | Schema supports it; no UI |
| Date range filter on Payments | Admin | High — needed for period reporting | Status filter only |
| Overdue payment auto-detection | Admin | Medium — currently manual | No cron or status transition logic visible |
| Revenue export for Asset Owners | Asset Owner | High — needed for financial reporting / tax | Admin has CSV export; owner does not |
| Bulk actions (approve, mark paid, archive) | Admin | Medium — efficiency at scale | No bulk operations anywhere |
| Maintenance cost aggregation at portfolio level | Asset Owner | Medium — affects net return calculations | Only per-aircraft detail |
| In-app admin contact / messaging | Flight School, Asset Owner | Medium — closes the "how do I ask a question" gap | No support channel in app |
| Printable / PDF lease agreement | Admin, Asset Owner | Medium — contract documentation | Lease view exists but no print/export |
| Document type taxonomy + compliance checklist | Admin | Medium — regulatory compliance signal | Free-text type field only |
| "Preview as client" mode for admin | Admin | Low-Medium — support and troubleshooting | Admin sees empty portals when previewing |
| Audit trail / activity log | Admin | Medium — trust and compliance signal | No last-modified or change history on records |
| Payment dispute / correction workflow | Flight School, Admin | Medium — billing accuracy | No dispute mechanism |
| Notification preferences / mute settings | All roles | Low — quality of life | No notification preferences page |
| Payout/disbursement tracking for owners | Asset Owner | Medium — financial trust | Net revenue shown but no payout status |
| Self-serve password reset | All roles | High — "contact admin" is not viable at scale | Current workaround is admin-side password reset |

---

## Broken / Incomplete Flows

### Flow 1: Invite Sent → Invite Accepted → Role Assigned
**Starts cleanly:** Owner/lessee detail drawer has invite functionality.
**Breaks at:** No UI to verify invite was sent, track that it's pending, resend if expired, or cancel.
**Recovery:** Only by deleting and re-creating the owner/lessee record, which loses all associated data.

### Flow 2: Hour Submission → Admin Review → Verified Status
**Starts cleanly:** Flight school submits hours with full invoice preview and confirmation.
**Breaks at:** Admin has no UI page to see pending hour submissions and set `verifiedHours`.
**Result:** `verifiedHours` field in the portal history table either stays null (showing the reported hours in grey) forever, or is only settable directly in the database.

### Flow 3: Maintenance Reported by Flight School → Admin Awareness
**Starts cleanly:** Portal maintenance page allows flight schools to log maintenance records.
**Breaks at:** Admin maintenance page shows "Reported By: [lessee name]" in a column, but there is no filter for "show only lessee-reported records" and no notification is triggered to alert admin of a new lessee-reported maintenance item.
**Result:** Admin could miss critical maintenance reports from schools.

### Flow 4: Lease Expiry → Renewal
**Starts cleanly:** Dashboard and My Fleet page show lease expiry warnings (15/60 day triggers).
**Breaks at:** Clicking the expiry warning does nothing — there is no CTA to initiate a renewal. Admin has no "Expiring Soon" filter on the leases page. No automatic notification is sent to admin or owner when a lease is within 30 days of expiry.
**Result:** Lease expiry is surfaced visually but has no actionable workflow attached.

### Flow 5: Admin Password Forgotten → Recovery
**Starts cleanly:** Login page has a "Reset Link" button.
**Breaks at:** Clicking it shows a toast: "Please contact your administrator to reset your password." If the user IS the administrator (or the only administrator), there is no recovery path within the application.
**Result:** Full lockout with no self-serve resolution.

### Flow 6: Plain User Registers → Gets Access
**Starts cleanly:** `/register` is open to anyone.
**Breaks at:** A user who registers with no role association gets approved by admin, but upon login is shown `AccessDeniedPage` ("Your account does not have portal access"). There is no admin workflow to assign an approved user to a lessee or owner entity. The admin user management page (`/admin/users`) can only set roles to `user`, `admin`, or `super_admin` — not `flight_school` or `asset_owner`. Linking a user to a lessee/owner entity appears to only happen through the invite flow, not through the admin user management UI.
**Result:** Self-registered users who are approved get permanently stuck with "No Portal Access" unless the super admin manually edits the database or uses a mechanism not visible in the frontend.

### Flow 7: Lessee Deleted → Orphaned Payments / Leases
**From leases.tsx:** "This action cannot be undone and will also delete any associated payments."
**From lessees.tsx:** Delete confirmation only says "This will permanently delete the flight school. This action cannot be undone." — no mention of cascading effects on leases, payments, or flight hour logs.
**Gap:** Admin is not warned that deleting a lessee will destroy lease and payment history. The leases deletion dialog does warn about payments, but the lessee deletion does not surface this information. Inconsistent cascade warnings.

---

## Priority Enhancement Roadmap

| Priority | Feature / Fix | Role Affected | Effort |
|---|---|---|---|
| P0 — Blocker | Lease lifecycle actions (Terminate, Renew, Amend) replacing hard-delete | Admin | Large |
| P0 — Blocker | Hour submission verification UI for admin | Admin | Medium |
| P0 — Blocker | Self-registered user → entity linking in admin user management | Admin | Medium |
| P1 — Critical | Invite resend, copy link, expiry display, and cancel | Admin | Small |
| P1 — Critical | Self-serve password reset flow | All roles | Medium |
| P1 — Critical | Plain user "no portal access" — guided resolution | All roles | Small |
| P1 — Critical | Admin notification when new registration or maintenance reported by lessee | Admin | Small |
| P2 — Important | Date range filter on Payments and Maintenance pages | Admin | Small |
| P2 — Important | Revenue export (CSV/PDF) for Asset Owner portal | Asset Owner | Small |
| P2 — Important | Lease expiry notification to admin + "Renew" CTA on warning banners | Admin, Flight School | Medium |
| P2 — Important | Deduplicate payment warning (same period + lease already has a payment) | Admin | Small |
| P2 — Important | Cascade warning on lessee/owner delete (leases + payments affected) | Admin | Small |
| P2 — Important | "You are logged in as [School/Owner Name]" role indicator in portal header | Flight School, Asset Owner | Small |
| P3 — Enhancement | Admin onboarding setup checklist on empty dashboard | Admin | Small |
| P3 — Enhancement | Zero-state improvements for portals with no active leases | Flight School, Asset Owner | Small |
| P3 — Enhancement | "Scheduling" link label correction on My Fleet (currently mislabeled) | Flight School | Trivial |
| P3 — Enhancement | Remove / fix disabled "Download Full Policy" button on portal payments | Flight School | Trivial |
| P3 — Enhancement | Document type taxonomy + required documents compliance checklist | Admin | Medium |
| P3 — Enhancement | Maintenance cost aggregation on owner portfolio dashboard | Asset Owner | Small |
| P3 — Enhancement | Audit trail (last modified by, timestamp) on key records | Admin | Medium |
| P4 — Nice to Have | In-app messaging / contact admin from portals | Flight School, Asset Owner | Large |
| P4 — Nice to Have | "Preview as client" mode for admin | Admin | Large |
| P4 — Nice to Have | Bulk actions (mark paid, approve, archive) | Admin | Medium |
| P4 — Nice to Have | Payout / disbursement tracking for owners | Asset Owner | Medium |
| P4 — Nice to Have | Notification preferences / mute settings | All roles | Small |

---

## Appendix: Terminology Inconsistencies

The following terminology is used inconsistently across the codebase and UI, which will confuse users who see different labels for the same concept in different views:

- **"Lessee" vs "Flight School"** — The database table and API calls use `lessee`, but the admin UI pages use "Flight School" exclusively. The portal uses "School." Choose one canonical term.
- **"Simulated payment"** — The portal payments page says "Your simulated payment has been processed." This must be changed to either real payment language or clearly marked as a demo/test environment indicator, not surfaced to production users.
- **"Aviation APE"** — The jsPDF invoice generator hardcodes "Aviation APE" as the brand name in the invoice header, while the UI renders "AeroLease Wise." Invoices sent to clients will show the wrong brand name.
- **"Operations Login"** — The login page calls itself "Operations Login" in the heading. A flight school accountant or asset owner investor would not identify as an "operations" user. Consider role-neutral language: "Sign In to AeroLease Wise."
- **"Encryption Key" / "Encrypted Key"** — Login and register forms label the password field with security-theater jargon. Standard B2B platforms use "Password." The current labels sound alarming to non-technical corporate users.
- **"Fleet Intelligence OS"** — The tagline under the logo on login/register. This is marketing copy but feels inconsistent with the functional, document-heavy reality of an aviation leasing platform.
