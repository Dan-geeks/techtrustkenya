export const formatKsh = (amount: number): string => {
  return `KSH ${amount.toLocaleString("en-KE")}`;
};

export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Where a notification should take you when tapped.
 *
 * `roles` matters for vendor_application: those go to a dashboard, and an admin
 * reviewing a technician application does not hold the `vendor` role - sending
 * them to /vendor/dashboard bounced them to the home page via ProtectedRoute.
 * Pass the viewer's roles so each side lands somewhere they can actually open.
 */
export const routeForNotification = (
  n: { type: string; reference_id: string | null },
  roles: string[] = [],
): string | null => {
  switch (n.type) {
    case "repair_update":
      return n.reference_id ? `/repairs/${n.reference_id}` : "/repairs";
    case "order_update":
    case "escrow_release":
    case "dispute_opened":
    case "payment":
    case "review_request":
    case "dispute":
      return n.reference_id ? `/orders/${n.reference_id}` : null;
    case "vendor_application":
      // Admins get the review queue; vendors get their own dashboard.
      if (roles.includes("admin") && !roles.includes("vendor")) return "/admin/dashboard";
      return "/vendor/dashboard";
    default:
      return null;
  }
};

/**
 * vendor_verification_status carries two synonyms for the same state:
 * "verified" (5 vendors) and "approved" (6 vendors). Pages that checked only
 * one of them showed "Verified Partner" incorrectly for roughly half the
 * marketplace, in both directions. Always go through this helper.
 */
export const isVendorVerified = (status?: string | null) =>
  status === "verified" || status === "approved";
