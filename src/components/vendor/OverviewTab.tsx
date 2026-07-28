import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh } from "@/lib/format";
import { Package, ShoppingCart, Wrench, Wallet, Star, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Props {
  vendor: any;
}

export const OverviewTab = ({ vendor }: Props) => {
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Active products" value={stats.activeProducts.toString()} />
        <StatCard icon={ShoppingCart} label="Pending orders" value={stats.pendingOrders.toString()} />
        <StatCard icon={Wrench} label="Active repairs" value={stats.activeRepairs.toString()} />
        <StatCard icon={Star} label="Avg rating" value={Number(stats.avgRating).toFixed(1)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" /> Float held
          </div>
          <div className="text-2xl font-bold text-warning">{formatKsh(stats.floatHeld)}</div>
          <p className="text-xs text-muted-foreground mt-1">Released after customer confirms delivery (max 48h).</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" /> Float released (lifetime)
          </div>
          <div className="text-2xl font-bold text-success">{formatKsh(stats.floatReleased)}</div>
          <p className="text-xs text-muted-foreground mt-1">Paid out to your M-Pesa.</p>
        </Card>
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

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Recent orders</h3>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="divide-y">
            {recentOrders.map((o) => (
              <li key={o.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{o.product?.brand} {o.product?.model_name}</div>
                  <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()} · Qty {o.quantity}</div>
                </div>
                <div className="text-right">
                  <div>{formatKsh(Number(o.total_amount_ksh))}</div>
                  <div className="text-xs text-muted-foreground capitalize">{o.status.replace(/_/g, " ")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <div className="text-2xl font-bold">{value}</div>
  </Card>
);
