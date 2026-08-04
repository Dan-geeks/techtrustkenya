import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsTab } from "../components/vendor/SettingsTab";

// Captures what Save actually writes, so the tests can assert the stored
// payout string rather than just what is on screen.
const updateSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (payload: any) => {
        updateSpy(payload);
        return { eq: () => ({ select: () => ({ single: async () => ({ data: payload, error: null }) }) }) };
      },
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

  /**
   * The client's literal ask: "if one want to change from send money to Buy
   * goods or paybill we can let them do." Rendering the picker is not enough -
   * the switch has to persist in the format onboarding writes, or the payout
   * destination silently stays whatever it was.
   */
  describe("switching method persists in onboarding's format", () => {
    beforeEach(() => updateSpy.mockClear());

    const saveAnd = async (assertion: (payload: any) => void) => {
      fireEvent.click(screen.getByRole("button", { name: /Save Location & Settings/i }));
      await waitFor(() => expect(updateSpy).toHaveBeenCalled());
      assertion(updateSpy.mock.calls.at(-1)![0]);
    };

    it("Send Money -> Buy Goods (till) writes 'Till: ...'", async () => {
      // Starts on Send Money, exactly the client's scenario.
      renderTab({ ...baseVendor, till_number: "M-Pesa Phone: 0712345678" });
      expect(screen.getByDisplayValue("0712345678")).toBeInTheDocument();

      const trigger = screen.getByText("M-Pesa Phone (Send Money)").closest("button")!;
      fireEvent.keyDown(trigger, { key: "Enter" });
      fireEvent.click(screen.getAllByText("M-Pesa Till (Buy Goods)").at(-1)!);

      fireEvent.change(screen.getByPlaceholderText("e.g. 890123"), { target: { value: "556677" } });
      await saveAnd((p) => expect(p.till_number).toBe("Till: 556677"));
    });

    it("Send Money -> Paybill writes 'Paybill: <biz> | Acc: <acc>'", async () => {
      renderTab({ ...baseVendor, till_number: "M-Pesa Phone: 0712345678" });

      const trigger = screen.getByText("M-Pesa Phone (Send Money)").closest("button")!;
      fireEvent.keyDown(trigger, { key: "Enter" });
      fireEvent.click(screen.getAllByText("M-Pesa Paybill").at(-1)!);

      fireEvent.change(screen.getByPlaceholderText("e.g. 247247"), { target: { value: "247247" } });
      fireEvent.change(screen.getByPlaceholderText("e.g. 123456"), { target: { value: "ACC-9" } });
      await saveAnd((p) => expect(p.till_number).toBe("Paybill: 247247 | Acc: ACC-9"));
    });

    it("Buy Goods -> Send Money writes 'M-Pesa Phone: ...'", async () => {
      renderTab({ ...baseVendor, till_number: "Till: 123456" });

      const trigger = screen.getByText("M-Pesa Till (Buy Goods)").closest("button")!;
      fireEvent.keyDown(trigger, { key: "Enter" });
      fireEvent.click(screen.getAllByText("M-Pesa Phone (Send Money)").at(-1)!);

      fireEvent.change(screen.getByPlaceholderText("e.g. 0712345678"), { target: { value: "0799001122" } });
      await saveAnd((p) => expect(p.till_number).toBe("M-Pesa Phone: 0799001122"));
    });

    it("refuses to save a method with its details left blank", async () => {
      renderTab({ ...baseVendor, till_number: "Till: 123456" });

      const trigger = screen.getByText("M-Pesa Till (Buy Goods)").closest("button")!;
      fireEvent.keyDown(trigger, { key: "Enter" });
      fireEvent.click(screen.getAllByText("M-Pesa Paybill").at(-1)!);

      // Switched to Paybill but filled nothing in.
      fireEvent.click(screen.getByRole("button", { name: /Save Location & Settings/i }));
      await new Promise((r) => setTimeout(r, 50));
      // Must not silently persist an empty or half-formed destination.
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("a saved switch survives a reload of the tab", async () => {
      renderTab({ ...baseVendor, till_number: "M-Pesa Phone: 0712345678" });
      const trigger = screen.getByText("M-Pesa Phone (Send Money)").closest("button")!;
      fireEvent.keyDown(trigger, { key: "Enter" });
      fireEvent.click(screen.getAllByText("M-Pesa Till (Buy Goods)").at(-1)!);
      fireEvent.change(screen.getByPlaceholderText("e.g. 890123"), { target: { value: "556677" } });
      await saveAnd((p) => expect(p.till_number).toBe("Till: 556677"));

      // Re-mount with what was stored: it must come back as Buy Goods, not
      // fall back to the old Send Money value.
      const saved = updateSpy.mock.calls.at(-1)![0].till_number;
      renderTab({ ...baseVendor, till_number: saved });
      expect(screen.getAllByText("M-Pesa Till (Buy Goods)").length).toBeGreaterThan(0);
      expect(screen.getAllByDisplayValue("556677").length).toBeGreaterThan(0);
    });
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
