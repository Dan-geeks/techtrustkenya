import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Client feedback: "Now i can not add items in the cart, there is no that
 * option."
 *
 * The product page only offered "Buy Now with Float" and "Message Vendor", so
 * the cart was unreachable from the one screen a buyer actually decides on.
 * ProductCard already had add-to-cart; this page did not.
 */
const addToCart = vi.fn().mockResolvedValue(true);
let mockUser: any = { id: "u-1" };

vi.mock("@/hooks/useCart", () => ({ useCart: () => ({ addToCart }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

let productRow: any = {
  id: "p-1",
  brand: "Hp",
  model_name: "EliteBook 840 G5",
  price_ksh: 100,
  category: "Laptops",
  condition: "new",
  quantity_in_stock: 3,
  image_urls: ["https://example.com/hp.jpg"],
  specifications: {},
  vendor_id: "v-1",
  vendor_profiles: { business_name: "TechHub Kenya", verification_status: "approved", user_id: "vu-1" },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: productRow, error: null }) }),
      }),
    }),
  },
}));

import ProductDetail from "../pages/ProductDetail";

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/product/p-1"]}>
      <Routes>
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Product page can add to cart (client feedback: no add-to-cart option)", () => {
  beforeEach(() => {
    addToCart.mockClear();
    navigate.mockClear();
    mockUser = { id: "u-1" };
    productRow = { ...productRow, quantity_in_stock: 3 };
  });

  it("renders an Add to Cart button alongside Buy Now", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: /Add to Cart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Buy Now with Float/i })).toBeInTheDocument();
  });

  it("adds the real product id to the real cart", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Add to Cart/i }));
    await waitFor(() => expect(addToCart).toHaveBeenCalledWith("p-1", 1));
  });

  it("sends a signed-out visitor to auth instead of silently failing", async () => {
    mockUser = null;
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Add to Cart/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/auth"));
    expect(addToCart).not.toHaveBeenCalled();
  });

  it("disables both CTAs when the vendor has no stock left", async () => {
    productRow = { ...productRow, quantity_in_stock: 0 };
    renderPage();
    expect(await screen.findByRole("button", { name: /Add to Cart/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Out of Stock/i })).toBeDisabled();
  });
});
