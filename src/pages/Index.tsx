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
      <main>
        {/* Hero Section - 100% matched to landing.PNG */}
        <section className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#f2f3ff] to-[#faf8ff] py-12 md:py-20">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center relative z-10">
            {/* Left Content */}
            <div className="flex flex-col gap-6">
              <span className="font-ui-label text-xs md:text-sm text-[#0f3d8c] uppercase tracking-wider font-bold">
                KENYA'S VERIFIED TECH MARKETPLACE
              </span>
              <h1 className="font-display-h1-mobile md:font-display-h1 text-3xl sm:text-4xl md:text-5xl lg:text-[48px] text-[#131b2e] font-bold leading-[1.15] tracking-tight">
                Buy and Sell Tech You Can Actually{" "}
                <span className="text-[#0f3d8c] relative inline-block whitespace-nowrap">
                  Trust
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#25c65f]" preserveAspectRatio="none" viewBox="0 0 100 20">
                    <path d="M0,10 Q50,20 100,10" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  </svg>
                </span>
              </h1>
              <p className="font-body-lg text-base md:text-lg text-[#434651] max-w-lg leading-relaxed">
                Every vendor is physically inspected. Every payment is held in Float until you confirm delivery. No risk. No Suprises.
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-[#c4c6d3]/30">
                  <span className="material-symbols-outlined text-[16px] text-[#0f3d8c]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-ui-label text-xs md:text-sm text-[#131b2e] font-medium">Float-protected</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-[#c4c6d3]/30">
                  <span className="material-symbols-outlined text-[16px] text-[#25c65f]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  <span className="font-ui-label text-xs md:text-sm text-[#131b2e] font-medium">Verified vendors</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-[#c4c6d3]/30">
                  <span className="material-symbols-outlined text-[16px] text-[#2170e4]">
                    handshake
                  </span>
                  <span className="font-ui-label text-xs md:text-sm text-[#131b2e] font-medium">Dispute resolution</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-2 flex gap-4">
                <Link
                  to="/browse"
                  className="bg-[#0f3d8c] text-white px-6 py-3 rounded-lg font-bold text-base hover:bg-[#002766] transition-colors shadow-sm inline-flex items-center justify-center"
                >
                  Browse Verified Tech
                </Link>
              </div>
            </div>

            {/* Right Visual Card */}
            <div className="relative flex justify-center md:justify-end">
              <div className="relative bg-white rounded-xl p-4 shadow-md border border-[#c4c6d3]/20 max-w-md w-full transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Verified Listing Badge */}
                <div className="absolute -top-3 -left-3 z-20 bg-[#25c65f] text-white px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 font-bold text-xs">
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
                    <h3 className="font-body-md-bold text-base md:text-lg text-[#131b2e] font-bold">MacBook Pro 14" M2</h3>
                    <p className="font-body-md text-sm text-[#434651] mt-0.5">
                      Vendor: <span className="text-[#0f3d8c] font-medium">Nairobi Tech Hub</span>
                    </p>
                  </div>
                  <span className="font-mono text-lg font-bold text-[#131b2e]">KSh 185,000</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-[#c4c6d3]/20 bg-white">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-8">
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-24 text-center">
              <div>
                <div className="font-mono text-3xl md:text-4xl font-bold text-[#0f3d8c] mb-1">
                  <CountUp end={12} suffix="+" />
                </div>
                <div className="font-ui-label text-xs md:text-sm text-[#434651] uppercase tracking-wide font-semibold">
                  Verified Vendors
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-[#c4c6d3]/30"></div>
              <div>
                <div className="font-mono text-3xl md:text-4xl font-bold text-[#0f3d8c] mb-1">
                  <CountUp end={121} suffix="+" />
                </div>
                <div className="font-ui-label text-xs md:text-sm text-[#434651] uppercase tracking-wide font-semibold">
                  Products Listed
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-[#c4c6d3]/30"></div>
              <div>
                <div className="font-mono text-3xl md:text-4xl font-bold text-[#0f3d8c] mb-1">
                  <CountUp end={8902} suffix="+" />
                </div>
                <div className="font-ui-label text-xs md:text-sm text-[#434651] uppercase tracking-wide font-semibold">
                  Safe Transactions
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Float Banner */}
        <section className="bg-[#0f3d8c] py-4">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#25c65f] text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              <p className="font-body-md-bold text-sm md:text-base text-white font-semibold">
                Your money is held safely by Float until you confirm your order.
              </p>
            </div>
            <Link
              to="/how-it-works"
              className="font-ui-label text-[#25c65f] hover:text-white transition-colors flex items-center gap-1 underline underline-offset-4 text-sm font-semibold"
            >
              How Float Works <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* Secure Trading in 3 Steps */}
        <section className="py-20 md:py-24 bg-[#faf8ff]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <h2 className="font-display-h2 text-3xl md:text-4xl text-[#131b2e] font-bold mb-4">Secure trading in 3 steps</h2>
              <p className="font-body-lg text-base md:text-lg text-[#434651] max-w-2xl mx-auto">
                We've removed the risk from buying electronics online.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-white border border-[#c4c6d3]/20 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#0f3d8c] mb-6">
                  <span className="material-symbols-outlined text-[32px]">search</span>
                </div>
                <h3 className="font-body-md-bold text-lg text-[#131b2e] font-bold mb-2">1. Browse Verified Gear</h3>
                <p className="font-body-md text-sm text-[#434651] leading-relaxed">
                  Find what you need from sellers who have passed our physical vetting process.
                </p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-white border border-[#c4c6d3]/20 shadow-sm relative">
                <div className="hidden md:block absolute top-14 -left-4 w-8 border-t-2 border-dashed border-[#c4c6d3]/50"></div>
                <div className="w-16 h-16 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#0f3d8c] mb-6">
                  <span className="material-symbols-outlined text-[32px]">account_balance</span>
                </div>
                <h3 className="font-body-md-bold text-lg text-[#131b2e] font-bold mb-2">2. Pay into Float</h3>
                <p className="font-body-md text-sm text-[#434651] leading-relaxed">
                  Your payment is held in a secure, financial-grade escrow account, not sent to the seller.
                </p>
                <div className="hidden md:block absolute top-14 -right-4 w-8 border-t-2 border-dashed border-[#c4c6d3]/50"></div>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-white border border-[#c4c6d3]/20 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#25c65f] mb-6">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <h3 className="font-body-md-bold text-lg text-[#131b2e] font-bold mb-2">3. Confirm Delivery</h3>
                <p className="font-body-md text-sm text-[#434651] leading-relaxed">
                  Once you receive and test the item, approve the transaction to release funds to the seller.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Preview Grid */}
        <section className="py-16 md:py-20 bg-white border-t border-[#c4c6d3]/20">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="font-display-h2 text-3xl md:text-4xl text-[#131b2e] font-bold">Recently Listed</h2>
                <p className="font-body-md text-sm text-[#434651] mt-1">All items backed by Float protection.</p>
              </div>
              <Link
                to="/browse"
                className="font-body-md-bold text-[#0f3d8c] hover:text-[#002766] hidden md:inline-flex items-center gap-1 text-sm font-semibold"
              >
                View All <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {SAMPLE_PRODUCTS.slice(0, 4).map((p) => {
                const imgUrl = p.image || p.gallery?.[0] || (p as any).images?.[0] || (p as any).image_urls?.[0] || "/placeholder.svg";
                return (
                  <div
                    key={p.id}
                    className="group bg-white rounded-xl border border-[#c4c6d3]/30 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
                  >
                    <div className="aspect-square bg-slate-50 relative overflow-hidden">
                      <img
                        src={imgUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-ui-label text-xs text-[#434651] font-semibold">{p.category}</span>
                        <span className="flex items-center gap-1 text-[12px] font-medium text-[#25c65f] bg-[#25c65f]/10 px-2 py-0.5 rounded-sm">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                        </span>
                      </div>
                      <h3 className="font-body-md-bold text-base text-[#131b2e] font-bold mb-4 line-clamp-1">{p.title}</h3>
                      <div className="mt-auto pt-4 border-t border-[#c4c6d3]/20 flex flex-col gap-3">
                        <span className="font-mono text-[22px] leading-tight text-[#131b2e] font-bold">
                          KSh {p.price.toLocaleString()}
                        </span>
                        <Link
                          to={`/product/${p.id}`}
                          className="w-full bg-[#f2f3ff] text-[#0f3d8c] hover:bg-[#0f3d8c] hover:text-white border border-[#0f3d8c]/20 px-4 py-2 rounded-lg font-body-md-bold text-xs text-center transition-colors font-semibold"
                        >
                          Buy with Float
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 text-center md:hidden">
              <Link
                to="/browse"
                className="font-body-md-bold text-[#0f3d8c] inline-block border border-[#0f3d8c] px-6 py-2 rounded-lg text-sm font-semibold"
              >
                View All Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Top Verified Vendors */}
        <section className="py-16 md:py-20 bg-[#faf8ff]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <div className="mb-10">
              <h2 className="font-display-h2 text-3xl md:text-4xl text-[#131b2e] font-bold mb-2">Top Verified Vendors</h2>
              <p className="font-body-lg text-base md:text-lg text-[#475569]">Trusted shops with proven track records.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Vendor 1 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-[#0f3d8c] text-white flex items-center justify-center font-display-h2 text-[24px] font-bold">
                    N
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-body-md-bold text-base md:text-lg text-[#131b2e] font-bold">Nairobi Tech Hub</h3>
                      <span className="material-symbols-outlined text-[16px] text-[#25c65f]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#434651] font-ui-label text-sm">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span>CBD, Nairobi</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[#E2E8F0] w-full mb-4"></div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="font-mono text-sm font-medium text-[#131b2e]">4.9 (312 reviews)</span>
                </div>
              </div>

              {/* Vendor 2 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-[#0f3d8c] text-white flex items-center justify-center font-display-h2 text-[24px] font-bold">
                    E
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-body-md-bold text-base md:text-lg text-[#131b2e] font-bold">Elite Gadgets</h3>
                      <span className="material-symbols-outlined text-[16px] text-[#25c65f]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#434651] font-ui-label text-sm">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span>Westlands, Nairobi</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[#E2E8F0] w-full mb-4"></div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="font-mono text-sm font-medium text-[#131b2e]">4.8 (189 reviews)</span>
                </div>
              </div>

              {/* Vendor 3 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-[#0f3d8c] text-white flex items-center justify-center font-display-h2 text-[24px] font-bold">
                    M
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-body-md-bold text-base md:text-lg text-[#131b2e] font-bold">Mombasa iStore</h3>
                      <span className="material-symbols-outlined text-[16px] text-[#25c65f]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#434651] font-ui-label text-sm">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span>Nyali, Mombasa</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[#E2E8F0] w-full mb-4"></div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="font-mono text-sm font-medium text-[#131b2e]">4.9 (245 reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Repair Services */}
        <section className="py-20 md:py-24 bg-[#0F172A]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 text-[#3B82F6] font-ui-label uppercase tracking-wider font-semibold text-sm">
                <span className="material-symbols-outlined text-[20px]">build</span>
                <span>Repair Services</span>
              </div>
              <h2 className="font-display-h1-mobile md:font-display-h1 text-3xl md:text-4xl text-white leading-tight font-bold">Device broken? We can fix that.</h2>
              <p className="font-body-lg text-[#94A3B8] max-w-lg leading-relaxed text-base md:text-lg">
                Book repairs with certified technicians. Transparent pricing, genuine parts, and guaranteed workmanship.
              </p>
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#25c65f] bg-slate-800 rounded-full p-1 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white text-base font-medium">Certified Technicians</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#25c65f] bg-slate-800 rounded-full p-1 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white text-base font-medium">Genuine Parts Guarantee</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#25c65f] bg-slate-800 rounded-full p-1 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white text-base font-medium">90-Day Repair Warranty</span>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  to="/repairs"
                  className="bg-[#0f3d8c] text-white px-6 py-3 rounded-lg font-body-md-bold hover:bg-[#002766] transition-colors inline-flex items-center gap-2 shadow-sm font-bold text-sm"
                >
                  Find a technician <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
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
