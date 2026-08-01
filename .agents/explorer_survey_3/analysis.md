# Explorer 3 Analysis Report: Vendor & Admin Portals, Backend/Mock Integration & Interactive Flows

**Project:** TechTrust Kenya Electronics Marketplace  
**Working Directory:** `C:\Users\Administrator\techtrustkenya`  
**Explorer Agent:** Explorer 3 (Vendor & Admin Portals, Backend/Mock Integration Explorer)  
**Date:** 2026-08-01  

---

## Executive Summary

TechTrust Kenya features a fully architected vendor management, admin verification, and escrow payment system built on **React 18 + Vite + Tailwind CSS** on the frontend, with **Supabase (PostgreSQL + RLS + Storage)** and **Deno / Hono Edge Functions** handling backend database logic and payment integration.

During this read-only survey, Explorer 3 audited:
1. **Pages & Portals**: Vendor Dashboard (`/vendor/dashboard`), Vendor Registration & Onboarding (`/vendor/register`, `/vendor/onboarding`, `/vendor/pending`, `/vendor/rejected`, `/vendor/suspended`), and Admin Dashboard (`/admin/dashboard`, `/admin/login`).
2. **Interactive Flows & Queues**: M-Pesa STK payment simulation, Float escrow release mechanism, Vendor approval/rejection queue, Repair service booking queue, and Dispute submission/resolution queue.
3. **Backend & State Architecture**: Supabase client (`src/integrations/supabase/client.ts`), Auth/Role management (`src/hooks/useAuth.tsx`, `ProtectedRoute.tsx`), Deno Edge Functions (`supabase/functions/*`), and Hono API server (`server/index.ts`).
4. **Design System & Typography Compliance**: Font classes (`.text-price`, `.text-stat`, `.text-data-id`, Sora, Inter UI) and color tokens (`#002766` navy, `#0058be` secondary blue, `#25c65f` green, `#3B82F6` float blue).

### Key Findings Overview
- **Build Status**: `bun run build` and `npx tsc --noEmit` build cleanly with **0 errors**.
- **Edge Functions & Database Integration**: Backend flows (STK push, callback receiver, Float escrow release, vendor profile creation) are fully implemented with production-grade edge functions, RPC triggers (`mark_order_paid`), and audit logging (`order_payment_events`).
- **Defects Identified**:
  1. **Missing Lucide Icon Imports in `OverviewTab.tsx`**: `Lock` and `ShieldCheck` are used on lines 82, 165, and 172 of `src/components/vendor/OverviewTab.tsx` without being imported from `lucide-react`. Because TypeScript DOM definitions include `window.Lock`, `tsc` did not throw an error, but passing `window.Lock` as a React icon component causes runtime UI rendering failures.
  2. **Typography Inconsistencies**:
     - Order ID string in `src/components/vendor/OrdersTab.tsx` (line 88) lacks the `.text-data-id` class.
     - Numeric stat figures in `src/components/vendor/AnalyticsTab.tsx` (lines 53–56) use generic `text-2xl font-bold` instead of `.text-stat`.

---

## 1. Pages & Portals Audit

### 1.1 Vendor Dashboard (`src/pages/vendor/VendorDashboard.tsx`)
- **Route**: `/vendor/dashboard` (protected by `<ProtectedRoute roles={["vendor"]} requireApprovedVendor>`).
- **File Structure**:
  - Main tab wrapper: `src/pages/vendor/VendorDashboard.tsx` (146 lines).
  - Sub-components (`src/components/vendor/`):
    - `OverviewTab.tsx` (209 lines): Top-level metrics, action items, recent orders table, Float status pills.
    - `ProductsTab.tsx` (544 lines): Listing CRUD, image dropzone (up to 5 images uploading to `product-images` bucket), price validation (min KSH 500), active/hidden switches.
    - `OrdersTab.tsx` (130 lines): Order queue with status filter, status transition triggers (`vendor_preparing`, `out_for_delivery`, `ready_for_pickup`, `delivered_awaiting_confirmation`).
    - `RepairsTab.tsx` (149 lines): Repair request management, quotation modal, technician notes, repair stage workflow (`submitted` -> `quotation_sent` -> `received` -> `diagnosing` -> `in_repair` -> `ready_for_collection` -> `completed`).
    - `ReviewsTab.tsx` (79 lines): Average product & service ratings, buyer comments.
    - `PromotionsTab.tsx` (144 lines): Creation and management of featured homepage / search / carousel promotion campaigns.
    - `AnalyticsTab.tsx` (76 lines): 30-day order metrics, GMV, payout revenue, top 5 products.
    - `SettingsTab.tsx` (85 lines): Business details, physical address, city, operating hours, Google Maps link.
