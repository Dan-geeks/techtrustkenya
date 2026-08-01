# Vendor Portal Comprehensive Audit & Analysis — Milestone 2

**Author**: Explorer 1 (Vendor Portal Explorer)  
**Target Scope**: TechTrust Kenya Vendor Onboarding, Status Pages, Vendor Dashboard & Tabs  
**Date**: 2026-08-01  
**Status**: Completed  

---

## 1. Executive Summary

A comprehensive, code-level investigation was conducted across all vendor-related pages, routing wrappers, and dashboard tab components within the TechTrust Kenya electronics marketplace web application. 

### Key Findings Summary
- **Overall Quality**: The vendor portal codebase is well-structured, written in clean TypeScript/React with Supabase backend integration, and adheres strongly to the core Stitch design theme.
- **Critical & High Priority Issues Identified**:
  1. **UX/Navigation Context Break in OverviewTab**: The "View all orders" link targets `/orders` (the *Buyer* order history page) instead of remaining in the Vendor Dashboard context or triggering the Vendor Orders tab.
  2. **ProtectedRoute Indirect Redirection for Rejected Vendors**: `ProtectedRoute.tsx` redirects `rejected` vendors to `/vendor/pending` instead of directly to `/vendor/rejected`, resulting in an unnecessary double-bounce redirect.
  3. **SettingsTab Missing Essential Financial & Contact Fields**: `SettingsTab.tsx` lacks fields for `till_number` (M-Pesa till number needed for float payouts), `phone_number`, `county`, and `sub_county`.
  4. **Promotions Creation Flow Lacks M-Pesa Payment Integration**: `PromotionsTab.tsx` creates database promotion records marked inactive without initiating an STK push or payment step.
  5. **Design System Token Styling Gaps**: Missing `.text-stat` classes on review average rating numbers (`ReviewsTab.tsx`), missing Repair Request IDs with `.text-data-id` (`RepairsTab.tsx`), and generic `.text-price` application on non-price metrics in `StatCard` (`OverviewTab.tsx`).

---

## 2. Scope & Target Files Inspected

| Category | Component / Page File | Description |
| text | text | text |
| **Routing & Auth** | `src/components/auth/ProtectedRoute.tsx` | Route guard for vendor roles & verification status |
| **Routing Helper** | `src/lib/redirectByRole.ts` | Role-based post-login redirection helper |
| **Onboarding** | `src/pages/vendor/VendorRegister.tsx` | Multi-step vendor & customer registration wizard |
| **Onboarding** | `src/pages/vendor/VendorOnboarding.tsx` | Single-page vendor setup for existing auth users |
| **Status Pages** | `src/pages/vendor/VendorPending.tsx` | Pending admin approval status view with auto-check |
| **Status Pages** | `src/pages/vendor/VendorRejected.tsx` | Rejected vendor application view with rejection reason |
| **Status Pages** | `src/pages/vendor/VendorSuspended.tsx` | Suspended vendor account notification view |
| **Dashboard Core** | `src/pages/vendor/VendorDashboard.tsx` | Vendor Portal shell with 8 tab triggers & badges |
| **Dashboard Tab 1** | `src/components/vendor/OverviewTab.tsx` | Stats cards, action items, recent orders table |
| **Dashboard Tab 2** | `src/components/vendor/ProductsTab.tsx` | Inventory management, product CRUD, drag-and-drop images |
| **Dashboard Tab 3** | `src/components/vendor/OrdersTab.tsx` | Order queue, customer info, order fulfillment status updates |
| **Dashboard Tab 4** | `src/components/vendor/RepairsTab.tsx` | Customer repair service requests & quotation engine |
| **Dashboard Tab 5** | `src/components/vendor/ReviewsTab.tsx` | Product & service rating summaries and customer reviews |
| **Dashboard Tab 6** | `src/components/vendor/PromotionsTab.tsx` | Homepage & search promotion slot booking |
| **Dashboard Tab 7** | `src/components/vendor/AnalyticsTab.tsx` | 30-day GMV, revenue, average order value, top products |
| **Dashboard Tab 8** | `src/components/vendor/SettingsTab.tsx` | Business profile and shop configuration form |

---

## 3. Deep-Dive Component Findings

### 3.1 Routing & Vendor Protection (`ProtectedRoute.tsx`, `redirectByRole.ts`)
- **Observation**:
  - In `ProtectedRoute.tsx` (lines 53-57):
    ```tsx
    if (requireApprovedVendor) {
      if (vendorStatus === "suspended") return <Navigate to="/vendor/suspended" replace />;
      if (vendorStatus !== "approved" && vendorStatus !== "verified")
        return <Navigate to="/vendor/pending" replace />;
    }
    ```
