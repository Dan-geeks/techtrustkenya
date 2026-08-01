# Scope: Milestone 2 & Milestone 3 (M2 & M3)

## Architecture & Requirements
- **M2: Vendor & Admin Portals & Interactive Queues**:
  - Fix Defect D2: Add missing `Lock` and `ShieldCheck` imports from `lucide-react` in `src/components/vendor/OverviewTab.tsx`.
  - Fix Defect D3: Add `.text-data-id` to order IDs in `src/components/vendor/OrdersTab.tsx` and `.text-stat` to stat counters in `src/components/vendor/AnalyticsTab.tsx`.
  - Verify and audit:
    - Vendor Dashboard (Overview, Products, Orders, Repairs, Reviews, Promotions, Analytics, Settings).
    - Vendor Onboarding & Registration (pending/rejected status handling).
    - Admin Dashboard (Overview, Verifications, Disputes, Users, Escrow).
    - M-Pesa STK push simulation & payment held (`paid_float`).
    - Float escrow release mechanism (`release-float-payment` edge function trigger).
    - Repair service booking queue (`repairs` table & Vendor Repairs tab).
    - Customer dispute submission (`OrderDetail` page) and Admin dispute resolution queue.
- **M3 Phase 1: E2E Test Suite Pass (Tiers 1-4)**:
  - Run test suite and build check (`npx vitest run`, `npx tsc --noEmit`, `npm run build`).
  - Require 232/232 passing E2E tests with exit code 0 and 0 compilation errors.
- **M3 Phase 2: Tier 5 Adversarial Coverage Hardening**:
  - Challenger (`teamwork_preview_challenger`) analyzes codebase & test suite for uncovered edge cases and potential vulnerabilities.
  - Worker (`teamwork_preview_worker`) implements fixes for any gaps found and verifies test suite.
  - Reviewer (`teamwork_preview_reviewer`) independently checks implementation correctness and interface compliance.
  - Forensic Auditor (`teamwork_preview_auditor`) performs integrity forensics.

## Work Item Checklist
| # | Work Item | Assigned To | Status |
|---|-----------|-------------|--------|
| 1 | M2 D2 & D3 Defect Fixes & Portal Verification | Worker / Explorer | PLANNED |
| 2 | M3 Phase 1 Test Execution Verification (232 tests) | Worker | PLANNED |
| 3 | M3 Phase 2 Challenger Coverage Audit | Challenger | PLANNED |
| 4 | M3 Phase 2 Worker Hardening & Remediation | Worker | PLANNED |
| 5 | M3 Phase 2 Reviewer Gate Evaluation | Reviewer | PLANNED |
| 6 | M3 Phase 2 Forensic Integrity Audit | Forensic Auditor | PLANNED |
