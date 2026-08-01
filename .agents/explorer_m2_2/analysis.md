# Milestone 2: Admin Dashboard & Queues Detailed Analysis Report

**Author**: Explorer 2 (Admin Portal Explorer)  
**Date**: 2026-08-01  
**Scope**: Full Codebase Audit of Admin Dashboard & Queues (`AdminDashboard.tsx`, `AdminLogin.tsx`, edge functions, auth hooks, routing, and Stitch design token compliance).

---

## Executive Summary

The TechTrust Kenya Admin Portal provides platform oversight for vendor verifications, buyer disputes, user account listings, and Float escrow transactions. 
Our read-only audit revealed that while the UI structure cleanly follows the Google Stitch design specification (using Sora, Inter, JetBrains Mono, `#002766` navy, `#0058be` primary blue, and `#25c65f` green), there are **4 critical functional defects / queue state mismatches / missing features** that impact system execution:

1. **Queue State Mismatch in Verifications Tab**: Profiles with `verification_status = 'verified'` are included in the "Approved" tab count (`counts.approved`), but excluded when querying the Approved tab (`query.eq("verification_status", "approved")`), resulting in empty or incomplete lists when filtering approved vendors.
2. **Dispute Resolution Payout Bypass**: Resolving a dispute in favor of a vendor in `AdminDisputes` updates `orders` DB status directly to `released` without calling the `release-float-payment` edge function or notifying the vendor, failing to trigger the actual M-Pesa B2C/B2B payout.
3. **Missing User Role Management**: The `AdminUsers` view is completely read-only. There are no UI controls or actions to promote/demote users, assign vendor/admin roles, or revoke permissions as required by the specification.
4. **Reject UX Flaw in Overview Queue**: Clicking "Reject" on a pending vendor in the Overview table redirects to the Verifications tab root without opening the rejection dialog or highlighting the vendor.

---

## 1. Overview Tab (`AdminOverview`)

### Functional Assessment
- **Metrics Grid**: Renders 6 StatCards: Total Users, Active Vendors, Pending Approvals, Lifetime GMV, Platform Revenue (10%), and Open Disputes.
- **Bento Layout**: 8-column "Pending Actions" queue alongside 4-column "Float Overview" & top-5 "Float Ledger".
- **Search Filtering**: Real-time filtering in Pending Actions for vendor name, owner name, or `VND-` reference ID.

### Issues & Observations
- **Overview Reject Action UX Flaw**: In `AdminOverview.decide(v, "rejected")` (line 183):
  ```tsx
  if (status === "rejected") {
    onOpenTab("vendors");
    return;
  }
  ```
  Clicking "Reject" in the Overview queue switches the active tab to `vendors`, but fails to pass the vendor ID or trigger the rejection modal. The admin lands on the Verifications tab without knowing which vendor was being rejected.
- **GMV Calculation**: Lifetime GMV (`stats.gmv`) sums `total_amount_ksh` for orders with `status === "confirmed"`. Orders held in Float before customer confirmation are properly kept out of GMV and listed under Float Overview.

---

## 2. Vendor Verifications Queue (`AdminVendors`)

### Application Inspection & Document Link Handling
- **Contact & Physical Location**: The detail dialog displays Owner Name, Email, Phone, Operating Hours, Physical Address (`physical_address`), County (`county ?? city`), Sub-County (`sub_county`), GPS coordinates (`gps_latitude ?? latitude`, `gps_longitude ?? longitude`), and embeds an interactive Google Maps iframe (`https://www.google.com/maps?q=lat,lng&z=16&output=embed`).
- **Document Links**: ID Document (`id_document_url`), Business Certificate (`business_certificate_url`), and Shop Photos (`shop_photo_urls`). Links open in new tabs with `target="_blank" rel="noreferrer"`. Missing documents render grayed-out icons (`DocIcon`).
- **Decision Workflow**:
  - `Approve`: Calls `applyVendorDecision(v, "approved")`, updating DB, creating an in-app notification, and triggering Deno Edge Function `notify-vendor-approved` for email delivery.
  - `Reject`: Requires written `rejection_reason` in a modal textarea.
  - `Suspend`: Requires written `suspension_reason` for active vendors.
  - `Reinstate` / `Re-open`: Reverts suspended/rejected vendors to approved/pending.

