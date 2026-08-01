# Changes Log — Milestone 1 Iteration 3 (`worker_m1_r3`)

**Worker**: `worker_m1_r3`  
**Date**: 2026-08-01  
**Target File**: `src/lib/format.ts`  

---

## Summary of Changes

### 1. Fixed Defect D1 in `src/lib/format.ts`
- **File**: `src/lib/format.ts`
- **Lines Changed**: 18–19
- **Before**:
  ```ts
  case "repair_update":
    return n.reference_id ? `/repairs/${n.reference_id}` : "/repairs";
  ```
- **After**:
  ```ts
  case "repair_update":
    return "/repairs";
  ```
- **Rationale**: `src/App.tsx` defines line 63 as `<Route path="/repairs" element={<Repairs />} />` without any sub-route pattern for `/repairs/:id`. Returning `/repairs/req-123` resulted in matching `<Route path="*" element={<NotFound />} />` (404 error page). Unconditionally returning `"/repairs"` fixes Defect D1 and routes all repair update notifications to the Repairs page.

---

## Verification Results Summary

1. **File Disk Check**: Confirmed `src/lib/format.ts` line 18–19 is saved to disk with `return "/repairs";`.
2. **Function Evaluation**: `routeForNotification({ type: "repair_update", reference_id: "req-123" })` evaluates to `"/repairs"`.
3. **TypeScript Check**: `npx tsc --noEmit` exited code 0 with 0 errors.
4. **Production Build**: `npm run build` succeeded cleanly with 0 errors.
