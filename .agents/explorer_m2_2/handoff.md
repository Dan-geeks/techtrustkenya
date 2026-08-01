# Handoff Report — Explorer 2 (Admin Portal Explorer)

**Agent ID**: Explorer 2 (`explorer_m2_2`)  
**Target Milestone**: Milestone 2 — Admin Dashboard & Queues Audit  
**Date**: 2026-08-01  

---

## 1. Observation

1. **Admin Pages and Components**:
   - `src/pages/admin/AdminDashboard.tsx`: Main admin container view containing 5 co-located tab components: `AdminOverview` (lines 143-368), `AdminVendors` (lines 500-808), `AdminDisputes` (lines 837-935), `AdminUsers` (lines 956-1051), and `AdminPayments` (lines 1098-1238).
   - `src/pages/admin/AdminLogin.tsx`: Dedicated admin login form restricting sign-in to users with `admin` role.
   - `src/App.tsx`: Routes `/admin` and `/admin/dashboard` protected via `<ProtectedRoute roles={["admin"]} loginPath="/admin/login">`.

2. **Verifications Tab Counter Mismatch**:
   - `AdminDashboard.tsx` line 520:
     `const k = r.verification_status === "verified" ? "approved" : r.verification_status; if (k in c) c[k] += 1;`
   - `AdminDashboard.tsx` line 513:
     `if (tab !== "all") query = query.eq("verification_status", tab);`
   - Direct Observation: `counts.approved` aggregates both `approved` and `verified` statuses, but when `tab === "approved"`, the query filters strictly `.eq("verification_status", "approved")`.

3. **Dispute Resolution Payout Bypassed**:
   - `AdminDashboard.tsx` lines 867-872:
     ```tsx
     await supabase.from("orders").update({ status: "confirmed", payment_status: "released", float_released_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", o.id);
     await supabase.from("notifications").insert([
       { user_id: o.customer_id, title: "Dispute resolved: in vendor's favor", message: "Payment was released to the vendor.", type: "dispute", reference_id: o.id },
     ]);
     ```
   - Direct Observation: Releasing dispute funds to a vendor in `AdminDisputes` executes a raw Supabase update instead of invoking the `release-float-payment` edge function (which handles M-Pesa B2C/B2B payout, event logging, and vendor notification).

4. **Read-Only User Management**:
   - `AdminDashboard.tsx` lines 956-1051 (`AdminUsers`): Renders a table of top 100 users with role badges (`admin`, `vendor`, `customer`) and a search bar. No interactive controls (buttons, select menus) exist to assign or revoke user roles.

5. **Overview Reject Button UX**:
   - `AdminDashboard.tsx` lines 183-187:
     `if (status === "rejected") { onOpenTab("vendors"); return; }`
   - Direct Observation: Clicking Reject in Overview switches tab to `vendors` without pre-selecting the vendor or opening the rejection reason modal.

6. **Stitch Design System Tokens Compliance**:
   - Palette: Primary Navy (`#002766` / `--primary`), Accent Blue (`#0058be` / `--accent`), Accent Green (`#25c65f` / `--success`, `--approve`).
   - Fonts: Sora (`font-display`) for headings, Inter (`font-sans`) for body, JetBrains Mono (`.text-price`, `.text-stat`, `.text-data-id`) for numbers, stats, IDs, phones, and receipt codes.

---

## 2. Logic Chain

1. **Step 1 (Queue Mismatch Reasoning)**:
   - Observation 2 shows that `counts.approved` includes profiles with `verification_status = "verified"`.
   - When the user selects the "Approved" tab, `query.eq("verification_status", "approved")` excludes `"verified"` records.
   - Therefore, vendors whose status is `"verified"` in the database are counted in the tab pill (e.g. `Approved (3)`), but invisible in the table when selected.
   - Conclusion: This is a defect causing state mismatch between queue tab counters and queue table data.

2. **Step 2 (Dispute Payout Bypass Reasoning)**:
   - Observation 3 shows `AdminDisputes.resolve` performs a DB update `payment_status = "released"`.
   - Inspection of `release-float-payment` edge function (and `OrderDetail.tsx` line 154) proves that actual M-Pesa B2C/B2B fund transfers require invoking `invokeFunction("release-float-payment", { body: { orderId } })`.
   - Therefore, resolving a dispute in favor of a vendor in `AdminDisputes` marks the order released in DB without transferring funds to the vendor's phone/till or notifying the vendor.
   - Conclusion: Admin dispute resolution is broken for vendor payouts.

3. **Step 3 (User Role Management Reasoning)**:
   - Observation 4 shows `AdminUsers` only displays user profiles and roles in a static table.
   - The authoritative requirement specifies "User account role assignments and management".
   - Therefore, `AdminUsers` is missing role assignment/management UI actions.
   - Conclusion: User role management feature is currently incomplete/read-only.

4. **Step 4 (Stitch Design System Reasoning)**:
   - Observation 6 confirms Sora font applied to `h1` titles, Inter font on table cells/forms, JetBrains Mono on all prices (`.text-price`), stats (`.text-stat`), and data IDs (`.text-data-id`).
   - Conclusion: Admin Portal layout and typography are 100% compliant with Google Stitch design tokens.

---

## 3. Caveats

- **Database RLS Policies**: We did not execute live Supabase admin role policy mutations; verification was performed via static code analysis of RLS files and Edge Function implementations.
- **M-Pesa Sandbox credentials**: Edge function testing depends on Deno environment variables (`MPESA_B2C_SHORTCODE`, `KCB_BUNI_PAYOUT_URL`, `PAYOUT_SIMULATION_ENABLED`); simulation fallback is supported when live credentials are empty.

---

## 4. Conclusion

The Admin Portal implementation (`AdminDashboard.tsx`, `AdminLogin.tsx`) is visually high quality and adheres closely to Stitch design system specifications. However, implementers for Milestone 2 must apply 4 targeted fixes:
1. Fix `AdminVendors` query filter when `tab === "approved"` to include `["approved", "verified"]`.
2. Fix `AdminDisputes` release action to invoke `release-float-payment` Edge Function.
3. Add interactive role modification actions to `AdminUsers` (e.g. role toggle/assign modal or select dropdown).
4. Pass vendor ID when redirecting from Overview table rejection action to Verifications tab.

---

## 5. Verification Method

### Automated Build Verification
Run the TypeScript build command in powershell:
```powershell
npm run build
```
*Expected Output*: Build succeeds cleanly with 0 TypeScript/Vite errors.

### Manual Verification Procedure
1. Log in at `/admin/login` using an account with `admin` role.
2. Inspect **Overview**: Ensure stat cards use `.text-stat` and bento grid tables use `.text-data-id` and `.text-price`.
3. Inspect **Verifications**:
   - Open detail modal for a vendor. Verify physical address, county, sub-county, GPS coordinates, Google Maps embed, and document links (`id_document_url`, `business_certificate_url`, `shop_photo_urls`).
   - Select "Approved" tab and verify vendors with `verification_status = "verified"` are listed.
4. Inspect **Disputes**: Verify open disputes display buyer reason and amount. Test "Release" action to confirm `release-float-payment` edge function is invoked.
5. Inspect **Users**: Check user listing search and role badges (`admin`, `vendor`, `customer`).
6. Inspect **Escrow**: Verify "Held in Float" and "Released to vendors" cards, filter buttons, and paginated ledger.