### Critical Defect: Approved Tab Queue State Mismatch
- **Location**: `AdminDashboard.tsx`, lines 513 & 520
- **Observation**:
  ```tsx
  // Counter aggregation (line 520):
  const k = r.verification_status === "verified" ? "approved" : r.verification_status;
  if (k in c) c[k] += 1;

  // Data fetching query (line 513):
  if (tab !== "all") query = query.eq("verification_status", tab);
  ```
- **Logic Chain**:
  When `tab === "approved"`, `query.eq("verification_status", "approved")` is executed. Any vendor profile with `verification_status = "verified"` (e.g. verified tier vendors) is counted in `counts.approved` (showing e.g. `Approved (3)`), but when the user clicks the "Approved" tab, those `"verified"` profiles are filtered out by `.eq("verification_status", "approved")`.
- **Impact**: The tab count displays a non-zero count, but the table displays zero rows or hides verified vendors.
- **Proposed Solution**: Update query for `approved` tab:
  ```tsx
  if (tab === "approved") {
    query = query.in("verification_status", ["approved", "verified"]);
  } else if (tab !== "all") {
    query = query.eq("verification_status", tab);
  }
  ```

---

## 3. Buyer Dispute Resolution Queue (`AdminDisputes`)

### Workflow & Display
- **Dispute Queue**: Fetches all orders where `status = "disputed"`, joining product details (`brand`, `model_name`), vendor profile (`business_name`), customer info (`full_name`, `phone_number`), amount, and customer's `dispute_reason`.
- **Actions**:
  - `Refund`: Updates `orders` DB row (`status = "refunded"`, `payment_status = "refunded"`), notifies customer.
  - `Release`: Updates `orders` DB row (`status = "confirmed"`, `payment_status = "released"`, `float_released_at = ISO timestamp`), notifies customer.

### Critical Defect: Dispute Release Bypasses Edge Function `release-float-payment`
- **Location**: `AdminDashboard.tsx`, lines 867-872
- **Observation**:
  ```tsx
  const resolve = async (o: DisputeOrder, outcome: "refund_customer" | "release_to_vendor") => {
    if (outcome === "refund_customer") {
      // ...
    } else {
      await supabase.from("orders").update({
        status: "confirmed",
        payment_status: "released",
        float_released_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", o.id);
      await supabase.from("notifications").insert([
        { user_id: o.customer_id, title: "Dispute resolved: in vendor's favor", message: "Payment was released to the vendor.", type: "dispute", reference_id: o.id },
      ]);
    }
  };
  ```
- **Logic Chain**:
  In `OrderDetail.tsx` (customer receipt confirmation), releasing Float invokes the `release-float-payment` Deno Edge Function. That function calculates the 90/10 split, initiates the M-Pesa B2C/B2B payout to the vendor's phone or till number, logs a payment event in `order_payment_events`, updates `payout_status` to `sent`, and sends an in-app notification to the vendor.
  In `AdminDisputes`, clicking "Release" updates `payment_status` directly in the database without invoking `release-float-payment`.
- **Impact**: No money is transferred to the vendor, `payout_status` remains empty/unprocessed, no payment event log is created, and the vendor receives no notification that their funds were released.
- **Proposed Solution**: In `AdminDisputes`, invoke `release-float-payment` via `invokeFunction("release-float-payment", { body: { orderId: o.id } })` (or an admin override flag if status is `disputed`) instead of doing a raw DB status update.

---

## 4. User Account Role Management (`AdminUsers`)

### Current Implementation
- **Data Display**: Fetches top 100 profiles from `profiles` joined with `user_roles`. Includes real-time search by name, email, or phone.
- **Badges**: Renders role badges for `admin` (primary blue), `vendor` (accent soft), and `customer` (muted).

### Missing Feature / Defect
- **Defect U1 (Read-Only User View)**: The project specification explicitly requires "User account role assignments and management". Currently, `AdminUsers` provides no UI buttons, select dropdowns, or actions to assign roles (e.g. promoting a customer to admin or assigning a vendor role), revoking roles, or suspending user accounts.

---

## 5. Escrow Ledger & Payments (`AdminPayments`)

### Ledger & Tracking
- **Summary Cards**: Displays "Held in Float" and "Released to vendors" aggregate totals.
- **Filtering & Pagination**: Status filter buttons (`All`, `Pending`, `Held`, `Released`, `Failed`) with client-side 20-item pagination controls.
- **Data Completeness**: Order ID, Customer Name & Phone, Amount, Payment Provider (`KCB` vs `Daraja`), M-Pesa Receipt #, Payment Status, Payout Status, and Created Date.

