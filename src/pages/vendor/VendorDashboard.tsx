import { useEffect, useState } from "react";
import { Store, Package, ShoppingBag, Settings as SettingsIcon, ShieldCheck, Loader2 } from "lucide-react";
import { SettingsTab } from "@/components/vendor/SettingsTab";
import { ProductsTab } from "@/components/vendor/ProductsTab";
import { OverviewTab } from "@/components/vendor/OverviewTab";
import { OrdersTab } from "@/components/vendor/OrdersTab";
import { MessagesTab } from "@/components/vendor/MessagesTab";
import { RepairsTab } from "@/components/vendor/RepairsTab";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const VendorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"Overview" | "Products" | "Orders" | "Repairs" | "Messages" | "Settings">("Overview");
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Vendor Dashboard | TechTrust Kenya";
    if (user) {
      loadVendor();
    }
  }, [user]);

  const loadVendor = async () => {
    try {
      const { data } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (data) setVendor(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const businessName = vendor?.business_name || "Your Shop";

  return (
    <div className="bg-background text-foreground font-body min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-border gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{businessName}</h1>
              {vendor?.verification_status === "approved" || vendor?.verification_status === "verified" ? (
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="bg-amber-100 dark:bg-amber-950 text-amber-600 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Pending Verification
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage listings, orders, and Float escrow payouts for your store.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium hover:underline text-muted-foreground">Marketplace</Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border mb-8 overflow-x-auto">
          {(vendor?.offers_repairs
              ? (["Overview", "Products", "Orders", "Repairs", "Messages", "Settings"] as const)
              : (["Overview", "Products", "Orders", "Messages", "Settings"] as const)
            ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === "Overview" && (
          <OverviewTab vendor={vendor} />
        )}
        
        {activeTab === "Products" && (
          <ProductsTab vendor={vendor} />
        )}

        {activeTab === "Orders" && (
          <OrdersTab vendor={vendor} />
        )}

        {activeTab === "Repairs" && (
          <RepairsTab vendor={vendor} />
        )}

        {activeTab === "Messages" && (
          <MessagesTab />
        )}

        {activeTab === "Settings" && (
          <SettingsTab vendor={{ business_name: businessName, phone: vendor?.phone || "", email: user?.email || "" }} onUpdated={loadVendor} />
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
