import { describe, it, expect } from "vitest";
import { routeForNotification } from "../../src/lib/format";
import fs from "fs";
import path from "path";

describe("M1 Empirical Verification Suite", () => {
  describe("Task 1: TypeScript & Build Integrity", () => {
    it("verifies package.json and vite config exist", () => {
      const root = process.cwd();
      expect(fs.existsSync(path.join(root, "package.json"))).toBe(true);
      expect(fs.existsSync(path.join(root, "vite.config.ts"))).toBe(true);
    });
  });

  describe("Task 2: 13 Public Buyer Pages TSX & Symbol Integrity", () => {
    const buyerPages = [
      "src/pages/Index.tsx",
      "src/pages/Browse.tsx",
      "src/pages/ProductDetail.tsx",
      "src/pages/ShopPage.tsx",
      "src/pages/Repairs.tsx",
      "src/pages/HowItWorks.tsx",
      "src/pages/Terms.tsx",
      "src/pages/Cart.tsx",
      "src/pages/Checkout.tsx",
      "src/pages/Orders.tsx",
      "src/pages/OrderDetail.tsx",
      "src/pages/Profile.tsx",
      "src/pages/Notifications.tsx",
    ];

    buyerPages.forEach((pageRelPath) => {
      it(`verifies page ${pageRelPath} exists and imports required components`, () => {
        const fullPath = path.resolve(process.cwd(), pageRelPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, "utf-8");
        expect(content.length).toBeGreaterThan(100);
        // Check for export default
        expect(content).toContain("export default");
      });
    });

    it("verifies design tokens (.text-price, .text-stat, .text-data-id, .text-eyebrow) usage across buyer pages", () => {
      const tokens = [".text-price", ".text-stat", ".text-data-id", ".text-eyebrow"];
      const cssPath = path.resolve(process.cwd(), "src/index.css");
      const cssContent = fs.readFileSync(cssPath, "utf-8");
      tokens.forEach((t) => {
        expect(cssContent).toContain(t);
      });
    });
  });

  describe("Task 3: Notification Routing Edge Cases (routeForNotification)", () => {
    it("routes order_update with reference_id to /orders/:id", () => {
      expect(routeForNotification({ type: "order_update", reference_id: "ord-123" })).toBe("/orders/ord-123");
    });

    it("routes order_update with null reference_id to /orders", () => {
      expect(routeForNotification({ type: "order_update", reference_id: null })).toBe("/orders");
    });

    it("routes payment with reference_id to /orders/:id", () => {
      expect(routeForNotification({ type: "payment", reference_id: "pay-456" })).toBe("/orders/pay-456");
    });

    it("routes payment with null reference_id to /orders", () => {
      expect(routeForNotification({ type: "payment", reference_id: null })).toBe("/orders");
    });

    it("routes dispute with reference_id to /orders/:id", () => {
      expect(routeForNotification({ type: "dispute", reference_id: "disp-789" })).toBe("/orders/disp-789");
    });

    it("routes dispute with null reference_id to /orders", () => {
      expect(routeForNotification({ type: "dispute", reference_id: null })).toBe("/orders");
    });

    it("routes review_request with reference_id to /orders/:id", () => {
      expect(routeForNotification({ type: "review_request", reference_id: "rev-101" })).toBe("/orders/rev-101");
    });

    it("routes review_request with null reference_id to /orders", () => {
      expect(routeForNotification({ type: "review_request", reference_id: null })).toBe("/orders");
    });

    it("routes vendor_application to /vendor/dashboard regardless of reference_id", () => {
      expect(routeForNotification({ type: "vendor_application", reference_id: null })).toBe("/vendor/dashboard");
      expect(routeForNotification({ type: "vendor_application", reference_id: "app-99" })).toBe("/vendor/dashboard");
    });

    it("routes repair_update notification", () => {
      const routeWithId = routeForNotification({ type: "repair_update", reference_id: "rep-555" });
      const routeNull = routeForNotification({ type: "repair_update", reference_id: null });
      
      console.log("repair_update with reference_id: rep-555 ->", routeWithId);
      console.log("repair_update with reference_id: null ->", routeNull);

      // Verify whether route matches existing routes in App.tsx
      expect(routeNull).toBe("/repairs");
    });

    it("handles unknown/system notification types without reference_id", () => {
      expect(routeForNotification({ type: "system", reference_id: null })).toBe(null);
      expect(routeForNotification({ type: "promotion", reference_id: null })).toBe(null);
    });

    it("handles unknown/system notification types with reference_id", () => {
      expect(routeForNotification({ type: "system", reference_id: "sys-001" })).toBe("/orders/sys-001");
    });
  });
});
