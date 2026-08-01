# Stitch Design System Compliance Audit: Public Buyer Pages 1–7

**Target Pages**:
1. Home (`src/pages/Index.tsx`)
2. Browse (`src/pages/Browse.tsx`)
3. Product Detail (`src/pages/ProductDetail.tsx`)
4. Shop Page (`src/pages/ShopPage.tsx`)
5. Repairs (`src/pages/Repairs.tsx`)
6. How It Works (`src/pages/HowItWorks.tsx`)
7. Terms (`src/pages/Terms.tsx`)

---

## Executive Summary
An in-depth code audit of Public Buyer Pages 1 to 7 was conducted against the TechTrust Kenya **Stitch Design System** rules:
- **Design Tokens**: Primary Navy (`#002766` / `var(--primary)`), Secondary/Accent Blue (`#0058be` / `var(--accent)`), Success Green (`#25c65f` / `var(--success)`).
- **Typography**: Sora headings (`font-display`, mapped automatically to `h1, h2, h3, h4`), Inter UI body font.
- **JetBrains Mono Classes**: `.text-price` for numeric prices/amounts, `.text-stat` for key metrics/counters/ratings, `.text-data-id` for IDs/hashes/dates.

### Audit Summary Table

| Page # | Page Name | File Path | Color Token Issues | Typography Issues | JetBrains Mono (.text-price / .text-stat / .text-data-id) Gaps | Recommended Fix Status |
|---|---|---|---|---|---|---|
| 1 | Home | `src/pages/Index.tsx` | 2 minor (raw `text-white` & `text-white/20`) | Compliant | Missing `.text-stat` on step numbers (01–03) & child components (`VendorCard`, `ProductCard`) | Actionable |
| 2 | Browse | `src/pages/Browse.tsx` | Clean token usage | Compliant | Missing `.text-price` in filter chips & `.text-stat` in product count & pagination | Actionable |
| 3 | Product Detail | `src/pages/ProductDetail.tsx` | Clean token usage | Compliant | Missing `.text-stat` on ratings, review counts, stock counts, quantity & tabs | Actionable |
| 4 | Shop Page | `src/pages/ShopPage.tsx` | Clean token usage | Compliant | Missing `.text-stat` on ratings, vendor sales count, turnaround days | Actionable |
| 5 | Repairs | `src/pages/Repairs.tsx` | Clean token usage | Compliant | Missing `.text-stat` on rating badge & turnaround days | Actionable |
| 6 | How It Works | `src/pages/HowItWorks.tsx` | Clean token usage | Compliant | Missing `.text-stat` on process step numbers (01–04) | Actionable |
| 7 | Terms | `src/pages/Terms.tsx` | Clean token usage | Compliant | Missing `.text-price` on referral credit ("KES 500") & `.text-data-id` on date | Actionable |

---

## Detailed Page-by-Page Audit Findings & Fixes

---

### Page 1: Home Page (`src/pages/Index.tsx`)

#### 1. Observations
- Headings (`h1`, `h2`) utilize `font-display` (Sora) via `@layer base` CSS rule.
- CountUp metrics (e.g., stats counter on line 154) correctly use `text-stat`.
- Main prices in embedded `ProductCard` use `text-price`.
- Raw colors / hardcoded utility classes exist in two places:
  - Line 219: `tabular-nums text-white/20` inside "How It Works" step numbers.
  - Line 328: `Button asChild className="bg-accent text-white hover:bg-accent/90"`.
- Step numbers `01`, `02`, `03` (line 219) have `tabular-nums` but lack `.text-stat` for JetBrains Mono font.

#### 2. Specific Line-by-Line Issues & Precise Fixes

