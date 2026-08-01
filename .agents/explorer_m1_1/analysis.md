# Defect Investigation Analysis Report (D1, D2, D3)

**Author**: `explorer_m1_1`  
**Milestone**: M1 (TechTrust Kenya)  
**Date**: 2026-08-01  

---

## Executive Summary

A comprehensive read-only code audit was conducted for defects **D1**, **D2**, and **D3** across the TechTrust Kenya web application repository (`C:\Users\Administrator\techtrustkenya`).

- **Defect D1**: `src/lib/format.ts` incorrectly routes `repair_update` notifications to `/repairs/${n.reference_id}`. Since React Router (`src/App.tsx`) defines `/repairs` as a non-parameterized route, clicking a repair notification redirects users to the `NotFound` 404 page. In addition, the top-level `if (!n.reference_id) return null;` guard in `routeForNotification` prevents routing for notification types that route to top-level pages (e.g. `/repairs` or `/vendor/dashboard`).
- **Defect D2**: `src/components/vendor/OverviewTab.tsx` references Lucide icons `Lock` (lines 82, 172) and `ShieldCheck` (line 165) without importing them on line 5 from `"lucide-react"`, causing runtime/compilation errors.
- **Defect D3**:
  - `src/components/vendor/OrdersTab.tsx`: Line 88 renders the order ID (`#{o.id.slice(0, 8).toUpperCase()}`) without the required `.text-data-id` font token class.
  - `src/components/vendor/AnalyticsTab.tsx`: Lines 53-54 render numeric stat counters (`{data.totalOrders}` and `{data.completedOrders}`) without the required `.text-stat` font token class.

---

## 1. Defect D1: Repair Notification Routing (`src/lib/format.ts`)

### 1.1 Observations & Evidence

- **File**: `src/lib/format.ts`
- **Function**: `routeForNotification` (lines 13–31)
- **Current Code**:
```typescript
13: export const routeForNotification = (n: {
14:   type: string;
15:   reference_id: string | null;
16: }): string | null => {
17:   if (!n.reference_id) return null;
18:   switch (n.type) {
19:     case "order_update":
20:     case "payment":
21:     case "review_request":
22:     case "dispute":
23:       return `/orders/${n.reference_id}`;
24:     case "repair_update":
25:       return `/repairs/${n.reference_id}`;
26:     case "vendor_application":
27:       return `/vendor/dashboard`;
28:     default:
29:       return null;
30:   }
31: };
```

- **App Route Declaration**: `src/App.tsx` (line 63)
```typescript
63: <Route path="/repairs" element={<Repairs />} />
```
There is no `/repairs/:id` parameter route registered in `App.tsx`.

- **Notification Generator**: `src/components/vendor/RepairsTab.tsx` (lines 56–62)
```typescript
56: await supabase.from("notifications").insert({
57:   user_id: active.customer_id,
58:   title: "Repair quotation received",
59:   message: `${vendor.business_name} sent a quote of KES ${quote} for your repair.`,
60:   type: "repair_update",
61:   reference_id: active.id,
62: });
```

### 1.2 Root Cause Analysis

1. **Unmapped Route**: `routeForNotification` returns `/repairs/${n.reference_id}` (e.g. `/repairs/abc-123`). Because React Router only has a route for `/repairs`, `navigate('/repairs/abc-123')` falls back to `<Route path="*" element={<NotFound />} />` (404 Page Not Found).
2. **Premature Null Guard**: Line 17 checks `if (!n.reference_id) return null;`. If a `repair_update` or `vendor_application` notification is dispatched without a `reference_id`, line 17 returns `null` before the switch statement ever executes.

### 1.3 Recommended Fix & Code Replacement

Modify `routeForNotification` in `src/lib/format.ts` to return `/repairs` for `repair_update` and handle optional `reference_id` checks per notification type inside the switch block.

**Target File**: `src/lib/format.ts` (lines 13–31)  
**Existing Lines 13–31**:
```typescript
export const routeForNotification = (n: {
  type: string;
  reference_id: string | null;
}): string | null => {
  if (!n.reference_id) return null;
  switch (n.type) {
    case "order_update":
    case "payment":
    case "review_request":
    case "dispute":
      return `/orders/${n.reference_id}`;
    case "repair_update":
      return `/repairs/${n.reference_id}`;
    case "vendor_application":
      return `/vendor/dashboard`;
    default:
      return null;
  }
};
```

