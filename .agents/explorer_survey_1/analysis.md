# Architectural & Design System Analysis Report — TechTrust Kenya

**Agent**: Explorer 1 (Project Architecture, Build Setup & Styling/Tokens)  
**Date**: 2026-08-01  
**Working Directory**: `C:\Users\Administrator\techtrustkenya\.agents\explorer_survey_1`  
**Target Repository**: `C:\Users\Administrator\techtrustkenya`  

---

## 1. Executive Summary

TechTrust Kenya is a modern React web application built with TypeScript, Vite (SWC), Tailwind CSS, and shadcn/ui components, backed by Supabase for authentication, database, and real-time state. The project adheres to a strict design specification (Stitch Design Spec) featuring a Kenya-tailored trust and verification framework.

Key findings from this architectural survey:
1. **Build Status**: 100% clean build. Both `npx tsc --noEmit` and `npm run build` completed with **exit code 0** and zero compilation errors. Vitest unit test suite runs and passes cleanly.
2. **Provider & State Architecture**: Clean hierarchy with `QueryClientProvider`, `TooltipProvider`, `Toaster` notifications, `BrowserRouter` (with base path awareness), `AuthProvider` (Supabase Auth + role fetching), and `CartProvider` (Supabase Postgres + Realtime sync).
3. **Typography Setup**: Fully configured with Google Fonts pre-loading (`Sora`, `Inter`, `JetBrains Mono`). Custom utility classes (`.text-price`, `.text-stat`, `.text-data-id`, `.text-eyebrow`) are explicitly defined in `src/index.css` and backed by `tailwind.config.ts`.
4. **Color Tokens**: Standardized CSS variables in `:root` (`src/index.css`) mapped into Tailwind CSS colors:
   - Primary Navy: `#0F3D8C` (`DEFAULT`) / Deep Navy `#002766` (`--primary-deep`)
   - Interactive Accent Blue: `#0058be` (`--accent`)
   - Success Green: `#21C75B` / `#25c65f` (`--success`)
   - Float Escrow Blue: `#3B82F6` (`--float`) — strictly reserved for escrow & money-held indicators.
   - Admin Deep Green: `#004c1e` (`--approve`)

---

## 2. Build & Configuration Architecture

### 2.1 Package Dependencies (`package.json`)
- **Core Framework**: React 18.3.1 & React DOM 18.3.1.
- **Build Tooling**: Vite 5.4.19 with `@vitejs/plugin-react-swc` for ultra-fast SWC compilation.
- **TypeScript**: TypeScript 5.8.3.
- **Routing**: `react-router-dom` 6.30.1.
- **State & Data Fetching**: `@tanstack/react-query` 5.83.0 and `@supabase/supabase-js` 2.103.3.
- **UI & Components**: Radix UI primitives (`@radix-ui/react-*`), shadcn/ui, `lucide-react` 0.462.0, `recharts` 2.15.4, `sonner` 1.7.4, `vaul` 0.9.9.
- **Styling**: `tailwindcss` 3.4.17, `autoprefixer` 10.4.21, `@tailwindcss/typography` 0.5.16, `tailwindcss-animate` 1.0.7, `clsx`, `tailwind-merge`.
- **Forms & Validation**: `react-hook-form` 7.61.1, `zod` 3.25.76, `@hookform/resolvers`.
- **Testing**: `vitest` 3.2.4 with `@testing-library/react` and `jsdom`.

