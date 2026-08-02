import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, MapPin, Star, Store, CheckCircle, ArrowRight, Phone, Mail } from "lucide-react";

interface VendorDetails {
  id: string;
  business_name: string;
  is_verified: boolean;
  rating: number;
  sales_count: number;
  location: string;
  joined_date: string;
  bio: string;
  products: Array<{
    id: string;
    title: string;
    price_ksh: number;
    condition: string;
    sku: string;
    image_url: string;
  }>;
}

const mockVendors: Record<string, VendorDetails> = {
  v100: {
    id: "v100",
    business_name: "TechHub Nairobi",
    is_verified: true,
    rating: 4.9,
    sales_count: 128,
    location: "CBD, Nairobi",
    joined_date: "March 2022",
    bio: "Premium electronics retailer specializing in high-end laptops, smartphones, and professional gear. All devices pass strict 40-point Float inspection before listing.",
    products: [
      {
        id: "p1",
        title: "MacBook Pro 16\" M3 Max",
        price_ksh: 350000,
        condition: "Refurbished - Excellent",
        sku: "APL-M3M-16",
        image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBNjSZv8rfoQvukUej12m1vF83ptirN4QMeHorHtscl3L07Er0-KcND24gMF9_fFNGsGJq0GhM3iiOq1_S0BbPRm_c-P28tHiGDXgbpV_eY_VKGvmyY8-h4PQCL5PN2myW6x8BXgRoC9Sg8EoltFCaHvQqYV5EsehQYlGYRb-g81rFfhC1tPC1owYBcdKAD0Kvc2x_h8VghauixHoM2ENr0M5zH7xqVLl9VJh7sTP97VGfvlK_IDvX_KA"
      },
      {
        id: "p2",
        title: "ThinkPad X1 Carbon Gen 10",
        price_ksh: 185000,
        condition: "Used - Like New",
        sku: "LNV-X1-8492",
        image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCokv45mRVrSIXOWebAFT4UoYazAFFcUbgCGEbnmD9yGyNV54x7N43L91196famiDQcKRBVxbcpDt2X4sEIkqlbHZYWIDsXksFw49njdx5TJb8PLi75aaZAXYAfs7-3sxTCNLBO7OYOPqEquk_48fNbyYChnf2_w9YLaoxr4MXfqm0oWPd7x4sYs05pH9KAgelZoOvLMbksbYq9D99zvRU4PTIp6icBuvUj7K_LLbFHW4-k_oiQwwCUFg"
      }
    ]
  }
};

const ShopPage = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const vendor = mockVendors[vendorId || "v100"] || {
    id: vendorId || "v100",
    business_name: "TechHub Nairobi",
    is_verified: true,
    rating: 4.9,
    sales_count: 128,
    location: "Nairobi, Kenya",
    joined_date: "March 2022",
    bio: "Verified merchant operating under Float Escrow protection.",
    products: [
      {
        id: "p1",
        title: "MacBook Pro 16\" M3 Max",
        price_ksh: 350000,
        condition: "Refurbished",
        sku: "APL-M3M-16",
        image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBNjSZv8rfoQvukUej12m1vF83ptirN4QMeHorHtscl3L07Er0-KcND24gMF9_fFNGsGJq0GhM3iiOq1_S0BbPRm_c-P28tHiGDXgbpV_eY_VKGvmyY8-h4PQCL5PN2myW6x8BXgRoC9Sg8EoltFCaHvQqYV5EsehQYlGYRb-g81rFfhC1tPC1owYBcdKAD0Kvc2x_h8VghauixHoM2ENr0M5zH7xqVLl9VJh7sTP97VGfvlK_IDvX_KA"
      }
    ]
  };

  useEffect(() => {
    document.title = `${vendor.business_name} | TechTrust Storefront`;
  }, [vendor.business_name]);

  return (
    <div className="bg-background text-foreground font-body antialiased min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Vendor Info */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xs text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary font-bold text-2xl">
              {vendor.business_name.substring(0, 2)}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{vendor.business_name}</h1>
            
            {vendor.is_verified && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold mb-4">
                <ShieldCheck className="w-4 h-4" />
                Physically Verified Merchant
              </div>
            )}

            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{vendor.location}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-muted p-3 rounded-lg text-xs mb-6">
              <div>
                <span className="font-bold text-foreground block">{vendor.rating} ★</span>
                <span className="text-muted-foreground">Rating</span>
              </div>
              <div>
                <span className="font-bold text-foreground block">{vendor.sales_count}</span>
                <span className="text-muted-foreground">Sales</span>
              </div>
              <div>
                <span className="font-bold text-foreground block">100%</span>
                <span className="text-muted-foreground">Float</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed text-left">
              {vendor.bio}
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
              Store Listings ({vendor.products.length})
            </h2>
            <Link to="/browse" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              Back to Browse <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {vendor.products.map((item) => (
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
                    <span className="text-xs text-muted-foreground">{item.condition} · SKU: {item.sku}</span>
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
        </section>

      </div>
    </div>
  );
};

export default ShopPage;
