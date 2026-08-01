# Stitch Design System Audit Report (Pages 8 to 13)

**Auditor:** `teamwork_preview_explorer #3`  
**Milestone:** M1  
**Project:** TechTrust Kenya Electronics Marketplace  
**Date:** 2026-08-01  

---

## Executive Summary

A comprehensive audit was performed on Public Buyer Pages 8 to 13 of the TechTrust Kenya application for compliance with the **Stitch Design System** specifications.

### Target Pages Analyzed:
8. **Cart** (`src/pages/Cart.tsx`)
9. **Checkout** (`src/pages/Checkout.tsx`)
10. **Orders** (`src/pages/Orders.tsx`)
11. **Order Detail** (`src/pages/OrderDetail.tsx`)
12. **Profile** (`src/pages/Profile.tsx`)
13. **Notifications** (`src/pages/Notifications.tsx`)

### Key Audit Findings & Compliance Summary:
- **Color Tokens**: Overall adherence to color design tokens is **EXCELLENT**. All 6 pages consistently use CSS variable-backed design tokens (`bg-primary`, `text-primary`, `text-accent`, `bg-success`, `bg-float`, `bg-warning`, `bg-destructive`, `bg-muted`). **No hardcoded arbitrary hex values** (such as raw `#002766`, `#0058be`, or `#25c65f`) were found in JSX/Tailwind classes.
- **Typography (Headings & Body)**: All `h1`, `h2`, `h3` heading elements automatically inherit **Sora** display font from CSS `@layer base` settings in `src/index.css`. Body text correctly inherits **Inter UI**. Minor inconsistencies were identified where uppercase section eyebrows did not use the standard `.text-eyebrow` class.
- **JetBrains Mono Typography Token Compliance (`.text-price`, `.text-stat`, `.text-data-id`)**:
  - `.text-price` coverage is **HIGH** across monetary amounts (e.g. `Cart`, `Checkout`, `Orders`, `OrderDetail`). However, monetary figures in `Profile.tsx` (Wallet balance and referral incentive) were missing `.text-price`.
  - `.text-stat` coverage is **PARTIAL**. Item quantities, stock counts, timer durations, item counters, and unread notification counts frequently omitted `.text-stat`.
  - `.text-data-id` coverage is **PARTIAL**. Order IDs in `OrderDetail.tsx` use `.text-data-id`, but `Orders.tsx` omitted order IDs entirely from list items, and `Profile.tsx` used `font-mono tracking-wider` instead of `.text-data-id`.

---

## Detailed Page-by-Page Audit & Recommendations

---

### Page 8: Cart (`src/pages/Cart.tsx`)

#### Compliance Overview
- **Color Tokens**: Fully compliant. Uses `bg-primary`, `text-primary-foreground`, `text-accent`, `text-success`, `hover:text-destructive`, `bg-muted`.
- **Typography**: Sora headings used on `h1` and `h2`.
- **JetBrains Mono**: `.text-price` applied on all formatted prices (`p.price_ksh`, `lineTotal`, `subtotal`, `platformFee`, `total`). `.text-stat` is missing on item quantities, stock counts, and item label counters.

#### Identified Issues & Recommended Fixes

##### Issue 8.1: Missing `.text-stat` on Header Item Counter
- **File**: `src/pages/Cart.tsx` (Lines 122–124)
- **Description**: The numeric count inside `itemLabel` (`{count} items`) in the main page header lacks the `.text-stat` JetBrains Mono class.
- **Current Code**:
  ```tsx
  <span className="text-muted-foreground font-normal text-xl">
    ({itemLabel})
  </span>
  ```
- **Recommended Fix**:
  ```tsx
  <span className="text-muted-foreground font-normal text-xl">
    (<span className="text-stat">{count}</span> {count === 1 ? "item" : "items"})
  </span>
  ```

##### Issue 8.2: Missing `.text-stat` on Item Quantity Selector
- **File**: `src/pages/Cart.tsx` (Line 191)
- **Description**: The numeric quantity display `{it.quantity}` inside the quantity adjustment control lacks the `.text-stat` font class.
- **Current Code**:
  ```tsx
  <span className="w-9 text-center text-sm font-medium select-none">
    {it.quantity}
  </span>
  ```
- **Recommended Fix**:
  ```tsx
  <span className="w-9 text-center text-sm font-medium select-none text-stat">
    {it.quantity}
  </span>
  ```

##### Issue 8.3: Missing `.text-stat` on Stock Count Display
- **File**: `src/pages/Cart.tsx` (Line 207)
- **Description**: Stock availability count `{max}` is a numeric stat but lacks `.text-stat` styling.
- **Current Code**:
  ```tsx
  <span className="text-xs text-muted-foreground ml-2">
    {max} in stock
  </span>
  ```
