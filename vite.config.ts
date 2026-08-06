import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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

/**
 * Emits `sitemap.xml`. The static routes are always included; product and
 * storefront URLs are pulled from Supabase at build time so newly listed items
 * are discoverable without waiting for a crawler to find them via /browse.
 *
 * Deliberately fail-soft: a network blip during a deploy should cost us the
 * dynamic URLs, never the whole build.
 */
const emitSitemap = (env: Record<string, string>) => ({
  name: "emit-sitemap",
  async generateBundle(this: { emitFile: (f: unknown) => void; warn: (m: string) => void }) {
    const entries: string[] = STATIC_ROUTES.map(([p, priority, freq]) =>
      urlEntry(p === "/" ? SITE_URL : `${SITE_URL}${p}`, priority, freq),
    );

    const base = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (base && key) {
      const rest = async (q: string) => {
        const res = await fetch(`${base}/rest/v1/${q}`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return (await res.json()) as Record<string, string>[];
      };

      try {
        const [products, vendors] = await Promise.all([
          rest("products?select=id,updated_at&is_active=eq.true"),
          rest("vendor_profiles?select=id,updated_at&verification_status=in.(verified,approved)"),
        ]);
        products.forEach((p) =>
          entries.push(urlEntry(`${SITE_URL}/product/${p.id}`, "0.8", "weekly", p.updated_at)),
        );
        vendors.forEach((v) =>
          entries.push(urlEntry(`${SITE_URL}/shop/${v.id}`, "0.6", "weekly", v.updated_at)),
        );
      } catch (err) {
        this.warn(`sitemap: static routes only, Supabase lookup failed (${String(err)})`);
      }
    } else {
      this.warn("sitemap: static routes only, VITE_SUPABASE_* not set");
    }

    this.emitFile({
      type: "asset" as const,
      fileName: "sitemap.xml",
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`,
    });
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
    emitSitemap(env),
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