- **State & DB Integration**: Queries `vendor_profiles` table matching `user_id == user.id`. Loads live relations from Supabase.

### 1.2 Vendor Application & Onboarding
- **Routes & Pages**:
  - `VendorOnboarding.tsx` (`src/pages/vendor/VendorOnboarding.tsx`): Dedicated onboarding flow for users authenticated via Google OAuth. Collects owner name, phone, till number, business name, county, sub-county, physical address (or online-only toggle), shop GPS (HTML5 Geolocation API with fallback manual inputs), Google Maps link, shop photos (uploads to `shop-photos` bucket), business certificate (uploads to `vendor-documents` bucket). Calls `create-vendor-profile` edge function.
  - `VendorRegister.tsx` (`src/pages/vendor/VendorRegister.tsx`): 5-step wizard (Role -> Account -> Business -> Location & Photos -> Review) for email/password registration or adding vendor role to an existing account. Features password generator (`generateStrongPassword`), copy button, county select dropdown (`KENYA_COUNTIES`), and `create-vendor-profile` edge function integration.
  - `VendorPending.tsx` (`src/pages/vendor/VendorPending.tsx`): Status waiting room for pending vendor applications. Auto-checks `verification_status` on mount and on "Refresh status" button click. Redirects to `/vendor/dashboard` when status is `approved` or `verified`.
  - `VendorRejected.tsx` (`src/pages/vendor/VendorRejected.tsx`): Rejection screen displaying the specific `rejection_reason` recorded by the admin team in `vendor_profiles`.
  - `VendorSuspended.tsx` (`src/pages/vendor/VendorSuspended.tsx`): Account suspension notification screen.

### 1.3 Admin Dashboard (`src/pages/admin/AdminDashboard.tsx` & `AdminLogin.tsx`)
- **Routes**:
  - `/admin/login`: Dedicated sign-in page restricting access to internal admin staff.
  - `/admin` & `/admin/dashboard`: Protected admin portal (`<ProtectedRoute roles={["admin"]} loginPath="/admin/login">`).
- **File Structure**:
  - `src/pages/admin/AdminDashboard.tsx` (1,241 lines).
- **Core Admin Tabs**:
  1. **Overview Tab** (`AdminOverview`): Top stat cards (Total Users, Active Vendors, Pending Approvals, Lifetime GMV, Platform Revenue 10%, Open Disputes), quick verification queue with ID search, Float Overview progress gauge (Held vs Released), and Float Ledger.
  2. **Verifications Tab** (`AdminVendors`): Application review queue with tab filters (`pending`, `approved`, `suspended`, `rejected`, `all`). Features dense data table and detailed modal showing owner contact, location, embedded Google Maps iframe using GPS coordinates (`gps_latitude`, `gps_longitude`), document links (`id_document_url`, `business_certificate_url`, `shop_photo_urls`), rejection/suspension reason textareas, and the unified decision function `applyVendorDecision`.
  3. **Disputes Tab** (`AdminDisputes`): Queue of orders with status `disputed`. Shows order ID, product/vendor info, customer contact, total amount, and dispute reason snippet. Provides two resolution actions:
     - **Refund Customer**: Updates order status to `refunded`, payment_status to `refunded`, inserts customer notification.
     - **Release to Vendor**: Updates order status to `confirmed`, payment_status to `released`, sets `float_released_at`, inserts customer notification.
  4. **Users Tab** (`AdminUsers`): Searchable directory of all registered profiles with joined role badges (`admin`, `vendor`, `customer`) from `user_roles`.
  5. **Escrow / Payments Tab** (`AdminPayments`): Complete Float ledger. Shows total held in Float vs released to vendors, filterable by payment status (`pending`, `paid_float`, `released`, `failed`), provider badge (`KCB` vs `Daraja`), M-Pesa receipt number, payout status, and paginated table controls.

