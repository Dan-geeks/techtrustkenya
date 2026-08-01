import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wrench,
  Star,
  Zap,
  BarChart2,
  Settings,
  Store,
} from "lucide-react";
import { OverviewTab } from "@/components/vendor/OverviewTab";
import { ProductsTab } from "@/components/vendor/ProductsTab";
import { OrdersTab } from "@/components/vendor/OrdersTab";
import { RepairsTab } from "@/components/vendor/RepairsTab";
import { ReviewsTab } from "@/components/vendor/ReviewsTab";
import { PromotionsTab } from "@/components/vendor/PromotionsTab";
import { AnalyticsTab } from "@/components/vendor/AnalyticsTab";
import { SettingsTab } from "@/components/vendor/SettingsTab";

const tabs = [
  { value: "overview", label: "Overview", Icon: LayoutDashboard },
  { value: "products", label: "Products", Icon: Package },
  { value: "orders", label: "Orders", Icon: ShoppingBag },
  { value: "repairs", label: "Repairs", Icon: Wrench },
  { value: "reviews", label: "Reviews", Icon: Star },
  { value: "promotions", label: "Promotions", Icon: Zap },
  { value: "analytics", label: "Analytics", Icon: BarChart2 },
  { value: "settings", label: "Settings", Icon: Settings },
] as const;

const VendorDashboard = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    document.title = "Vendor Dashboard | TechTrust";
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setVendor(data);
      setLoading(false);

      if (data) {
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", data.id)
          .eq("status", "pending");
        setPendingOrders(count ?? 0);
      }
    })();
  }, [user]);

  const [activeTab, setActiveTab] = useState("overview");

  if (loading)
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );

  if (!vendor)
    return (
      <div className="container py-20 text-center text-muted-foreground">
        Vendor profile not found.
      </div>
    );

  return (
    <div className="flex flex-col">
      <div className="bg-primary text-primary-foreground">
        <div className="container py-8">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <Store className="h-3 w-3" /> Vendor
          </span>
          <h1 className="text-2xl md:text-3xl font-bold">{vendor.business_name}</h1>
          <p className="text-sm text-primary-foreground/60 mt-1">
            Manage your shop, products, orders, repairs and more.
          </p>
        </div>
      </div>

      <div className="container py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/50 p-1">
          {tabs.map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative flex items-center gap-1.5"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>

              {value === "orders" && pendingOrders > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {pendingOrders > 9 ? "9+" : pendingOrders}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab vendor={vendor} onSelectTab={setActiveTab} />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductsTab vendor={vendor} />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab vendor={vendor} />
        </TabsContent>
        <TabsContent value="repairs" className="mt-6">
          <RepairsTab vendor={vendor} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          <ReviewsTab vendor={vendor} />
        </TabsContent>
        <TabsContent value="promotions" className="mt-6">
          <PromotionsTab vendor={vendor} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab vendor={vendor} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab vendor={vendor} onUpdated={(v) => setVendor(v)} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default VendorDashboard;
