# Milestone 2 Reviewer & Critic Handoff Report (Reviewer 2)

**Author**: Reviewer 2 (teamwork_reviewer_critic)  
**Roles**: reviewer, critic  
**Milestone**: Milestone 2 — Admin Portal & Queues Audit  
**Working Directory**: `C:\Users\Administrator\techtrustkenya\.agents\reviewer_m2_2`  
**Date**: 2026-08-01  

---

## 1. Observation

A comprehensive review and adversarial stress-test of the Admin Portal & Queues code modifications was conducted.

### Direct File & Line Observations

1. **`supabase/functions/release-float-payment/index.ts` (Lines 408-410 & 446-449)**:
   - Line 408-409:
     ```typescript
     if (orderErr || !order) return ok({ success: false, error: "Order not found" }, 404);
     if (order.customer_id !== userData.user.id) return ok({ success: false, error: "Forbidden" }, 403);
     ```
   - Line 446-449:
     ```typescript
     const canRelease =
       order.status === "delivered_awaiting_confirmation" ||
       order.status === "disputed" ||
       (order.status === "confirmed" && order.payout_status === "failed");
     ```

2. **`src/pages/admin/AdminDashboard.tsx` (Lines 922-938)**:
   - Dispute release action in `AdminDisputes`:
     ```typescript
     const { data: res, error } = await invokeFunction("release-float-payment", { body: { orderId: o.id } });
     if (error || (res && !res.success)) {
       console.warn("release-float-payment warning or fallback:", error?.message ?? res?.error);
       await supabase.from("orders").update({
         status: "confirmed",
         payment_status: "released",
         float_released_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
       }).eq("id", o.id);
     }
     ```

3. **`src/pages/admin/AdminDashboard.tsx` (Lines 564-566 & 574-577)**:
   - AdminVendors approved tab filter:
     ```typescript
     if (tab === "approved") {
       query = query.in("verification_status", ["approved", "verified"]);
     } else if (tab !== "all") {
       query = query.eq("verification_status", tab);
     }
     ```

4. **`src/pages/admin/AdminDashboard.tsx` (Lines 1048-1078 & 1145-1155)**:
   - AdminUsers user role assignment/revocation:
     - `assignRole(userId, targetRole)` inserts into `user_roles`.
     - `revokeRole(userId, roleToRemove)` deletes from `user_roles`.
     - Dropdown `<Select>` for role assignment and `×` button on badges for role revocation.

5. **`src/pages/admin/AdminDashboard.tsx` (Lines 186-212 & 387-416)**:
   - AdminOverview vendor rejection dialog:
     - Rejection button triggers `<Dialog>` asking for written `rejection_reason`.
     - `confirmReject()` invokes `applyVendorDecision(v, "rejected", { rejection_reason })`.

6. **Stitch Design Tokens & Font Classes (`src/index.css` & `src/pages/admin/AdminDashboard.tsx`)**:
   - `src/index.css` defines `--primary-deep: 217 100% 20%` (`#002766`), `--accent: 212 100% 37%` (`#0058be`), `--success: 142 71% 45%` (`#25c65f`), `.text-price`, `.text-stat`, `.text-data-id`, Sora, and Inter.
   - `AdminDashboard.tsx` correctly applies `.text-price` on monetary values, `.text-stat` on numerical count cards, `.text-data-id` on reference IDs (`#...`, `VND-...`, `TXN-...`), and `font-display` on page headers.

7. **Build & Typecheck Commands**:
   - `npx tsc --noEmit` executed with **exit code 0**.
   - `npm run build` executed with **exit code 0** (built in 14.18s).

---

## 2. Logic Chain

1. **Edge Function Authorization Barrier (`Critical Finding`)**:
   - *Observation*: `release-float-payment/index.ts` line 409 checks `if (order.customer_id !== userData.user.id) return ok({ success: false, error: "Forbidden" }, 403);`.
   - *Reasoning*: When an Admin resolves a dispute in `AdminDashboard.tsx` and clicks "Release", `invokeFunction("release-float-payment", { body: { orderId: o.id } })` is executed with the Admin's JWT authorization header.
   - *Deduction*: `userData.user.id` is the Admin's user ID. `order.customer_id` is the Buyer's user ID. Because `Admin ID !== Customer ID`, line 409 ALWAYS triggers and returns HTTP 403 Forbidden (`{ success: false, error: "Forbidden" }`).
   - *Impact*: The Edge Function fails every time it is invoked by an admin. Line 447 (`order.status === "disputed"`) inside the Edge Function is unreachable for admin requests.

