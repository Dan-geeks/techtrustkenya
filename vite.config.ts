import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// Same table the runtime <Seo> uses, so the prerendered copy cannot drift.
import { ROUTE_SEO } from "./src/lib/seoRoutes";

const SITE_URL = "https://techtrustkenya.com";

/** Stable public routes, with the crawl priority we want to signal. */
const STATIC_ROUTES: [string, string, string][] = [
  ["/", "1.0", "daily"],
  ["/browse", "0.9", "daily"],
  ["/repairs", "0.8", "weekly"],
  ["/vendors", "0.8", "weekly"],
  ["/how-it-works", "0.7", "monthly"],
  ["/book-repair", "0.7", "monthly"],
  ["/verification", "0.5", "monthly"],
  ["/seller-guidelines", "0.4", "yearly"],
  ["/disputes", "0.4", "yearly"],
  ["/terms", "0.3", "yearly"],
  ["/privacy", "0.3", "yearly"],
];

// Identifies this build. Baked into the bundle via __BUILD_ID__ and written to
// dist/version.json, so a running tab can tell whether it is still current.
const buildId = process.env.VITE_BUILD_ID ?? Date.now().toString(36);

/**
 * Emits `version.json` beside index.html. firebase.json serves everything
 * outside /assets with `no-store`, so this file is always fetched fresh -
 * which is what lets a long-open tab notice that a deploy happened.
 */
const emitVersionFile = () => ({
  name: "emit-version-file",
  generateBundle() {
    this.emitFile({
      type: "asset" as const,
      fileName: "version.json",
      source: JSON.stringify({ buildId }),
    });
  },
});

