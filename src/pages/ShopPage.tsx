import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck, Star, MapPin, Clock, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const ShopPage = () => {
  const { vendorId } = useParams();
  const [vendor, setVendor] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!vendorId) return;
    (async () => {
      const { data: v } = await supabase.from("vendor_profiles").select("*").eq("id", vendorId).maybeSingle();
      setVendor(v);
      if (v) document.title = `${v.business_name} | TechTrust`;
      const { data: p } = await supabase.from("products").select("*, vendor:vendor_profiles(id,business_name,average_rating,verification_status)").eq("vendor_id", vendorId).eq("is_active", true);
      setProducts(p ?? []);
      const { data: s } = await supabase.from("repair_services").select("*").eq("vendor_id", vendorId).eq("is_active", true);
      setServices(s ?? []);
      const { data: r } = await supabase.from("reviews").select("*, customer:profiles(full_name)").eq("vendor_id", vendorId).order("created_at", { ascending: false });
      setReviews(r ?? []);
    })();
  }, [vendorId]);

  if (!vendor) {
    return <div className="container py-20 text-center text-muted-foreground">Loading shop…</div>;
  }

  const filterByCategory = (cat?: string) => cat ? products.filter((p) => p.category === cat) : products;

  return (
    <div>
      {/* HEADER */}
      <section className="bg-muted/40 border-b border-border">
        <div className="container py-12">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-2xl shrink-0">
              {vendor.business_name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">{vendor.business_name}</h1>
                <Badge className="bg-success/10 text-success border border-success/30">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {vendor.physical_address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {vendor.physical_address}{vendor.sub_county ? `, ${vendor.sub_county}` : ""}{vendor.county ? `, ${vendor.county} County` : (vendor.city ? `, ${vendor.city}` : "")}
                  </span>
                )}
                {vendor.operating_hours && (
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {vendor.operating_hours}</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                {Number(vendor.average_rating) > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-medium text-foreground">{Number(vendor.average_rating).toFixed(1)}</span>
                    <span>rating</span>
                  </span>
                )}
                {vendor.total_completed_transactions > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span><strong className="text-foreground">{vendor.total_completed_transactions}</strong> sales</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* MAP */}
          {vendor.latitude && vendor.longitude && (
            <div className="mt-8 rounded-xl overflow-hidden border border-border aspect-[16/5] max-h-56">
              <iframe
                title="Shop location"
                src={`https://www.google.com/maps?q=${vendor.latitude},${vendor.longitude}&hl=en&z=16&output=embed`}
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </section>

      {/* TABS */}
      <div className="container py-10">
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="laptop">Laptops</TabsTrigger>
            <TabsTrigger value="smartphone">Smartphones</TabsTrigger>
            <TabsTrigger value="accessory">Accessories</TabsTrigger>
            {services.length > 0 && <TabsTrigger value="repairs">Repair Services</TabsTrigger>}
          </TabsList>

          {(["all", "laptop", "smartphone", "accessory"] as const).map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-6">
              {(cat === "all" ? products : filterByCategory(cat)).length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No products in this category.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {(cat === "all" ? products : filterByCategory(cat)).map((p) => <ProductCard key={p.id} {...p} />)}
                </div>
              )}
            </TabsContent>
          ))}

          {services.length > 0 && (
            <TabsContent value="repairs" className="mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                {services.map((s) => (
                  <div key={s.id} className="p-5 bg-card border border-border rounded-xl shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Wrench className="h-5 w-5 text-accent" />
                          <h3 className="font-semibold">{s.service_name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{s.description}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs">
                          <Badge variant="outline" className="capitalize">{s.device_type}</Badge>
                          <Badge variant="outline">{s.estimated_turnaround_days} days</Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm text-muted-foreground">From</div>
                        <div className="font-bold text-primary">{formatKsh(s.price_min_ksh)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* REVIEWS */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reviews yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="p-5 bg-card border border-border rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{r.customer?.full_name ?? "Customer"}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.service_rating ? "fill-warning text-warning" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80">{r.comment}</p>
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