- **Logic Chain**:
  1. When a vendor with `verification_status === 'rejected'` attempts to visit `/vendor/dashboard`, `requireApprovedVendor` evaluates to `true`.
  2. The check `vendorStatus === "suspended"` evaluates `false`.
  3. The check `vendorStatus !== "approved" && vendorStatus !== "verified"` evaluates `true`.
  4. The guard redirects the user to `/vendor/pending`.
  5. `VendorPending.tsx` mounts, runs its `useEffect` hook, checks Supabase, finds `verification_status === 'rejected'`, and navigates to `/vendor/rejected`.
- **Conclusion**: This produces an extra state transition, network query, and component remount. `ProtectedRoute.tsx` should directly check `if (vendorStatus === "rejected") return <Navigate to="/vendor/rejected" replace />;`.

### 3.2 Vendor Registration & Onboarding (`VendorRegister.tsx`, `VendorOnboarding.tsx`)
- **Observation**:
  - Both `VendorRegister.tsx` (lines 405-421) and `VendorOnboarding.tsx` (lines 166-183) invoke the Deno edge function `create-vendor-profile` via `invokeFunction`.
  - Form validation correctly enforces owner name, valid Kenyan phone format (`/^(07\d{8}|2547\d{8})$/`), business name, county selection, sub-county, minimum 2 shop photos (max 5MB each), and agreement to vendor terms.
  - GPS geolocation button attempts browser `navigator.geolocation` with fallback to manual input.
  - Online-only business checkbox ("I don't have a physical shop location") sets `physical_address` to `"Online-only — no physical shop location"`.
- **Caveat**:
  - In `VendorRegister.tsx` (line 229) and `VendorOnboarding.tsx` (line 133), latitude and longitude are required even if `noPhysicalAddress` is checked. For purely online vendors, forced GPS coordinates may require dummy coordinates or manual input override.

### 3.3 Status Views (`VendorPending.tsx`, `VendorRejected.tsx`, `VendorSuspended.tsx`)
- **Observation**:
  - `VendorPending.tsx` includes an auto-check effect on mount and a manual "Refresh status" button to prevent approved vendors from remaining stuck on the pending screen.
  - `VendorRejected.tsx` fetches `rejection_reason` from `vendor_profiles` and displays it in a red-tinted alert box (`bg-destructive/5 border-destructive/20`).
  - `VendorSuspended.tsx` displays suspension warning with support contact links.
  - All three status pages comply with Stitch colors (`#002766` background or cards, `#0058be` links, `#25c65f` success icons).

### 3.4 Vendor Dashboard Shell (`VendorDashboard.tsx`)
- **Observation**:
  - `VendorDashboard.tsx` renders top banner with `#002766` (`bg-primary`), business name in Sora font, and a pending orders badge on the Orders tab (`pendingOrders > 0`).
  - Supports 8 tabs: `Overview`, `Products`, `Orders`, `Repairs`, `Reviews`, `Promotions`, `Analytics`, `Settings`.
  - State management handles updating vendor state when settings change (`onUpdated={(v) => setVendor(v)}`).

### 3.5 Overview Tab (`OverviewTab.tsx`)
- **Observation**:
  - Calculates 4 stat cards: `Float released (lifetime)`, `Active orders`, `Pending Float funds`, `Seller rating`.
  - Displays pending action items (`payment_held` orders to prepare, `submitted` repair requests).
  - Displays Recent Orders table with order ID, item, amount, date, Float status pill (`Held` in blue, `Released` in green).
- **Defects & Deviations**:
  - **Broken Link**: Line 115 links to `/orders` (Buyer Order History page) instead of staying within vendor portal.
  - **Token Misuse**: Line 203 uses `text-price` on all `StatCard` metric values, including non-monetary metrics ("Active orders" count and "Seller rating"). Should use `text-stat` for non-price figures.

### 3.6 Products Tab (`ProductsTab.tsx`)
- **Observation**:
  - Handles full CRUD for products (`laptop`, `smartphone`, `accessory`, `spare_part`).
  - Supports image upload to Supabase storage bucket `product-images`, drag-and-drop reordering, main image selection, price validation (>= KSH 500), stock badge formatting (`Out of stock`, `Low: X`, `In stock: X`), and visibility toggle (`is_active`).
- **Defects & Deviations**:
  - **Missing Token**: Stock quantity count inside badges and character counter limit (`form.description.length/500`) do not use `.text-stat`.