- **Recommended Fix**:
  ```tsx
  <span className="text-xs text-muted-foreground ml-2">
    <span className="text-stat">{max}</span> in stock
  </span>
  ```

##### Issue 8.4: Missing `.text-stat` on Sidebar Subtotal Item Counter
- **File**: `src/pages/Cart.tsx` (Line 238)
- **Description**: Subtotal label item count in the summary sidebar lacks `.text-stat` wrapper on `{count}`.
- **Current Code**:
  ```tsx
  <span className="text-primary-foreground/60">
    Subtotal ({itemLabel})
  </span>
  ```
- **Recommended Fix**:
  ```tsx
  <span className="text-primary-foreground/60">
    Subtotal (<span className="text-stat">{count}</span> {count === 1 ? "item" : "items"})
  </span>
  ```

---

### Page 9: Checkout (`src/pages/Checkout.tsx`)

#### Compliance Overview
- **Color Tokens**: Fully compliant. Uses `bg-primary text-primary-foreground`, `text-accent`, `bg-success/5 border-success/30`, `text-warning`, `bg-destructive/10`.
- **Typography**: Sora headings used on `h1` and `h2`.
- **JetBrains Mono**: `.text-price` applied on subtotal, platform fee, total, and CTA button. `.text-stat` missing on order item quantity indicator and payment timeout counter.

#### Identified Issues & Recommended Fixes

##### Issue 9.1: Missing `.text-stat` on Product Quantity Indicator
- **File**: `src/pages/Checkout.tsx` (Line 268)
- **Description**: Item quantity indicator (`&times;&nbsp;{order.quantity}`) in product summary lacks `.text-stat` JetBrains Mono styling.
- **Current Code**:
  ```tsx
  <span className="text-sm text-primary-foreground/60">
    &times;&nbsp;{order.quantity}
  </span>
  ```
- **Recommended Fix**:
  ```tsx
  <span className="text-sm text-primary-foreground/60">
    &times;&nbsp;<span className="text-stat">{order.quantity}</span>
  </span>
  ```

##### Issue 9.2: Missing `.text-stat` on Timeout Counter Display
- **File**: `src/pages/Checkout.tsx` (Line 388)
- **Description**: The timeout period `{TIMEOUT_SECONDS}` in the M-Pesa timeout card is a numeric statistic lacking `.text-stat`.
- **Current Code**:
  ```tsx
  <p className="text-xs text-muted-foreground mb-3">
    We did not hear back from M-Pesa within {TIMEOUT_SECONDS}{" "}
    seconds...
  </p>
  ```
- **Recommended Fix**:
  ```tsx
  <p className="text-xs text-muted-foreground mb-3">
    We did not hear back from M-Pesa within <span className="text-stat">{TIMEOUT_SECONDS}</span>{" "}
    seconds...
  </p>
  ```

---

### Page 10: Orders (`src/pages/Orders.tsx`)

#### Compliance Overview
- **Color Tokens**: Status badges correctly use `bg-warning/10`, `bg-accent/10`, `bg-success/10`, `bg-destructive/10`. Active status filter button uses `bg-foreground` instead of primary design token `bg-primary`.
- **Typography**: Uses Sora headings. Monthly group headers do not utilize standard `.text-eyebrow` class.
- **JetBrains Mono**: `.text-price` is applied on `total_amount_ksh`. Missing Order ID display (`.text-data-id`) and item quantity display (`.text-stat`) in list items.

#### Identified Issues & Recommended Fixes

##### Issue 10.1: Non-Token Active Style on Filter Pill Buttons
- **File**: `src/pages/Orders.tsx` (Lines 98–102)
- **Description**: Active filter buttons use `bg-foreground text-background border-foreground` instead of primary token `bg-primary text-primary-foreground border-primary`.
- **Current Code**:
  ```tsx
  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
    filter === f.key
      ? "bg-foreground text-background border-foreground"
      : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
  }`}
  ```
- **Recommended Fix**:
  ```tsx
  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
    filter === f.key
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
  }`}
  ```

##### Issue 10.2: Non-Standard Section Eyebrow Class for Monthly Headers
- **File**: `src/pages/Orders.tsx` (Line 124)
- **Description**: Monthly group header uses inline uppercase classes instead of `.text-eyebrow`.
- **Current Code**:
  ```tsx
  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
    {month}
  </h2>
  ```
- **Recommended Fix**:
  ```tsx
  <h2 className="text-eyebrow text-muted-foreground mb-3">
    {month}
  </h2>
  ```

