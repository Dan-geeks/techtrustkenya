import { useEffect } from "react";
import { Link } from "react-router-dom";

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
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-container-low to-background py-16 md:py-24">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
            {/* Left Content */}
            <div className="flex flex-col gap-6">
              <span className="font-ui-label text-ui-label text-primary-container uppercase tracking-wider">
                Kenya's Verified Tech Marketplace
              </span>
              <h1 className="font-display-h1-mobile md:font-display-h1 text-display-h1-mobile md:text-display-h1 text-on-background">
                Buy and Sell Tech You Can Actually{" "}
                <span className="text-primary-container relative whitespace-nowrap">
                  Trust
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-on-tertiary-container" preserveAspectRatio="none" viewBox="0 0 100 20">
                    <path d="M0,10 Q50,20 100,10" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  </svg>
                </span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
                Every vendor is physically inspected. Every payment is held in Float until you confirm delivery. No risk. No Suprises.
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-full shadow-sm border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[16px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-ui-label text-ui-label text-on-surface">Float-protected</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-full shadow-sm border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[16px] text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  <span className="font-ui-label text-ui-label text-on-surface">Verified vendors</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-full shadow-sm border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[16px] text-secondary-container">handshake</span>
                  <span className="font-ui-label text-ui-label text-on-surface">Dispute resolution</span>
                </div>
              </div>
              <div className="mt-4 flex gap-4">
                <Link to="/browse" className="bg-primary-container text-on-primary px-6 py-3 rounded-lg font-body-md-bold text-body-md-bold hover:bg-primary transition-colors shadow-sm inline-block">
                  Start Browsing
                </Link>
                <Link to="/vendor/register" className="border border-primary-container text-primary-container px-6 py-3 rounded-lg font-body-md-bold text-body-md-bold hover:bg-primary-container hover:text-on-primary transition-colors inline-block">
                  List Your Shop
                </Link>
              </div>
            </div>
            {/* Right Visual */}
            <div className="relative flex justify-center md:justify-end">
              <div className="relative bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/20 max-w-md w-full transform rotate-1 hover:rotate-0 transition-transform duration-500 md:-translate-x-8">
                {/* Badge */}
                <div className="absolute -top-3 -left-3 z-20 bg-on-tertiary-container text-white px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    shield
                  </span>
                  <span className="font-body-md-bold text-ui-label">Verified Listing</span>
                </div>
                <div className="rounded-lg overflow-hidden bg-surface-container-low aspect-[4/3] relative">
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
                    <h3 className="font-body-md-bold text-body-md-bold text-on-background">MacBook Pro 14" M2</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Vendor: <span className="text-primary font-medium">Nairobi Tech Hub</span>
                    </p>
                  </div>
                  <span className="font-data-price text-data-price text-on-background">KSh 185,000</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-outline-variant/20 bg-surface-container-lowest">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-24 text-center">
              <div>
                <div className="font-data-price text-display-h2 text-primary-container mb-1">12+</div>
                <div className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-wide">
                  Verified Vendors
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-outline-variant/30"></div>
              <div>
                <div className="font-data-price text-display-h2 text-primary-container mb-1">121+</div>
                <div className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-wide">
                  Products Listed
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-outline-variant/30"></div>
              <div>
                <div className="font-data-price text-display-h2 text-primary-container mb-1">8,902+</div>
                <div className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-wide">
                  Safe Transactions
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Float Banner */}
        <section className="bg-primary-container py-4">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-tertiary-container text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              <p className="font-body-md-bold text-body-md-bold text-on-primary">
                Your money is held safely by Float until you confirm your order.
              </p>
            </div>
            <Link
              className="font-ui-label text-ui-label text-on-tertiary-container hover:text-white transition-colors flex items-center gap-1 underline underline-offset-4"
              to="/how-it-works"
            >
              How Float Works <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-background">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="text-center mb-16">
              <h2 className="font-display-h2 text-display-h2 text-on-background mb-4">Secure trading in 3 steps</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                We've removed the risk from buying electronics online.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-primary-container mb-6">
                  <span className="material-symbols-outlined text-[32px]">search</span>
                </div>
                <h3 className="font-body-md-bold text-body-md-bold text-on-background mb-2">1. Browse Verified Gear</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Find what you need from sellers who have passed our physical vetting process.
                </p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm relative">
                <div className="hidden md:block absolute top-14 -left-4 w-8 border-t-2 border-dashed border-outline-variant/50"></div>
                <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-primary-container mb-6">
                  <span className="material-symbols-outlined text-[32px]">account_balance</span>
                </div>
                <h3 className="font-body-md-bold text-body-md-bold text-on-background mb-2">2. Pay into Float</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Your payment is held in a secure, financial-grade escrow account, not sent to the seller.
                </p>
                <div className="hidden md:block absolute top-14 -right-4 w-8 border-t-2 border-dashed border-outline-variant/50"></div>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-on-tertiary-container mb-6">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <h3 className="font-body-md-bold text-body-md-bold text-on-background mb-2">3. Confirm Delivery</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Once you receive and test the item, approve the transaction to release funds to the seller.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Preview Grid */}
        <section className="py-16 bg-surface-container-lowest border-t border-outline-variant/20">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="font-display-h2 text-display-h2 text-on-background">Recently Listed</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">All items backed by Float protection.</p>
              </div>
              <Link
                className="font-body-md-bold text-body-md-bold text-primary-container hover:text-primary hidden md:inline-flex items-center gap-1"
                to="/browse"
              >
                View All <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="group bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-surface-container-high transition-all duration-300 flex flex-col">
                <div className="aspect-square bg-surface-container-low relative">
                  <div
                    className="absolute inset-0 bg-cover bg-center w-full h-full"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBdhrRGXHbRXPN-L86ppaitJv80VCBifa_ZbT98SAOGMJszWAuJCPJznoAHRKLcb5YSBOCWNxN23utz56npO8QsomqeLrtGOJsTvOokDKiaOg13F1sJzixUDikLQkWDKrocsse9cK62yucx5aLjTLVszSpegeyJlTLgNBzjDNlAdtCycoee5JmZXYhHwnb_wBDMqrx2K8oq-OOS6DJvtPwXl0B_kb9OEjIhG73IB6T1YEVVz4FwrcXI3g')",
                    }}
                  ></div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-ui-label text-ui-label text-on-surface-variant">Smartphones</span>
                    <span className="flex items-center gap-1 text-[12px] font-medium text-on-tertiary-container bg-tertiary-container/10 px-2 py-0.5 rounded-sm">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                    </span>
                  </div>
                  <h3 className="font-body-md-bold text-body-md-bold text-on-background mb-4">Samsung Galaxy S23 Ultra</h3>
                  <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-3">
                    <span className="font-data-price text-[22px] leading-tight text-on-background">KSh 145,000</span>
                    <Link
                      to="/browse"
                      className="w-full text-center py-2 bg-surface-container-low text-primary-container hover:bg-primary-container hover:text-on-primary border border-primary-container/20 rounded-lg font-body-md-bold text-body-md-bold transition-colors block"
                    >
                      Buy with Float
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="group bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-surface-container-high transition-all duration-300 flex flex-col">
                <div className="aspect-square bg-surface-container-low relative">
                  <div
                    className="absolute inset-0 bg-cover bg-center w-full h-full"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCoVEcfhWGo2okdJQ6WkKbOCCftiAQT-aNoBeaIfKeQtmpwxggnl745y6tSWtVlQwIqg7M5NCMNqtYEqbMbqLY6GJQX2btPigttK4BtrTpM0ucR1pplF0j0cGoSaUe6FOeee_IRlElFdNFI9qOZXmDS7g8OvnNqpOqHBH6cvPYhKTE83aMILOI-emQXf_94jGuvGLu_SzP4tJVIUKc1k9-W_LNtrCn83S-YfSqwAKbttUcXh2oTHdnZ7g')",
                    }}
                  ></div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-ui-label text-ui-label text-on-surface-variant">Cameras</span>
                    <span className="flex items-center gap-1 text-[12px] font-medium text-on-tertiary-container bg-tertiary-container/10 px-2 py-0.5 rounded-sm">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                    </span>
                  </div>
                  <h3 className="font-body-md-bold text-body-md-bold text-on-background mb-4">Sony A7 IV Body Only</h3>
                  <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-3">
                    <span className="font-data-price text-[22px] leading-tight text-on-background">KSh 320,000</span>
                    <Link
                      to="/browse"
                      className="w-full text-center py-2 bg-surface-container-low text-primary-container hover:bg-primary-container hover:text-on-primary border border-primary-container/20 rounded-lg font-body-md-bold text-body-md-bold transition-colors block"
                    >
                      Buy with Float
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="group bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-surface-container-high transition-all duration-300 flex flex-col">
                <div className="aspect-square bg-surface-container-low relative">
                  <div
                    className="absolute inset-0 bg-cover bg-center w-full h-full"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCGrQg9voAWYfnwRbHdyCc1WlJ6yt42k4HrGpbcfmMBkqqWsf1t8UYU6BhNwnnUORD0Ovvdcs-cVFhC5dN6khxoenX-qXr056Mi1-i4WGGg9LL4Urp7bhTsAHtOl8cvTNBqHSV-T-wCPAEPsLx3y6Yf0wLCKmZEdWJe9J4uZ9dEiYJ-ZtN0g1R4R3LukPvIrd_FZV0jYck0B9lzOkVwJeOTMOcU1yKxP12wSM7Kqq6Od9k7o5I5JUPqBQ')",
                    }}
                  ></div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-ui-label text-ui-label text-on-surface-variant">Audio</span>
                    <span className="flex items-center gap-1 text-[12px] font-medium text-on-tertiary-container bg-tertiary-container/10 px-2 py-0.5 rounded-sm">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                    </span>
                  </div>
                  <h3 className="font-body-md-bold text-body-md-bold text-on-background mb-4">Sony WH-1000XM5</h3>
                  <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-3">
                    <span className="font-data-price text-[22px] leading-tight text-on-background">KSh 45,000</span>
                    <Link
                      to="/browse"
                      className="w-full text-center py-2 bg-surface-container-low text-primary-container hover:bg-primary-container hover:text-on-primary border border-primary-container/20 rounded-lg font-body-md-bold text-body-md-bold transition-colors block"
                    >
                      Buy with Float
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="group bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-surface-container-high transition-all duration-300 flex flex-col">
                <div className="aspect-square bg-surface-container-low relative">
                  <div
                    className="absolute inset-0 bg-cover bg-center w-full h-full"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAD6GY2WscPbhDGU9htCuFVUOrLTqW0wsRRdeZSLFgGIdieuDB5bfCo9PDDyGIkdjJgvuxvlb-vSg4uCGiVUcVZqgPc8lQCJlDPw0DbrtadLsM8T1YdJ04fTU6vuEBrsXYnTNdgLnPTYUhB8nWToEP0zOUwUW2v4jHRgA1HwtRhgh5onzkmvWkmihSwtH6cFfzFMtDCbgf1341gsy07eNrE2EheAZSE_agibsEa3NwR3OhRwoSqS2drag')",
                    }}
                  ></div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-ui-label text-ui-label text-on-surface-variant">Wearables</span>
                    <span className="flex items-center gap-1 text-[12px] font-medium text-on-tertiary-container bg-tertiary-container/10 px-2 py-0.5 rounded-sm">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                    </span>
                  </div>
                  <h3 className="font-body-md-bold text-body-md-bold text-on-background mb-4">Apple Watch Series 8</h3>
                  <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-3">
                    <span className="font-data-price text-[22px] leading-tight text-on-background">KSh 62,500</span>
                    <Link
                      to="/browse"
                      className="w-full text-center py-2 bg-surface-container-low text-primary-container hover:bg-primary-container hover:text-on-primary border border-primary-container/20 rounded-lg font-body-md-bold text-body-md-bold transition-colors block"
                    >
                      Buy with Float
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 text-center md:hidden">
              <Link
                className="font-body-md-bold text-body-md-bold text-primary-container inline-block border border-primary-container px-6 py-2 rounded-lg"
                to="/browse"
              >
                View All Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Top Verified Vendors */}
        <section className="py-16 bg-background">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="mb-10">
              <h2 className="font-display-h2 text-display-h2 text-on-background mb-2">Top Verified Vendors</h2>
              <p className="font-body-lg text-body-lg text-[#475569]">Trusted shops with proven track records.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Vendor 1 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-surface-container-high transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-display-h2 text-[24px]">
                    N
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-body-md-bold text-body-md-bold text-on-background">Nairobi Tech Hub</h3>
                      <span className="material-symbols-outlined text-[16px] text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-on-surface-variant font-ui-label text-[14px]">
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
                  <span className="font-data-id text-[14px] font-medium text-on-background">4.9 (312 reviews)</span>
                </div>
              </div>

              {/* Vendor 2 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-surface-container-high transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-display-h2 text-[24px]">
                    E
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-body-md-bold text-body-md-bold text-on-background">Elite Gadgets</h3>
                      <span className="material-symbols-outlined text-[16px] text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-on-surface-variant font-ui-label text-[14px]">
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
                  <span className="font-data-id text-[14px] font-medium text-on-background">4.8 (189 reviews)</span>
                </div>
              </div>

              {/* Vendor 3 */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-surface-container-high transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-display-h2 text-[24px]">
                    M
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-body-md-bold text-body-md-bold text-on-background">Mombasa iStore</h3>
                      <span className="material-symbols-outlined text-[16px] text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-on-surface-variant font-ui-label text-[14px]">
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
                  <span className="font-data-id text-[14px] font-medium text-on-background">4.9 (245 reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Repair Services */}
        <section className="py-24 bg-[#0F172A]">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 text-[#3B82F6] font-ui-label uppercase tracking-wider">
                <span className="material-symbols-outlined text-[20px]">build</span>
                <span>Repair Services</span>
              </div>
              <h2 className="font-display-h1-mobile md:font-display-h1 text-white">Device broken? We can fix that.</h2>
              <p className="font-body-lg text-[#94A3B8] max-w-lg">
                Book repairs with certified technicians. Transparent pricing, genuine parts, and guaranteed workmanship.
              </p>
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container bg-surface-container-low rounded-full p-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white">Certified Technicians</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container bg-surface-container-low rounded-full p-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white">Genuine Parts Guarantee</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container bg-surface-container-low rounded-full p-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                  <span className="font-body-md text-white">90-Day Repair Warranty</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  to="/repairs"
                  className="bg-[#0F3D8C] text-white px-6 py-3 rounded-lg font-body-md-bold text-body-md-bold hover:bg-primary transition-colors inline-flex items-center gap-2 shadow-sm"
                >
                  Find a technician <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
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
