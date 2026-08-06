/**
 * SEO primitives.
 *
 * This is a client-rendered SPA, so index.html carries the defaults that
 * crawlers and link unfurlers see before any JS runs, and <Seo> then overwrites
 * them per route. Tags are upserted in place rather than appended, so switching
 * routes can never leave two competing descriptions or canonicals behind.
 */

export const SITE_URL = "https://techtrustkenya.com";
export const SITE_NAME = "TechTrust";

/** 1200x630 social card. Absolute - relative og:image URLs are ignored. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-card.png`;

export const DEFAULT_TITLE = "TechTrust | Verified Tech Marketplace in Kenya";
export const DEFAULT_DESCRIPTION =
  "Buy and sell verified laptops and smartphones in Kenya. Every vendor is physically inspected and every payment is held in Float escrow until you confirm delivery.";

export interface SeoInput {
  title?: string;
  description?: string;
  /** Route-relative path, e.g. "/browse". Resolved against SITE_URL. */
  path?: string;
  image?: string;
  /** Product pages should say "product" so unfurlers render the price. */
  type?: "website" | "article" | "product";
  /** Keep private and duplicate pages out of the index. */
  noindex?: boolean;
  /** JSON-LD objects rendered into <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown>[];
}

/** Absolute, query-free canonical. Trailing slash only for the homepage. */
export const canonicalUrl = (path?: string): string => {
  if (!path) return SITE_URL;
  const clean = path.split("?")[0].split("#")[0];
  if (clean === "/" || clean === "") return SITE_URL;
  return `${SITE_URL}${clean.startsWith("/") ? "" : "/"}${clean.replace(/\/+$/, "")}`;
};

/** Search results cut descriptions around 160 chars; trim on a word boundary. */
export const clampDescription = (text: string, max = 160): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/, "")}...`;
};

type MetaKind = "name" | "property";

const upsertMeta = (kind: MetaKind, key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

/** Marks the JSON-LD blocks this module owns, so route changes can clear them. */
export const JSON_LD_ATTR = "data-seo-jsonld";

export const clearJsonLd = () => {
  document.head.querySelectorAll(`script[${JSON_LD_ATTR}]`).forEach((el) => el.remove());
};

const renderJsonLd = (blocks: Record<string, unknown>[]) => {
  clearJsonLd();
  blocks.forEach((block) => {
    const script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute(JSON_LD_ATTR, "");
    script.textContent = JSON.stringify(block);
    document.head.appendChild(script);
  });
};

/**
 * Writes the full tag set for one route. Called by <Seo>; exported so tests can
 * drive it without mounting React.
 */
export const applySeo = (input: SeoInput): void => {
  const title = input.title ? `${input.title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const description = clampDescription(input.description ?? DEFAULT_DESCRIPTION);
  const url = canonicalUrl(input.path);
  const image = input.image || DEFAULT_OG_IMAGE;

  document.title = title;
  upsertCanonical(url);

  upsertMeta("name", "description", description);
  upsertMeta(
    "name",
    "robots",
    input.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
  );

  upsertMeta("property", "og:type", input.type ?? "website");
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:locale", "en_KE");

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);

  renderJsonLd(input.jsonLd ?? []);
};
