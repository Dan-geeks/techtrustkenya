import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CountUp } from "@/components/ui/count-up";
import { SAMPLE_PRODUCTS } from "@/data/products";

const Index = () => {
  useEffect(() => {
    document.title = "TechTrust - Verified Tech Marketplace";

    const ensureStylesheet = (href: string) => {
      const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
        (link) => link.getAttribute("href") === href
      );
      if (exists) return;
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      document.head.appendChild(el);
    };

    ensureStylesheet("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");
  }, []);

  return (
    <div className="bg-background text-on-background font-body-md antialiased overflow-x-hidden">
      <main className="flex flex-col gap-8 md:gap-14">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-container-low to-background pt-6 md:pt-10 pb-10 md:pb-14">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-10 items-center relative z-10">
            {/* Left Content */}
            <div className="flex flex-col">
              <div className="inline-flex items-center gap-2 bg-[#EEF2FF] border border-[#0F3D8C]/20 px-3.5 py-1 rounded-full w-fit mb-3 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#0F3D8C] animate-pulse"></span>
                <span className="font-ui-label text-xs text-[#0F3D8C] uppercase tracking-wider font-bold">
                  Kenya's Verified Tech Marketplace
                </span>
              </div>
              <h1 className="font-display-h1-mobile md:font-display-h1 text-3xl md:text-[40px] font-bold text-[#0F172A] leading-tight mb-3">
                Buy and Sell Tech You Can Actually{" "}
                <span className="text-[#0F3D8C] relative inline-block whitespace-nowrap">
                  Trust
                  <svg className="absolute w-full h-2.5 -bottom-0.5 left-0 text-[#10B981]" preserveAspectRatio="none" viewBox="0 0 100 20">
                    <path d="M0,10 Q50,20 100,10" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  </svg>
                </span>
              </h1>
              <p className="font-body-lg text-sm md:text-base text-[#475569] max-w-md leading-relaxed mb-5">
                Every vendor is physically inspected. Every payment is held in Float until you confirm delivery. No risk. No Suprises.
              </p>
              <div className="flex flex-wrap gap-2.5 mb-5">
                <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-sm border border-[#E2E8F0]">
                  <span className="material-symbols-outlined text-[16px] text-[#0F3D8C]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-ui-label text-xs text-[#1E293B] font-medium">Float-protected</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-sm border border-[#E2E8F0]">
                  <span className="material-symbols-outlined text-[16px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <span className="font-ui-label text-xs text-[#1E293B] font-medium">Verified vendors</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-sm border border-[#E2E8F0]">
                  <span className="material-symbols-outlined text-[16px] text-[#0284C7]">
                    sell
                  </span>
                  <span className="font-ui-label text-xs text-[#1E293B] font-medium">Dispute resolution</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <Link to="/browse" className="bg-[#0F3D8C] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#0A2D6B] transition-all duration-200 shadow-sm inline-flex items-center justify-center gap-2">
                  Start Browsing
                </Link>
                <Link to="/vendor/onboarding" className="border-2 border-[#0F3D8C] text-[#0F3D8C] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#0F3D8C] hover:text-white transition-all duration-200 inline-flex items-center justify-center gap-2">
                  List Your Shop
                </Link>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative flex justify-center lg:justify-end mt-4 lg:mt-0 w-full">
              <div className="relative bg-white rounded-xl p-5 shadow-lg border border-[#E2E8F0] max-w-sm w-full transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Green Verified Listing Badge */}
                <div className="absolute -top-3 -left-3 z-20 bg-[#10B981] text-white px-3.5 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 font-bold text-xs">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    shield
                  </span>
                  <span>Verified Listing</span>
                </div>
                <div className="rounded-lg overflow-hidden bg-slate-100 aspect-[4/3] relative">
                  <div
                    className="absolute inset-0 bg-cover bg-center w-full h-full"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCNEq40Uz9nsu-TaISjawfog1xi2HMrnUYFgN1zzt_OZ4fILy1SLg6IGLEmJYRzGAWuTCBGqat5qsqg6R58jCh8ZX_0j51zYAZT0BP1NqFj9tf9bD4Gie_080uWLSj-tzTEsqdJA2varHTqwKxYaHbWYY9vhhbQU_Z7G11_zmvc1tqvKbponer9usMoVIEwKfRy7bBuKr3Rxi1UzzrPZmDRR3uR30RWlPAUpBtZ7eNZkEpfSwBvh74Gxg')",
                    }}
                  ></div>
                </div>
                <div className="mt-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-body-md-bold text-base text-[#0F172A] font-bold">MacBook Pro 14" M2</h3>
                    <p className="font-body-md text-xs text-[#64748B] mt-0.5">
                      Vendor: <span className="text-[#0F3D8C] font-semibold">Nairobi Tech Hub</span>
                    </p>
                  </div>
                  <span className="font-mono text-lg text-[#0F172A] font-bold">KSh 185,000</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-[#E2E8F0] bg-white py-8 md:py-10">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-20 text-center">
              <div className="flex flex-col items-center gap-0.5">
                <div className="font-data-price text-3xl md:text-4xl font-bold text-[#0F3D8C] mb-0.5">
                  <CountUp end={12} suffix="+" />
                </div>
                <div className="font-ui-label text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                  Verified Vendors
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-[#E2E8F0]"></div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="font-data-price text-3xl md:text-4xl font-bold text-[#0F3D8C] mb-0.5">
                  <CountUp end={121} suffix="+" />
                </div>
                <div className="font-ui-label text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                  Products Listed
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-[#E2E8F0]"></div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="font-data-price text-3xl md:text-4xl font-bold text-[#0F3D8C] mb-0.5">
                  <CountUp end={8902} suffix="+" />
                </div>
                <div className="font-ui-label text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                  Safe Transactions
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Float Banner */}
        <section className="bg-[#0F3D8C] py-5 text-white">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#10B981] text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              <p className="font-body-md-bold text-sm md:text-base font-semibold">
                Your money is held safely by Float until you confirm your order.
              </p>
            </div>
            <Link
              className="font-ui-label text-[#10B981] hover:text-white transition-colors flex items-center gap-1.5 underline underline-offset-4 whitespace-nowrap text-xs md:text-sm font-semibold"
              to="/how-it-works"
            >
              How Float Works <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-14 md:py-20 bg-background">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
            <div className="text-center mb-12 md:mb-14">
              <h2 className="font-display-h2 text-2xl md:text-3xl text-[#0F172A] font-bold mb-2.5">Secure trading in 3 steps</h2>
              <p className="font-body-lg text-sm md:text-base text-[#64748B] max-w-xl mx-auto">
                We've removed the risk from buying electronics online.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center p-6 md:p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-[#0F3D8C] mb-6">
                  <span className="material-symbols-outlined text-[32px]">search</span>
                </div>
                <h3 className="font-body-md-bold text-lg text-[#0F172A] font-bold mb-2">1. Browse Verified Gear</h3>
                <p className="font-body-md text-sm text-[#64748B] leading-relaxed">
                  Find what you need from sellers who have passed our physical vetting process.
                </p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center p-6 md:p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all relative">
                <div className="hidden md:block absolute top-16 -left-4 w-8 border-t-2 border-dashed border-[#CBD5E1]"></div>
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-[#0F3D8C] mb-6">
                  <span className="material-symbols-outlined text-[32px]">account_balance</span>
                </div>
                <h3 className="font-body-md-bold text-lg text-[#0F172A] font-bold mb-2">2. Pay into Float</h3>
                <p className="font-body-md text-sm text-[#64748B] leading-relaxed">
                  Your payment is held in a secure, financial-grade escrow account, not sent to the seller.
                </p>
                <div className="hidden md:block absolute top-16 -right-4 w-8 border-t-2 border-dashed border-[#CBD5E1]"></div>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center p-6 md:p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-[#10B981] mb-6">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <h3 className="font-body-md-bold text-lg text-[#0F172A] font-bold mb-2">3. Confirm Delivery</h3>
                <p className="font-body-md text-sm text-[#64748B] leading-relaxed">
                  Once you receive and test the item, approve the transaction to release funds to the seller.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Recently Listed Products Grid */}
        <section className="py-14 md:py-20 bg-white border-t border-[#E2E8F0]">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="font-display-h2 text-2xl md:text-3xl text-[#0F172A] font-bold mb-1.5">Recently Listed</h2>
                <p className="font-body-md text-sm text-[#64748B]">All items backed by Float protection.</p>
              </div>
              <Link
                className="font-body-md-bold text-[#0F3D8C] hover:text-[#0A2D6B] hidden md:inline-flex items-center gap-1.5 text-sm font-semibold"
                to="/browse"
              >
                View All <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {SAMPLE_PRODUCTS.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="group bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-square bg-slate-50 relative overflow-hidden">
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-grow gap-2.5">
                    <div className="flex justify-between items-start">
                      <span className="font-ui-label text-xs text-[#64748B] uppercase font-semibold tracking-wider">
                        {p.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                      </span>
                    </div>
                    <h3 className="font-body-md-bold text-sm text-[#0F172A] font-bold line-clamp-1">
                      {p.title}
                    </h3>
                    <div className="mt-auto pt-3 border-t border-[#E2E8F0] flex flex-col gap-2.5">
                      <span className="font-mono text-lg font-bold text-[#0F172A]">
                        KSh {p.price.toLocaleString()}
                      </span>
                      <Link
                        to={`/product/${p.id}`}
                        className="w-full text-center py-2 bg-[#EEF2FF] text-[#0F3D8C] hover:bg-[#0F3D8C] hover:text-white border border-[#0F3D8C]/20 rounded-lg font-body-md-bold text-xs transition-all block font-semibold"
                      >
                        Buy with Float
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center md:hidden">
              <Link
                className="font-body-md-bold text-[#0F3D8C] inline-block border border-[#0F3D8C] px-5 py-2 rounded-lg text-sm font-semibold"
                to="/browse"
              >
                View All Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Top Verified Vendors */}
        <section className="py-14 md:py-20 bg-background">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
            <div className="mb-10 md:mb-12">
              <h2 className="font-display-h2 text-2xl md:text-3xl text-[#0F172A] font-bold mb-1.5">Top Verified Vendors</h2>
              <p className="font-body-lg text-sm md:text-base text-[#64748B]">Trusted shops with proven track records.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Vendor 1 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-[#0F3D8C] text-white flex items-center justify-center font-display-h2 text-xl font-bold">
                    N
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="font-body-md-bold text-base text-[#0F172A] font-bold">Nairobi Tech Hub</h3>
                      <span className="material-symbols-outlined text-[16px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#64748B] font-ui-label text-xs">
                      <span className="material-symbols-outlined text-[15px]">location_on</span>
                      <span>CBD, Nairobi</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[#E2E8F0] w-full mb-4"></div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="font-data-id text-xs font-semibold text-[#0F172A]">4.9 (312 reviews)</span>
                </div>
              </div>

              {/* Vendor 2 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-[#0F3D8C] text-white flex items-center justify-center font-display-h2 text-xl font-bold">
                    E
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="font-body-md-bold text-base text-[#0F172A] font-bold">Elite Gadgets</h3>
                      <span className="material-symbols-outlined text-[16px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#64748B] font-ui-label text-xs">
                      <span className="material-symbols-outlined text-[15px]">location_on</span>
                      <span>Westlands, Nairobi</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[#E2E8F0] w-full mb-4"></div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="font-data-id text-xs font-semibold text-[#0F172A]">4.8 (189 reviews)</span>
                </div>
              </div>

              {/* Vendor 3 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-[#0F3D8C] text-white flex items-center justify-center font-display-h2 text-xl font-bold">
                    M
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="font-body-md-bold text-base text-[#0F172A] font-bold">Mombasa iStore</h3>
                      <span className="material-symbols-outlined text-[16px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#64748B] font-ui-label text-xs">
                      <span className="material-symbols-outlined text-[15px]">location_on</span>
                      <span>Nyali, Mombasa</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[#E2E8F0] w-full mb-4"></div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="font-data-id text-xs font-semibold text-[#0F172A]">4.9 (245 reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Repair Services */}
        <section className="py-16 md:py-24 bg-[#0F172A]">
          <div className="max-w-[1360px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-14 items-center">
            <div className="flex flex-col gap-5 md:gap-6">
              <div className="flex items-center gap-2 text-[#3B82F6] font-ui-label uppercase tracking-wider font-semibold text-xs">
                <span className="material-symbols-outlined text-[18px]">build</span>
                <span>Repair Services</span>
              </div>
              <h2 className="font-display-h1-mobile md:font-display-h1 text-2xl md:text-4xl text-white leading-tight font-bold">Device broken? We can fix that.</h2>
              <p className="font-body-lg text-[#94A3B8] max-w-lg leading-relaxed text-sm md:text-base">
                Book repairs with certified technicians. Transparent pricing, genuine parts, and guaranteed workmanship.
              </p>
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#10B981] bg-slate-800 rounded-full p-1 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white text-sm font-medium">Certified Technicians</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#10B981] bg-slate-800 rounded-full p-1 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white text-sm font-medium">Genuine Parts Guarantee</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#10B981] bg-slate-800 rounded-full p-1 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white text-sm font-medium">90-Day Repair Warranty</span>
                </div>
              </div>
              <div className="mt-3">
                <Link
                  to="/repairs"
                  className="bg-[#0F3D8C] text-white px-6 py-3 rounded-lg font-body-md-bold hover:bg-[#0A2D6B] transition-all inline-flex items-center gap-2 shadow-md text-sm font-bold"
                >
                  Find a technician <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden shadow-xl border border-slate-700">
              <img
                alt="Professional technician repairing a smartphone"
                className="w-full h-auto object-cover aspect-[4/3]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYAqbQ90iiDsZovWE9OCcD3ekhKt6FWjY0fywGPiNtSVe7-So7bY0DKS98IUoWEOXnXa_2_E0oxv9T7ZTwShXm1-Vcvm38WdIM92KTkvpyopqwmwn_pw9Eeq_GWjOYMgTswRlxZbKZ_v1KKF1CEi2x3LbyL21l9STEvAPISc2ZABNtL_ByVydRU8cIHkuvYWYDhte-u84TvnjC0TuEyCKN8RMkMqYTrtrSsLT-lIbPVdfSPMNdE7F88A"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
