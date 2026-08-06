import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Product pages are the search-traffic surface, so their tags come from the
 * loaded record rather than the static route table.
 *
 * The regression that prompted the seller checks: the vendor join returns null
 * for suspended shops and the page falls back to the literal "Unknown Vendor",
 * which was landing in the indexed description and in Product.seller.
 */
vi.mock("@/hooks/useCart", () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));

let productRow: any;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: productRow, error: null }) }) }),
    }),
  },
}));

import ProductDetail from "../pages/ProductDetail";
import { JSON_LD_ATTR } from "../lib/seo";

const baseRow = {
  id: "p-1",
  brand: "HP",
  model_name: "EliteBook 840 G5",
  price_ksh: 45000,
  category: "laptop",
  condition: "refurbished",
  quantity_in_stock: 3,
  image_urls: ["https://cdn.example.com/hp.jpg"],
  specifications: {},
  vendor_id: "v-1",
  vendor_profiles: { business_name: "TechHub Kenya", verification_status: "approved", user_id: "vu-1" },
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/product/p-1"]}>
      <Routes>
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>,
  );

const ld = (type: string) =>
  [...document.head.querySelectorAll(`script[${JSON_LD_ATTR}]`)]
    .map((s) => JSON.parse(s.textContent!))
    .find((b) => b["@type"] === type);

describe("Product page SEO", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    productRow = { ...baseRow };
  });

  it("emits Product and BreadcrumbList structured data", async () => {
    renderPage();
    await waitFor(() => expect(ld("Product")).toBeTruthy());

    const p = ld("Product");
    expect(p.name).toBe("HP EliteBook 840 G5");
    expect(p.sku).toBe("p-1");
    expect(p.offers.price).toBe(45000);
    expect(p.offers.priceCurrency).toBe("KES");
    expect(p.offers.availability).toBe("https://schema.org/InStock");
    expect(p.offers.seller.name).toBe("TechHub Kenya");
    expect(ld("BreadcrumbList").itemListElement).toHaveLength(3);
  });

  it("marks a sold-out product OutOfStock rather than hiding it", async () => {
    productRow = { ...baseRow, quantity_in_stock: 0 };
    renderPage();
    await waitFor(() => expect(ld("Product")).toBeTruthy());
    expect(ld("Product").offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("never claims 'Unknown Vendor' as the seller when the join comes back empty", async () => {
    productRow = { ...baseRow, vendor_profiles: null };
    renderPage();
    await waitFor(() => expect(ld("Product")).toBeTruthy());

    expect(ld("Product").offers.seller).toBeUndefined();
    const desc = document.head
      .querySelector('meta[name="description"]')!
      .getAttribute("content")!;
    expect(desc).not.toMatch(/Unknown Vendor/i);
    expect(desc).not.toMatch(/Sold by/i);
    // The useful part of the description still survives.
    expect(desc).toMatch(/EliteBook/);
  });

  it("writes a self-referencing canonical and product og:type", async () => {
    renderPage();
    await waitFor(() => expect(ld("Product")).toBeTruthy());

    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(
      "https://techtrustkenya.com/product/p-1",
    );
    expect(
      document.head.querySelector('meta[property="og:type"]')!.getAttribute("content"),
    ).toBe("product");
  });
});