**Replacement Lines 13–31**:
```typescript
export const routeForNotification = (n: {
  type: string;
  reference_id: string | null;
}): string | null => {
  switch (n.type) {
    case "order_update":
    case "payment":
    case "review_request":
    case "dispute":
      return n.reference_id ? `/orders/${n.reference_id}` : "/orders";
    case "repair_update":
      return "/repairs";
    case "vendor_application":
      return "/vendor/dashboard";
    default:
      return n.reference_id ? `/orders/${n.reference_id}` : null;
  }
};
```

---

## 2. Defect D2: Missing Icon Imports in `OverviewTab.tsx`

### 2.1 Observations & Evidence

- **File**: `src/components/vendor/OverviewTab.tsx`
- **Import Statement**: Line 5
```typescript
5: import { Package, ShoppingCart, Wrench, Wallet, Star, AlertTriangle } from "lucide-react";
```
Notice `Lock` and `ShieldCheck` are missing from the `lucide-react` import statement.

- **Component Usage**:
  - Line 82: `<StatCard icon={Lock} label="Pending Float funds" ... />`
  - Line 165: `<ShieldCheck className="h-3 w-3" /> Released` inside `FloatStatusPill`
  - Line 172: `<Lock className="h-3 w-3" /> Held` inside `FloatStatusPill`

### 2.2 Root Cause Analysis

Because `Lock` and `ShieldCheck` are referenced in JSX / prop values on lines 82, 165, and 172 but omitted from the import declaration on line 5, the React component throws a `ReferenceError: Lock is not defined` / `ReferenceError: ShieldCheck is not defined` when executed, and fails TypeScript type checks.

### 2.3 Recommended Fix & Code Replacement

**Target File**: `src/components/vendor/OverviewTab.tsx` (line 5)  
**Existing Line 5**:
```typescript
import { Package, ShoppingCart, Wrench, Wallet, Star, AlertTriangle } from "lucide-react";
```

**Replacement Line 5**:
```typescript
import { Package, ShoppingCart, Wrench, Wallet, Star, AlertTriangle, Lock, ShieldCheck } from "lucide-react";
```

---

## 3. Defect D3: Typography & Styling Tokens

### 3.1 Part A: Missing `text-data-id` Class in `OrdersTab.tsx`

#### Observations & Evidence
- **File**: `src/components/vendor/OrdersTab.tsx`
- **Lines 85–90**:
```typescript
85:                     <div className="min-w-0">
86:                       <div className="font-medium truncate">{o.product?.brand} {o.product?.model_name}</div>
87:                       <div className="text-xs text-muted-foreground">
88:                         #{o.id.slice(0, 8).toUpperCase()} · Qty {o.quantity} · {formatDate(o.created_at)}
89:                       </div>
90:                       <div className="text-xs mt-1">
```
- **Design Specification**: Per `PROJECT.md` contract line 7 & line 48:
  "JetBrains Mono for numbers/prices/stats/data-ids (`.text-price`, `.text-stat`, `.text-data-id`). All reference IDs render with `className="text-data-id"`."

#### Root Cause Analysis
Line 88 renders the order reference ID `#{o.id.slice(0, 8).toUpperCase()}` as plain text inside `<div className="text-xs text-muted-foreground">` without wrapping it in `<span className="text-data-id">`. This fails visual design consistency by using Inter instead of JetBrains Mono font.

#### Recommended Fix & Code Replacement
**Target File**: `src/components/vendor/OrdersTab.tsx` (lines 87–89)  
**Existing Lines 87–89**:
```typescript
                      <div className="text-xs text-muted-foreground">
                        #{o.id.slice(0, 8).toUpperCase()} · Qty {o.quantity} · {formatDate(o.created_at)}
                      </div>
```

**Replacement Lines 87–89**:
```typescript
                      <div className="text-xs text-muted-foreground">
                        <span className="text-data-id">#{o.id.slice(0, 8).toUpperCase()}</span> · Qty {o.quantity} · {formatDate(o.created_at)}
                      </div>
```

