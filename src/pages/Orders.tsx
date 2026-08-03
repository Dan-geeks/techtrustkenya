import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, CheckCircle, Package, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Order History - TechTrust Kenya";
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, product:product_id(*), vendor:vendor_id(*)")
        .eq("customer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load orders");
      } else if (data) {
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    if (status === "payment_held") return "Funds Secured in Escrow";
    if (status === "vendor_preparing") return "Vendor Preparing";
    if (status === "out_for_delivery") return "Out for Delivery";
    if (status === "ready_for_pickup") return "Ready for Pickup";
    if (status === "delivered_awaiting_confirmation") return "Awaiting Your Confirmation";
    if (status === "confirmed" || status === "completed") return "Completed";
    return status.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen pt-32 pb-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pt-24">
      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Order History</h1>
          <p className="text-muted-foreground text-lg">Track and manage your secured electronics purchases.</p>
        </div>

        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-6">You haven't placed any secured orders.</p>
              <Link to="/browse">
                <Button>Browse Marketplace</Button>
              </Link>
            </div>
          ) : (
            orders.map((order) => {
              const isCompleted = order.status === "confirmed" || order.status === "completed";
              
              return (
                <div key={order.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                  <div className="bg-muted px-4 md:px-6 py-3 border-b border-border flex flex-wrap gap-4 items-center justify-between text-sm">
                    <div className="flex gap-6">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Order Placed</span>
                        <span className="font-semibold text-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Total Amount</span>
                        <span className="font-semibold text-foreground">KES {order.total_amount_ksh?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5 text-right">Order #</span>
                      <span className="font-mono font-semibold text-foreground">{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="p-4 md:px-6 md:py-5 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                    <div className="flex flex-col gap-3 min-w-[200px]">
                      <div className="flex items-center gap-2 text-sm">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{order.vendor?.business_name || "Vendor"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <div className="flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-xs font-semibold">Funds Released</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                            <Shield className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-semibold capitalize">{getStatusDisplay(order.status)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-grow">
                      <div className="flex gap-4 items-start">
                        <div className="w-16 h-16 rounded-md bg-secondary flex-shrink-0 overflow-hidden border border-border">
                          <img alt={order.product?.model_name} className="w-full h-full object-cover" src={order.product?.image_urls?.[0] || "/placeholder.svg"} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{order.product?.brand} {order.product?.model_name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">Condition: {order.product?.condition}</p>
                          <p className="text-sm text-muted-foreground">Qty: {order.quantity}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 min-w-[140px] mt-2 lg:mt-0 w-full lg:w-auto">
                      <Link to={`/orders/${order.id}`} className="w-full">
                        <Button className="w-full flex items-center justify-center gap-2">
                          Track Order
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default Orders;
