import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { formatKsh, formatDate, routeForNotification as libRouteForNotification } from "../../src/lib/format";

export const routeForNotification = libRouteForNotification;

// ==========================================
// Types & Interfaces
// ==========================================

export interface TestCase {
  id: string;
  featureId: number;
  featureName: string;
  name: string;
  fn: () => void | Promise<void>;
}

export interface TestResult {
  id: string;
  featureId: number;
  featureName: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: Error;
}

export interface FeatureSummary {
  featureId: number;
  featureName: string;
  total: number;
  passed: number;
  failed: number;
}

export interface TestSuiteSummary {
  totalTests: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  features: FeatureSummary[];
}

// ==========================================
// Custom Assertions
// ==========================================

export function assert(condition: unknown, message?: string): void {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

export function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`
    );
  }
}

export function assertNotEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    throw new Error(
      message || `Expected actual value NOT to equal ${JSON.stringify(expected)}`
    );
  }
}

export function assertTrue(condition: boolean, message?: string): void {
  assertEquals(condition, true, message || "Expected true");
}

export function assertFalse(condition: boolean, message?: string): void {
  assertEquals(condition, false, message || "Expected false");
}

export function assertContains(haystack: string, needle: string, message?: string): void {
  assert(
    haystack.includes(needle),
    message || `Expected "${haystack}" to contain "${needle}"`
  );
}

export function assertRegex(text: string, regex: RegExp, message?: string): void {
  assert(
    regex.test(text),
    message || `Expected "${text}" to match regex ${regex}`
  );
}

export function assertMatches(text: string, regex: RegExp, message?: string): void {
  assertRegex(text, regex, message);
}

export function assertKshFormat(val: string): void {
  assertRegex(val, /^KSH\s[\d,]+$/, `Expected "${val}" to match KSH format`);
}

export function assertPhoneFormat(val: string): void {
  assertRegex(val, /^254[17]\d{8}$/, `Expected "${val}" to match Kenyan phone format`);
}

export function assertEscrowSplit(total: number, expectedFee: number, expectedPayout: number): void {
  const split = calculateEscrowSplit(total);
  assertEquals(split.platformFeeKsh, expectedFee);
  assertEquals(split.vendorPayoutKsh, expectedPayout);
}

export function assertThrows(fn: () => void, expectedErrorMessageSubstring?: string): void {
  let threw = false;
  try {
    fn();
  } catch (err: any) {
    threw = true;
    if (expectedErrorMessageSubstring) {
      assertContains(
        String(err?.message || err),
        expectedErrorMessageSubstring,
        `Expected error message to contain "${expectedErrorMessageSubstring}"`
      );
    }
  }
  assert(threw, "Expected function to throw an error, but it succeeded");
}

// ==========================================
// Feature Inventory Registry
// ==========================================

export const FEATURE_INVENTORY: Record<number, string> = {
  1: "Design Tokens & Fonts",
  2: "Home Page",
  3: "Browse Page",
  4: "Product Detail Page",
  5: "Shop Page",
  6: "How It Works Page",
  7: "Terms Page",
  8: "Cart Page",
  9: "Profile Page",
  10: "Notifications Page & Router Fix",
  11: "Vendor Overview Icon Fix",
  12: "Vendor Typography Polish",
  13: "Repairs Page & Booking Queue",
  14: "Checkout & M-Pesa STK Push",
  15: "Orders & Order Detail Pages",
  16: "Float Escrow Release",
  17: "Vendor Dashboard",
  18: "Vendor Onboarding & Verification",
  19: "Admin Dashboard & Vendor Approvals",
  20: "Admin Dispute Resolution Queue",
};

// ==========================================
// Test Harness Registry Class & Instances
// ==========================================

export class TestHarness {
  private static tests: TestCase[] = [];

  public static registerTest(
    featureId: number,
    name: string,
    fn: () => void | Promise<void>
  ): void {
    const featureName = FEATURE_INVENTORY[featureId] || `Feature ${featureId}`;
    const id = `F${featureId}_${TestHarness.tests.length + 1}_${name.replace(/\s+/g, "_")}`;
    TestHarness.tests.push({ id, featureId, featureName, name, fn });
  }

  public static getRegisteredTests(): TestCase[] {
    return [...TestHarness.tests];
  }

  public static clear(): void {
    TestHarness.tests = [];
  }

  public static async runSuite(tierName: string = "Tier 1"): Promise<TestSuiteSummary> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    const featureMap: Map<number, FeatureSummary> = new Map();

    for (let id = 1; id <= 20; id++) {
      if (FEATURE_INVENTORY[id]) {
        featureMap.set(id, {
          featureId: id,
          featureName: FEATURE_INVENTORY[id],
          total: 0,
          passed: 0,
          failed: 0,
        });
      }
    }

    for (const testCase of TestHarness.tests) {
      const testStart = Date.now();
      let passed = false;
      let error: Error | undefined = undefined;

      try {
        await testCase.fn();
        passed = true;
      } catch (err: any) {
        passed = false;
        error = err instanceof Error ? err : new Error(String(err));
      }

      const durationMs = Date.now() - testStart;
      results.push({
        id: testCase.id,
        featureId: testCase.featureId,
        featureName: testCase.featureName,
        name: testCase.name,
        passed,
        durationMs,
        error,
      });

      const feat = featureMap.get(testCase.featureId);
      if (feat) {
        feat.total += 1;
        if (passed) feat.passed += 1;
        else feat.failed += 1;
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;

    return {
      totalTests: results.length,
      passedCount,
      failedCount,
      durationMs: totalDuration,
      features: Array.from(featureMap.values()),
    };
  }

  public static registerWithVitest(suiteName: string): void {
    describe(suiteName, () => {
      const grouped = new Map<number, TestCase[]>();
      for (const t of TestHarness.tests) {
        const list = grouped.get(t.featureId) || [];
        list.push(t);
        grouped.set(t.featureId, list);
      }

      for (let fId = 1; fId <= 20; fId++) {
        const tests = grouped.get(fId);
        if (tests && tests.length > 0) {
          const featureName = FEATURE_INVENTORY[fId];
          describe(`Feature ${fId}: ${featureName}`, () => {
            for (const testCase of tests) {
              it(testCase.name, async () => {
                await testCase.fn();
              });
            }
          });
        }
      }
    });
  }
}

export const registry = {
  register: (item: any) => {
    TestHarness.registerTest(item.featureId || 1, item.title || item.id, item.fn);
  },
};

// ==========================================
// Stateful Mock Data Store for E2E Tests
// ==========================================

export class MockDataStore {
  public profiles = new Map<string, any>();
  public vendorProfiles = new Map<string, any>();
  public vendors = new Map<string, any>();
  public products = new Map<string, any>();
  public cart = new Map<string, any[]>();
  public cartItems = new Map<string, any>();
  public orders = new Map<string, any>();
  public repairs = new Map<string, any>();
  public repairRequests = new Map<string, any>();
  public disputes = new Map<string, any>();
  public notifications = new Map<string, any>();

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    this.profiles.set("usr_buyer_1", {
      id: "usr_buyer_1",
      email: "buyer1@example.com",
      full_name: "John Buyer",
      phone_number: "254712345678",
      role: "buyer",
    });

    const vendorObj = {
      id: "vnd_1",
      user_id: "usr_vnd1",
      business_name: "Nairobi Tech",
      verification_status: "approved",
      status: "approved",
      balance_ksh: 0,
      escrow_held_ksh: 0,
    };
    this.vendors.set("vnd_1", vendorObj);
    this.vendorProfiles.set("vnd_1", vendorObj);

    this.products.set("prd_phone_1", {
      id: "prd_phone_1",
      brand: "Apple",
      model_name: "iPhone 14 Pro",
      category: "Phones",
      condition: "Brand New",
      price_ksh: 125000,
      quantity_in_stock: 5,
      vendor_id: "vnd_1",
      is_active: true,
    });
    this.products.set("prd_laptop_1", {
      id: "prd_laptop_1",
      brand: "Apple",
      model_name: "MacBook Pro M2 14-inch",
      category: "Laptops",
      condition: "Refurbished",
      price_ksh: 210000,
      quantity_in_stock: 3,
      vendor_id: "vnd_1",
      is_active: true,
    });
  }

  public addToCart(buyerId: string, productId: string, qty: number) {
    const product = this.products.get(productId);
    if (!product || product.quantity_in_stock < qty) {
      throw new Error(`Product unavailable or insufficient stock for product ${productId}`);
    }
    const items = this.cart.get(buyerId) || [];
    const item = { product_id: productId, quantity: qty, unit_price_ksh: product.price_ksh, product };
    items.push(item);
    this.cart.set(buyerId, items);
    this.cartItems.set(`${buyerId}_${productId}`, item);
    return item;
  }

  public createOrderFromCart(buyerId: string, address: string, phone: string = "254712345678") {
    const items = this.cart.get(buyerId) || [];
    if (items.length === 0) throw new Error("Cart is empty");
    
    for (const item of items) {
      const product = this.products.get(item.product_id);
      if (!product || product.quantity_in_stock < item.quantity) {
        throw new Error(`Product unavailable or insufficient stock for product ${item.product_id}`);
      }
    }

    const buyer = this.profiles.get(buyerId);
    const orderPhone = buyer?.phone_number || phone;

    const ordersList: any[] = [];
    for (const item of items) {
      const product = this.products.get(item.product_id);
      product.quantity_in_stock -= item.quantity;
      const totalAmountKsh = item.unit_price_ksh * item.quantity;
      const split = calculateEscrowSplit(totalAmountKsh);
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const order = {
        id: orderId,
        customer_id: buyerId,
        buyer_id: buyerId,
        user_id: buyerId,
        vendor_id: product.vendor_id,
        product_id: product.id,
        quantity: item.quantity,
        total_amount_ksh: totalAmountKsh,
        platform_fee_ksh: split.platformFeeKsh,
        vendor_payout_ksh: split.vendorPayoutKsh,
        status: "pending",
        payment_status: "pending",
        shipping_address: address,
        contact_phone: orderPhone,
        phone_number: orderPhone,
        created_at: new Date().toISOString(),
      };
      this.orders.set(orderId, order);
      ordersList.push(order);
    }
    this.cart.set(buyerId, []);
    this.cartItems.clear();
    return ordersList;
  }

  public processStkPushPayment(orderId: string, phone: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    order.status = "payment_held";
    order.payment_status = "paid_float";
    const vendor = this.vendors.get(order.vendor_id) || this.vendorProfiles.get(order.vendor_id);
    if (vendor) {
      vendor.escrow_held_ksh += order.vendor_payout_ksh;
    }

    this.addNotification({
      user_id: order.buyer_id,
      type: "payment",
      reference_id: order.id,
      title: "Payment Held in Float",
      message: `Payment of KSH ${order.total_amount_ksh} held in Float escrow.`,
    });

    return {
      success: true,
      status: "paid_float",
      orderId,
      receipt: "WSK12345678",
      checkoutRequestId: `req_${Date.now()}`,
    };
  }

  public simulateSTKPush(orderId: string, phone: string) {
    return this.processStkPushPayment(orderId, phone);
  }

  public confirmOrderReceipt(orderId: string, buyerId?: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    order.status = "confirmed";
    order.payment_status = "released";
    const vendor = this.vendors.get(order.vendor_id) || this.vendorProfiles.get(order.vendor_id);
    if (vendor) {
      vendor.escrow_held_ksh -= order.vendor_payout_ksh;
      vendor.balance_ksh += order.vendor_payout_ksh;
    }
    return {
      success: true,
      status: "confirmed",
      payment_status: "released",
      platformFee: order.platform_fee_ksh,
      vendorPayout: order.vendor_payout_ksh,
      order,
    };
  }

  public releaseFloatPayment(orderId: string) {
    return this.confirmOrderReceipt(orderId);
  }

  public addNotification(payload: { user_id: string; type: string; title: string; message: string; reference_id?: string }) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const notification = {
      id: notifId,
      user_id: payload.user_id,
      type: payload.type,
      reference_id: payload.reference_id || null,
      title: payload.title,
      message: payload.message,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.notifications.set(notifId, notification);
    return notification;
  }

  public submitRepairRequest(
    buyerId: string,
    vendorId: string,
    category: string,
    brand: string,
    model: string,
    issue: string,
    preferredDate?: string
  ) {
    const repairId = `rpr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const repair = {
      id: repairId,
      customer_id: buyerId,
      vendor_id: vendorId,
      category,
      brand,
      device_model: `${brand} ${model}`.trim(),
      problem_description: issue,
      preferred_date: preferredDate,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    this.repairs.set(repairId, repair);
    this.repairRequests.set(repairId, repair);

    this.addNotification({
      user_id: buyerId,
      type: "repair_update",
      reference_id: repairId,
      title: "Repair Request Submitted",
      message: `Your repair request for ${repair.device_model} has been submitted.`,
    });

    return repair;
  }

  public createRepairRequest(buyerId: string, vendorId: string, deviceModel: string, issue: string) {
    return this.submitRepairRequest(buyerId, vendorId, "General", "", deviceModel, issue);
  }

  public updateRepairStatus(repairId: string, status: string, quoteAmount?: number, notes?: string) {
    const repair = this.repairs.get(repairId) || this.repairRequests.get(repairId);
    if (!repair) throw new Error("Repair not found");
    repair.status = status;
    if (quoteAmount !== undefined) {
      repair.quote_amount_ksh = quoteAmount;
      repair.estimated_cost_ksh = quoteAmount;
    }
    if (notes !== undefined) repair.vendor_notes = notes;

    this.addNotification({
      user_id: repair.customer_id,
      type: "repair_update",
      reference_id: repairId,
      title: `Repair Status: ${status}`,
      message: `Your repair status updated to ${status}`,
    });

    return repair;
  }

  public createDispute(orderId: string, buyerId: string, reason: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    const disputeId = `dsp_${Date.now()}`;
    const dispute = {
      id: disputeId,
      order_id: orderId,
      buyer_id: buyerId,
      reason,
      status: "open",
      created_at: new Date().toISOString(),
    };
    order.status = "disputed";
    this.disputes.set(disputeId, dispute);
    return dispute;
  }

  public submitDispute(orderId: string, buyerId: string, reason: string) {
    return this.createDispute(orderId, buyerId, reason);
  }

  public resolveDispute(disputeId: string, arg2: string, arg3?: string) {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error("Dispute not found");
    const order = this.orders.get(dispute.order_id);

    const argStr = (arg2 + " " + (arg3 || "")).trim().toLowerCase();

    if (argStr.includes("refund")) {
      dispute.status = "resolved_refund";
      if (order) {
        order.status = "cancelled";
        order.payment_status = "refunded";
      }
    } else if (argStr.includes("release")) {
      dispute.status = "resolved_release";
      if (order) {
        order.status = "confirmed";
        order.payment_status = "released";
        const vendor = this.vendors.get(order.vendor_id) || this.vendorProfiles.get(order.vendor_id);
        if (vendor) {
          vendor.escrow_held_ksh -= order.vendor_payout_ksh;
          vendor.balance_ksh += order.vendor_payout_ksh;
        }
      }
    }
    return dispute;
  }

  public registerVendor(userId: string, storeName: string, kraPin: string) {
    const vendorId = `vnd_${Date.now()}`;
    const vendor = {
      id: vendorId,
      user_id: userId,
      business_name: storeName,
      kra_pin: kraPin,
      verification_status: "pending",
      status: "pending",
      balance_ksh: 0,
      escrow_held_ksh: 0,
    };
    this.vendors.set(vendorId, vendor);
    this.vendorProfiles.set(vendorId, vendor);
    return vendor;
  }

  public registerVendorOnboarding(userId: string, storeName: string, kraPin: string, phone?: string) {
    return this.registerVendor(userId, storeName, kraPin);
  }

  public reviewVendorOnboarding(vendorId: string, decision: string, reason?: string) {
    if (decision === "approve") {
      return this.approveVendor(vendorId, "admin_1");
    } else {
      return this.rejectVendor(vendorId, reason || "Rejected", "admin_1");
    }
  }

  public approveVendor(vendorId: string, adminId: string) {
    const vendor = this.vendors.get(vendorId) || this.vendorProfiles.get(vendorId);
    if (!vendor) throw new Error("Vendor not found");
    vendor.verification_status = "approved";
    vendor.status = "approved";
    const profile = this.profiles.get(vendor.user_id);
    if (profile) {
      profile.role = "vendor";
    }
    return vendor;
  }

  public rejectVendor(vendorId: string, reason: string, adminId: string) {
    const vendor = this.vendors.get(vendorId) || this.vendorProfiles.get(vendorId);
    if (!vendor) throw new Error("Vendor not found");
    vendor.verification_status = "rejected";
    vendor.status = "rejected";
    vendor.rejection_reason = reason;
    return vendor;
  }

  public suspendVendor(vendorId: string, adminId: string) {
    const vendor = this.vendors.get(vendorId) || this.vendorProfiles.get(vendorId);
    if (!vendor) throw new Error("Vendor not found");
    vendor.verification_status = "suspended";
    vendor.status = "suspended";
    return vendor;
  }

  public markAllNotificationsRead(userId: string) {
    for (const notif of this.notifications.values()) {
      if (notif.user_id === userId) {
        notif.is_read = true;
      }
    }
    return true;
  }

  public getEscrowSummary() {
    let totalHeld = 0;
    let totalFees = 0;
    for (const order of this.orders.values()) {
      if (order.payment_status === "paid_float") {
        totalHeld += order.total_amount_ksh;
      }
      if (order.payment_status === "released") {
        totalFees += order.platform_fee_ksh;
      }
    }
    return { totalHeld, totalFees };
  }
}

