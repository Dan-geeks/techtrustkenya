# E2E Test Infra: TechTrust Kenya Electronics Marketplace

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on internal implementation design.
- Direct validation of features, boundary values, cross-feature interactions, and real-world application scenarios derived from `ORIGINAL_REQUEST.md` and `PROJECT.md` Feature Inventory.

## Feature Inventory Mapping & Coverage Matrix
| # | Feature | Requirements Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|---------------------|:-----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | Design Tokens & Fonts | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 2 | Home Page | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 3 | Browse Page | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 4 | Product Detail Page | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 5 | Shop Page | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 6 | How It Works Page | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 7 | Terms Page | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 8 | Cart Page | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 9 | Profile Page | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 10 | Notifications Page & Router Fix | ORIGINAL_REQUEST R1 / D1 | 5 | 5 | ✓ | ✓ |
| 11 | Vendor Overview Icon Fix | Survey D2 | 5 | 5 | ✓ | ✓ |
| 12 | Vendor Typography Polish | Survey D3 | 5 | 5 | ✓ | ✓ |
| 13 | Repairs Page & Booking Queue | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ | ✓ |
| 14 | Checkout & M-Pesa STK Push | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ | ✓ |
| 15 | Orders & Order Detail Pages | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ | ✓ |
| 16 | Float Escrow Release | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ | ✓ |
| 17 | Vendor Dashboard | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| 18 | Vendor Onboarding & Verification | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ | ✓ |
| 19 | Admin Dashboard & Vendor Approvals | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ | ✓ |
| 20 | Admin Dispute Resolution Queue | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ | ✓ |

## Test Architecture & Framework
- Test Runner Location: `tests/e2e/runner.ts` (or executed via `npm run test:e2e` / `npx vitest run tests/e2e`)
- Invocation Command: `npm run test:e2e`
- Pass/Fail Semantics: Exit code 0 on 100% pass, non-zero on any failure.
- Directory Layout:
  - `tests/e2e/tier1_feature_coverage.test.ts`: 100 test cases (5 per feature across 20 features)
  - `tests/e2e/tier2_boundary_corner.test.ts`: 100 test cases (5 per feature across 20 features)
  - `tests/e2e/tier3_pairwise_combinations.test.ts`: 20 test cases (cross-feature interactions)
  - `tests/e2e/tier4_realworld_workloads.test.ts`: 10 test cases (end-to-end real-world scenarios)
  - `tests/e2e/harness.ts` & `tests/e2e/runner.ts`: Test runner infrastructure and assertions

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (20 features = 100 test cases)
- Tier 2: ≥5 test cases per feature (20 features = 100 test cases)
- Tier 3: ≥20 pairwise feature interaction test cases
- Tier 4: ≥10 real-world application workload scenarios
- Total Minimum Test Cases: 230 test cases