- **File**: `src/pages/Index.tsx`
  - **Line 219**:
    - *Issue*: Step counter `01`, `02`, `03` uses `text-white/20` and lacks `.text-stat`.
    - *Current Code*:
      ```tsx
      <div className="w-10 shrink-0 text-3xl font-black leading-none tabular-nums text-white/20 transition-colors group-hover:text-accent/60">
        {num}
      </div>
      ```
    - *Recommended Fix*:
      ```tsx
      <div className="text-stat w-10 shrink-0 text-3xl font-black leading-none text-primary-foreground/20 transition-colors group-hover:text-accent/60">
        {num}
      </div>
      ```
  - **Line 328**:
    - *Issue*: Hardcoded `text-white` on button instead of token `text-accent-foreground`.
    - *Current Code*:
      ```tsx
      <Button asChild className="bg-accent text-white hover:bg-accent/90">
      ```
    - *Recommended Fix*:
      ```tsx
      <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
      ```

- **File**: `src/components/marketplace/ProductCard.tsx` (Rendered on Home)
  - **Line 134**:
    - *Issue*: Low stock count `Only {quantity_in_stock} left` lacks `.text-stat` class.
    - *Current Code*:
      ```tsx
      <p className="text-[10px] font-medium text-warning">Only {quantity_in_stock} left</p>
      ```
    - *Recommended Fix*:
      ```tsx
      <p className="text-[10px] font-medium text-warning">Only <span className="text-stat">{quantity_in_stock}</span> left</p>
      ```

- **File**: `src/components/marketplace/VendorCard.tsx` (Rendered on Home)
  - **Line 58 & 62**:
    - *Issue*: Rating metric `{Number(average_rating).toFixed(1)}` and completed sales count `{total_completed_transactions}` lack `.text-stat` class.
    - *Current Code*:
      ```tsx
      <span className="flex items-center gap-1">
        <Star className="h-3 w-3 fill-warning text-warning" />
        {Number(average_rating).toFixed(1)}
      </span>
      ...
      <span>{total_completed_transactions} completed</span>
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="flex items-center gap-1">
        <Star className="h-3 w-3 fill-warning text-warning" />
        <span className="text-stat">{Number(average_rating).toFixed(1)}</span>
      </span>
      ...
      <span><span className="text-stat">{total_completed_transactions}</span> completed</span>
      ```

---

### Page 2: Browse Page (`src/pages/Browse.tsx`)

#### 1. Observations
- Filter panel, categories, condition tags, county selectors use standard design system components (`Select`, `Checkbox`, `Slider`, `Badge`, `Button`).
- Main title `Browse Products` (`h1` line 261) correctly renders in Sora.
- Active price filter chips, product total counts, pagination numbers lack `.text-price` / `.text-stat` classes.

#### 2. Specific Line-by-Line Issues & Precise Fixes

- **File**: `src/pages/Browse.tsx`
  - **Line 135**:
    - *Issue*: Active price range filter chip renders raw numbers without `.text-price`.
    - *Current Code*:
      ```tsx
      ...(priceRange[0] !== DEFAULT_PRICE[0] || priceRange[1] !== DEFAULT_PRICE[1]
        ? [{ label: `KSH ${priceRange[0].toLocaleString()}–${priceRange[1].toLocaleString()}`, remove: () => setPriceRange(DEFAULT_PRICE) }]
        : []),
      ```
    - *Recommended Fix*:
      ```tsx
      ...(priceRange[0] !== DEFAULT_PRICE[0] || priceRange[1] !== DEFAULT_PRICE[1]
        ? [{ label: `KSH ${priceRange[0].toLocaleString()}–${priceRange[1].toLocaleString()}`, remove: () => setPriceRange(DEFAULT_PRICE) }]
        : []),
      ```
      *Note*: Update `FilterChip` component on line 41 to wrap numeric price/range labels with `.text-price` when appropriate, or wrap price range string output.

  - **Line 263–265**:
    - *Issue*: Total products found counter `{products.length}` is a key metric counter, missing `.text-stat`.
    - *Current Code*:
      ```tsx
      <p className="text-sm text-muted-foreground mt-0.5">
        {products.length} {products.length === 1 ? "product" : "products"} found
      </p>
      ```
    - *Recommended Fix*:
      ```tsx
      <p className="text-sm text-muted-foreground mt-0.5">
        <span className="text-stat font-medium">{products.length}</span> {products.length === 1 ? "product" : "products"} found
      </p>
      ```

  - **Line 354**:
    - *Issue*: Pagination page numbers `Page {page} of {totalPages}` lack `.text-stat` class.
    - *Current Code*:
      ```tsx
      <span className="text-sm text-muted-foreground px-2">
        Page {page} of {totalPages}
      </span>
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="text-sm text-muted-foreground px-2">
        Page <span className="text-stat font-medium">{page}</span> of <span className="text-stat font-medium">{totalPages}</span>
      </span>
      ```

  - **Line 173–190**:
    - *Issue*: Min and Max price input fields in `FilterPanel` do not use JetBrains Mono font.
    - *Current Code*:
      ```tsx
      <Input ... className="text-xs h-8" placeholder="Min" />
      ```
    - *Recommended Fix*:
      ```tsx
      <Input ... className="text-price text-xs h-8" placeholder="Min" />
      ```