### 2.2 TypeScript Configuration (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)
- **Root Configuration** (`tsconfig.json`): References `./tsconfig.app.json` and `./tsconfig.node.json`. Declares path mapping `@/*` -> `./src/*`.
- **Application Config** (`tsconfig.app.json`): Target `ES2020`, module `ESNext`, `moduleResolution: bundler`, `noEmit: true`, `jsx: react-jsx`. Includes `vitest/globals` types.
- **Strictness Level**: `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, `skipLibCheck: true`. Allows pragmatic TypeScript validation without blocking builds on external type inconsistencies.

### 2.3 Vite Configuration (`vite.config.ts`)
- **Path Resolution**: Path alias `@` maps to `./src`.
- **Base Path**: Flexible base path supporting process environment variable `process.env.VITE_BASE_PATH ?? "/"`.
- **Deduplication**: Explicit `dedupe` array for `react`, `react-dom`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `@tanstack/react-query`, and `@tanstack/query-core` to prevent multiple bundle instantiations.
- **Server Port**: Port `8080` on host `::`.

### 2.4 HTML Entry Point (`index.html`)
- Serves SVG favicon (`/favicon.svg`), replacing legacy unrendered favicon files.
- Sets document meta theme color (`#0a1628`).
- Sets page title: `TechTrust | Verified Tech Marketplace in Kenya`.

---

## 3. Application Architecture & Routing Structure

### 3.1 Main Entry Point & Provider Stack
- **Entry Point**: `src/main.tsx` initializes React DOM root and mounts `<App />`.
- **Global Provider Hierarchy (`src/App.tsx`)**:
  ```tsx
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <CartProvider>
            <CookieConsent />
            <Routes> ... </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  ```

### 3.2 Global Context & State Management
1. **`AuthProvider` (`src/hooks/useAuth.tsx`)**:
   - Manages Supabase Auth session (`session`, `user`) and handles `onAuthStateChange` listeners.
   - Asynchronously queries the `user_roles` database table on login to populate `roles` (`customer`, `vendor`, `admin`).
   - Renders a global loading screen (`Checking your session...`) until auth state resolves.
2. **`CartProvider` (`src/hooks/useCart.tsx`)**:
   - Manages customer cart state linked to Supabase `carts` and `cart_items` tables.
   - Implements automated cart creation with race-condition fallback (`ensureCart`).
   - Listens to Supabase Realtime postgres changes on `cart_items` filtered by `cart_id`.
   - Exposes `addToCart`, `removeItem`, `setQuantity`, `clearCart`, `items`, `count`, and `refresh`.

### 3.3 Routing Map & Layout Shell
Routes are organized into two categories:

#### A. Standalone Utility & Auth Routes (No `AppLayout` Header/Footer Shell)
- `/auth` -> Authentication page (`Auth.tsx`)
- `/admin/login` -> Dedicated Admin login (`AdminLogin.tsx`)
- `/welcome` -> Post-signup onboarding welcome (`Welcome.tsx`)
- `/reset-password` -> Password reset (`ResetPassword.tsx`)
- `/vendor/register` -> Vendor Registration flow (`VendorRegister.tsx`)
- `/vendor/onboarding` -> Vendor Profile Onboarding (`VendorOnboarding.tsx`)
- `/vendor/pending` -> Vendor Pending Approval state screen (`VendorPending.tsx`)
- `/vendor/suspended` -> Vendor Account Suspended screen (`VendorSuspended.tsx`)
- `/vendor/rejected` -> Vendor Application Rejected screen (`VendorRejected.tsx`)

#### B. Main Marketplace Routes (Wrapped in `<AppLayout />`)
- `/` -> Homepage (`Index.tsx`)
- `/browse` -> Product Catalog (`Browse.tsx`)
- `/product/:id` -> Product Detail View (`ProductDetail.tsx`)
- `/shop/:vendorId` -> Vendor Storefront (`ShopPage.tsx`)
- `/repairs` -> Certified Tech Repairs (`Repairs.tsx`)
- `/how-it-works` -> Trust & Escrow explanation (`HowItWorks.tsx`)
- `/terms` -> Terms of Service & Buyer Protection (`Terms.tsx`)
- **Protected Routes (`ProtectedRoute.tsx`)**:
  - `/cart` -> Customer Cart (`Cart.tsx`)
  - `/orders` -> Customer Order History (`Orders.tsx`)
  - `/orders/:orderId` -> Detailed Order Status (`OrderDetail.tsx`)
  - `/checkout/:orderId` -> Escrow Checkout (`Checkout.tsx`)
  - `/profile` -> Customer Profile (`Profile.tsx`)
  - `/notifications` -> Notifications Center (`Notifications.tsx`)
  - `/vendor/dashboard` -> Vendor Portal (`VendorDashboard.tsx`, requires role `vendor` and `requireApprovedVendor`)
  - `/admin` & `/admin/dashboard` -> Admin Portal (`AdminDashboard.tsx`, requires role `admin`)

