import { useEffect, useState } from "react";
import { Store, Package, ShoppingBag, Settings as SettingsIcon, ShieldCheck, Loader2 } from "lucide-react";
import { SettingsTab } from "@/components/vendor/SettingsTab";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const VendorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"Overview" | "Products" | "Orders" | "Settings">("Overview");
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
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border mb-8 overflow-x-auto">
          {(["Overview", "Products", "Orders", "Settings"] as const).map((tab) => (
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
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-border rounded-xl shadow-xs p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Total Sales (30d)</span>
                </div>
                <div className="font-data-price text-2xl font-bold text-foreground mb-2">KES 0.00</div>
                <div className="text-xs text-emerald-600 font-semibold">No sales yet</div>
              </div>
              <div className="bg-card border border-border rounded-xl shadow-xs p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Active Orders</span>
                </div>
                <div className="font-data-price text-2xl font-bold text-foreground mb-2">0</div>
                <div className="text-xs text-muted-foreground">0 awaiting shipment</div>
              </div>
              <div className="bg-card border border-border rounded-xl shadow-xs p-6 border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Pending Float Funds</span>
                </div>
                <div className="font-data-price text-2xl font-bold text-foreground mb-2">KES 0.00</div>
                <div className="text-xs text-blue-600 font-semibold">Secured in Float Escrow</div>
              </div>
              <div className="bg-card border border-border rounded-xl shadow-xs p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Seller Rating</span>
                </div>
                <div className="font-data-price text-2xl font-bold text-foreground mb-2">N/A</div>
                <div className="text-xs text-muted-foreground">No reviews yet</div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-bold text-foreground text-sm">Recent Escrow Orders</h3>
              </div>
              <div className="p-8 text-center text-muted-foreground text-sm">
                No recent orders found.
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "Products" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Product Catalog</h2>
            <p className="text-xs text-muted-foreground">Listings verified under TechTrust seller standards.</p>
          </div>
        )}

        {activeTab === "Orders" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Escrow Orders</h2>
            <p className="text-xs text-muted-foreground">Orders awaiting dispatch or buyer inspection confirmation.</p>
          </div>
        )}

        {activeTab === "Settings" && (
          <SettingsTab vendor={{ business_name: businessName, phone: vendor?.phone || "", email: user?.email || "" }} onUpdated={loadVendor} />
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