---

## 2. Interactive Flows & Queues Audit

```
+---------------------------------------------------------------------------------------------------+
|                                 TECHTRUST KENYA INTERACTIVE FLOWS                                 |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  1. M-Pesa STK Push Flow:                                                                        |
|     Customer Checkout (/checkout/:orderId)                                                        |
|        │                                                                                          |
|        ▼                                                                                          |
|     Edge Function / Endpoint (mpesa-stkpush) ──► Safaricom Daraja / KCB Buni / Simulation        |
|        │                                            │ (Response 1: CheckoutRequestID)             |
|        ▼                                            ▼                                             |
|     Frontend Polls (fetchPaymentStatus) ◄── Gateway Webhook (mpesa-callback) / simulate-payment   |
|                                                     │ (Response 2: mark_order_paid RPC)           |
|                                                     ▼                                             |
|                                         status: 'payment_held', payment_status: 'paid_float'      |
|                                                                                                   |
|  2. Float Escrow Release Flow:                                                                    |
|     Customer Confirms Receipt (/orders/:orderId) OR Admin Resolves Dispute                        |
|        │                                                                                          |
|        ▼                                                                                          |
|     Edge Function (release-float-payment)                                                         |
|        │                                                                                          |
|        ├── 10% Platform Fee Retained                                                             |
|        └── 90% Vendor Payout via Daraja B2B (Till) / Daraja B2C (Phone) / KCB Buni               |
|              │                                                                                    |
|              ▼                                                                                    |
|          status: 'confirmed', payment_status: 'released', float_released_at: timestamp            |
|                                                                                                   |
|  3. Vendor Verification Queue:                                                                    |
|     Vendor Application Submitted ──► status: 'pending'                                            |
|        │                                                                                          |
|        ▼                                                                                          |
|     Admin Review Queue (AdminDashboard / Verifications Tab)                                       |
|        │                                                                                          |
|        ├── Approve ──► verification_status: 'approved', notify-vendor-approved edge function      |
|        └── Reject  ──► verification_status: 'rejected', rejection_reason saved                    |
|                                                                                                   |
|  4. Repair Service Booking Queue:                                                                 |
|     Customer Requests Repair (/repairs -> RepairRequestDialog)                                    |
|        │                                                                                          |
|        ▼                                                                                          |
|     repair_requests record created (status: 'submitted') ──► Vendor Dashboard (RepairsTab)        |
|        │                                                                                          |
|        ▼                                                                                          |
|     Vendor sends quote -> Customer approves -> Lifecycle: received -> diagnosing -> in_repair... |
|                                                                                                   |
|  5. Dispute Submission & Resolution Queue:                                                         |
|     Customer raises dispute on /orders/:orderId ──► status: 'disputed', dispute_reason saved      |
|        │                                                                                          |
|        ▼                                                                                          |
|     Admin Dashboard (Disputes Tab)                                                                |
|        ├── Refund Customer ──► status: 'refunded', payment_status: 'refunded'                    |
|        └── Release Vendor ──► status: 'confirmed', payment_status: 'released'                     |
+---------------------------------------------------------------------------------------------------+
```

