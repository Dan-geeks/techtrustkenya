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

export const routeForNotification = (n: {
  type: string;
  reference_id: string | null;
}): string | null => {
  if (!n.reference_id) return null;
  switch (n.type) {
    case "order_update":
    case "payment":
    case "review_request":
    case "dispute":
      return `/orders/${n.reference_id}`;
    case "repair_update":
      return `/repairs/${n.reference_id}`;
    case "vendor_application":
      return `/vendor/dashboard`;
    default:
      return null;
  }
};