const urlEntry = (loc: string, priority: string, changefreq: string, lastmod?: string) =>
  [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const clamp = (text: string, max = 160) => {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,.;:]$/, "")}...`;
};

interface PageMeta {
  /** Output path inside dist, e.g. "browse.html" or "product/<id>.html". */
  file: string;
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
  jsonLd?: unknown[];
}

/**
 * Rewrites the built index.html into a per-route copy.
 *
 * Googlebot executes our JS and would eventually see the tags <Seo> sets, but
 * link unfurlers (WhatsApp, Facebook, Twitter, LinkedIn, Slack) never run JS.
 * Without this every shared product link previewed as the homepage, and
 * og:url pointed unfurlers back at "/" - actively telling them the page was
 * the homepage.
 */
const renderPage = (template: string, m: PageMeta) => {
  // Tagged with data-seo-jsonld so the runtime clearJsonLd() adopts these on
  // mount: without it the prerendered block both duplicates the one <Seo> adds
  // and survives client-side navigation to an unrelated page. The site-wide
  // Organization/WebSite graph in index.html is deliberately left untagged so
  // it persists.
  const ld = (m.jsonLd ?? [])
    .map((b) => `<script type="application/ld+json" data-seo-jsonld>${JSON.stringify(b)}</script>`)
    .join("\n    ");

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${esc(m.description)}" />`,
    )
    .replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${esc(m.url)}" />`,
    )
    .replace(
      /<meta property="og:type"[^>]*>/,
      `<meta property="og:type" content="${m.type ?? "website"}" />`,
    )
    .replace(
      /<meta property="og:title"[^>]*>/,
      `<meta property="og:title" content="${esc(m.title)}" />`,
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/,
      `<meta property="og:description" content="${esc(m.description)}" />`,
    )
    .replace(
      /<meta property="og:url"[^>]*>/,
      `<meta property="og:url" content="${esc(m.url)}" />`,
    )
    .replace(
      /<meta property="og:image"[^>]*>/,
      `<meta property="og:image" content="${esc(m.image ?? `${SITE_URL}/og-card.png`)}" />`,
    )
    .replace(
      /<meta name="twitter:title"[^>]*>/,
      `<meta name="twitter:title" content="${esc(m.title)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?\/>/,
      `<meta name="twitter:description" content="${esc(m.description)}" />`,
    )
    .replace(
      /<meta name="twitter:image"[^>]*>/,
      `<meta name="twitter:image" content="${esc(m.image ?? `${SITE_URL}/og-card.png`)}" />`,
    )
    .replace("</head>", ld ? `  ${ld}\n  </head>` : "</head>");
};

/**
 * Emits `sitemap.xml` plus one static HTML file per public route.
 *
 * Product and storefront data is pulled from Supabase at build time, so newly
 * listed items are both discoverable and correctly previewable without waiting
 * for a crawler to find them via /browse.
 *
 * Deliberately fail-soft: a network blip during a deploy should cost us the
 * dynamic pages, never the whole build.
 */
const emitSeoFiles = (env: Record<string, string>, routeSeo: Record<string, any>) => ({
  name: "emit-seo-files",
  async writeBundle(
    this: { warn: (m: string) => void },
    options: { dir?: string },
  ) {
    const fs = await import("node:fs/promises");
    const outDir = options.dir ?? "dist";
    const template = await fs.readFile(`${outDir}/index.html`, "utf-8");

    const entries: string[] = STATIC_ROUTES.map(([p, priority, freq]) =>
      urlEntry(p === "/" ? SITE_URL : `${SITE_URL}${p}`, priority, freq),
    );
    const pages: PageMeta[] = [];

    // Static routes: reuse the exact copy the runtime <Seo> would apply.
    for (const [route] of STATIC_ROUTES) {
      if (route === "/") continue; // index.html already carries the homepage tags
      const seo = routeSeo[route];
      if (!seo?.title) continue;
      pages.push({
        file: `${route.replace(/^\//, "")}.html`,
        title: `${seo.title} | TechTrust`,
        description: clamp(seo.description ?? ""),
        url: `${SITE_URL}${route}`,
      });
    }

    const base = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (base && key) {
      const rest = async (q: string) => {
        const res = await fetch(`${base}/rest/v1/${q}`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return (await res.json()) as Record<string, any>[];
      };

      try {
        const [products, vendors] = await Promise.all([
          rest(
            "products?select=id,updated_at,brand,model_name,price_ksh,condition,image_urls,quantity_in_stock,vendor_profiles(business_name,verification_status)&is_active=eq.true",
          ),
          rest(
            "vendor_profiles?select=id,updated_at,business_name,city,verification_status&verification_status=in.(verified,approved)",
          ),
        ]);

        for (const p of products) {
          const url = `${SITE_URL}/product/${p.id}`;
          const name = [p.brand, p.model_name].filter(Boolean).join(" ");
          const price = Number(p.price_ksh ?? 0);
          // The vendor join is empty for suspended shops; never invent a seller.
          const seller = p.vendor_profiles?.business_name;
          const description = clamp(
            [
              `${p.condition ? `${p.condition} ` : ""}${name} for KES ${price.toLocaleString("en-KE")} in Kenya.`,
              seller ? `Sold by ${seller}.` : "",
              "Paid through Float escrow - funds are only released after you inspect the device.",
            ]
              .filter(Boolean)
              .join(" "),
          );
          entries.push(urlEntry(url, "0.8", "weekly", p.updated_at));
          pages.push({
            file: `product/${p.id}.html`,
            title: `${name} | TechTrust`,
            description,
            url,
            image: p.image_urls?.[0],
            type: "product",
            jsonLd: [
              {
                "@context": "https://schema.org",
                "@type": "Product",
                name,
                description,
                ...(p.image_urls?.length ? { image: p.image_urls } : {}),
                sku: p.id,
                ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
                offers: {
                  "@type": "Offer",
                  url,
                  priceCurrency: "KES",
                  price,
                  availability:
                    (p.quantity_in_stock ?? 0) > 0
                      ? "https://schema.org/InStock"
                      : "https://schema.org/OutOfStock",
                  ...(seller ? { seller: { "@type": "Organization", name: seller } } : {}),
                },
              },
            ],
          });
        }

        for (const v of vendors) {
          const url = `${SITE_URL}/shop/${v.id}`;
          entries.push(urlEntry(url, "0.6", "weekly", v.updated_at));
          pages.push({
            file: `shop/${v.id}.html`,
            title: `${v.business_name} Storefront | TechTrust`,
            description: clamp(
              `Shop verified devices from ${v.business_name}${v.city ? ` in ${v.city}, Kenya` : " in Kenya"}. Physically verified TechTrust vendor. Every order is protected by Float escrow.`,
            ),
            url,
          });
        }
      } catch (err) {
        this.warn(`seo: static routes only, Supabase lookup failed (${String(err)})`);
      }
    } else {
      this.warn("seo: static routes only, VITE_SUPABASE_* not set");
    }

    await Promise.all(
      pages.map(async (m) => {
        const dest = `${outDir}/${m.file}`;
        await fs.mkdir(dest.slice(0, dest.lastIndexOf("/")), { recursive: true });
        await fs.writeFile(dest, renderPage(template, m), "utf-8");
      }),
    );

    await fs.writeFile(
      `${outDir}/sitemap.xml`,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`,
      "utf-8",
    );
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  // Firebase Hosting serves from the domain root; GitHub Pages serves from a
  // repo sub-path. VITE_BASE_PATH lets the Pages workflow ask for the latter.
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    emitVersionFile(),
    emitSeoFiles(env, ROUTE_SEO),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  };
});
