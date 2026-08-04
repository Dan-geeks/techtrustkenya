import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Client feedback item 7: "in the Shopping cart the 2 items above are hard
 * coded. That when i remove them, they still come back."
 *
 * The page used to hold two invented products (a Sony A7 IV at KES 245,000 and
 * a MacBook Pro 16" at KES 410,000) in local state seeded from a constant, so
 * removing one worked until the next render and a real add-to-cart never
 * appeared here at all. It now renders whatever useCart returns.
 */
const removeItem = vi.fn();
const setQuantity = vi.fn();
let mockCart: any = { items: [], count: 0, loading: false, removeItem, setQuantity };

vi.mock("@/hooks/useCart", () => ({ useCart: () => mockCart }));

import Cart from "../pages/Cart";

const renderCart = () =>
  render(
    <MemoryRouter>
      <Cart />
    </MemoryRouter>,
  );

const realItem = {
  id: "ci-1",
  product_id: "p-1",
  quantity: 2,
  product: {
    brand: "Hp",
    model_name: "Elitebook 840 G5",
    price_ksh: 30000,
    image_urls: ["https://example.com/hp.jpg"],
    vendor: { business_name: "TechHub Kenya", verification_status: "approved" },
  },
};

describe("Shopping cart uses real data (client feedback item 7)", () => {
  beforeEach(() => {
    removeItem.mockClear();
    setQuantity.mockClear();
  });

  it("shows an empty cart instead of the two hardcoded demo products", () => {
    mockCart = { items: [], count: 0, loading: false, removeItem, setQuantity };
    renderCart();

    expect(screen.queryByText(/Sony Alpha A7 IV/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MacBook Pro 16/i)).not.toBeInTheDocument();
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("renders the real cart row, its vendor and its line total", () => {
    mockCart = { items: [realItem], count: 2, loading: false, removeItem, setQuantity };
    renderCart();

    expect(screen.getByText("Hp Elitebook 840 G5")).toBeInTheDocument();
    expect(screen.getByText("TechHub Kenya")).toBeInTheDocument();
    // 30,000 x 2, and it appears on the line, the subtotal and the total -
    // which is the point: all three are derived from the same real row.
    expect(screen.getAllByText("KES 60,000").length).toBeGreaterThanOrEqual(2);
  });

  it("removing an item calls the real cart, so it cannot reappear on re-render", () => {
    mockCart = { items: [realItem], count: 2, loading: false, removeItem, setQuantity };
    renderCart();

    fireEvent.click(screen.getByRole("button", { name: /Remove Hp Elitebook 840 G5 from cart/i }));
    expect(removeItem).toHaveBeenCalledWith("ci-1");
  });

  it("changing quantity goes through the real cart too", () => {
    mockCart = { items: [realItem], count: 2, loading: false, removeItem, setQuantity };
    renderCart();

    fireEvent.click(screen.getByText("+"));
    expect(setQuantity).toHaveBeenCalledWith("ci-1", 3);

    fireEvent.click(screen.getByText("-"));
    expect(setQuantity).toHaveBeenCalledWith("ci-1", 1);
  });

  it("totals the real rows rather than a fixed KES 655,000", () => {
    mockCart = {
      items: [realItem, { ...realItem, id: "ci-2", quantity: 1, product: { ...realItem.product, price_ksh: 500 } }],
      count: 3,
      loading: false,
      removeItem,
      setQuantity,
    };
    renderCart();

    // 60,000 + 500. The old page always showed 655,000 from its two constants.
    expect(screen.getAllByText("KES 60,500").length).toBeGreaterThan(0);
    expect(screen.queryByText("KES 655,000")).not.toBeInTheDocument();
  });
});