### 3.7 Orders Tab (`OrdersTab.tsx`)
- **Observation**:
  - Filters orders by status: `payment_held`, `vendor_preparing`, `out_for_delivery`, `ready_for_pickup`, `delivered_awaiting_confirmation`, `confirmed`, `disputed`.
  - Includes full status update progression buttons (`Mark preparing` -> `Out for delivery` / `Ready for pickup` -> `Mark delivered`).
- **Design System Alignment**:
  - Order ID styled with `.text-data-id` (`#8A3B2F1C`).
  - Order quantity styled with `.text-stat`.
  - Amounts styled with `.text-price`.
  - Excellent compliance following Milestone 1 Survey D3 resolution.

### 3.8 Repairs Tab (`RepairsTab.tsx`)
- **Observation**:
  - Displays customer repair requests, problem descriptions, customer contact details.
  - Allows vendor to issue quotations (`quoted_price_ksh`), technician notes, and progress repair state (`received` -> `diagnosing` -> `in_repair` -> `ready_for_collection` -> `completed`).
  - Inserts notification of type `repair_update` to customer upon quote submission.
- **Defects & Deviations**:
  - **Missing Data ID**: Repair Request ID is not displayed in card header. Should render `#${r.id.slice(0,8).toUpperCase()}` with `.text-data-id`.
  - **Input Validation Gap**: Quotation input in Dialog lacks `min="1"` attribute in HTML input.

### 3.9 Reviews Tab (`ReviewsTab.tsx`)
- **Observation**:
  - Fetches product reviews, computes average product rating and average service rating.
  - Displays individual customer reviews with star breakdowns.
- **Defects & Deviations**:
  - **Missing Token**: Average product rating (`avgProduct.toFixed(1)`) and average service rating (`avgService.toFixed(1)`) in summary cards (lines 48 & 52) render as `text-2xl font-bold` without the `.text-stat` class.

### 3.10 Promotions Tab (`PromotionsTab.tsx`)
- **Observation**:
  - Vendors can select promotion types (`featured_homepage` KES 2,000/wk, `top_search` KES 1,500/wk, `trending_carousel` KES 1,000/wk) and duration (7, 14, 30 days).
  - Computes total price using `.text-price`.
- **Defects & Deviations**:
  - **Workflow Gap**: Promotion creation directly inserts into `promotions` table with `is_active: false` without triggering M-Pesa STK push or payment checkout. Needs STK push payment integration or payment notice.

### 3.11 Analytics Tab (`AnalyticsTab.tsx`)
- **Observation**:
  - Computes 30-day metrics: total orders, completed orders, total GMV, vendor payout revenue, average order value, and top 5 revenue-generating products.
- **Design System Alignment**:
  - `totalOrders` and `completedOrders` use `.text-stat`.
  - `revenue` and `avgOrder` use `.text-price`.
  - Product sales counts use `.text-stat` and revenue uses `.text-price`.
  - Perfect token compliance.

### 3.12 Settings Tab (`SettingsTab.tsx`)
- **Observation**:
  - Allows updating business name, owner name, physical address, city, operating hours, and Google Maps link.
- **Defects & Deviations**:
  - **Missing Core Fields**: Vendor profile form lacks fields for updating `till_number` (M-Pesa till number), `phone_number` / `phone`, `county`, and `sub_county`. Since float payouts are processed to the vendor's M-Pesa till/phone number, missing `till_number` in settings prevents vendors from updating payout details.

---

## 4. Design System Compliance Matrix

| Token Requirement | Standard Specification | Compliance Status | Observations / Violations |
| text | text | text | text |
| **Primary Navy Color** | `#002766` (`var(--primary-deep)`, `bg-primary`) | **COMPLIANT** | Applied on headers, left registration hero panel, buttons |
| **Interactive Blue Color** | `#0058be` (`var(--accent)`, `text-accent`) | **COMPLIANT** | Applied on active tab indicators, links, primary buttons |
| **Success Green Color** | `#25c65f` (`var(--success)`, `text-success`) | **COMPLIANT** | Applied on verified badges, payout released pills, positive metrics |
| **Heading Typography** | `Sora` (`font-display`, `h1..h4`) | **COMPLIANT** | Applied on all page titles, hero text, card headings |
| **Body Typography** | `Inter` | **COMPLIANT** | Base font set globally in `index.css` |
| **Price Font Token** | `.text-price` (JetBrains Mono) | **COMPLIANT** | Used across OverviewTab, ProductsTab, OrdersTab, RepairsTab, PromotionsTab, AnalyticsTab |
| **Stat Font Token** | `.text-stat` (JetBrains Mono) | **PARTIAL VIOLATION** | Used in OrdersTab and AnalyticsTab; MISSING in ReviewsTab (`avgProduct`/`avgService`) & OverviewTab `StatCard` non-price stats |
| **Data ID Font Token** | `.text-data-id` (JetBrains Mono) | **PARTIAL VIOLATION** | Used in OverviewTab and OrdersTab; MISSING in RepairsTab repair request headers |
| **Eyebrow Header Token** | `.text-eyebrow` (Inter 600 uppercase) | **COMPLIANT** | Applied to table headers in OverviewTab |

