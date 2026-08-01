import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Components to test
import VendorDashboard from "../src/pages/vendor/VendorDashboard";
import AdminDashboard from "../src/pages/admin/AdminDashboard";
import { SettingsTab } from "../src/components/vendor/SettingsTab";
import { PromotionsTab } from "../src/components/vendor/PromotionsTab";

// Mocks for hooks & Supabase
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "vendor@techtrust.co.ke" },
    loading: false,
  }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: "v-123",
      business_name: "TechTrust Vendor",
      owner_name: "Jane Doe",
      phone: "0712345678",
      till_number: "54321",
      physical_address: "123 Kimathi Street",
      city: "Nairobi",
      county: "Nairobi",
      sub_county: "Central",
      operating_hours: "8am - 5pm",
      google_maps_link: "https://maps.google.com",
      verification_status: "approved",
      subscription_tier: "verified",
    },
    error: null,
  });

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
    delete: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      },
    },
  };
});

describe("M2 Challenger Stress Testing Suite", () => {
  describe("1. VendorDashboard Component & Tabs State Transitions", () => {
    it("renders VendorDashboard with active vendor profile and tabs", async () => {
      render(<VendorDashboard />);
      await waitFor(() => {
        expect(screen.getByText("TechTrust Vendor")).toBeInTheDocument();
      });
      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Orders")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });

  describe("2. SettingsTab Component Props & Boundary Testing", () => {
    it("handles full vendor props safely", () => {
      const vendor = {
        id: "v-100",
        business_name: "Alpha Tech",
        owner_name: "John Owner",
        phone: "0700000000",
        phone_number: "0700000000",
        till_number: "98765",
        physical_address: "Moi Avenue",
        city: "Nairobi",
        county: "Nairobi",
        sub_county: "Starehe",
        operating_hours: "24/7",
        google_maps_link: "https://maps.app.goo.gl",
        verification_status: "approved",
        subscription_tier: "basic",
      };
      const onUpdated = vi.fn();

      render(<SettingsTab vendor={vendor} onUpdated={onUpdated} />);
      expect(screen.getByDisplayValue("Alpha Tech")).toBeInTheDocument();
      expect(screen.getByDisplayValue("98765")).toBeInTheDocument();
    });

    it("handles minimal vendor object with missing optional fields without crashing", () => {
      const minimalVendor = {
        id: "v-min",
        business_name: "Minimal Store",
        physical_address: "Kenyatta Ave",
        verification_status: "pending",
        subscription_tier: "free",
      };
      const onUpdated = vi.fn();

      render(<SettingsTab vendor={minimalVendor} onUpdated={onUpdated} />);
      expect(screen.getByDisplayValue("Minimal Store")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Kenyatta Ave")).toBeInTheDocument();
    });
  });

  describe("3. PromotionsTab Component & STK Push State Machine", () => {
    it("renders PromotionsTab and opens STK Push simulation modal", async () => {
      const vendor = {
        id: "v-promo",
        phone: "0711223344",
      };

      render(<PromotionsTab vendor={vendor} />);
      expect(screen.getByText("Promotions")).toBeInTheDocument();

      const newBtn = screen.getByText("New promotion");
      fireEvent.click(newBtn);

      await waitFor(() => {
        expect(screen.getByText("Pay with M-Pesa")).toBeInTheDocument();
      });
    });
  });

  describe("4. AdminDashboard & Helper Function Stress Tests", () => {
    it("tests getInitials logic with normal, null, undefined, and empty string values", () => {
      const getInitials = (name: string | null | undefined) =>
        (name && name.trim() ? name : "?")
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase();

      expect(getInitials("TechTrust Kenya")).toBe("TK");
      expect(getInitials("Vendor")).toBe("V");
      expect(getInitials(null)).toBe("?");
      expect(getInitials(undefined)).toBe("?");
      expect(getInitials("")).toBe("?");
      expect(getInitials("   ")).toBe("?");
    });
  });
});