### 2.1 M-Pesa STK Payment Simulation
- **Trigger**: Initiated on `/checkout/:orderId` (`Checkout.tsx`).
- **Mechanism**:
  - Front-end validates phone number (`07XXXXXXXX` or `254XXXXXXXX`) and calls `invokeFunction("mpesa-stkpush", { body: { order_id, phone } })`.
  - Edge function `supabase/functions/mpesa-stkpush/index.ts` formats phone to `2547XXXXXXXX`, checks configuration, and dispatches the push:
    - **Safaricom Daraja**: `CustomerPayBillOnline` request.
    - **KCB Buni**: `/mm/api/request/1.0.0/stkpush` request.
    - **Sandbox Simulation**: Controlled by `PAYMENT_SANDBOX_MODE` / `PAYMENT_SIMULATION_ENABLED`.
  - Returns `CheckoutRequestID` as **Response 1** (confirming prompt dispatch).
  - Frontend enters `waiting` phase and polls `fetchPaymentStatus(orderId)` / database every 4s for up to 150 seconds.
  - Gateway webhook `supabase/functions/mpesa-callback/index.ts` or `simulate-payment` receives **Response 2**, calls Supabase RPC `mark_order_paid`, updating order:
    - `payment_status = 'paid_float'`
    - `status = 'payment_held'`
    - Inserts audit record into `order_payment_events`.

### 2.2 Float Escrow Release Mechanism
- **Trigger**:
  - Customer confirms receipt on `/orders/:orderId` (`OrderDetail.tsx`) when order is `delivered_awaiting_confirmation`.
  - Admin resolves dispute in vendor's favor in Admin Dashboard.
- **Mechanism**:
  - Front-end calls `release-float-payment` edge function.
  - Function validates `order.payment_status === 'paid_float'`, calculates 10% platform fee and 90% vendor payout amount.
  - Payout Routing:
    - If vendor has a till number on file and B2B is configured -> sends Daraja B2B (`BusinessBuyGoods`).
    - Otherwise -> sends Daraja B2C (`BusinessPayment`) or KCB Buni Payout or Simulation.
  - Updates order:
    - `payment_status = 'released'`
    - `status = 'confirmed'`
    - `float_released_at = new Date().toISOString()`
  - Inserts notification record into `notifications` table for the vendor.

### 2.3 Vendor Approval / Rejection Queue
- **Trigger**: Vendor submits application on `/vendor/register` or `/vendor/onboarding`. Profile created with `verification_status = 'pending'`.
- **Mechanism**:
  - Appears in `AdminDashboard.tsx` (`OverviewTab` pending queue and `AdminVendors` tab).
  - Admin reviews physical address, county, sub-county, embedded Google Maps preview, uploaded shop photos, and business certificate.
  - Helper function `applyVendorDecision(vendor, status, extra)`:
    - Updates `vendor_profiles.verification_status` to `'approved'` or `'rejected'`.
    - Inserts in-app notification into `notifications` table.
    - On approval, invokes `notify-vendor-approved` edge function to send welcome email.
  - Next visit by vendor to `/vendor/pending` automatically redirects to `/vendor/dashboard` (if approved) or `/vendor/rejected` / `/vendor/suspended`.

### 2.4 Repair Service Booking Queue
- **Trigger**: Customer browses repair services on `/repairs` (`Repairs.tsx`) and opens `RepairRequestDialog.tsx`.
- **Mechanism**:
  - Inserts record into `repair_requests`:
    - `customer_id`, `vendor_id`, `repair_service_id`, `device_description`, `problem_description`, `status = 'submitted'`.
  - Inserts notification for vendor user.
  - Appears in Vendor Dashboard `RepairsTab.tsx`:
    - Vendor reviews request and opens "Send quote" modal (`quoted_price_ksh` + `technician_notes`).
    - Updates status to `quotation_sent` and notifies customer.
    - Upon customer quote approval, vendor steps through lifecycle: `received` -> `diagnosing` -> `in_repair` -> `ready_for_collection` -> `completed`.