### Verification
- Full data visibility, clean handling of nulls (`—`), correct currency formatting, and complete design token compliance.

---

## 6. Design System Compliance & Token Audit

| Stitch Token / Rule | Expected Specification | Actual Implementation in Admin Portal | Compliance Status |
|---|---|---|---|
| **Primary Navy Color** | `#002766` (`hsl(217 100% 20%)`) | Header page titles (`text-primary font-bold`), primary badges | **COMPLIANT** |
| **Interactive Accent Blue** | `#0058be` (`hsl(212 100% 37%)`) | Active tab links, secondary buttons, "Internal" pill | **COMPLIANT** |
| **Success Accent Green** | `#25c65f` / `#22c55e` (`hsl(142 71% 45%)`) | `variant="approve"` deep green buttons, released status badges | **COMPLIANT** |
| **Sora Font** | Page & Hero Headings | `font-display` on `h1` titles across `AdminDashboard` & `AdminLogin` | **COMPLIANT** |
| **Inter Font** | UI Body & Forms | Default `font-sans` applied across all table cells, inputs, modals | **COMPLIANT** |
| **JetBrains Mono `.text-price`** | All monetary currency values | `formatKsh(...)` spans wrapped in `.text-price` in cards & tables | **COMPLIANT** |
| **JetBrains Mono `.text-stat`** | All metric counters | StatCard values set in `.text-stat` | **COMPLIANT** |
| **JetBrains Mono `.text-data-id`** | Order IDs, Vendor IDs, Phone Numbers, Receipts | Applied to `VND-`, `TXN-`, `#ORDER-`, phone numbers, and receipts | **COMPLIANT** |
| **Micro-Eyebrows `.text-eyebrow`** | Table headers & card section titles | `Th` component and card section labels set in `.text-eyebrow` | **COMPLIANT** |

---

## 7. Proposed Code Changes (Patch Preview)

### Proposed Patch 1: Fix Approved Tab Queue State Mismatch (`AdminDashboard.tsx`)
```tsx
// In AdminVendors load():
- if (tab !== "all") query = query.eq("verification_status", tab);
+ if (tab === "approved") {
+   query = query.in("verification_status", ["approved", "verified"]);
+ } else if (tab !== "all") {
+   query = query.eq("verification_status", tab);
+ }
```

### Proposed Patch 2: Fix Dispute Release Edge Function Call (`AdminDashboard.tsx`)
```tsx
// In AdminDisputes resolve():
  } else {
-   await supabase.from("orders").update({ status: "confirmed", payment_status: "released", float_released_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", o.id);
-   await supabase.from("notifications").insert([
-     { user_id: o.customer_id, title: "Dispute resolved: in vendor's favor", message: "Payment was released to the vendor.", type: "dispute", reference_id: o.id },
-   ]);
+   const { data: res, error } = await invokeFunction("release-float-payment", { body: { orderId: o.id } });
+   if (error || !res?.success) {
+     toast.error("Could not release float: " + (error?.message ?? res?.error ?? "unknown"));
+     return;
+   }
+   await supabase.from("notifications").insert([
+     { user_id: o.customer_id, title: "Dispute resolved: in vendor's favor", message: "Payment was released to the vendor.", type: "dispute", reference_id: o.id },
+   ]);
  }
```

### Proposed Patch 3: Overview Rejection UX Redirect (`AdminDashboard.tsx`)
```tsx
// In AdminOverview decide():
  if (status === "rejected") {
-   onOpenTab("vendors");
-   return;
+   // Switch to verifications tab with target vendor pre-selected for rejection modal
+   onOpenTab(`vendors?reject=${v.id}`);
+   return;
  }
```

---

## Conclusion & Verification Plan

- **Verification Command**: `npm run build` (Ensures 0 TypeScript errors).
- **Manual Verification Steps**:
  1. Login as Admin at `/admin/login`.
  2. Navigate tabs: Overview, Verifications, Disputes, Users, Escrow.
  3. Verify vendor detail modal populates physical address, GPS coordinates, Google Maps iframe, and document links.
  4. Verify Approved tab correctly lists vendors with `verification_status = 'verified'`.
  5. Verify resolving a dispute in favor of vendor triggers `release-float-payment` payout.
  6. Confirm all price values, stat values, and IDs use JetBrains Mono classes (`.text-price`, `.text-stat`, `.text-data-id`).