---

## 4. Design System, Styling & Token Architecture

### 4.1 Typography Specification
The application imports Google Fonts in `src/index.css`:
- **Display Headings**: `Sora` (weights: 400, 600, 700, 800) applied to all `h1, h2, h3, h4` and `font-display`.
- **Body & UI**: `Inter` (weights: 400, 500, 600, 700, 800, 900) applied to `html`, `body`, and `font-sans`.
- **Numeric, Financial & Code Data**: `JetBrains Mono` (weights: 400, 500, 600) applied to `font-mono`.

#### Custom Utility Classes (`src/index.css` `@layer utilities`)
1. `.text-price`: Sets `font-family: 'JetBrains Mono'`, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.01em`. Used for monetary values across product cards, cart totals, order lines, and vendor/admin revenue statistics.
2. `.text-stat`: Sets `font-family: 'JetBrains Mono'`, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.02em`. Used for numerical dashboard KPIs and platform metrics.
3. `.text-data-id`: Sets `font-family: 'JetBrains Mono'`, `font-size: 0.75rem`, `line-height: 1rem`, `font-weight: 500`, `letter-spacing: 0.02em`. Used for order IDs, product condition badges, tracking numbers, and reference codes.
4. `.text-eyebrow`: Sets `font-size: 0.75rem`, `font-weight: 600`, `letter-spacing: 0.05em`, `text-transform: uppercase`. Used for section headers and table headers.

### 4.2 Color Token Architecture
Design tokens are defined in `src/index.css` under `:root` using HSL syntax and exposed via `tailwind.config.ts`:

| Token Token Name | HSL Value | Hex Equivalent | Usage Specification |
|---|---|---|---|
| `--primary` | `218 81% 30%` | `#0F3D8C` | Primary branding, standard CTA buttons |
| `--primary-deep` | `217 100% 20%` | `#002766` | Key display headings, hero badges, dark elements |
| `--accent` | `212 100% 37%` | `#0058be` | Secondary emphasis, links, interactive highlights |
| `--accent-soft` | `226 100% 96%` | `#EEF2FF` | Soft blue card/button backgrounds |
| `--success` | `142 71% 45%` | `#21C75B` / `#25c65f` | Verified badges, protected status, success notifications |
| `--float` | `217 91% 60%` | `#3B82F6` | **Float Escrow ONLY**: Money held, escrow status indicators |
| `--approve` | `144 100% 15%` | `#004c1e` | Admin portal vendor approval actions |
| `--destructive` | `0 76% 42%` | `#ba1a1a` | Rejection, deletion, destructive CTAs |
| `--input` | `213 27% 84%` | `#94A3B8` | Border color for input controls |

---

## 5. Diagnostics & Build Verification Summary

| Check Command | Executed Command | Exit Code | Diagnostic Result |
|---|---|---|---|
| TypeScript Check | `npx tsc --noEmit` | `0` | **0 errors**. Type definitions clean across entire codebase. |
| Production Build | `npm run build` | `0` | **Success**. Vite transformed 1830 modules, output generated in `dist/`. |
| Unit Tests | `npm run test` | `0` | **1/1 passed**. Vitest environment functional. |

---

## 6. Recommendations for Implementation & Survey Team

1. **Font Utility Uniformity**: Ensure all newly modified or built price tags, order references, and dashboard statistics use `.text-price`, `.text-stat`, and `.text-data-id` instead of standard sans-serif text.
2. **Escrow Color Integrity**: Guard `--float` (`bg-float`, `text-float`) usage so it is reserved exclusively for escrow and money-held indicators, preserving visual consistency with the Stitch specification.
3. **Route Protection**: When adding or polishing vendor/admin routes, ensure `<ProtectedRoute>` wrappers specify `roles={['vendor']}` or `roles={['admin']}` as needed.