### 2.5 Dispute Submission & Resolution Queue
- **Trigger**: Customer opens order detail page `/orders/:orderId` (`OrderDetail.tsx`) for an order with `payment_status === 'paid_float'`.
- **Mechanism**:
  - Customer clicks "Raise Dispute", inputs explanation (min 10 characters).
  - Updates order `status = 'disputed'`, sets `dispute_reason`.
  - Appears in Admin Dashboard `AdminDisputes` tab.
  - Admin inspects order details and selects:
    - **Refund**: Updates order `status = 'refunded'`, `payment_status = 'refunded'`, notifies customer.
    - **Release**: Updates order `status = 'confirmed'`, `payment_status = 'released'`, sets `float_released_at`, notifies customer.

---

## 3. Backend, Database & State Integration Audit

### 3.1 State Management & Auth Architecture
- **Supabase JS Client**: Single instance in `src/integrations/supabase/client.ts`.
- **Auth Provider (`src/hooks/useAuth.tsx`)**:
  - Manages session lifecycle (`onAuthStateChange`).
  - Fetches user roles from `user_roles` (`admin`, `vendor`, `customer`).
  - Fetches associated `vendor_profiles` record.
  - Provides `user`, `roles`, `vendorProfile`, `loading` context to the entire app.
- **Route Guard (`src/components/auth/ProtectedRoute.tsx`)**:
  - Checks required roles.
  - For vendor routes (`requireApprovedVendor`), checks `vendorProfile.verification_status` and routes pending/rejected/suspended users to their respective status pages.

### 3.2 Database Schema & RLS Summary
- `profiles`: User account details (`full_name`, `phone_number`, `onboarding_complete`).
- `vendor_profiles`: Vendor shop profile (`business_name`, `owner_name`, `email`, `phone`, `till_number`, `county`, `sub_county`, `physical_address`, `gps_latitude`, `gps_longitude`, `google_maps_link`, `shop_photo_urls`, `business_certificate_url`, `id_document_url`, `verification_status`, `rejection_reason`, `suspension_reason`).
- `products`: Items for sale (`vendor_id`, `category`, `brand`, `model_name`, `price_ksh`, `quantity_in_stock`, `condition`, `image_urls`, `is_active`, `warranty_status`).
- `orders`: Orders & escrow state (`customer_id`, `vendor_id`, `product_id`, `quantity`, `total_amount_ksh`, `platform_fee_ksh`, `vendor_payout_ksh`, `status`, `payment_status`, `mpesa_transaction_id`, `mpesa_receipt_number`, `payout_status`, `payout_reference`, `dispute_reason`, `float_released_at`).
- `repair_services` & `repair_requests`: Repair services catalog and request queue.
- `notifications`: In-app notification messages.
- `user_roles`: User role assignments.
- `order_payment_events`: Audit trail for payment and payout events.

---

## 4. Design System, Typography & Color Compliance Audit

### 4.1 Specification vs Implementation Matrix

| Design Token | Specification Target | Config / Class | Vendor & Admin Audit Result | Compliance |
|--------------|----------------------|----------------|-----------------------------|------------|
| **Primary Navy** | `#002766` / `#0F3D8C` | `--primary-deep` / `--primary` | Applied to headings, hero headers, primary buttons, admin header titles. | **Compliant** |
| **Accent / Secondary Blue** | `#0058be` | `--accent` | Applied to interactive links, active tab underlines, icons, secondary buttons. | **Compliant** |
| **Success Green** | `#25c65f` / `#22C55E` | `--success` | Applied to verified badges, released Float status pills, positive stat metrics. | **Compliant** |
| **Escrow Float Blue** | `#3B82F6` | `--float` | Applied exclusively to Float held indicators & Float progress bars. | **Compliant** |
| **Display Font** | Sora | `font-display` / `h1..h4` | Configured in `tailwind.config.ts` and `index.css` for headings. | **Compliant** |
| **Body Font** | Inter UI | `font-sans` / `html` | Base font family across all cards and paragraphs. | **Compliant** |
| **Monospace / Numeric Values** | JetBrains Mono | `.text-price` | Applied to monetary KSH amounts across cards, tables, and dialogs. | **Compliant** |
| **Monospace / Stat Counters** | JetBrains Mono | `.text-stat` | Applied to admin stat cards. *Missing in `AnalyticsTab.tsx`*. | **Minor Gap** |
| **Monospace / Data IDs** | JetBrains Mono | `.text-data-id` | Applied to order IDs, vendor IDs, transaction IDs in admin & vendor tables. *Missing in `OrdersTab.tsx` line 88*. | **Minor Gap** |

