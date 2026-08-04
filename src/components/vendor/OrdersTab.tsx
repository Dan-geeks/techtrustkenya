import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

const STATUSES = ["payment_held", "vendor_preparing", "out_for_delivery", "ready_for_pickup", "delivered_awaiting_confirmation"];

export const OrdersTab = ({ vendor }: { vendor: any }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, product:products(brand, model_name, image_urls)")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false });
    const list = data ?? [];
    const customerIds = Array.from(new Set(list.map((o: any) => o.customer_id)));
    const profilesMap: Record<string, any> = {};
    if (customerIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone_number").in("id", customerIds);
      (profs ?? []).forEach((p: any) => { profilesMap[p.id] = p; });
    }
    setOrders(list.map((o: any) => ({ ...o, customer: profilesMap[o.customer_id] ?? null })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [vendor.id]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Order updated");
      load();
    }
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Orders</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="payment_held">Float held (new)</SelectItem>
            <SelectItem value="vendor_preparing">Preparing</SelectItem>
            <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
            <SelectItem value="ready_for_pickup">Ready for pickup</SelectItem>
            <SelectItem value="delivered_awaiting_confirmation">Awaiting confirmation</SelectItem>
            <SelectItem value="confirmed">Completed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No orders match this filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Card
              key={o.id}
              // The whole card opens the tracker. Buttons inside stopPropagation
              // so acting on an order doesn't also navigate away from it.
              onClick={() => navigate(`/orders/${o.id}`)}
              className="p-4 cursor-pointer transition-colors hover:bg-muted/40"
            >
              <div className="flex gap-4">
                <img src={o.product?.image_urls?.[0] ?? "/placeholder.svg"} alt="" className="w-16 h-16 rounded object-cover bg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate hover:underline">{o.product?.brand} {o.product?.model_name}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-data-id">#{o.id.slice(0, 8).toUpperCase()}</span> · Qty <span className="text-stat">{o.quantity}</span> · {formatDate(o.created_at)}
                      </div>
                      <div className="text-xs mt-1">
                        Customer: {o.customer?.full_name ?? "-"} · {o.customer?.phone_number ?? "-"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold"><span className="text-price">{formatKsh(Number(o.total_amount_ksh))}</span></div>
                      <div className="text-xs text-muted-foreground">Payout <span className="text-price">{formatKsh(Number(o.vendor_payout_ksh))}</span></div>
                      <Badge variant="outline" className="mt-1 capitalize text-xs">{o.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                  {STATUSES.includes(o.status) && o.status !== "delivered_awaiting_confirmation" && (
                    <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      {o.status === "payment_held" && (
                        <Button size="sm" onClick={() => updateStatus(o.id, "vendor_preparing")}>Confirm Order</Button>
                      )}
                      {o.status === "vendor_preparing" && (
                        <>
                          <Button size="sm" onClick={() => updateStatus(o.id, "out_for_delivery")}>Out for delivery</Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, "ready_for_pickup")}>Ready for pickup</Button>
                        </>
                      )}
                      {(o.status === "out_for_delivery" || o.status === "ready_for_pickup") && (
                        <Button size="sm" onClick={() => updateStatus(o.id, "delivered_awaiting_confirmation")}>Mark delivered</Button>
                      )}
                    </div>
                  )}
                  {o.status === "disputed" && o.dispute_reason && (
                    <div className="mt-2 text-xs p-2 bg-destructive/10 text-destructive rounded">
                      Dispute: {o.dispute_reason}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
