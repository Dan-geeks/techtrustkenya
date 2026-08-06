import { SeoInput } from "./seo";

/**
 * Head tags for every static route, in one place.
 *
 * Dynamic routes (/product/:id, /shop/:vendorId) are deliberately absent: those
 * pages render their own <Seo> from the record they loaded, and RouteSeo must
 * not race them.
 *
 * Titles here omit the "| TechTrust" suffix - applySeo appends it.
 */
export const ROUTE_SEO: Record<string, SeoInput> = {
  "/": {
    title: "Verified Tech Marketplace in Kenya",
    description:
      "Buy verified laptops, smartphones and tech in Kenya. Every vendor is physically inspected and your M-Pesa payment is held in Float escrow until you confirm delivery.",
  },
  "/browse": {
    title: "Browse Verified Laptops & Phones in Kenya",
    description:
      "Shop inspected laptops, smartphones, tablets and accessories from verified Kenyan vendors. Filter by price, condition and location. Every order is escrow protected.",
  },
  "/repairs": {
    title: "Certified Phone & Laptop Repairs in Kenya",
    description:
      "Book vetted technicians for phone and laptop repairs in Kenya. You approve the quote before work starts and the payment is only released once the repair is confirmed.",
  },
  "/book-repair": {
    title: "Book a Device Repair",
    description:
      "Tell us what is wrong with your phone or laptop and get a quote from a vetted TechTrust repair technician in Kenya. No payment until you approve the quote.",
  },
  "/vendors": {
    title: "Verified Tech Vendors in Kenya",
    description:
      "Browse TechTrust's physically verified electronics vendors across Kenya. Every shop is inspected before it can list, and every sale is covered by Float escrow.",
  },
  "/how-it-works": {
    title: "How Float Escrow & Vendor Verification Work",
    description:
      "Pay into Float escrow, receive your device, inspect it, then release the funds. Here is exactly how TechTrust protects both buyers and vendors in Kenya.",
  },
  "/verification": {
    title: "Vendor Verification Policy",
    description:
      "How TechTrust physically vets electronics vendors in Kenya before they are allowed to list: documentation, premises inspection and ongoing review.",
  },
  "/seller-guidelines": {
    title: "Seller Guidelines",
    description:
      "What TechTrust expects from vendors: accurate listings, honest condition grading, dispatch timelines and how Float escrow settlement works.",
  },
  "/disputes": {
    title: "Dispute Policy",
    description:
      "How TechTrust resolves buyer and vendor disputes while funds are still held in Float escrow, including evidence, timelines and refund outcomes.",
  },
  "/terms": {
    title: "Terms of Service",
    description:
      "The terms governing use of the TechTrust marketplace, Float escrow payments, vendor obligations and buyer protections in Kenya.",
  },
  "/privacy": {
    title: "Privacy Policy",
    description:
      "What personal data TechTrust collects, why we collect it, how long we keep it and the rights you have over it under Kenyan data protection law.",
  },

  // Signed-in and transactional surfaces. robots.txt stops the crawl; noindex
  // is what actually keeps a linked URL out of the results.
  "/auth": { title: "Sign In", noindex: true },
  "/auth/callback": { title: "Signing you in", noindex: true },
  "/reset-password": { title: "Reset Password", noindex: true },
  "/welcome": { title: "Welcome", noindex: true },
  "/cart": { title: "Shopping Cart", noindex: true },
  "/checkout": { title: "Secure Escrow Checkout", noindex: true },
  "/orders": { title: "Order History", noindex: true },
  "/profile": { title: "Profile & Referral Wallet", noindex: true },
  "/notifications": { title: "Notifications", noindex: true },
  "/admin/login": { title: "Admin Sign In", noindex: true },
};

/** Anything under these is private, whatever the exact path turns out to be. */
export const NOINDEX_PREFIXES = [
  "/admin",
  "/vendor/",
  "/order/",
  "/repair/",
  "/checkout",
  "/profile",
  "/orders",
  "/notifications",
  "/cart",
  "/auth",
];

/** Pages that build their own tags from loaded data; RouteSeo leaves them be. */
export const SELF_MANAGED_PREFIXES = ["/product/", "/shop/"];

export const seoForPath = (pathname: string): SeoInput | null => {
  if (SELF_MANAGED_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const exact = ROUTE_SEO[pathname];
  if (exact) return exact;

  if (NOINDEX_PREFIXES.some((p) => pathname.startsWith(p))) {
    return { noindex: true };
  }
  // Unknown path - the 404 view. Never let it be indexed.
  return { title: "Page not found", noindex: true };
};
