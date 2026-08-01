import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const AnalyticsTab = ({ vendor }: { vendor: any }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount_ksh, vendor_payout_ksh, status, created_at, product_id, product:products(brand, model_name)")
        .eq("vendor_id", vendor.id)
        .gte("created_at", since.toISOString());

      const list = orders ?? [];
      const completed = list.filter((o) => o.status === "confirmed");
      const revenue = completed.reduce((s, o) => s + Number(o.vendor_payout_ksh), 0);
      const gmv = list.reduce((s, o) => s + Number(o.total_amount_ksh), 0);
      const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};
      completed.forEach((o) => {
        const key = o.product_id;
        const name = `${o.product?.brand ?? ""} ${o.product?.model_name ?? ""}`.trim() || "Unknown";
        productCounts[key] = productCounts[key] || { name, count: 0, revenue: 0 };
        productCounts[key].count += 1;
        productCounts[key].revenue += Number(o.vendor_payout_ksh);
      });
      const topProducts = Object.values(productCounts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      setData({
        totalOrders: list.length,
        completedOrders: completed.length,
        gmv,
        revenue,
        avgOrder: completed.length ? revenue / completed.length : 0,
        topProducts,
      });
      setLoading(false);
    })();
  }, [vendor.id]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Analytics (last 30 days)</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Orders</div><div className="text-2xl font-bold text-stat">{data.totalOrders}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-bold text-stat">{data.completedOrders}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Revenue (payout)</div><div className="text-xl font-bold"><span className="text-price">{formatKsh(data.revenue)}</span></div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Avg order</div><div className="text-xl font-bold"><span className="text-price">{formatKsh(Math.round(data.avgOrder))}</span></div></Card>
      </div>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Top products</h3>
        {data.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed sales in this period.</p>
        ) : (
          <ul className="divide-y">
            {data.topProducts.map((p: any, i: number) => (
              <li key={i} className="py-2 flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-muted-foreground"><span className="text-stat">{p.count}</span> sold · <span className="text-price">{formatKsh(p.revenue)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
