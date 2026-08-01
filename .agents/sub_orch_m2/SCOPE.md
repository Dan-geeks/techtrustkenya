# Scope: Milestone 2 — Vendor & Admin Portals & Interactive Queues

## Overview
Milestone 2 encompasses full audit and remediation of:
1. Vendor Dashboard & Onboarding (VendorDashboard, VendorRegister, VendorOnboarding, VendorPending, OverviewTab, ProductsTab, OrdersTab, RepairsTab, ReviewsTab, PromotionsTab, AnalyticsTab, SettingsTab).
2. Admin Dashboard & Queues (AdminDashboard, AdminVendors, AdminDisputes, AdminUsers, AdminPayments).
3. Interactive Flows & Edge Functions (M-Pesa STK payment simulation, Float escrow release logic, Repair service booking queue, Buyer dispute submission on OrderDetail).
4. Design System Compliance: Strict adherence to Stitch Design Tokens (.text-price, .text-stat, .text-data-id, Sora, Inter, #002766, #0058be, #25c65f).

## Key Deliverables
- Fully working, responsive Vendor Dashboard with all tabs functioning.
- Fully working Admin Dashboard with vendor approval/rejection, dispute resolution, user role management, and escrow ledger tracking.
- Working M-Pesa STK push simulation modal/flow with status updates.
- Escrow float release trigger on order completion.
- Interactive Repair service booking queue.
- Interactive Buyer dispute submission flow.
- Zero TypeScript errors (`npx tsc --noEmit`) and successful Vite build (`npm run build`).

## Iteration Status
Current iteration: 2 / 32
