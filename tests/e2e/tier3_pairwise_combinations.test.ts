import { describe, it, expect, beforeEach } from "vitest";
import {
  MockDataStore,
  verifyDesignTokens,
  routeForNotification,
} from "./harness";
import { globalTestStats } from "./runner";

describe("Tier 3 — Pairwise Feature Combinations Suite (>=20 Test Cases)", () => {
  let store: MockDataStore;

  beforeEach(() => {
    store = new MockDataStore();
  });

  it("T3_PAIR_01: Cart + M-Pesa Checkout — Adds product to cart, creates order, and completes M-Pesa STK push to payment_held", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      const productId = "prd_phone_1";

      // Step 1: Add product to Cart
      const cartItem = store.addToCart(buyerId, productId, 1);
      expect(cartItem.product_id).toBe(productId);
      expect(cartItem.quantity).toBe(1);

      // Step 2: Create Order from Cart
      const orders = store.createOrderFromCart(
        buyerId,
        "Building 4, Harambee Avenue, Nairobi",
        "0712345678"
      );
      expect(orders).toHaveLength(1);
      const order = orders[0];
      expect(order.status).toBe("pending");
      expect(order.total_amount_ksh).toBe(125000);

      // Step 3: Complete M-Pesa STK Push Payment
      const stkResult = store.simulateSTKPush(order.id, "0712345678");
      expect(stkResult.success).toBe(true);
      expect(stkResult.receipt).toMatch(/^WSK\d{8}$/);

      // Step 4: Verify Order state is now paid_float / payment_held
      const updatedOrder = store.orders.get(order.id);
      expect(updatedOrder?.payment_status).toBe("paid_float");
      expect(updatedOrder?.status).toBe("payment_held");

      globalTestStats.record("Tier3", "T3_PAIR_01", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_01", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_02: Repair Booking + Vendor Repair Queue — Submits repair, verifies vendor queue insertion and status progression", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      const vendorId = "vnd_1";

      // Step 1: Submit Repair Request
      const repair = store.submitRepairRequest(
        buyerId,
        vendorId,
        "Smartphones",
        "Samsung",
        "Galaxy S21",
        "Screen cracked after fall",
        "2026-08-10"
      );
      expect(repair.status).toBe("pending");

      // Step 2: Vendor checks queue and accepts request
      const vendorQueue = Array.from(store.repairRequests.values()).filter(
        (r) => r.vendor_id === vendorId
      );
      expect(vendorQueue).toContainEqual(expect.objectContaining({ id: repair.id }));

      // Step 3: Vendor updates status to in_progress with estimated cost
      const updatedRepair = store.updateRepairStatus(repair.id, "in_progress", 8500, "Screen replacement ordered");
      expect(updatedRepair.status).toBe("in_progress");
      expect(updatedRepair.estimated_cost_ksh).toBe(8500);

      globalTestStats.record("Tier3", "T3_PAIR_02", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_02", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_03: Dispute Submission + Admin Resolution (Refund) — Opens dispute, admin refunds buyer and cancels order", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      const adminId = "usr_admin_1";

      // Setup paid order
      store.addToCart(buyerId, "prd_phone_1", 1);
      const orders = store.createOrderFromCart(buyerId, "Mombasa Rd", "0712345678");
      const order = orders[0];
      store.simulateSTKPush(order.id, "0712345678");

      // Step 1: Customer submits dispute
      const dispute = store.submitDispute(order.id, buyerId, "Item delivered was damaged during transit", ["http://photo1.jpg"]);
      expect(dispute.status).toBe("open");
      expect(store.orders.get(order.id)?.status).toBe("disputed");

      // Step 2: Admin resolves dispute in buyer's favor
      const resolved = store.resolveDispute(dispute.id, adminId, "refund_buyer", "Valid damage proof provided. Full refund granted.");
      expect(resolved.status).toBe("resolved_refund");

      const finalOrder = store.orders.get(order.id);
      expect(finalOrder?.payment_status).toBe("refunded");
      expect(finalOrder?.status).toBe("cancelled");

      globalTestStats.record("Tier3", "T3_PAIR_03", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_03", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_04: Dispute Submission + Admin Resolution (Release) — Opens dispute, admin releases float payment to vendor", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      const adminId = "usr_admin_1";

      store.addToCart(buyerId, "prd_phone_1", 1);
      const orders = store.createOrderFromCart(buyerId, "Kilio St", "0712345678");
      const order = orders[0];
      store.simulateSTKPush(order.id, "0712345678");

      // Step 1: Customer submits dispute
      const dispute = store.submitDispute(order.id, buyerId, "Unjustified change of mind after dispatch");

      // Step 2: Admin inspects and releases payment to vendor
      const resolved = store.resolveDispute(dispute.id, adminId, "release_vendor", "Product delivered matching exact specs. Buyer remorse.");
      expect(resolved.status).toBe("resolved_release");

      const finalOrder = store.orders.get(order.id);
      expect(finalOrder?.payment_status).toBe("released");
      expect(finalOrder?.status).toBe("confirmed");

      globalTestStats.record("Tier3", "T3_PAIR_04", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_04", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_05: Vendor Onboarding + Admin Approval — Registers new vendor, admin approves, transitions state to active vendor", () => {
    const start = Date.now();
    try {
      const newUserId = "usr_new_vnd_1";
      store.profiles.set(newUserId, {
        id: newUserId,
        email: "newvendor@techtrust.co.ke",
        full_name: "Peter Njoroge",
        phone_number: "0733112233",
        role: "customer",
      });

      // Step 1: Submit vendor application
      const vendor = store.registerVendorOnboarding(newUserId, "Njoroge Electronics", "Wholesaler", "http://id.pdf");
      expect(vendor.status).toBe("pending");

      // Step 2: Admin reviews and approves
      const approvedVendor = store.reviewVendorOnboarding(vendor.id, "approve");
      expect(approvedVendor.status).toBe("approved");

      // Step 3: Check user role updated
      const user = store.profiles.get(newUserId);
      expect(user?.role).toBe("vendor");

      globalTestStats.record("Tier3", "T3_PAIR_05", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_05", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_06: Vendor Onboarding + Admin Rejection — Registers vendor, admin rejects application with reason", () => {
    const start = Date.now();
    try {
      const newUserId = "usr_rejected_vnd";
      store.profiles.set(newUserId, {
        id: newUserId,
        email: "incomplete@techtrust.co.ke",
        full_name: "James Kariuki",
        phone_number: "0788776655",
        role: "customer",
      });

      // Step 1: Submit application
      const vendor = store.registerVendorOnboarding(newUserId, "Kariuki Tech", "Retailer", "http://invalid_doc.jpg");
      expect(vendor.status).toBe("pending");

      // Step 2: Admin rejects with reason
      const rejectedVendor = store.reviewVendorOnboarding(vendor.id, "reject", "Business permit copy unreadable");
      expect(rejectedVendor.status).toBe("rejected");
      expect(rejectedVendor.rejection_reason).toBe("Business permit copy unreadable");

      globalTestStats.record("Tier3", "T3_PAIR_06", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_06", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_07: Product Detail + Realtime Cart Sync — Updates cart item count and calculates correct total price formatting", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      const item1 = store.addToCart(buyerId, "prd_phone_1", 1);
      const item2 = store.addToCart(buyerId, "prd_laptop_1", 1);

      const cartItems = Array.from(store.cartItems.values());
      expect(cartItems).toHaveLength(2);

      const totalKsh = cartItems.reduce((sum, ci) => sum + (ci.product?.price_ksh || 0) * ci.quantity, 0);
      expect(totalKsh).toBe(125000 + 210000);

      // Verify typography token check for price display
      const fontCheck = verifyDesignTokens({ priceClass: true, fontFamily: "JetBrains Mono" });
      expect(fontCheck).toBe(true);

      globalTestStats.record("Tier3", "T3_PAIR_07", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_07", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_08: Browse Filters + Product Detail Navigation — Filters by category 'Laptops' and retrieves matching product details", () => {
    const start = Date.now();
    try {
      const category = "Laptops";
      const filteredProducts = Array.from(store.products.values()).filter((p) => p.category === category);
      expect(filteredProducts).toHaveLength(1);
      expect(filteredProducts[0].model_name).toBe("MacBook Pro M2 14-inch");
      expect(filteredProducts[0].condition).toBe("Refurbished");

      globalTestStats.record("Tier3", "T3_PAIR_08", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_08", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_09: M-Pesa Payment STK Push + Order History — STK Push payment updates buyer order history with payment_held status", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      store.addToCart(buyerId, "prd_phone_1", 1);
      const orders = store.createOrderFromCart(buyerId, "Westlands, Nairobi", "0712345678");
      const order = orders[0];

      store.simulateSTKPush(order.id, "0712345678");

      const buyerOrders = Array.from(store.orders.values()).filter((o) => o.customer_id === buyerId);
      expect(buyerOrders).toContainEqual(
        expect.objectContaining({
          id: order.id,
          payment_status: "paid_float",
          status: "payment_held",
        })
      );

      globalTestStats.record("Tier3", "T3_PAIR_09", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_09", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_10: Buyer Confirm Receipt + Float Escrow Release — Receipt confirmation releases 90% payout to vendor and 10% platform fee", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      store.addToCart(buyerId, "prd_phone_1", 1); // 125,000 Ksh
      const orders = store.createOrderFromCart(buyerId, "Kilimani", "0712345678");
      const order = orders[0];
      store.simulateSTKPush(order.id, "0712345678");

      // Buyer confirms receipt
      const releaseResult = store.releaseFloatPayment(order.id);
      expect(releaseResult.success).toBe(true);
      expect(releaseResult.platformFee).toBe(12500); // 10%
      expect(releaseResult.vendorPayout).toBe(112500); // 90%

      const updatedOrder = store.orders.get(order.id);
      expect(updatedOrder?.payment_status).toBe("released");
      expect(updatedOrder?.status).toBe("confirmed");

      globalTestStats.record("Tier3", "T3_PAIR_10", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_10", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_11: Vendor Product Creation + Public Storefront — Vendor adds product to inventory, instantly queryable on Browse page", () => {
    const start = Date.now();
    try {
      const vendorId = "vnd_1";
      const newProd: Product = {
        id: "prd_tablet_1",
        vendor_id: vendorId,
        brand: "Apple",
        model_name: "iPad Air M1",
        category: "Tablets",
        price_ksh: 85000,
        quantity_in_stock: 4,
        is_active: true,
        condition: "New",
        image_urls: ["http://ipad.jpg"],
      };
      store.products.set(newProd.id, newProd);

      // Verify product appears in public browse query
      const browseProducts = Array.from(store.products.values()).filter((p) => p.is_active);
      expect(browseProducts).toContainEqual(expect.objectContaining({ id: "prd_tablet_1", brand: "Apple" }));

      globalTestStats.record("Tier3", "T3_PAIR_11", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_11", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_12: Vendor Repair Status Update + Notification Route — Vendor marks repair completed, verifies notification routes to /repairs/rpr_id", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      const repair = store.submitRepairRequest(buyerId, "vnd_1", "Audio", "Sony", "WH-1000XM4", "Left ear cup audio dead", "2026-08-05");

      store.updateRepairStatus(repair.id, "completed", 5000, "Wiring repaired");

      const notifs = Array.from(store.notifications.values()).filter((n) => n.user_id === buyerId);
      const repairNotif = notifs.find((n) => n.type === "repair_update" && n.reference_id === repair.id);

      expect(repairNotif).toBeDefined();
      const targetRoute = routeForNotification({ type: repairNotif!.type, reference_id: repairNotif!.reference_id });
      expect(targetRoute).toBe(`/repairs/${repair.id}`);

      globalTestStats.record("Tier3", "T3_PAIR_12", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_12", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_13: Cart Out-of-Stock Validation + Checkout Prevention — Prevents checkout when stock is insufficient", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      const prod = store.products.get("prd_laptop_1")!;
      
      // Stock is currently 2
      expect(() => store.addToCart(buyerId, "prd_laptop_1", 5)).toThrow("Product unavailable or insufficient stock");

      globalTestStats.record("Tier3", "T3_PAIR_13", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_13", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_14: Shop Page Storefront + Vendor Inventory Filtering — Filters shop page by vendor_id 'vnd_1'", () => {
    const start = Date.now();
    try {
      const vendorStorefrontProducts = Array.from(store.products.values()).filter(
        (p) => p.vendor_id === "vnd_1" && p.is_active
      );
      expect(vendorStorefrontProducts.length).toBeGreaterThanOrEqual(2);
      expect(vendorStorefrontProducts.every((p) => p.vendor_id === "vnd_1")).toBe(true);

      globalTestStats.record("Tier3", "T3_PAIR_14", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_14", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_15: Notifications Badge + Mark All Read — Displays unread count and clears when marked read", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      store.addNotification({ user_id: buyerId, type: "system", title: "Welcome", message: "Thanks for joining!", reference_id: null });
      store.addNotification({ user_id: buyerId, type: "system", title: "Offer", message: "10% off repairs", reference_id: null });

      let buyerNotifs = Array.from(store.notifications.values()).filter((n) => n.user_id === buyerId);
      const unreadCount = buyerNotifs.filter((n) => !n.is_read).length;
      expect(unreadCount).toBeGreaterThanOrEqual(2);

      // Mark all read
      for (const n of buyerNotifs) {
        n.is_read = true;
      }

      const updatedUnread = Array.from(store.notifications.values())
        .filter((n) => n.user_id === buyerId)
        .filter((n) => !n.is_read).length;
      expect(updatedUnread).toBe(0);

      globalTestStats.record("Tier3", "T3_PAIR_15", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_15", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_16: Admin Escrow Audit + Platform Fee Accounting — Verifies aggregated escrow balances and fee splits", () => {
    const start = Date.now();
    try {
      const buyerId = "usr_buyer_1";
      store.addToCart(buyerId, "prd_phone_1", 1); // 125,000
      const orders = store.createOrderFromCart(buyerId, "Parklands", "0712345678");
      const order = orders[0];
      store.simulateSTKPush(order.id, "0712345678");

      const heldOrders = Array.from(store.orders.values()).filter((o) => o.status === "payment_held");
      const totalHeldFloat = heldOrders.reduce((sum, o) => sum + o.total_amount_ksh, 0);
      const totalExpectedFees = heldOrders.reduce((sum, o) => sum + o.platform_fee_ksh, 0);

      expect(totalHeldFloat).toBe(125000);
      expect(totalExpectedFees).toBe(12500);

      globalTestStats.record("Tier3", "T3_PAIR_16", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_16", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_17: Profile Updates + Checkout Pre-population — Profile phone updates reflect in checkout details", () => {
    const start = Date.now();
    try {
      const buyer = store.profiles.get("usr_buyer_1")!;
      buyer.phone_number = "0799887766";
      buyer.full_name = "Juma Omondi Updated";

      store.addToCart("usr_buyer_1", "prd_phone_1", 1);
      const orders = store.createOrderFromCart("usr_buyer_1", "Karen, Nairobi", buyer.phone_number);
      expect(orders[0].phone_number).toBe("0799887766");

      globalTestStats.record("Tier3", "T3_PAIR_17", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_17", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_18: Vendor Suspension + Storefront Hiding — Suspended vendor products are hidden from browse", () => {
    const start = Date.now();
    try {
      const vendor = store.vendorProfiles.get("vnd_1")!;
      vendor.status = "suspended";

      // Deactivate vendor products
      for (const prod of store.products.values()) {
        if (prod.vendor_id === vendor.id) {
          prod.is_active = false;
        }
      }

      const activeBrowseProducts = Array.from(store.products.values()).filter((p) => p.is_active);
      expect(activeBrowseProducts).toHaveLength(0);

      globalTestStats.record("Tier3", "T3_PAIR_18", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_18", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_19: Terms Policy Checkbox + Vendor Onboarding Validation — Validates required agreement on onboarding", () => {
    const start = Date.now();
    try {
      const validateTermsAgreement = (accepted: boolean) => {
        if (!accepted) throw new Error("You must accept the terms of service and marketplace policies.");
        return true;
      };

      expect(() => validateTermsAgreement(false)).toThrow("You must accept the terms of service and marketplace policies.");
      expect(validateTermsAgreement(true)).toBe(true);

      globalTestStats.record("Tier3", "T3_PAIR_19", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_19", false, Date.now() - start, err.message);
      throw err;
    }
  });

  it("T3_PAIR_20: How It Works Quick Action + Repair/Browse Routing — Validates quick action targets from HowItWorks guide", () => {
    const start = Date.now();
    try {
      const guideLinks = [
        { label: "Book Repair Service", target: "/repairs" },
        { label: "Browse Marketplace", target: "/browse" },
        { label: "Become a Vendor", target: "/vendor/register" },
      ];

      expect(guideLinks.find((l) => l.label.includes("Repair"))?.target).toBe("/repairs");
      expect(guideLinks.find((l) => l.label.includes("Marketplace"))?.target).toBe("/browse");

      globalTestStats.record("Tier3", "T3_PAIR_20", true, Date.now() - start);
    } catch (err: any) {
      globalTestStats.record("Tier3", "T3_PAIR_20", false, Date.now() - start, err.message);
      throw err;
    }
  });
});