---

### Page 3: Product Detail (`src/pages/ProductDetail.tsx`)

#### 1. Observations
- Price display line 310 `<span className="text-price">{formatKsh(product.price_ksh)}</span>` and total line 377 correctly use `.text-price`.
- Float Protection explainer card (line 383) correctly uses `border-float/25 bg-accent-soft` and `bg-float`.
- Multiple rating values, stock counters, review counts, vendor statistics lack `.text-stat`.

#### 2. Specific Line-by-Line Issues & Precise Fixes

- **File**: `src/pages/ProductDetail.tsx`
  - **Line 70 & 73** (`StarRow` component):
    - *Issue*: Star rating number `{star}` and review count `{count}` lack `.text-stat`.
    - *Current Code*:
      ```tsx
      <span className="w-4 text-right text-muted-foreground">{star}</span>
      ...
      <span className="w-6 text-right text-muted-foreground text-xs">{count}</span>
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="text-stat w-4 text-right text-muted-foreground">{star}</span>
      ...
      <span className="text-stat w-6 text-right text-muted-foreground text-xs">{count}</span>
      ```

  - **Line 304 & 305**:
    - *Issue*: Average rating `{avgRating.toFixed(1)}` and review count `{reviews.length}` lack `.text-stat`.
    - *Current Code*:
      ```tsx
      <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="text-stat text-sm font-medium">{avgRating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">(<span className="text-stat">{reviews.length}</span> reviews)</span>
      ```

  - **Line 335 & 340**:
    - *Issue*: Low stock count `only {product.quantity_in_stock} left` and in stock `({product.quantity_in_stock} units)` lack `.text-stat`.
    - *Current Code*:
      ```tsx
      Low stock — only {product.quantity_in_stock} left
      In stock ({product.quantity_in_stock} units)
      ```
    - *Recommended Fix*:
      ```tsx
      Low stock — only <span className="text-stat">{product.quantity_in_stock}</span> left
      In stock (<span className="text-stat">{product.quantity_in_stock}</span> units)
      ```

  - **Line 371**:
    - *Issue*: Quantity selector value `{qty}` lacks `.text-stat`.
    - *Current Code*:
      ```tsx
      <span className="w-10 text-center font-semibold">{qty}</span>
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="text-stat w-10 text-center font-semibold">{qty}</span>
      ```

  - **Line 428 & 432**:
    - *Issue*: Vendor average rating `{Number(...).toFixed(1)}` and sales count `{product.vendor.total_completed_transactions}` lack `.text-stat`.
    - *Current Code*:
      ```tsx
      {Number(product.vendor.average_rating ?? 0).toFixed(1)}
      {product.vendor.total_completed_transactions ?? 0} sales
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="text-stat">{Number(product.vendor.average_rating ?? 0).toFixed(1)}</span>
      <span className="text-stat">{product.vendor.total_completed_transactions ?? 0}</span> sales
      ```

  - **Line 466, 478, 483**:
    - *Issue*: Tab review count `Reviews ({reviews.length})`, big breakdown rating `{avgRating.toFixed(1)}`, and review count text `{reviews.length}` lack `.text-stat`.
    - *Current Code*:
      ```tsx
      <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
      ...
      <div className="text-4xl font-extrabold text-center mb-1">{avgRating.toFixed(1)}</div>
      ...
      {reviews.length} review{reviews.length !== 1 ? "s" : ""}
      ```
    - *Recommended Fix*:
      ```tsx
      <TabsTrigger value="reviews">Reviews (<span className="text-stat">{reviews.length}</span>)</TabsTrigger>
      ...
      <div className="text-stat text-4xl font-extrabold text-center mb-1">{avgRating.toFixed(1)}</div>
      ...
      <span className="text-stat">{reviews.length}</span> review{reviews.length !== 1 ? "s" : ""}
      ```

