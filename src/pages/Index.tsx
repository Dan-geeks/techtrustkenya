import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowRight, Wrench, BadgeCheck, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { VendorCard } from "@/components/marketplace/VendorCard";
import { AnimatedArt, art } from "@/components/marketing/AnimatedArt";
import { Reveal } from "@/components/marketing/Reveal";
import { CountUp } from "@/components/marketing/CountUp";
import { supabase } from "@/integrations/supabase/client";
import { useParallax } from "@/hooks/useParallax";

interface Stats {
  vendors: number;
  products: number;
  transactions: number;
}

const Index = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({ vendors: 0, products: 0, transactions: 0 });

  const blobOne = useParallax<HTMLDivElement>(0.12);
  const blobTwo = useParallax<HTMLDivElement>(-0.18);
  const repairArt = useParallax<HTMLDivElement>(-0.08);

  useEffect(() => {
    document.title = "TechTrust | Verified Tech Marketplace in Kenya";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Buy and sell verified laptops and smartphones in Kenya. Pay securely with Float. Trusted vendors, real protection.");

    (async () => {
      const [{ data: prods }, { data: vens }, vendorCount, productCount, txCount] = await Promise.all([
        supabase.from("products").select("*, vendor:vendor_profiles(id,business_name,average_rating,verification_status)").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
        // Both "verified" and "approved" mean a live vendor — filtering on only
        // one of them under-counted the marketplace on the homepage.
        supabase.from("vendor_profiles").select("id,business_name,physical_address,average_rating,total_completed_transactions").in("verification_status", ["verified", "approved"]).order("average_rating", { ascending: false }).limit(6),
        supabase.from("vendor_profiles").select("*", { count: "exact", head: true }).in("verification_status", ["verified", "approved"]),
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

      {/* HERO — copy left, laptop right; the laptop closes its lid as you scroll past */}
      <section className="relative bg-gradient-subtle overflow-hidden">
        {/* Decorative parallax blobs — purely visual, drift at different speeds for depth */}
        <div
          ref={blobOne}
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl will-change-transform"
        />
        <div
          ref={blobTwo}
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl will-change-transform"
        />
        <div className="container relative py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8">
            <div>
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Kenya's Verified Tech Marketplace
              </p>
              <h1 className="text-balance text-5xl font-extrabold leading-[1.0] tracking-tight text-foreground md:text-6xl">
                Buy and Sell Tech You Can Actually{" "}
                {/* Hand-drawn underline under "Trust", straight from the mockup */}
                <span className="relative whitespace-nowrap text-accent">
                  Trust
                  <svg
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-3 w-full text-success"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 20"
                  >
                    <path d="M0,10 Q50,20 100,10" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>
                .
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                Every vendor is physically inspected. Every payment held in Float until you confirm delivery.
                No risk. No surprises.
              </p>
              {/* Trust signals as chips, matching the mockup's pill row */}
              <div className="mt-7 flex flex-wrap gap-2.5">
                {[
                  { icon: ShieldCheck, label: "Float-protected", tone: "text-accent" },
                  { icon: BadgeCheck, label: "Verified vendors", tone: "text-success" },
                  { icon: Handshake, label: "Dispute resolution", tone: "text-primary" },
                ].map(({ icon: Icon, label, tone }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-card"
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="xl" asChild>
                  <Link to="/browse">Browse Verified Tech <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" size="xl" asChild>
                  <Link to="/how-it-works">Learn How It Works</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-border bg-primary p-6 shadow-lg">
                <img
                  src="/coding-with-coffee-v2.svg"
                  alt="Illustration of a laptop displaying code"
                  loading="eager"
                  className="aspect-square w-full object-contain"
                />
              </div>
              <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-success-foreground shadow-lg sm:left-6">
                <BadgeCheck className="h-5 w-5 shrink-0" />
                <div className="leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Verified Listing</p>
                  <p className="text-sm font-bold">100% Genuine</p>
                </div>
              </div>
            </div>
          </div>

          {/* Only shown once real numbers exist — "0+ vendors" reads as broken. */}
          {(stats.vendors > 0 || stats.products > 0 || stats.transactions > 0) && (
            <div className="mt-16 flex flex-wrap items-center justify-center gap-10 border-t border-border pt-10 sm:gap-16">
              {[
                { show: stats.vendors > 0, value: stats.vendors, label: "Verified vendors" },
                { show: stats.products > 0, value: stats.products, label: "Products listed" },
                { show: stats.transactions > 0, value: stats.transactions, label: "Safe transactions" },
              ]
                .filter((s) => s.show)
                .map((s, i) => (
                  <div key={s.label} className="flex items-center gap-10 sm:gap-16">
                    {i > 0 && <div className="hidden h-12 w-px bg-border sm:block" aria-hidden="true" />}
                    <div className="text-center">
                      <div className="text-stat mb-1 text-4xl font-semibold text-accent">
                        <CountUp value={s.value} />+
                      </div>
                      <div className="text-eyebrow text-muted-foreground">{s.label}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Reassurance strip — reinforces Float escrow right under the fold */}
        <div className="bg-primary py-4 text-primary-foreground">
          <div className="container flex flex-col items-center justify-between gap-3 md:flex-row">
            <span className="inline-flex items-center gap-2.5 text-sm font-semibold">
              <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
              Your money is held safely by Float until you confirm your order.
            </span>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1 text-sm font-medium text-success underline underline-offset-4 transition-colors hover:text-primary-foreground"
            >
              How Float works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — editorial numbered list, not 3-card grid */}
      <section className="border-b border-border">
        <div className="container py-20">
          <Reveal className="flex flex-col lg:flex-row lg:gap-20">
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
            <div className="flex-1 flex flex-col gap-4">
              {[
                {
                  num: "01",
                  title: "Browse verified vendors",
                  desc: "Every shop on TechTrust has been physically inspected by our team. We visit the location, verify documents, and only list shops that pass.",
                },
                {
                  num: "02",
                  title: "Pay into Float",
                  desc: "Your M-Pesa payment is held by TechTrust Float. The vendor receives nothing until you confirm the product. You're never at risk.",
                },
                {
                  num: "03",
                  title: "Confirm or dispute",
                  desc: "Receive the product, check it thoroughly, then release payment. If anything's wrong, raise a dispute — we step in and your money stays safe.",
                },
              ].map(({ num, title, desc }) => (
                <div
                  key={num}
                  className="group flex gap-6 rounded-2xl bg-primary p-6 text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-8"
                >
                  <div className="text-stat w-10 shrink-0 text-3xl font-black leading-none text-primary-foreground/20 transition-colors group-hover:text-accent/60">
                    {num}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">{title}</h3>
                    <p className="text-sm leading-relaxed text-primary-foreground/60">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="container py-16">
        <Reveal>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-xl font-bold">Latest listings</h2>
            <Link to="/browse" className="text-sm text-accent font-medium hover:underline flex items-center gap-1">
              Browse all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} {...p} variant="dark" />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No products listed yet. <Link to="/vendor/register" className="text-accent underline">Be the first vendor.</Link>
            </div>
          )}
        </Reveal>
      </section>

      {/* TOP VENDORS */}
      {vendors.length > 0 && (
        <section className="container py-8 pb-16">
          <Reveal>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-xl font-bold">Top verified vendors</h2>
              <Link to="/browse" className="text-sm text-accent font-medium hover:underline flex items-center gap-1">
                All vendors <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((v) => <VendorCard key={v.id} {...v} />)}
            </div>
          </Reveal>
        </section>
      )}

      {/* UPGRADE CTA — general marketplace push, separate from the repair CTA below */}
      <section className="bg-primary text-primary-foreground">
        <div className="container py-16 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to upgrade safely?</h2>
            <p className="mt-3 max-w-xl mx-auto text-primary-foreground/60 text-sm leading-relaxed">
              Join thousands of Kenyans transacting with peace of mind. No more "kulipia hewa" —
              your money is only released when you're happy.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="success" size="lg" asChild>
                <Link to="/browse">Start Shopping</Link>
              </Button>
              <Button variant="outlineLight" size="lg" asChild>
                <Link to="/vendor/register">Register a Business</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs font-medium text-accent">
              Free for your first month as a vendor — no listing fees.
            </p>
          </Reveal>
        </div>
      </section>

      {/* DIVIDER — breaks up the two back-to-back dark sections */}
      <section className="bg-background">
        <Reveal className="container py-14 text-center">
          <p className="text-xl md:text-2xl font-display font-semibold text-foreground text-balance">
            From your next laptop to your next repair — always protected.
          </p>
        </Reveal>
      </section>

      {/* REPAIR CTA — dark, distinct from hero */}
      <section className="bg-foreground text-background overflow-hidden">
        <div className="container py-16 md:py-20 flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
          <Reveal className="flex-1">
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
            <div className="mb-8 flex flex-col gap-2.5">
              {["Diagnosis before you pay a shilling", "Genuine spare parts, approved by you first", "Same escrow protection as every purchase"].map((t) => (
                <div key={t} className="flex items-center gap-2.5 text-sm text-background/70">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
                  {t}
                </div>
              ))}
            </div>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/repairs">Find a technician <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </Reveal>
          <div ref={repairArt} className="md:w-[30%] max-w-[280px] shrink-0 will-change-transform">
            <AnimatedArt
              src={art.repairs}
              alt="Technicians diagnosing and repairing customer devices"
            />
          </div>
        </div>
      </section>

    </div>
  );
};

export default Index;
