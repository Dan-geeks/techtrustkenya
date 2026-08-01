import { describe, it, expect } from "vitest";
import { routeForNotification } from "./format";

describe("routeForNotification - Empirical Verification", () => {
  it("repair_update returns /repairs regardless of reference_id", () => {
    expect(routeForNotification({ type: "repair_update", reference_id: "req-123" })).toBe("/repairs");
    expect(routeForNotification({ type: "repair_update", reference_id: null })).toBe("/repairs");
    expect(routeForNotification({ type: "repair_update", reference_id: "" })).toBe("/repairs");
  });

  it("order_update returns /orders/${reference_id} when reference_id is non-null", () => {
    expect(routeForNotification({ type: "order_update", reference_id: "ord-456" })).toBe("/orders/ord-456");
    expect(routeForNotification({ type: "order_update", reference_id: null })).toBeNull();
  });

  it("escrow_release returns /orders/${reference_id} when reference_id is non-null", () => {
    expect(routeForNotification({ type: "escrow_release", reference_id: "ord-789" })).toBe("/orders/ord-789");
    expect(routeForNotification({ type: "escrow_release", reference_id: null })).toBeNull();
  });

  it("dispute_opened returns /orders/${reference_id} when reference_id is non-null", () => {
    expect(routeForNotification({ type: "dispute_opened", reference_id: "ord-101" })).toBe("/orders/ord-101");
    expect(routeForNotification({ type: "dispute_opened", reference_id: null })).toBeNull();
  });

  it("payment, review_request, and dispute return /orders/${reference_id} when reference_id is non-null", () => {
    expect(routeForNotification({ type: "payment", reference_id: "ord-202" })).toBe("/orders/ord-202");
    expect(routeForNotification({ type: "review_request", reference_id: "ord-303" })).toBe("/orders/ord-303");
    expect(routeForNotification({ type: "dispute", reference_id: "ord-404" })).toBe("/orders/ord-404");
  });

  it("vendor_application returns /vendor/dashboard", () => {
    expect(routeForNotification({ type: "vendor_application", reference_id: null })).toBe("/vendor/dashboard");
  });

  it("unknown notification type returns null", () => {
    expect(routeForNotification({ type: "unknown_type", reference_id: "xyz" })).toBeNull();
  });
});