---

### 3.2 Part B: Missing `text-stat` Class in `AnalyticsTab.tsx`

#### Observations & Evidence
- **File**: `src/components/vendor/AnalyticsTab.tsx`
- **Lines 52–57**:
```typescript
52:       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
53:         <Card className="p-4"><div className="text-xs text-muted-foreground">Orders</div><div className="text-2xl font-bold">{data.totalOrders}</div></Card>
54:         <Card className="p-4"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-bold">{data.completedOrders}</div></Card>
55:         <Card className="p-4"><div className="text-xs text-muted-foreground">Revenue (payout)</div><div className="text-xl font-bold"><span className="text-price">{formatKsh(data.revenue)}</span></div></Card>
56:         <Card className="p-4"><div className="text-xs text-muted-foreground">Avg order</div><div className="text-xl font-bold"><span className="text-price">{formatKsh(Math.round(data.avgOrder))}</span></div></Card>
57:       </div>
```
- **Design Specification**: Per `PROJECT.md` contract line 7 & line 47:
  "JetBrains Mono for numbers/prices/stats/data-ids (`.text-price`, `.text-stat`, `.text-data-id`). Stat counters: All key metrics render with `className="text-stat"`."

#### Root Cause Analysis
Lines 53 and 54 render stat counters `{data.totalOrders}` and `{data.completedOrders}` with `className="text-2xl font-bold"` instead of `className="text-2xl font-bold text-stat"`. This omits the JetBrains Mono font family and stat styling tokens.

#### Recommended Fix & Code Replacement
**Target File**: `src/components/vendor/AnalyticsTab.tsx` (lines 53–54)  
**Existing Lines 53–54**:
```typescript
        <Card className="p-4"><div className="text-xs text-muted-foreground">Orders</div><div className="text-2xl font-bold">{data.totalOrders}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-bold">{data.completedOrders}</div></Card>
```

**Replacement Lines 53–54**:
```typescript
        <Card className="p-4"><div className="text-xs text-muted-foreground">Orders</div><div className="text-2xl font-bold text-stat">{data.totalOrders}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-bold text-stat">{data.completedOrders}</div></Card>
```

---

## 4. Summary Table of Files & Recommended Edits

| Defect ID | Target File Path | Target Lines | Summary of Defect | Summary of Fix |
|-----------|------------------|--------------|-------------------|----------------|
| **D1** | `src/lib/format.ts` | 13–31 | `routeForNotification` returns `/repairs/${n.reference_id}` (404 route) and has top-level `if (!n.reference_id) return null;` guard. | Update function to return `/repairs` for `repair_update` and handle reference checking per notification type. |
| **D2** | `src/components/vendor/OverviewTab.tsx` | 5 | Omitted `Lock` and `ShieldCheck` from `lucide-react` import. | Add `Lock, ShieldCheck` to import on line 5. |
| **D3 (A)** | `src/components/vendor/OrdersTab.tsx` | 87–89 | Order reference ID missing `.text-data-id` class wrapper. | Wrap order ID in `<span className="text-data-id">...</span>`. |
| **D3 (B)** | `src/components/vendor/AnalyticsTab.tsx` | 53–54 | Stat counters `totalOrders` and `completedOrders` missing `.text-stat` class. | Add `text-stat` to `className` on lines 53 and 54. |

---

## 5. Verification Plan for Implementer

1. **Verify D1**:
   - Run `npx tsc --noEmit` or `npm run build`.
   - Test `routeForNotification({ type: 'repair_update', reference_id: '123' })` -> returns `/repairs`.
   - Test clicking a repair notification in the app -> routes to `/repairs` instead of 404 page.

2. **Verify D2**:
   - Run `npx tsc --noEmit`.
   - Load Vendor Dashboard Overview tab (`/vendor/dashboard`). Confirm "Pending Float funds" card and float status pills ("Released", "Held") render icons without runtime errors.

3. **Verify D3**:
   - Open Vendor Dashboard Orders tab (`/vendor/dashboard`). Confirm Order IDs use JetBrains Mono font (class `text-data-id`).
   - Open Vendor Dashboard Analytics tab. Confirm "Orders" and "Completed" counter figures use JetBrains Mono font (class `text-stat`).