### 4.2 Detailed Codebase Defects Found

#### Defect 1: Missing Lucide Icon Imports in `src/components/vendor/OverviewTab.tsx`
- **Location**: `src/components/vendor/OverviewTab.tsx`, lines 5, 82, 165, 172.
- **Observation**:
  - Line 5 imports: `import { Package, ShoppingCart, Wrench, Wallet, Star, AlertTriangle } from "lucide-react";`
  - Line 82 uses `<StatCard icon={Lock} ... />`
  - Line 165 uses `<ShieldCheck className="h-3 w-3" /> Released`
  - Line 172 uses `<Lock className="h-3 w-3" /> Held`
- **Impact**: Neither `Lock` nor `ShieldCheck` is imported in `OverviewTab.tsx`. Because `window.Lock` is defined in browser DOM TypeScript declarations (`lib.dom.d.ts`), `npx tsc` did not throw an error, but passing `window.Lock` as a React icon component causes runtime UI rendering failures or blank icon spots.
- **Proposed Fix**: Add `Lock` and `ShieldCheck` to the `lucide-react` import statement in `OverviewTab.tsx`:
  ```tsx
  import { Package, ShoppingCart, Wrench, Wallet, Star, AlertTriangle, Lock, ShieldCheck } from "lucide-react";
  ```

#### Defect 2: Missing `.text-data-id` Class in `src/components/vendor/OrdersTab.tsx`
- **Location**: `src/components/vendor/OrdersTab.tsx`, line 88.
- **Observation**:
  ```tsx
  <div className="text-xs text-muted-foreground">
    #{o.id.slice(0, 8).toUpperCase()} · Qty {o.quantity} · {formatDate(o.created_at)}
  </div>
  ```
  The order ID string `#{o.id.slice(0, 8).toUpperCase()}` is rendered without the `.text-data-id` monospace utility class required by the Stitch design specification.
- **Proposed Fix**: Wrap order ID in `<span className="text-data-id">#{o.id.slice(0, 8).toUpperCase()}</span>`.

#### Defect 3: Missing `.text-stat` Class in `src/components/vendor/AnalyticsTab.tsx`
- **Location**: `src/components/vendor/AnalyticsTab.tsx`, lines 53–54.
- **Observation**:
  - Line 53: `<div className="text-2xl font-bold">{data.totalOrders}</div>`
  - Line 54: `<div className="text-2xl font-bold">{data.completedOrders}</div>`
  Numeric stat values are rendered in standard font rather than JetBrains Mono (`.text-stat`).
- **Proposed Fix**: Add `text-stat` to the stat figure elements: `<div className="text-stat text-2xl font-bold">{data.totalOrders}</div>`.

---

## 5. Verification & Test Suite Results

1. **TypeScript Type Check**:
   - Command: `npx tsc --noEmit`
   - Result: **0 errors** (Exit code 0).
2. **Production Vite Build**:
   - Command: `bun run build`
   - Result: **Successfully built in 14.86s** with 0 errors. All assets generated under `dist/`.
3. **Backend Escrow Integration Test**:
   - Command: `bun test server/escrow.test.ts` (if test suite present in `server/`).

---

## 6. Recommendations for Implementation Phase

1. **Fix Component Imports**: Add `Lock` and `ShieldCheck` to `OverviewTab.tsx` imports from `lucide-react`.
2. **Standardize Monospace Typography Classes**: Update `OrdersTab.tsx` and `AnalyticsTab.tsx` to include `.text-data-id` and `.text-stat` respectively.
3. **Maintain Read-Only Discipline**: All survey findings recorded herein; implementation updates should be executed by the implementer agent.
