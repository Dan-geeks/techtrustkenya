import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, formatDate } from "@/lib/format";
import { Package, ShoppingCart, Wrench, Wallet, Star, AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Props {
  vendor: any;
  onSelectTab?: (tab: string) => void;
}

export const OverviewTab = ({ vendor, onSelectTab }: Props) => {
  const [stats, setStats] = useState({
    activeProducts: 0,
    pendingOrders: 0,
    activeRepairs: 0,
    floatHeld: 0,
    floatReleased: 0,
    avgRating: vendor.average_rating ?? 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [products, orders, repairs] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).eq("is_active", true),
        supabase.from("orders").select("id, status, payment_status, total_amount_ksh, vendor_payout_ksh, created_at, quantity, product:products(brand, model_name)").eq("vendor_id", vendor.id).order("created_at", { ascending: false }),
        supabase.from("repair_requests").select("id, status").eq("vendor_id", vendor.id),
      ]);

      const allOrders = orders.data ?? [];
      const pending = allOrders.filter((o) => ["payment_held", "vendor_preparing", "out_for_delivery", "ready_for_pickup", "delivered_awaiting_confirmation"].includes(o.status));
      const floatHeld = allOrders.filter((o) => o.payment_status === "paid_float").reduce((s, o) => s + Number(o.vendor_payout_ksh), 0);
      const floatReleased = allOrders.filter((o) => o.payment_status === "released").reduce((s, o) => s + Number(o.vendor_payout_ksh), 0);
      const activeRepairs = (repairs.data ?? []).filter((r) => !["completed", "cancelled"].includes(r.status)).length;

      setStats({
        activeProducts: products.count ?? 0,
        pendingOrders: pending.length,
        activeRepairs,
        floatHeld,
        floatReleased,
        avgRating: vendor.average_rating ?? 0,
      });
      setRecentOrders(allOrders.slice(0, 5));

      const actions: any[] = [];
      allOrders
        .filter((o) => o.status === "payment_held")
        .forEach((o) => actions.push({ kind: "prepare", id: o.id, label: `Prepare order for ${o.product?.brand} ${o.product?.model_name}` }));
      (repairs.data ?? [])
        .filter((r) => r.status === "submitted")
        .forEach((r) => actions.push({ kind: "repair", id: r.id, label: `New repair request awaiting response` }));
      setActionItems(actions.slice(0, 5));
      setLoading(false);
    })();
  }, [vendor]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Stats grid, per the Vendor Center mockup: label + icon tile, mono
          figure, one supporting line. Float funds get the blue accent rail. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Float released (lifetime)"
          value={formatKsh(stats.floatReleased)}
          note="Paid out to your M-Pesa."
          isPrice
        />
        <StatCard
          icon={ShoppingCart}
          label="Active orders"
          value={stats.pendingOrders.toString()}
          note={`${stats.activeProducts} products listed`}
        />
        <StatCard
          icon={Lock}
          label="Pending Float funds"
          value={formatKsh(stats.floatHeld)}
          note="Secured in Float"
          highlight
          isPrice
        />
        <StatCard
          icon={Star}
          label="Seller rating"
          value={`${Number(stats.avgRating).toFixed(1)}/5.0`}
          note={`${stats.activeRepairs} active repairs`}
        />
      </div>

      {actionItems.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Action items
          </h3>
          <ul className="space-y-2">
            {actionItems.map((a, i) => (
              <li key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <span>{a.label}</span>
                <Badge variant="outline" className="capitalize">{a.kind}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h3 className="font-semibold">Recent orders</h3>
          <button
            type="button"
            onClick={() => onSelectTab?.("orders")}
            className="text-sm font-medium text-accent hover:underline bg-transparent border-0 p-0 cursor-pointer"
          >
            View all orders
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <p className="px-5 pb-8 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-border bg-secondary text-eyebrow text-muted-foreground">
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Float status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-secondary/50">
                    <td className="px-5 py-3 text-data-id text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-3 font-medium">
                      {o.product?.brand} {o.product?.model_name}
                      <span className="ml-1 text-xs text-muted-foreground">×{o.quantity}</span>
                    </td>
                    <td className="px-5 py-3 text-right"><span className="text-price">{formatKsh(Number(o.total_amount_ksh))}</span></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(o.created_at)}</td>
                    <td className="px-5 py-3"><FloatStatusPill paymentStatus={o.payment_status} /></td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectTab?.("orders")}
                        className="text-sm font-medium text-accent hover:underline bg-transparent border-0 p-0 cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

const FloatStatusPill = ({ paymentStatus }: { paymentStatus: string }) => {
  if (paymentStatus === "released") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
        <ShieldCheck className="h-3 w-3" /> Released
      </span>
    );
  }
  if (paymentStatus === "paid_float") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-float">
        <Lock className="h-3 w-3" /> Held
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
      {String(paymentStatus ?? "—").replace(/_/g, " ")}
    </span>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  note,
  highlight,
  isPrice = false,
}: {
  icon: any;
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
  isPrice?: boolean;
}) => (
  <Card className={`p-5 ${highlight ? "border-l-4 border-l-float" : ""}`}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className={`${isPrice ? "text-price" : "text-stat"} text-xl font-bold text-foreground`}>{value}</div>
    {note && (
      <p className={`mt-1 text-xs ${highlight ? "font-medium text-float" : "text-muted-foreground"}`}>{note}</p>
    )}
  </Card>
);
