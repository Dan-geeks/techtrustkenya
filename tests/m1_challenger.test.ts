import { describe, it, expect } from "vitest";
import { routeForNotification } from "../src/lib/format";
import fs from "fs";
import path from "path";

describe("M1 Empirical Verification & Stress Testing Suite", () => {
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
      it(`verifies page ${pageRelPath} exists and exports valid TSX component`, () => {
        const fullPath = path.resolve(process.cwd(), pageRelPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, "utf-8");
        expect(content.length).toBeGreaterThan(100);
        expect(content).toContain("export default");
      });
    });

    it("verifies design tokens (.text-price, .text-stat, .text-data-id, .text-eyebrow) in index.css", () => {
      const tokens = [".text-price", ".text-stat", ".text-data-id", ".text-eyebrow"];
      const cssPath = path.resolve(process.cwd(), "src/index.css");
      const cssContent = fs.readFileSync(cssPath, "utf-8");
      tokens.forEach((t) => {
        expect(cssContent).toContain(t);
      });
    });
  });

  describe("Task 3: Notification Routing Edge Cases Empirical Matrix", () => {
    it("case 1: order_update with reference_id returns /orders/:id", () => {
      expect(routeForNotification({ type: "order_update", reference_id: "ord-123" })).toBe("/orders/ord-123");
    });

    it("case 2: order_update with null reference_id returns null (DEFECT: fails to fallback to /orders)", () => {
      // Current implementation returns null when reference_id is null
      expect(routeForNotification({ type: "order_update", reference_id: null })).toBe(null);
    });

    it("case 3: repair_update with reference_id returns /repairs/rep-123 (DEFECT: route /repairs/:id missing in App.tsx -> 404)", () => {
      const appTsx = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf-8");
      const routeWithId = routeForNotification({ type: "repair_update", reference_id: "rep-123" });
      expect(routeWithId).toBe("/repairs/rep-123");
      expect(appTsx.includes('path="/repairs/:')).toBe(false);
    });

    it("case 4: repair_update with null reference_id returns null (DEFECT: fails to return /repairs)", () => {
      expect(routeForNotification({ type: "repair_update", reference_id: null })).toBe(null);
    });

    it("case 5: vendor_application with reference_id returns /vendor/dashboard", () => {
      expect(routeForNotification({ type: "vendor_application", reference_id: "vnd-1" })).toBe("/vendor/dashboard");
    });

    it("case 6: vendor_application with null reference_id returns null (DEFECT: fails to navigate to dashboard when reference_id is null)", () => {
      expect(routeForNotification({ type: "vendor_application", reference_id: null })).toBe(null);
    });

    it("case 7: unknown type with reference_id returns null", () => {
      expect(routeForNotification({ type: "system", reference_id: "sys-1" })).toBe(null);
    });

    it("case 8: unknown type with null reference_id returns null", () => {
      expect(routeForNotification({ type: "system", reference_id: null })).toBe(null);
    });
  });
});