---

### Page 4: Shop Page (`src/pages/ShopPage.tsx`)

#### 1. Observations
- Storefront header displays vendor details cleanly with `bg-muted/40` background and `bg-success/10` verified badge.
- Service prices on line 141 use `<span className="text-price">{formatKsh(s.price_min_ksh)}</span>`.
- Rating metrics, sales counters, repair turnaround days lack `.text-stat`.

#### 2. Specific Line-by-Line Issues & Precise Fixes

- **File**: `src/pages/ShopPage.tsx`
  - **Line 71 & 78**:
    - *Issue*: Vendor rating metric `{Number(vendor.average_rating).toFixed(1)}` and sales count `{vendor.total_completed_transactions}` lack `.text-stat`.
    - *Current Code*:
      ```tsx
      <span className="font-medium text-foreground">{Number(vendor.average_rating).toFixed(1)}</span>
      ...
      <span><strong className="text-foreground">{vendor.total_completed_transactions}</strong> sales</span>
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="text-stat font-medium text-foreground">{Number(vendor.average_rating).toFixed(1)}</span>
      ...
      <span><strong className="text-stat text-foreground">{vendor.total_completed_transactions}</strong> sales</span>
      ```

  - **Line 136**:
    - *Issue*: Repair service estimated turnaround days `{s.estimated_turnaround_days} days` lacks `.text-stat`.
    - *Current Code*:
      ```tsx
      <Badge variant="outline">{s.estimated_turnaround_days} days</Badge>
      ```
    - *Recommended Fix*:
      ```tsx
      <Badge variant="outline"><span className="text-stat">{s.estimated_turnaround_days}</span> days</Badge>
      ```

---

### Page 5: Repairs Page (`src/pages/Repairs.tsx`)

#### 1. Observations
- Process flow badges (Diagnosis, Quote, Float hold, Repair, Release) correctly use tokenized colors (`bg-primary`, `border-success text-success`, `border-primary text-primary`).
- Starting prices use `<span className="text-price">{formatKsh(s.price_min_ksh)}</span>`.
- Turnaround days badge and vendor ratings lack `.text-stat`.

#### 2. Specific Line-by-Line Issues & Precise Fixes

- **File**: `src/pages/Repairs.tsx`
  - **Line 121**:
    - *Issue*: Vendor rating `{Number(vendor.average_rating).toFixed(1)}` lacks `.text-stat`.
    - *Current Code*:
      ```tsx
      {Number(vendor.average_rating).toFixed(1)}
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="text-stat">{Number(vendor.average_rating).toFixed(1)}</span>
      ```

  - **Line 141**:
    - *Issue*: Turnaround days count `{s.estimated_turnaround_days}` lacks `.text-stat`.
    - *Current Code*:
      ```tsx
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {s.estimated_turnaround_days} day{s.estimated_turnaround_days !== 1 ? "s" : ""}
      </Badge>
      ```
    - *Recommended Fix*:
      ```tsx
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <span className="text-stat">{s.estimated_turnaround_days}</span> day{s.estimated_turnaround_days !== 1 ? "s" : ""}
      </Badge>
      ```

---

### Page 6: How It Works (`src/pages/HowItWorks.tsx`)

#### 1. Observations
- Uses primary navy cards (`bg-primary p-6 text-primary-foreground`).
- Step numbers `01`, `02`, `03`, `04` have `tabular-nums` but lack `.text-stat` for JetBrains Mono typography.

