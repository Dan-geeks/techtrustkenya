import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { SettingsTab } from "../components/vendor/SettingsTab";

// The tab only needs Supabase for saving; rendering must not hit the network.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
    }),
  },
}));

/**
 * Client feedback item 8: "In the vendor dashboard under settings, can we let
 * the vendor update the payment method just the same way we did during
 * registration. i.e. if one wants to change from send money to Buy goods or
 * paybill we can let them do."
 *
 * Settings previously had ONE free-text box labelled "M-Pesa Till / Paybill
 * Number (Payouts)" holding the raw stored string, so switching method meant
 * reproducing onboarding's format ("Paybill: 247247 | Acc: 12") by hand.
 *
 * These assertions are the proof that the picker exists and works, rather than
 * grepping the built bundle for strings.
 */
const renderTab = (vendor: any) =>
  render(
    <MemoryRouter>
      <SettingsTab vendor={vendor} />
    </MemoryRouter>,
  );

const baseVendor = {
  id: "v1",
  business_name: "TechHub Kenya",
  owner_name: "Megwe Mwangi",
  phone: "0768621411",
  physical_address: "Luthuli Avenue",
  offers_products: true,
  offers_repairs: false,
};

describe("Vendor settings - payout method (client feedback item 8)", () => {
  it("shows the payout method picker, not the old single free-text field", () => {
    renderTab({ ...baseVendor, till_number: "Till: 123456" });

    expect(screen.getByText("How you receive payouts")).toBeInTheDocument();
    // The label that used to be the only control.
    expect(screen.queryByText("M-Pesa Till / Paybill Number (Payouts)")).not.toBeInTheDocument();
  });

  it("reads back an existing Till (Buy Goods) payout", () => {
    renderTab({ ...baseVendor, till_number: "Till: 123456" });
    expect(screen.getByText("M-Pesa Till (Buy Goods)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123456")).toBeInTheDocument();
  });

  it("reads back an existing Paybill payout into its two separate fields", () => {
    renderTab({ ...baseVendor, till_number: "Paybill: 247247 | Acc: TT-99" });
    expect(screen.getByText("M-Pesa Paybill")).toBeInTheDocument();
    expect(screen.getByDisplayValue("247247")).toBeInTheDocument();
    expect(screen.getByDisplayValue("TT-99")).toBeInTheDocument();
  });

  it("reads back an existing Send Money payout", () => {
    renderTab({ ...baseVendor, till_number: "M-Pesa Phone: 0712345678" });
    expect(screen.getByText("M-Pesa Phone (Send Money)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0712345678")).toBeInTheDocument();
  });

  it("treats a bare legacy number as a till rather than losing it", () => {
    // Rows written before the formatted string existed hold just the digits.
    renderTab({ ...baseVendor, till_number: "890123" });
    expect(screen.getByText("M-Pesa Till (Buy Goods)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("890123")).toBeInTheDocument();
  });

  it("does not prefill sample business details over the vendor's own", () => {
    // Settings used to default to "TechTrust Vendor", till 890123 and an
    // address on Kimathi Street, so opening it and pressing Save overwrote the
    // vendor's real details with someone else's.
    renderTab({ ...baseVendor, business_name: "", physical_address: "", till_number: null });
    expect(screen.queryByDisplayValue("TechTrust Vendor")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Store Manager")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("890123")).not.toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("Kimathi Street, Eagle House, 2nd Floor, Room 204"),
    ).not.toBeInTheDocument();
  });

  it("offers every method the client asked for, in one control", () => {
    renderTab({ ...baseVendor, till_number: "Till: 123456" });

    // The page has several selects (county, sub-county); this is the payout one,
    // identified by the value it is currently displaying.
    const trigger = screen.getByText("M-Pesa Till (Buy Goods)").closest("button");
    expect(trigger).not.toBeNull();

    // Radix only mounts options once the trigger is opened. jsdom lacks the
    // pointer-capture APIs Radix uses, so drive it by keyboard instead.
    fireEvent.keyDown(trigger!, { key: "Enter" });

    for (const method of [
      "M-Pesa Till (Buy Goods)",
      "M-Pesa Paybill",
      "M-Pesa Phone (Send Money)",
      "Bank Account",
    ]) {
      expect(screen.getAllByText(method).length).toBeGreaterThan(0);
    }
  });
});