##### Issue 10.3: Missing Order Reference ID & `.text-data-id` Class
- **File**: `src/pages/Orders.tsx` (Lines 140–146)
- **Description**: Order cards omit the order reference ID (e.g., `#TT-84920`), missing the requirement to display reference IDs formatted with `.text-data-id`.
- **Current Code**:
  ```tsx
  <div className="flex-1 min-w-0">
    <div className="font-medium text-sm truncate">
      {o.product?.brand} {o.product?.model_name}
    </div>
    <div className="text-xs text-muted-foreground truncate">
      {o.vendor?.business_name}
    </div>
  </div>
  ```
- **Recommended Fix**:
  ```tsx
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <span className="font-medium text-sm truncate">
        {o.product?.brand} {o.product?.model_name}
      </span>
      <span className="text-data-id text-muted-foreground shrink-0">
        #{o.id.slice(0, 8).toUpperCase()}
      </span>
    </div>
    <div className="text-xs text-muted-foreground truncate">
      {o.vendor?.business_name}
    </div>
  </div>
  ```

##### Issue 10.4: Missing Item Quantity Stat & `.text-stat` Class
- **File**: `src/pages/Orders.tsx` (Line 144)
- **Description**: Quantity statistic `{o.quantity}` is omitted from order history items.
- **Recommended Fix**: Add quantity display alongside vendor name:
  ```tsx
  <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
    <span>{o.vendor?.business_name}</span>
    <span>·</span>
    <span>Qty <span className="text-stat">{o.quantity}</span></span>
  </div>
  ```

---

### Page 11: Order Detail (`src/pages/OrderDetail.tsx`)

#### Compliance Overview
- **Color Tokens**: Fully compliant. Uses `bg-success`, `bg-float`, `bg-warning/10`, `bg-accent`, `bg-destructive/10`.
- **Typography**: Sora headings used on `h1`, `h2`, `h3`.
- **JetBrains Mono**: Excellent compliance. Order ID correctly uses `.text-data-id`. Total paid, vendor payout, and platform fee correctly use `.text-price`. Item quantity is missing `.text-stat`.

#### Identified Issues & Recommended Fixes

##### Issue 11.1: Missing `.text-stat` on Item Quantity
- **File**: `src/pages/OrderDetail.tsx` (Line 313)
- **Description**: Quantity value `order.quantity` in product details card lacks `.text-stat` font class.
- **Current Code**:
  ```tsx
  <div className="text-xs text-muted-foreground mt-0.5">
    Qty {order.quantity} · {formatDate(order.created_at)}
  </div>
  ```
- **Recommended Fix**:
  ```tsx
  <div className="text-xs text-muted-foreground mt-0.5">
    Qty <span className="text-stat">{order.quantity}</span> · {formatDate(order.created_at)}
  </div>
  ```

---

### Page 12: Profile (`src/pages/Profile.tsx`)

#### Compliance Overview
- **Color Tokens**: Fully compliant. Uses `bg-primary`, `bg-accent-soft text-accent`, `bg-success/5 border-success/20`.
- **Typography**: Sora headings used on `h1` and `h2`.
- **JetBrains Mono**: Referral code input uses inline `font-mono tracking-wider` instead of `.text-data-id`. Monetary values in referral banner and wallet balance missing `.text-price`.

#### Identified Issues & Recommended Fixes

##### Issue 12.1: Missing `.text-price` on Referral Banner Amounts
- **File**: `src/pages/Profile.tsx` (Lines 248, 251)
- **Description**: Monetary reward amounts (`KES 500` / `500`) in referral headers and body text lack `.text-price` JetBrains Mono styling.
- **Current Code**:
  ```tsx
  <h2 className="font-semibold">Refer friends, earn KES 500</h2>
  <p className="text-sm text-muted-foreground mb-4">
    Share your code. You both get KES 500 credited to your wallet once they complete their first order.
  </p>
  ```
- **Recommended Fix**:
  ```tsx
  <h2 className="font-semibold">Refer friends, earn <span className="text-price">KES 500</span></h2>
  <p className="text-sm text-muted-foreground mb-4">
    Share your code. You both get <span className="text-price">KES 500</span> credited to your wallet once they complete their first order.
  </p>
  ```

##### Issue 12.2: Non-Standard `.text-data-id` Token Usage for Referral Code
- **File**: `src/pages/Profile.tsx` (Line 254)
- **Description**: Referral code field uses generic `font-mono tracking-wider` instead of the design system `.text-data-id` token.
- **Current Code**:
  ```tsx
  <Input value={referralCode ?? "…"} readOnly className="font-mono tracking-wider bg-muted" />
  ```
- **Recommended Fix**:
  ```tsx
  <Input value={referralCode ?? "…"} readOnly className="text-data-id font-mono bg-muted" />
  ```

