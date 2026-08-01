import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKsh, formatDate } from "@/lib/format";
import { ShoppingBag, ChevronRight } from "lucide-react";

type StatusFilter = "all" | "pending" | "held" | "completed" | "cancelled" | "disputed";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "held", label: "Held" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "disputed", label: "Disputed" },
];

const STATUS_GROUPS: Record<StatusFilter, string[]> = {
  all: [],
  pending: ["pending_payment", "vendor_preparing", "out_for_delivery", "ready_for_pickup", "delivered_awaiting_confirmation"],
  held: ["payment_held"],
  completed: ["confirmed", "refunded"],
  cancelled: ["cancelled"],
  disputed: ["disputed"],
};

const statusVariant = (s: string): { label: string; cls: string } => {
  const map: Record<string, { label: string; cls: string }> = {
    pending_payment: { label: "Awaiting payment", cls: "bg-muted text-muted-foreground" },
    payment_held: { label: "Float held", cls: "bg-warning/10 text-warning border-warning/30" },
    vendor_preparing: { label: "Preparing", cls: "bg-warning/10 text-warning border-warning/30" },
    out_for_delivery: { label: "Out for delivery", cls: "bg-accent/10 text-accent border-accent/30" },
    ready_for_pickup: { label: "Ready for pickup", cls: "bg-accent/10 text-accent border-accent/30" },
    delivered_awaiting_confirmation: { label: "Confirm receipt", cls: "bg-warning/10 text-warning border-warning/30" },
    confirmed: { label: "Completed", cls: "bg-success/10 text-success border-success/30" },
    disputed: { label: "Disputed", cls: "bg-destructive/10 text-destructive border-destructive/30" },
    cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground" },
    refunded: { label: "Refunded", cls: "bg-muted text-muted-foreground" },
  };
  return map[s] ?? { label: s, cls: "bg-muted text-muted-foreground" };
};

const groupByMonth = (orders: any[]): { month: string; items: any[] }[] => {
  const groups: Record<string, any[]> = {};
  for (const o of orders) {
    const label = new Date(o.created_at).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(o);
  }
  return Object.entries(groups).map(([month, items]) => ({ month, items }));
};

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    document.title = "My Orders | TechTrust";
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id, status, payment_status, total_amount_ksh, quantity, created_at, product:products(brand, model_name, image_urls), vendor:vendor_profiles(business_name)"
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const filtered =
    filter === "all"
      ? orders
      : orders.filter((o) => STATUS_GROUPS[filter].includes(o.status));

  const groups = groupByMonth(filtered);

  if (loading)
    return <div className="container py-20 text-center text-muted-foreground">Loading orders…</div>;

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-semibold mb-1">No orders yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Browse the marketplace to find your next device.
          </p>
          <Button asChild variant="default">
            <Link to="/browse">Start Shopping</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map(({ month, items }) => (
            <div key={month}>
              <h2 className="text-eyebrow text-muted-foreground mb-3">
                {month}
              </h2>
              <div className="space-y-3">
                {items.map((o) => {
                  const sv = statusVariant(o.status);
                  return (
                    <Link key={o.id} to={`/orders/${o.id}`} className="block">
                      <Card className="p-4 hover:shadow-card transition-smooth">
                        <div className="flex gap-3 items-center">
                          <img
                            src={o.product?.image_urls?.[0] ?? "/placeholder.svg"}
                            alt={o.product?.model_name}
                            className="w-10 h-10 rounded-md object-cover bg-muted shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {o.product?.brand} {o.product?.model_name}
                              </span>
                              <span className="text-data-id text-muted-foreground shrink-0">
                                #{o.id.slice(0, 8).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                              <span>{o.vendor?.business_name}</span>
                              <span>·</span>
                              <span>Qty <span className="text-stat">{o.quantity}</span></span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <div className="text-xs text-muted-foreground">{formatDate(o.created_at)}</div>
                            <div className="font-semibold text-sm"><span className="text-price">{formatKsh(Number(o.total_amount_ksh))}</span></div>
                            <Badge className={`${sv.cls} text-[10px] px-2 py-0`} variant="outline">
                              {sv.label}
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
