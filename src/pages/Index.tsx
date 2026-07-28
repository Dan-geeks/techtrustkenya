import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { VendorCard } from "@/components/marketplace/VendorCard";
import { AnimatedArt, art } from "@/components/marketing/AnimatedArt";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  vendors: number;
  products: number;
  transactions: number;
}

const Index = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({ vendors: 0, products: 0, transactions: 0 });

  useEffect(() => {
    document.title = "TechTrust — Verified Tech Marketplace in Kenya";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Buy and sell verified laptops and smartphones in Kenya. Pay securely with Float escrow. Trusted vendors, real protection.");

    (async () => {
      const [{ data: prods }, { data: vens }, vendorCount, productCount, txCount] = await Promise.all([
        supabase.from("products").select("*, vendor:vendor_profiles(id,business_name,average_rating,verification_status)").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
        supabase.from("vendor_profiles").select("id,business_name,physical_address,average_rating,total_completed_transactions").eq("verification_status", "approved").order("average_rating", { ascending: false }).limit(6),
        supabase.from("vendor_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "approved"),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("vendor_profiles").select("total_completed_transactions"),
      ]);
      setProducts(prods ?? []);
      setVendors(vens ?? []);
      const totalTx = (txCount.data ?? []).reduce((sum: number, v: any) => sum + (v.total_completed_transactions || 0), 0);
      setStats({
        vendors: vendorCount.count ?? 0,
        products: productCount.count ?? 0,
        transactions: totalTx,
      });
    })();
  }, []);

  return (
    <div className="flex flex-col">

      {/* HERO — copy left, large animated illustration right */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="container relative py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8">
            <div>
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/40">
                Kenya's Verified Tech Marketplace
              </p>
              <h1 className="text-balance text-5xl font-extrabold leading-[1.0] tracking-tight md:text-6xl">
                Buy Tech You Can{" "}
                <em className="not-italic text-accent">Actually</em>{" "}
                Trust.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-primary-foreground/60">
                Every vendor is physically inspected. Every payment held in escrow until you confirm delivery.
                No risk. No surprises.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/browse">Shop Now <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button variant="outlineLight" size="xl" asChild>
                  <Link to="/vendor/register">List Your Shop</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-col gap-2">
                {["Float Escrow Protected", "Vendor Verified Physically", "Dispute Resolution Included"].map((t) => (
                  <div key={t} className="flex items-center gap-2.5 text-sm text-primary-foreground/50">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-accent/70" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <AnimatedArt
              src={art.marketplace}
              alt="Vendors and buyers reviewing verified listings and escrow activity on TechTrust"
              eager
            />
          </div>

          {/* Only shown once real numbers exist — "0+ vendors" reads as broken. */}
          {(stats.vendors > 0 || stats.products > 0 || stats.transactions > 0) && (
            <div className="mt-12 flex flex-wrap gap-8 border-t border-primary-foreground/10 pt-8 text-sm text-primary-foreground/50">
              {stats.vendors > 0 && (
                <span><strong className="font-semibold text-primary-foreground">{stats.vendors}+</strong> verified vendors</span>
              )}
              {stats.products > 0 && (
                <span><strong className="font-semibold text-primary-foreground">{stats.products}+</strong> products listed</span>
              )}
              {stats.transactions > 0 && (
                <span><strong className="font-semibold text-primary-foreground">{stats.transactions.toLocaleString()}+</strong> safe transactions</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS — editorial numbered list, not 3-card grid */}
      <section className="border-b border-border">
        <div className="container py-20">
          <div className="flex flex-col lg:flex-row lg:gap-20">
            <div className="lg:w-72 shrink-0 mb-10 lg:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">How it works</h2>
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                Three steps. Your money is protected the entire time.
              </p>
              <div className="mt-8 hidden lg:block">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/how-it-works">Full guide <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            </div>
            <div className="flex-1 divide-y divide-border">
              {[
                {
                  num: "01",
                  title: "Browse verified vendors",
                  desc: "Every shop on TechTrust has been physically inspected by our team. We visit the location, verify documents, and only list shops that pass.",
                },
                {
                  num: "02",
                  title: "Pay into Float escrow",
                  desc: "Your M-Pesa payment is held by TechTrust Float. The vendor receives nothing until you confirm the product. You're never at risk.",
                },
                {
                  num: "03",
                  title: "Confirm or dispute",
                  desc: "Receive the product, check it thoroughly, then release payment. If anything's wrong, raise a dispute — we step in and your money stays safe.",
                },
              ].map(({ num, title, desc }) => (
                <div key={num} className="py-8 flex gap-8 group">
                  <div className="text-3xl font-black text-border group-hover:text-accent/30 transition-colors tabular-nums shrink-0 w-12 leading-none pt-1">
                    {num}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="container py-16">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-xl font-bold">Latest listings</h2>
          <Link to="/browse" className="text-sm text-accent font-medium hover:underline flex items-center gap-1">
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No products listed yet. <Link to="/vendor/register" className="text-accent underline">Be the first vendor.</Link>
          </div>
        )}
      </section>

      {/* TOP VENDORS */}
      {vendors.length > 0 && (
        <section className="container py-8 pb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-xl font-bold">Top verified vendors</h2>
            <Link to="/browse" className="text-sm text-accent font-medium hover:underline flex items-center gap-1">
              All vendors <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => <VendorCard key={v.id} {...v} />)}
          </div>
        </section>
      )}

      {/* REPAIR CTA — dark, distinct from hero */}
      <section className="bg-foreground text-background">
        <div className="container py-16 md:py-20 flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Wrench className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-background/60 uppercase tracking-wide">Repair Services</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              Device broken? We can fix that.
            </h2>
            <p className="text-background/60 text-sm leading-relaxed mb-6 max-w-md">
              Certified technicians. Payment released only after you approve the repair. Same Float protection, same zero risk.
            </p>
            <Button asChild className="bg-accent text-white hover:bg-accent/90">
              <Link to="/repairs">Find a technician <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <AnimatedArt
            src={art.repairs}
            alt="Technicians diagnosing and repairing customer devices"
            className="md:w-[46%] shrink-0"
          />
        </div>
      </section>

    </div>
  );
};

export default Index;
