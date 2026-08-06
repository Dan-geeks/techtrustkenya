import { describe, it, expect, beforeEach } from "vitest";
import {
  applySeo,
  canonicalUrl,
  clampDescription,
  clearJsonLd,
  DEFAULT_TITLE,
  JSON_LD_ATTR,
  SITE_URL,
} from "../lib/seo";
import { seoForPath } from "../lib/seoRoutes";

const meta = (kind: "name" | "property", key: string) =>
  document.head.querySelector(`meta[${kind}="${key}"]`)?.getAttribute("content");

const canonical = () =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");

describe("canonicalUrl", () => {
  it("collapses the homepage to the bare origin", () => {
    expect(canonicalUrl("/")).toBe(SITE_URL);
    expect(canonicalUrl()).toBe(SITE_URL);
  });

  it("strips query strings and hashes so filters do not fork the canonical", () => {
    expect(canonicalUrl("/browse?q=laptop&page=2")).toBe(`${SITE_URL}/browse`);
    expect(canonicalUrl("/browse#results")).toBe(`${SITE_URL}/browse`);
  });

  it("drops a trailing slash so /browse and /browse/ do not compete", () => {
    expect(canonicalUrl("/browse/")).toBe(`${SITE_URL}/browse`);
  });
});

describe("clampDescription", () => {
  it("leaves a short description alone", () => {
    expect(clampDescription("Short and useful.")).toBe("Short and useful.");
  });

  it("truncates on a word boundary rather than mid-word", () => {
    const out = clampDescription("word ".repeat(80));
    expect(out.length).toBeLessThanOrEqual(164);
    expect(out.endsWith("...")).toBe(true);
    expect(out).not.toMatch(/wo\.\.\.$/);
  });

  it("collapses newlines and runs of whitespace", () => {
    expect(clampDescription("a\n\n  b\tc")).toBe("a b c");
  });
});

describe("applySeo", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("writes title, canonical, description and the og/twitter set", () => {
    applySeo({ title: "Browse", description: "Find laptops.", path: "/browse" });

    expect(document.title).toBe("Browse | TechTrust");
    expect(canonical()).toBe(`${SITE_URL}/browse`);
    expect(meta("name", "description")).toBe("Find laptops.");
    expect(meta("property", "og:title")).toBe("Browse | TechTrust");
    expect(meta("property", "og:url")).toBe(`${SITE_URL}/browse`);
    expect(meta("property", "og:image")).toBe(`${SITE_URL}/og-card.png`);
    expect(meta("name", "twitter:card")).toBe("summary_large_image");
  });

  it("falls back to the site defaults when a page passes nothing", () => {
    applySeo({});
    expect(document.title).toBe(DEFAULT_TITLE);
    expect(meta("name", "description")).toContain("verified");
  });

  it("emits noindex only when asked", () => {
    applySeo({ path: "/browse" });
    expect(meta("name", "robots")).toBe("index, follow, max-image-preview:large");

    applySeo({ path: "/cart", noindex: true });
    expect(meta("name", "robots")).toBe("noindex, nofollow");
  });

  it("upserts rather than appends, so routing cannot stack duplicate tags", () => {
    applySeo({ title: "One", path: "/a" });
    applySeo({ title: "Two", path: "/b" });

    expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(canonical()).toBe(`${SITE_URL}/b`);
  });

  it("replaces the previous page's JSON-LD instead of accumulating it", () => {
    applySeo({ path: "/product/1", jsonLd: [{ "@type": "Product", name: "A" }] });
    expect(document.head.querySelectorAll(`script[${JSON_LD_ATTR}]`).length).toBe(1);

    applySeo({ path: "/product/2", jsonLd: [{ "@type": "Product", name: "B" }] });
    const blocks = document.head.querySelectorAll(`script[${JSON_LD_ATTR}]`);
    expect(blocks.length).toBe(1);
    expect(blocks[0].textContent).toContain('"B"');

    clearJsonLd();
    expect(document.head.querySelectorAll(`script[${JSON_LD_ATTR}]`).length).toBe(0);
  });

  it("produces parseable JSON-LD", () => {
    applySeo({ jsonLd: [{ "@type": "Product", name: "HP EliteBook" }] });
    const raw = document.head.querySelector(`script[${JSON_LD_ATTR}]`)!.textContent!;
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(JSON.parse(raw).name).toBe("HP EliteBook");
  });
});

describe("seoForPath", () => {
  it("returns real copy for the money pages", () => {
    expect(seoForPath("/")!.description).toMatch(/verified/i);
    expect(seoForPath("/browse")!.title).toMatch(/Browse/i);
    expect(seoForPath("/browse")!.noindex).toBeFalsy();
  });

  it("noindexes signed-in surfaces", () => {
    for (const p of ["/cart", "/checkout", "/orders", "/profile", "/auth"]) {
      expect(seoForPath(p)!.noindex, p).toBe(true);
    }
  });

  it("noindexes anything under a private prefix, including unlisted paths", () => {
    expect(seoForPath("/admin/dashboard")!.noindex).toBe(true);
    expect(seoForPath("/vendor/dashboard")!.noindex).toBe(true);
    expect(seoForPath("/order/abc-123")!.noindex).toBe(true);
  });

  it("noindexes unknown paths so 404s never get indexed", () => {
    expect(seoForPath("/nope/not-a-page")!.noindex).toBe(true);
  });

  it("stands aside for pages that build tags from loaded data", () => {
    expect(seoForPath("/product/abc")).toBeNull();
    expect(seoForPath("/shop/abc")).toBeNull();
  });

  it("gives every indexable route a description", () => {
    for (const p of ["/", "/browse", "/repairs", "/vendors", "/how-it-works", "/book-repair"]) {
      const seo = seoForPath(p)!;
      expect(seo.noindex, p).toBeFalsy();
      expect(seo.description, p).toBeTruthy();
      expect(seo.description!.length, p).toBeGreaterThan(50);
    }
  });
});