2. **Escrow Payout Bypass via Fallback (`Critical Finding`)**:
   - *Observation*: In `AdminDashboard.tsx` lines 923-931, `AdminDisputes` catches `error || (res && !res.success)` and falls back to:
     `await supabase.from("orders").update({ status: "confirmed", payment_status: "released", ... })`.
   - *Reasoning*: Because `release-float-payment` returns `res.success: false` due to the 403 Forbidden error, `AdminDisputes` ALWAYS enters this fallback branch during dispute resolution.
   - *Deduction*: The real escrow release payout logic in `release-float-payment` (`sendPayout(...)`, M-Pesa B2C/B2B or KCB Buni gateway calls, `order_payment_events` audit log insertion, and vendor payout notifications) is completely bypassed. The client app silently performs a direct database overwrite without executing financial transactions or logging payment events.

3. **Approved Queue Query Filtering**:
   - *Observation*: `AdminVendors` tab query filters `.in("verification_status", ["approved", "verified"])`.
   - *Reasoning*: Profiles in the database can have either `"approved"` or `"verified"` verification status. Including both ensures no approved vendors disappear from the table view.

4. **User Role Management**:
   - *Observation*: `AdminUsers` provides `assignRole` and `revokeRole` backed by Supabase mutations on `user_roles`.
   - *Reasoning*: Admins can grant and revoke `admin`, `vendor`, or `customer` roles interactively.

5. **Vendor Rejection Dialog**:
   - *Observation*: Rejection action in `AdminOverview` opens a modal prompting for `rejection_reason`.
   - *Reasoning*: Enforces written rejection reasons before updating vendor state and notifying the applicant.

---

## 3. Caveats

- **Sandbox API Endpoints**: Live M-Pesa / KCB Buni payout gateways default to simulation mode in development environments when gateway credentials are absent. The defect identified in `release-float-payment` authorization is independent of gateway credentials and occurs prior to payout provider invocation.
- No other unexamined areas remain within the M2 Admin Portal & Queues scope.

---

## 4. Conclusion

### Review Verdict: REQUEST_CHANGES

The Admin Portal UI controls, verification filters, user role management, vendor rejection dialogs, design tokens, typechecks, and production builds all pass. However, a **Critical Finding** was surfaced in the Admin Dispute resolution flow.

### Findings Summary

#### [Critical] Finding 1: Edge Function Admin Authorization & Escrow Payout Bypass
- **What**: `release-float-payment` edge function rejects Admin dispute release calls with 403 Forbidden because line 409 strictly checks `order.customer_id !== userData.user.id` without checking for Admin user roles. `AdminDisputes` in `AdminDashboard.tsx` catches this error and falls back to a direct client-side DB update.
- **Where**: `supabase/functions/release-float-payment/index.ts:409` and `src/pages/admin/AdminDashboard.tsx:922-933`.
- **Why**: Admins cannot trigger actual Float escrow release payouts, M-Pesa B2C/B2B transactions, or payment event logging for disputed orders. The feature relies on a client-side database overwrite bypass.
- **Suggested Fix**:
  1. In `release-float-payment/index.ts`: Check if `userData.user.id === order.customer_id` OR if `userData.user.id` has an `admin` role in `user_roles`. Allow authorization if either condition is met.
  2. In `AdminDashboard.tsx`: Handle `release-float-payment` response cleanly without masking authorization failures via direct DB updates that bypass payout execution.

---

## 5. Verification Method

### 5.1 Command Line Verification
Run in `C:\Users\Administrator\techtrustkenya`:
```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Production build
npm run build
```
Both commands return exit code 0.

### 5.2 Failure Mode Reproduction
1. Log in as an Admin user (`role = "admin"`).
2. Open Admin Dashboard (`/admin/dashboard`) -> Disputes tab.
3. Select an order with `status = "disputed"`.
4. Click "Release" to resolve in vendor's favor.
5. Inspect network request to `release-float-payment` edge function:
   - Response: `403 Forbidden` (`{"success": false, "error": "Forbidden"}`).
6. Observe browser console warning and note that `order_payment_events` was not populated and no payout call was executed.
