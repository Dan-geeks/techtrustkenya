import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, MapPin, Star, Store, CheckCircle, ArrowRight, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VendorProfile {
  id: string;
  business_name: string;
  city: string;
  physical_address: string;
  average_rating: number;
  total_completed_transactions: number;
  verification_status: string;
  created_at: string;
  shop_photo_urls: string[] | null;
}

interface Product {
  id: string;
  title: string;
  price_ksh: number;
  condition: string;
  image_url: string;
}

const ShopPage = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendorAndProducts = async () => {
      setIsLoading(true);
      if (!vendorId) return;

      const { data: vendorData, error: vendorError } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("id", vendorId)
        .single();

      if (vendorData) {
        setVendor(vendorData);
        document.title = `${vendorData.business_name} | TechTrust Storefront`;
      }

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("is_active", true);

      if (productsData) {
        const mappedProducts = productsData.map((p) => ({
          id: p.id,
          title: p.model_name ? `${p.brand} ${p.model_name}` : p.brand,
          price_ksh: p.price_ksh,
          condition: p.condition || "Used",
          image_url: p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : "/placeholder.svg",
        }));
        setProducts(mappedProducts);
      }
      setIsLoading(false);
    };

    fetchVendorAndProducts();
  }, [vendorId]);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen py-32 flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Loading vendor profile...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="bg-background min-h-screen py-32 flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Vendor Not Found</h2>
        <p className="text-muted-foreground">The vendor you are looking for does not exist or has been removed.</p>
        <Link to="/vendors" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold">
          Browse Vendors
        </Link>
      </div>
    );
  }

  const isVerified = vendor.verification_status === "verified";
  const joinedDate = new Date(vendor.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="bg-background text-foreground font-body antialiased min-h-screen pt-32 pb-8">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Vendor Info */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xs text-center">
            {vendor.shop_photo_urls && vendor.shop_photo_urls.length > 0 ? (
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-2 border-primary/20">
                <img src={vendor.shop_photo_urls[0]} alt={vendor.business_name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary font-bold text-2xl">
                {vendor.business_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground mb-1">{vendor.business_name}</h1>
            
            {isVerified && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold mb-4">
                <ShieldCheck className="w-4 h-4" />
                Physically Verified Merchant
              </div>
            )}

            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{vendor.city ? `${vendor.physical_address || ""}, ${vendor.city}` : "Nairobi"}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-muted p-3 rounded-lg text-xs mb-6">
              <div>
                <span className="font-bold text-foreground block">{vendor.average_rating || 4.8} &starf;</span>
                <span className="text-muted-foreground">Rating</span>
              </div>
              <div>
                <span className="font-bold text-foreground block">{vendor.total_completed_transactions || 0}</span>
                <span className="text-muted-foreground">Sales</span>
              </div>
              <div>
                <span className="font-bold text-foreground block">100%</span>
                <span className="text-muted-foreground">Float</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed text-left">
              Joined {joinedDate}. Trusted electronics merchant offering quality devices.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Verification Badge Status</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Physical Shop Premises Inspected</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>KRA PIN & Business Registration Validated</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Float Escrow Payment Integration Enabled</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Products Listing Grid */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-xs">
            <h2 className="text-lg font-bold text-foreground">
              Store Listings ({products.length})
            </h2>
            <Link to="/vendors" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              Back to Vendors <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
              This vendor hasn't listed any products yet.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {products.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-xs">
                      Float Escrow Protected
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-foreground text-base leading-snug">{item.title}</h3>
                      <span className="text-xs text-muted-foreground capitalize">{item.condition}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-border">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Price (KSH)</span>
                        <span className="font-data-price text-price text-lg font-bold text-primary">
                          KSH {item.price_ksh.toLocaleString()}
                        </span>
                      </div>
                      <Link
                        to={`/product/${item.id}`}
                        className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default ShopPage;