---

## 5. Itemized Defect Catalog

### Priority Breakdown
- **High**: 3
- **Medium**: 4
- **Low**: 3

| ID | Priority | Location | Description | Impact | Proposed Remediation |
|---|---|---|---|---|---|
| **V-01** | **High** | `OverviewTab.tsx:115` | "View all orders" button links to `/orders` (Buyer order page) | Breaks vendor portal navigation context | Change link target to stay in Vendor Dashboard or switch to Orders tab |
| **V-02** | **High** | `ProtectedRoute.tsx:55` | Rejected vendors redirected to `/vendor/pending` instead of `/vendor/rejected` | Unnecessary 2-step redirect hop and user confusion | Add `if (vendorStatus === "rejected") return <Navigate to="/vendor/rejected" replace />;` |
| **V-03** | **High** | `SettingsTab.tsx:12-73` | Missing `till_number`, `phone`, `county`, `sub_county` fields in shop settings | Vendor cannot view or update M-Pesa payout till number or contact info | Add input fields for `till_number`, `phone_number`, `county`, `sub_county` to settings form |
| **V-04** | **Medium** | `ReviewsTab.tsx:48,52` | Average rating values (`avgProduct`, `avgService`) missing `.text-stat` class | Typography token violation for key quantitative metric | Wrap rating values in `<span className="text-stat">{avgProduct.toFixed(1)}</span>` |
| **V-05** | **Medium** | `RepairsTab.tsx:96` | Repair Request card does not display Repair Request ID with `.text-data-id` | Inconsistent reference ID formatting across dashboard tabs | Add `<span className="text-data-id">#{r.id.slice(0,8).toUpperCase()}</span>` to card header |
| **V-06** | **Medium** | `OverviewTab.tsx:203` | `StatCard` applies `.text-price` to non-monetary metrics (seller rating, active orders count) | Token semantic misuse (price font used for non-price quantitative stat) | Accept `isPrice?: boolean` prop on `StatCard` and apply `text-stat` for non-price values |
| **V-07** | **Medium** | `PromotionsTab.tsx:43-59` | Promotion creation inserts record without triggering M-Pesa payment flow | Functional workflow gap (promotion created inactive without STK push) | Trigger M-Pesa STK push simulation modal or payment flow before creating promotion |
| **V-08** | **Low** | `ProductsTab.tsx:220` | Stock badge counts (`Low: X`, `In stock: X`) missing `.text-stat` class | Minor token polish | Wrap numeric quantity in `<span className="text-stat">{qty}</span>` |
| **V-09** | **Low** | `RepairsTab.tsx:133` | Quotation amount input missing `min="1"` attribute in dialog | Minor input validation gap | Add `min="1"` and `step="1"` to quotation `Input` |
| **V-10** | **Low** | `VendorRegister.tsx:229` | Online-only vendors forced to provide GPS coordinates during registration | Registration friction for home-based / online vendors | Skip strict GPS coordinate validation if `noPhysicalAddress` is checked |

---

## 6. Recommended Action Plan for Implementation Phase

1. **Fix Navigation & Protection Guards**:
   - Update `OverviewTab.tsx` to handle tab switching for "View all orders".
   - Update `ProtectedRoute.tsx` to handle `rejected` status directly.
2. **Complete SettingsTab Profile Coverage**:
   - Add M-Pesa till number (`till_number`), phone, county, sub-county input fields and save handler in `SettingsTab.tsx`.
3. **Typography & Token Polish**:
   - Add `.text-stat` to `ReviewsTab.tsx` average ratings and `OverviewTab.tsx` non-price stat cards.
   - Add `.text-data-id` to `RepairsTab.tsx` repair request cards.
   - Add `.text-stat` to stock level badges in `ProductsTab.tsx`.
4. **Promotions & Form Validation Polish**:
   - Add STK push payment prompt or notice in `PromotionsTab.tsx`.
   - Add validation bounds to quotation input in `RepairsTab.tsx`.

