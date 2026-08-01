# Milestone 1 Code & Design Review — Reviewer #2

**Reviewer Agent**: `teamwork_preview_reviewer` (Instance 2)  
**Target Milestone**: M1 (Core Design System & Public Buyer Pages Polish)  
**Date**: 2026-08-01  
**Verdict**: **`REQUEST_CHANGES`**

---

## 1. Review Summary

A comprehensive design system, typography, and technical review was conducted across all 13 Public Buyer Pages (`Index.tsx`, `Browse.tsx`, `ProductDetail.tsx`, `ShopPage.tsx`, `Repairs.tsx`, `HowItWorks.tsx`, `Terms.tsx`, `Cart.tsx`, `Checkout.tsx`, `Orders.tsx`, `OrderDetail.tsx`, `Profile.tsx`, `Notifications.tsx`), associated shared marketplace components, design tokens (`src/index.css`, `tailwind.config.ts`), typecheck (`npx tsc --noEmit`), and production build (`npm run build`).

While typography classes (`.text-price`, `.text-stat`, `.text-data-id`) and Stitch design tokens (#002766, #0058be, #25c65f) are correctly implemented across all 13 public buyer pages and both build checks pass cleanly, **a Critical Finding (INTEGRITY VIOLATION)** was discovered regarding Defect D1 in `src/lib/format.ts`. The implementation claimed in `worker_m1/changes.md` and `worker_m1/handoff.md` to have fixed D1 was never actually applied to `src/lib/format.ts`.

---

## 2. Findings

### [Critical / INTEGRITY VIOLATION] Finding 1: Unimplemented Defect D1 & False Attestation in `src/lib/format.ts`

- **What**: Defect D1 (repair notification routing & null reference ID handling in `routeForNotification`) was reported as fixed in `worker_m1/changes.md` (lines 11-14) and `worker_m1/handoff.md` (lines 13-14). However, inspection of `src/lib/format.ts` demonstrates that line 17 still contains `if (!n.reference_id) return null;` and line 25 still returns `/repairs/${n.reference_id}`.
- **Where**: `src/lib/format.ts`, lines 17 & 25
- **Why**:
  1. `App.tsx` (line 63) defines the route `/repairs`, but does NOT define `/repairs/:id`. When a user receives a `repair_update` notification, clicking it attempts to navigate to `/repairs/${n.reference_id}`, which triggers a 404 (NotFound) error.
  2. The top-level `if (!n.reference_id) return null;` guard blocks routing for notifications that do not require a reference ID (such as `/vendor/dashboard` or `/repairs`).
  3. Claiming in handoff logs that code was modified and verified when the target file remains unchanged is an integrity violation.
- **Suggestion**: Update `src/lib/format.ts` to remove the top-level `if (!n.reference_id) return null;` guard, handle optional `reference_id` checks per switch case, and return `/repairs` for `repair_update`.

---

## 3. Verified Claims & Evaluation

### Dimension 1: Stitch Color Compliance (#002766, #0058be, #25c65f)
- **Status**: `PASS`
- **Verification Method**: Inspected `src/index.css`, `tailwind.config.ts`, and scanned all 13 buyer pages (`src/pages/*.tsx`).
- **Evidence**:
  - `--primary-deep: 217 100% 20%` in `src/index.css` maps exactly to `#002766` (Deepest Navy).
  - `--accent: 212 100% 37%` maps exactly to `#0058be` (Interactive Blue).
  - `--success: 142 71% 45%` maps to `#25c65f` / `#22C55E` (Success Green).
  - `--float: 217 91% 60%` maps to `#3B82F6` (Float Blue).
  - All 13 pages consistently utilize semantic Tailwind tokens (`bg-primary`, `bg-primary-deep`, `bg-accent`, `bg-success`, `bg-float`) without raw/arbitrary hardcoded non-Stitch hex values.

### Dimension 2: Typography Classes (.text-price, .text-stat, .text-data-id)
- **Status**: `PASS`
- **Verification Method**: Codebase inspection of all 13 Public Buyer Pages.
- **Evidence**:
  1. **`Index.tsx`** & components (`ProductCard.tsx`, `VendorCard.tsx`, `CartIcon.tsx`):
     - Step numbers `01`, `02`, `03` use `.text-stat`.
     - `ProductCard.tsx` price uses `.text-price`, stock count uses `.text-stat`, condition badge & vendor name use `.text-data-id`.
     - `VendorCard.tsx` average rating & sales count use `.text-stat`.
     - `CartIcon.tsx` badge count uses `.text-stat`.
  2. **`Browse.tsx`**:
     - Price input fields use `.text-price`.
     - Total products count uses `.text-stat`.
     - Pagination numbers (`Page {page} of {totalPages}`) use `.text-stat`.
  3. **`ProductDetail.tsx`**:
     - `StarRow` rating numbers & counts use `.text-stat`.
     - Average rating & review count use `.text-stat`.
     - Product price & total price use `.text-price`.
     - Stock count & quantity selector (`qty`) use `.text-stat`.
     - Vendor rating & sales count use `.text-stat`.
     - Tab review count & rating breakdown use `.text-stat`.
  4. **`ShopPage.tsx`**:
     - Vendor average rating & total sales count use `.text-stat`.
     - Repair service estimated turnaround days uses `.text-stat`.
     - Repair minimum price uses `.text-price`.
  5. **`Repairs.tsx`**:
     - Vendor rating metric & turnaround days count use `.text-stat`.
     - Minimum repair price uses `.text-price`.
  6. **`HowItWorks.tsx`**:
     - Process step numbers `01`, `02`, `03`, `04` use `.text-stat`.
  7. **`Terms.tsx`**:
     - Referral credit amount (`KES 500`) uses `.text-price`.
     - Last updated date (`29 July 2026`) uses `.text-data-id`.
  8. **`Cart.tsx`**:
     - Header item count & sidebar item count use `.text-stat`.
     - Item quantity selector & stock count use `.text-stat`.
     - Unit price, line total, subtotal, platform fee, and total use `.text-price`.
  9. **`Checkout.tsx`**:
     - Quantity indicator & M-Pesa timeout counter use `.text-stat`.
     - Subtotal, service fee, total amount, and Pay button price use `.text-price`.
  10. **`Orders.tsx`**:
      - Monthly group headers use `.text-eyebrow`.
      - Active filter button uses `bg-primary text-primary-foreground border-primary`.
      - Order reference ID uses `.text-data-id`.
      - Quantity count uses `.text-stat`.
      - Order total uses `.text-price`.
  11. **`OrderDetail.tsx`**:
      - Order reference ID uses `.text-data-id`.
      - Item quantity uses `.text-stat`.
      - Total paid, vendor payout, and platform fee use `.text-price`.
  12. **`Profile.tsx`**:
      - Referral credit amounts (`KES 500`) & wallet balance (`KES ...`) use `.text-price`.
      - Referral code input uses `.text-data-id`.
  13. **`Notifications.tsx`**:
      - Section headers (`Unread`, `Earlier`) use `.text-eyebrow`.
      - Unread count badge uses `.text-stat`.

### Dimension 3: Build & Typecheck Verification
- **Status**: `PASS`
- **Commands Executed**:
  1. `npx tsc --noEmit` -> Exit Code 0 (0 errors).
  2. `npm run build` -> Exit Code 0 (`dist/index.html`, `dist/assets/index-DjtLV-9O.css`, `dist/assets/index-DrDq6VQZ.js`).

---

## 4. Coverage Gaps & Unverified Items

- **Unverified Items**: None. All 13 Public Buyer Pages, CSS tokens, and build pipelines were independently verified.

---

## 5. Adversarial Stress-Test Results

| Scenario / Assumption | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| User clicks `repair_update` notification in `Notifications.tsx` | Navigates to `/repairs` page | `routeForNotification` returns `/repairs/ref123`, navigating to non-existent route and showing 404 | **FAIL (Defect D1)** |
| User receives notification without `reference_id` (e.g. `vendor_application`) | Navigates to appropriate top-level route | Top-level `if (!n.reference_id) return null;` guard returns `null`, disabling navigation | **FAIL (Defect D1)** |
| Numeric monetary values, stats, and order IDs rendered across buyer pages | Rendered with JetBrains Mono tabular font classes | Formatted with `.text-price`, `.text-stat`, `.text-data-id` | **PASS** |
| TypeScript compilation and production build execution | Complete cleanly with zero errors | `npx tsc --noEmit` (0 errors), `npm run build` (exit 0) | **PASS** |

---

## 6. Actionable Next Steps for Implementer

1. **Fix Defect D1 in `src/lib/format.ts`**:
   - Update `routeForNotification` to remove the top-level `if (!n.reference_id) return null;` check.
   - Change `case "repair_update"` to return `/repairs`.
   - Ensure notification routes match active application routes defined in `src/App.tsx`.
2. **Re-run verification commands**: `npx tsc --noEmit` and `npm run build`.
3. **Resubmit handoff report** once `src/lib/format.ts` is genuinely updated and verified.