// ==========================================
// Helper Fixtures & Utilities
// ==========================================

export function verifyDesignTokens(): boolean {
  const cssPath = path.resolve(process.cwd(), "src/index.css");
  const css = fs.readFileSync(cssPath, "utf-8");
  return css.includes("--primary") && css.includes(".text-price");
}

export function normalizeKenyanPhone(phone: string): string {
  const clean = phone.replace(/[\s\-\+\(\)]/g, "");
  if (clean.startsWith("254") && clean.length === 12) {
    return clean;
  }
  if ((clean.startsWith("07") || clean.startsWith("01")) && clean.length === 10) {
    return `254${clean.slice(1)}`;
  }
  if (clean.startsWith("7") || clean.startsWith("1")) {
    if (clean.length === 9) return `254${clean}`;
  }
  throw new Error(`Invalid Kenyan phone number format: ${phone}`);
}

export function calculateEscrowSplit(totalAmountKsh: number, platformRate: number = 0.10): {
  totalAmountKsh: number;
  platformFeeKsh: number;
  vendorPayoutKsh: number;
} {
  assert(totalAmountKsh > 0, "Total amount must be greater than 0");
  const platformFeeKsh = Math.round(totalAmountKsh * platformRate);
  const vendorPayoutKsh = totalAmountKsh - platformFeeKsh;
  return {
    totalAmountKsh,
    platformFeeKsh,
    vendorPayoutKsh,
  };
}

export const mockData = {
  products: [
    { id: "prd_1", brand: "Apple", model_name: "iPhone 14", price_ksh: 120000, vendor_id: "vnd_1" },
  ],
  vendors: [
    { id: "vnd_1", business_name: "Nairobi Tech", verification_status: "verified" },
  ],
};
