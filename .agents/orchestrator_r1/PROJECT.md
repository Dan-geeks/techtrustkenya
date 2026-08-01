# Project: TechTrust Kenya Electronics Marketplace

## Architecture
- **Frontend Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + shadcn/ui.
- **Backend Stack**: Supabase (Database, Auth, Storage, RLS) + Deno Edge Functions (`mpesa-stkpush`, `mpesa-callback`, `release-float-payment`, `create-vendor-profile`, `notify-vendor-approved`).
- **Global State**: `AuthProvider` (Supabase Auth & User Role), `CartProvider` (Cart management & Realtime sync), TanStack React Query.
- **Styling & Design Tokens**: HSL CSS variables in `src/index.css` mapped in `tailwind.config.ts`. Sora for headings, Inter UI for body, JetBrains Mono for numbers/prices/stats/data-ids (`.text-price`, `.text-stat`, `.text-data-id`).
- **Payment & Escrow Logic**: M-Pesa STK push simulation updates order to `paid_float` (`payment_held`). Confirmation/Admin action triggers `release-float-payment` edge function (10% platform fee, 90% vendor payout).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Design Tokens & Fonts | Primary navy (#002766), secondary (#0058be), green (#25c65f), Sora, Inter UI, JetBrains Mono (.text-price, .text-stat, .text-data-id) | M1 | ORIGINAL_REQUEST R1 |
| 2 | Home Page | Hero, categories, featured products, trust badges | M1 | ORIGINAL_REQUEST R1 |
| 3 | Browse Page | Product grid, category & price filters, search | M1 | ORIGINAL_REQUEST R1 |
| 4 | Product Detail Page | Product images, specs, vendor info, add to cart | M1 | ORIGINAL_REQUEST R1 |
| 5 | Shop Page | Vendor profile storefront, product listings | M1 | ORIGINAL_REQUEST R1 |
| 6 | How It Works Page | Buyer & vendor guide, trust explanation | M1 | ORIGINAL_REQUEST R1 |
| 7 | Terms Page | Terms of service & marketplace policies | M1 | ORIGINAL_REQUEST R1 |
| 8 | Cart Page | Cart items list, subtotal, checkout button | M1 | ORIGINAL_REQUEST R1 |
| 9 | Profile Page | User profile details & preferences | M1 | ORIGINAL_REQUEST R1 |
| 10 | Notifications Page & Router Fix | Notifications list, fixing repair notification route defect D1 | M1 | ORIGINAL_REQUEST R1 / Survey D1 |
| 11 | Vendor Overview Icon Fix | Fix missing Lock and ShieldCheck icon imports in OverviewTab.tsx (defect D2) | M1 | Survey D2 |
| 12 | Vendor Typography Polish | Add missing .text-data-id and .text-stat in OrdersTab/AnalyticsTab (defect D3) | M1 | Survey D3 |
| 13 | Repairs Page & Booking Queue | Repair service request dialog, queue insertion, vendor status tracking | M2 | ORIGINAL_REQUEST R1, R2 |
| 14 | Checkout & M-Pesa STK Push | Checkout flow, phone prompt, M-Pesa STK push payment simulation | M2 | ORIGINAL_REQUEST R1, R2 |
| 15 | Orders & Order Detail Pages | Order history, order status, confirm receipt trigger | M2 | ORIGINAL_REQUEST R1, R2 |
| 16 | Float Escrow Release | Confirm receipt & admin dispute action trigger float escrow release to vendor | M2 | ORIGINAL_REQUEST R1, R2 |
| 17 | Vendor Dashboard | Vendor tabs (Overview, Products, Orders, Repairs, Reviews, Promotions, Analytics, Settings) | M2 | ORIGINAL_REQUEST R1 |
| 18 | Vendor Onboarding & Verification | Vendor registration wizard, onboarding form, pending/rejected status handling | M2 | ORIGINAL_REQUEST R1, R2 |
| 19 | Admin Dashboard & Vendor Approvals | Admin tabs (Overview, Verifications, Disputes, Users, Escrow), vendor approval/rejection queue | M2 | ORIGINAL_REQUEST R1, R2 |
| 20 | Admin Dispute Resolution Queue | Buyer dispute submission on OrderDetail, Admin queue resolution (refund vs release) | M2 | ORIGINAL_REQUEST R1, R2 |
| 21 | E2E Testing Suite (Tiers 1-4) | Comprehensive opaque-box E2E test suite covering all features | M3 | System Requirement |
| 22 | Adversarial Hardening (Tier 5) | White-box static & edge-case stress test hardening | M3 | System Requirement |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Design System & Public Pages Polish | Fix D1 (notification route), D2 (icon imports), D3 (typography classes), audit & polish 13 public buyer pages | none | IN_PROGRESS (`00ba8e2f-a90f-4c4f-9b61-3b07ff626b2c`) |
| M2 | Vendor & Admin Portals & Interactive Queues | Audit & verify Vendor Dashboard, Vendor Onboarding, Admin Dashboard, M-Pesa payment, Float escrow release, vendor approvals, repairs, disputes | M1 | PLANNED |
| M3 | Final Milestone (E2E Test Verification & Hardening) | Phase 1: 100% pass on Tiers 1-4 test suite. Phase 2: Tier 5 adversarial coverage hardening | M1, M2 | PLANNED |

## Interface Contracts
### Public Pages ↔ Shared Components
- Notifications link format: `routeForNotification` returns `/repairs` for `repair_update`.
- Monetary prices: All price elements render formatted Ksh values with `className="text-price"`.
- Stat counters: All key metrics render with `className="text-stat"`.
- IDs & hashes: All reference IDs render with `className="text-data-id"`.

### Vendor/Admin Dashboard ↔ Edge Functions & Database
- `create-vendor-profile`: Submits vendor business details & photos, sets state to `pending`.
- `applyVendorDecision`: Admin approves/rejects vendor, calls `notify-vendor-approved` for email + in-app notification.
- `mpesa-stkpush`: Initiates payment, sets order state to `payment_held` (`paid_float`).
- `release-float-payment`: Payout execution (10% platform fee, 90% vendor payout), updates order `payment_status = 'released'`, `status = 'confirmed'`.
- `repair_requests`: Inserted on Repairs page, managed in Vendor Dashboard Repairs tab.
- `disputes`: Customer raises on OrderDetail, resolved in Admin Disputes tab.

## Code Layout
- `src/pages/*.tsx`: Public buyer pages (`Index`, `Browse`, `ProductDetail`, `ShopPage`, `Repairs`, `HowItWorks`, `Terms`, `Cart`, `Checkout`, `Orders`, `OrderDetail`, `Profile`, `Notifications`).
- `src/pages/vendor/*.tsx`: Vendor onboarding & dashboard (`VendorDashboard`, `VendorRegister`, `VendorOnboarding`, `VendorPending`, `VendorRejected`, `VendorSuspended`).
- `src/pages/admin/*.tsx`: Admin dashboard & login (`AdminDashboard`, `AdminLogin`).
- `src/components/vendor/*.tsx`: Vendor dashboard tabs (`OverviewTab`, `ProductsTab`, `OrdersTab`, `RepairsTab`, `ReviewsTab`, `PromotionsTab`, `AnalyticsTab`, `SettingsTab`).
- `src/components/admin/*.tsx`: Admin dashboard components (`AdminVendors`, `AdminDisputes`, `AdminUsers`, `AdminPayments`).
- `src/lib/*.ts`: Helper functions & utilities (`format.ts`, `supabase.ts`).
- `supabase/functions/*`: Deno edge functions for payments, escrow, notifications, vendor profiles.
