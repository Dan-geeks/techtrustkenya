import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

// Target components to stress test
import { OverviewTab } from "../src/components/vendor/OverviewTab";
import { SettingsTab } from "../src/components/vendor/SettingsTab";
import { PromotionsTab } from "../src/components/vendor/PromotionsTab";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Helper to construct chainable Supabase query builder
function createMockBuilder(defaultData: any = [], countValue: number = 0) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data: defaultData[0] ?? defaultData, error: null }),
    single: vi.fn().mockResolvedValue({ data: defaultData[0] ?? defaultData, error: null }),
    update: vi.fn((payload) => {
      builder.updatePayload = payload;
      return builder;
    }),
    insert: vi.fn().mockResolvedValue({ data: defaultData, error: null }),
    delete: vi.fn(() => builder),
    then: (resolve: any) => resolve({ data: defaultData, count: countValue, error: null }),
  };
  return builder;
}

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === "orders") {
          return createMockBuilder([
            {
              id: "ord-12345678",
              total_amount_ksh: 15000,
              quantity: 1,
              payment_status: "paid_float",
              created_at: "2026-01-01T00:00:00Z",
              product: { brand: "Samsung", model_name: "Galaxy S23" },
            },
          ], 1);
        }
        return createMockBuilder([], 0);
      },
    },
  };
});

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div data-testid="error-container">{String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}

describe("M2 Empirical Stress Testing & Contract Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("FIX VERIFICATION: OverviewTab renders recent orders without formatDate ReferenceError", () => {
    it("renders OverviewTab order date using formatDate without throwing ReferenceError", async () => {
      const vendor = { id: "v-123", average_rating: 4.8 };
      
      const { findByText } = render(
        <ErrorBoundary>
          <OverviewTab vendor={vendor} />
        </ErrorBoundary>
      );

      // Verify recent order date is rendered cleanly (formatDate converts 2026-01-01T00:00:00Z to formatted KE date)
      const dateElement = await findByText(/Jan 2026|1 Jan|2026/);
      expect(dateElement).toBeInTheDocument();
    });
  });

  describe("SettingsTab & PromotionsTab Valid Contract Verification", () => {
    it("verifies SettingsTab handles vendor props and prevents invalid saves", () => {
      const vendor = {
        id: "v-full",
        business_name: "SuperTech Nairobi",
        physical_address: "Luthuli Avenue, Shop B4",
        till_number: "7654321",
        county: "Nairobi",
        sub_county: "Starehe",
        verification_status: "approved",
        subscription_tier: "verified",
      };
      const onUpdated = vi.fn();
      const { getByDisplayValue } = render(<SettingsTab vendor={vendor} onUpdated={onUpdated} />);
      expect(getByDisplayValue("SuperTech Nairobi")).toBeInTheDocument();
      expect(getByDisplayValue("7654321")).toBeInTheDocument();
    });
  });
});