#### 2. Specific Line-by-Line Issues & Precise Fixes

- **File**: `src/pages/HowItWorks.tsx`
  - **Line 54**:
    - *Issue*: Process step counter `01`, `02`, `03`, `04` lacks `.text-stat` class.
    - *Current Code*:
      ```tsx
      <div className="text-3xl font-black text-primary-foreground/20 group-hover:text-accent/60 transition-colors tabular-nums shrink-0 w-12 leading-none pt-1">
        {num}
      </div>
      ```
    - *Recommended Fix*:
      ```tsx
      <div className="text-stat text-3xl font-black text-primary-foreground/20 group-hover:text-accent/60 transition-colors shrink-0 w-12 leading-none pt-1">
        {num}
      </div>
      ```

---

### Page 7: Terms Page (`src/pages/Terms.tsx`)

#### 1. Observations
- Standard clean typography with Sora headers and muted copy.
- Section 3 body text contains monetary referral value `"KES 500"` without `.text-price`.
- Last updated date `29 July 2026` lacks `.text-data-id`.

#### 2. Specific Line-by-Line Issues & Precise Fixes

- **File**: `src/pages/Terms.tsx`
  - **Line 14**:
    - *Issue*: Referral credit monetary amount `KES 500` lacks `.text-price` tag.
    - *Current Code*:
      ```tsx
      body: "Users may share a personal referral code. When a referred user completes their first confirmed order, both the referred user and the referrer receive a KES 500 credit to their TechTrust wallet. TechTrust may change or end the referral program at any time; credits already granted are not affected retroactively.",
      ```
    - *Recommended Fix*: Wrap monetary figure with `<span className="text-price">KES 500</span>` when rendering section body, or format section string.

  - **Line 42**:
    - *Issue*: Date string `29 July 2026` lacks `.text-data-id`.
    - *Current Code*:
      ```tsx
      <p className="text-sm text-muted-foreground mb-10">Last updated 29 July 2026.</p>
      ```
    - *Recommended Fix*:
      ```tsx
      <p className="text-sm text-muted-foreground mb-10">Last updated <span className="text-data-id text-foreground">29 July 2026</span>.</p>
      ```

---

## Shared Header / Cart Component Finding

- **File**: `src/components/cart/CartIcon.tsx` (Visible on all 7 pages in TopNav)
  - **Line 14**:
    - *Issue*: Cart badge counter `{count > 99 ? "99+" : count}` is a numeric count metric, missing `.text-stat`.
    - *Current Code*:
      ```tsx
      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
        {count > 99 ? "99+" : count}
      </span>
      ```
    - *Recommended Fix*:
      ```tsx
      <span className="text-stat absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
        {count > 99 ? "99+" : count}
      </span>
      ```

---

## Conclusion & Verification Instructions

### Key Findings Summary:
1. **Design Tokens**: Color tokens (`primary`, `accent`, `success`, `float`, `muted`) are applied consistently across all 7 pages. Only 2 minor raw color usages were identified in `Index.tsx` (`text-white/20` and `text-white`).
2. **Typography**: Sora headings (`h1`, `h2`, `h3`, `h4`) and Inter UI body fonts conform 100% to the Stitch design specification via `@layer base` CSS inheritance.
3. **JetBrains Mono**: Primary product prices (`formatKsh`) correctly utilize `.text-price`. However, several key metric counters (ratings, review counts, stock counts, step numbers, pagination indices) were missing the `.text-stat` utility class.

### How to Verify Fixes (When Applied by Implementer):
1. Execute Vite build: `npm run build` or `npx vite build` to confirm 0 TypeScript / compilation errors.
2. Inspect rendered DOM for pages 1–7 using browser DevTools to confirm computed `font-family` for numeric values (`.text-price`, `.text-stat`, `.text-data-id`) computes to `'JetBrains Mono'`.
3. Check color token consistency via CSS variable inspection (`hsl(var(--primary))`, `hsl(var(--accent))`, `hsl(var(--success))`).