##### Issue 12.3: Missing `.text-price` on Wallet Balance Amount
- **File**: `src/pages/Profile.tsx` (Line 263)
- **Description**: Wallet balance monetary figure lacks `.text-price` JetBrains Mono styling.
- **Current Code**:
  ```tsx
  <p className="text-sm">
    Wallet balance:{" "}
    <span className="font-semibold text-foreground">KES {walletBalance.toLocaleString()}</span>
  </p>
  ```
- **Recommended Fix**:
  ```tsx
  <p className="text-sm">
    Wallet balance:{" "}
    <span className="text-price font-semibold text-foreground">KES {walletBalance.toLocaleString()}</span>
  </p>
  ```

---

### Page 13: Notifications (`src/pages/Notifications.tsx`)

#### Compliance Overview
- **Color Tokens**: Fully compliant. Uses `border-l-accent`, `text-accent`, `bg-accent/10`.
- **Typography**: Uses Sora headings. Section headers use custom inline classes rather than `.text-eyebrow`.
- **JetBrains Mono**: Missing `.text-stat` on unread badge counter and relative time duration numbers.

#### Identified Issues & Recommended Fixes

##### Issue 13.1: Non-Standard Section Eyebrow & Missing `.text-stat` on Unread Counter
- **File**: `src/pages/Notifications.tsx` (Lines 200–202)
- **Description**: Section header uses inline styling instead of `.text-eyebrow`, and unread count `{unread.length}` lacks `.text-stat` styling.
- **Current Code**:
  ```tsx
  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
    Unread ({unread.length})
  </h2>
  ```
- **Recommended Fix**:
  ```tsx
  <h2 className="text-eyebrow text-muted-foreground mb-2">
    Unread (<span className="text-stat">{unread.length}</span>)
  </h2>
  ```

##### Issue 13.2: Non-Standard Eyebrow Styling on "Earlier" Section Header
- **File**: `src/pages/Notifications.tsx` (Lines 214–216)
- **Description**: Section header for earlier notifications uses inline uppercase utility classes instead of `.text-eyebrow`.
- **Current Code**:
  ```tsx
  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
    Earlier
  </h2>
  ```
- **Recommended Fix**:
  ```tsx
  <h2 className="text-eyebrow text-muted-foreground mb-2">
    Earlier
  </h2>
  ```

##### Issue 13.3: Missing `.text-stat` on Relative Time Numbers
- **File**: `src/pages/Notifications.tsx` (Lines 53–58)
- **Description**: Numeric values in relative timestamp strings (e.g. `${mins} minutes ago`, `${hours} hours ago`) lack `.text-stat` styling.
- **Current Code**:
  ```tsx
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  ```
- **Recommended Fix**: Wrap numeric values in relative time component or return formatted spans where appropriate:
  ```tsx
  <span className="text-xs text-muted-foreground font-sans">
    <span className="text-stat">{mins}</span> minute{mins === 1 ? "" : "s"} ago
  </span>
  ```

---

## Verification Matrix

| Page # | Page Name | Path | Color Token Adherence | Sora Headings | JetBrains Mono (.text-price, .text-stat, .text-data-id) | Audit Status |
|---|---|---|---|---|---|---|
| 8 | Cart | `src/pages/Cart.tsx` | PASS (100%) | PASS (100%) | PARTIAL (Prices Pass, Quantities/Stats missing `.text-stat`) | NEEDS MINOR POLISH |
| 9 | Checkout | `src/pages/Checkout.tsx` | PASS (100%) | PASS (100%) | PARTIAL (Prices Pass, Quantity/Timer missing `.text-stat`) | NEEDS MINOR POLISH |
| 10 | Orders | `src/pages/Orders.tsx` | PASS (95% - Active filter pill needs `bg-primary`) | PASS (90% - Needs `.text-eyebrow`) | PARTIAL (Prices Pass, Missing Order ID & Qty stat) | NEEDS MINOR POLISH |
| 11 | Order Detail | `src/pages/OrderDetail.tsx` | PASS (100%) | PASS (100%) | PASS (95% - Order ID & Prices Pass, Qty missing `.text-stat`) | PASS (NEAR PERFECT) |
| 12 | Profile | `src/pages/Profile.tsx` | PASS (100%) | PASS (100%) | PARTIAL (Wallet & Referral amounts missing `.text-price`, Ref Code needs `.text-data-id`) | NEEDS MINOR POLISH |
| 13 | Notifications | `src/pages/Notifications.tsx` | PASS (100%) | PASS (90% - Needs `.text-eyebrow`) | PARTIAL (Unread counter missing `.text-stat`) | NEEDS MINOR POLISH |

