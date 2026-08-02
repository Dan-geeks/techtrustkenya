import { useEffect } from "react";
import { Link } from "react-router-dom";

const Repairs = () => {
  useEffect(() => {
    document.title = "Certified Tech Repairs | TechTrust Kenya";
    window.scrollTo(0, 0);

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
      <main className="flex flex-col gap-12 md:gap-20">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-container-low to-background pt-12 md:pt-20 pb-20 md:pb-28 border-b border-outline-variant/20">
          <div className="max-w-container-max mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative z-10">
            {/* Left Content */}
            <div className="flex flex-col gap-6 md:gap-8">
              <div className="flex items-center gap-2 text-[#0F3D8C] font-ui-label text-xs md:text-sm uppercase tracking-wider font-bold">
                <span className="material-symbols-outlined text-[20px]">build</span>
                <span>Verified Repair Network</span>
              </div>
              <h1 className="font-display-h1-mobile md:font-display-h1 text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight">
                Certified Tech Repairs You Can Rely On
              </h1>
              <p className="font-body-lg text-base md:text-lg text-[#64748B] max-w-lg leading-relaxed">
                Connect with physically inspected technicians in Nairobi, Mombasa & Kisumu. Your money is secured in Float escrow until you test and approve the repair.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/book-repair"
                  className="bg-[#0F3D8C] text-white px-8 py-3.5 rounded-lg font-body-md-bold text-base hover:bg-[#0A2D6B] transition-all duration-200 shadow-md inline-block font-semibold"
                >
                  Book a Repair
                </Link>
                <div className="flex items-center gap-2 px-5 py-3.5 bg-[#EEF2FF] rounded-lg text-[#0F3D8C] font-ui-label text-sm border border-[#0F3D8C]/20 font-semibold">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    shield
                  </span>
                  <span>Float Protected Escrow</span>
                </div>
              </div>
            </div>

            {/* Right Visual Image */}
            <div className="relative flex justify-center md:justify-end">
              <div className="relative w-full max-w-md h-[340px] md:h-[380px] rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC2TUz52lHXtE5HuMmxUxTM9wAGitz7ARgCTKhnpn_XPap05bITnDuSpgZFZsWsU81AqKwPLwm2vgjQD9LpPFPie9PXyuF0Pjwr_RmCG9f4ODkyIBlIbzbvCTpRQpP_-95yUZbTptuJi8R5pE9uHFvZD5ptVjKQUoqzhYH8qGlvXzf1iSjxWhnp96JHQe5ZtzrE3FLnWhNu6Jh1a2c5Ookzizc2GdXXrEUJLEUgCQPz5PZO2ilpevEICw')",
                  }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* 5-Step Process Section */}
        <section className="py-20 md:py-28 bg-white border-b border-[#E2E8F0]">
          <div className="max-w-container-max mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <h2 className="font-display-h2 text-3xl md:text-4xl text-[#0F172A] font-bold mb-4">The Secure 5-Step Repair Process</h2>
              <p className="text-base md:text-lg text-[#64748B] max-w-2xl mx-auto">
                No hidden costs, no unauthorized part swaps. Full transparency from diagnosis to payout release.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-[#E2E8F0] shadow-sm">
                <div className="w-14 h-14 rounded-full bg-[#0F3D8C] text-white flex items-center justify-center mb-4 font-bold shadow-sm">
                  <span className="material-symbols-outlined">build</span>
                </div>
                <h3 className="font-body-md-bold text-base text-[#0F172A] font-bold mb-1">1. Diagnosis</h3>
                <p className="text-xs text-[#64748B]">Shop inspects device hardware</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-[#E2E8F0] shadow-sm">
                <div className="w-14 h-14 rounded-full bg-[#0F3D8C] text-white flex items-center justify-center mb-4 font-bold shadow-sm">
                  <span className="material-symbols-outlined">request_quote</span>
                </div>
                <h3 className="font-body-md-bold text-base text-[#0F172A] font-bold mb-1">2. Quote</h3>
                <p className="text-xs text-[#64748B]">Receive exact upfront quote</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#EEF2FF] border border-[#0F3D8C]/30 shadow-md">
                <div className="w-14 h-14 rounded-full bg-[#0F3D8C] text-white flex items-center justify-center mb-4 font-bold shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    lock
                  </span>
                </div>
                <h3 className="font-body-md-bold text-base text-[#0F3D8C] font-bold mb-1">3. Float Hold</h3>
                <p className="text-xs text-[#0F3D8C] font-medium">Funds locked in escrow</p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-[#E2E8F0] shadow-sm">
                <div className="w-14 h-14 rounded-full bg-[#0F3D8C] text-white flex items-center justify-center mb-4 font-bold shadow-sm">
                  <span className="material-symbols-outlined">hardware</span>
                </div>
                <h3 className="font-body-md-bold text-base text-[#0F172A] font-bold mb-1">4. Repair</h3>
                <p className="text-xs text-[#64748B]">Certified repair performed</p>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-[#10B981] text-white flex items-center justify-center mb-4 font-bold shadow-sm">
                  <span className="material-symbols-outlined">task_alt</span>
                </div>
                <h3 className="font-body-md-bold text-base text-emerald-900 font-bold mb-1">5. Payout Release</h3>
                <p className="text-xs text-emerald-700 font-medium">You approve payout</p>
              </div>
            </div>
          </div>
        </section>

        {/* Standard Services */}
        <section className="py-20 md:py-28 bg-background">
          <div className="max-w-container-max mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
              <div>
                <h2 className="font-display-h2 text-3xl md:text-4xl text-[#0F172A] font-bold mb-2">Standard Repair Services</h2>
                <p className="text-base text-[#64748B]">All repairs include 90-day warranty &amp; genuine replacement parts.</p>
              </div>
              <span className="inline-flex items-center gap-2 bg-[#10B981] text-white px-4 py-2 rounded-lg font-ui-label text-xs font-semibold">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                Physical inspection badges for all technician shops
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Service 1 */}
              <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F3D8C]">
                    <span className="material-symbols-outlined text-3xl">smartphone</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-[#0F3D8C]">KES 8,000 - 25,000</span>
                </div>
                <h3 className="font-body-md-bold text-xl text-[#0F172A] font-bold mb-2">Screen &amp; Display Replacement</h3>
                <p className="text-sm text-[#64748B] mb-6 flex-grow leading-relaxed">
                  OEM and premium aftermarket OLED/LCD options for iPhone, Samsung, Google Pixel &amp; MacBooks.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2 text-[#0F3D8C] text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px]">engineering</span> Certified Technicians Only
                  </div>
                  <div className="flex items-center gap-2 text-[#10B981] text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px]">gpp_good</span> Float Protected Escrow
                  </div>
                </div>
              </div>

              {/* Service 2 */}
              <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F3D8C]">
                    <span className="material-symbols-outlined text-3xl">battery_charging_full</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-[#0F3D8C]">KES 4,500 - 9,000</span>
                </div>
                <h3 className="font-body-md-bold text-xl text-[#0F172A] font-bold mb-2">Battery Replacement</h3>
                <p className="text-sm text-[#64748B] mb-6 flex-grow leading-relaxed">
                  Full battery health diagnostic check included. Restore your device's original daily battery capacity.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2 text-[#0F3D8C] text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px]">engineering</span> Certified Technicians Only
                  </div>
                  <div className="flex items-center gap-2 text-[#10B981] text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px]">gpp_good</span> Float Protected Escrow
                  </div>
                </div>
              </div>

              {/* Service 3 */}
              <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F3D8C]">
                    <span className="material-symbols-outlined text-3xl">memory</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-[#0F3D8C]">KES 15,000 - 40,000</span>
                </div>
                <h3 className="font-body-md-bold text-xl text-[#0F172A] font-bold mb-2">Logic Board Micro-soldering</h3>
                <p className="text-sm text-[#64748B] mb-6 flex-grow leading-relaxed">
                  Advanced micro-soldering, liquid damage recovery, power IC chip replacement, and board-level repairs.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2 text-[#0F3D8C] text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px]">engineering</span> Certified Technicians Only
                  </div>
                  <div className="flex items-center gap-2 text-[#10B981] text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px]">gpp_good</span> Float Protected Escrow
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Repairs;
