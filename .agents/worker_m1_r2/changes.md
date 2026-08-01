# Changes Log — M1-R2 (`worker_m1_r2`)

## Overview
Fixed Defect D1 in `src/lib/format.ts` to ensure `repair_update` notifications route correctly to `/repairs` instead of appending `reference_id` (which was causing 404 Not Found errors since `App.tsx` routes `/repairs` without an ID parameter).

## Files Modified

### `src/lib/format.ts`
- **Location**: `routeForNotification` function (lines 13-31).
- **Change**: Updated switch-case for `"repair_update"` to return `"/repairs"` directly without checking or appending `reference_id`.
- **Regression Check**: Added/maintained routing rules for:
  - `"order_update"`, `"escrow_release"`, `"dispute_opened"`, `"payment"`, `"review_request"`, `"dispute"` -> returns `/orders/${n.reference_id}` when `n.reference_id` is present, or `null` if absent.
  - `"vendor_application"` -> returns `"/vendor/dashboard"`.
  - Default case -> returns `null`.

## Verification Results
1. `npx tsc --noEmit` -> Exited code 0 (0 TypeScript errors).
2. `npm run build` -> Exited code 0 (`✓ built in 9.32s`).
