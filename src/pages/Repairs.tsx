import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isVendorVerified } from "@/lib/format";

const Repairs = () => {
  // This page was entirely static, so a customer could never see who actually
  // repairs things. List the vendors who enabled repairs at onboarding AND
  // have been through the admin's three vetting checks - ticking the box alone
  // is only an application, not a licence to appear here.
  const [techs, setTechs] = useState<any[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(true);
  const [myRepairs, setMyRepairs] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vendor_profiles")
        .select("id, business_name, city, county, physical_address, average_rating, verification_status, shop_photo_urls")
        .eq("offers_repairs", true)
        .eq("repair_application_status", "approved")
        .order("average_rating", { ascending: false });
      setTechs(data ?? []);
      setLoadingTechs(false);
    })();
  }, []);

  // A customer's own repairs, so this page answers "how is my repair going?"
  // without them having to hunt for the notification that mentioned it.
  useEffect(() => {
    if (!user) {
      setMyRepairs([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("repair_requests")
        .select("id, device_description, status, quoted_price_ksh, payment_status, customer_rating, created_at, vendor:vendor_profiles(business_name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      setMyRepairs(data ?? []);
    })();
  }, [user]);

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
        {/* Your own repairs, first thing on the page. Previously the only way
            back to a repair in progress was the notification that announced it,
            so once that was read the repair was effectively lost. */}
        {myRepairs.length > 0 && (
          <section className="py-14 md:py-16 bg-[#F8FAFC] border-t border-[#E2E8F0]">
            <div className="max-w-container-max mx-auto px-6 md:px-12">
              <h2 className="font-display-h2 text-2xl md:text-3xl text-[#0F172A] font-bold mb-1">
                Your repairs
              </h2>
              <p className="text-sm text-[#64748B] mb-6">
                Tap any repair to see its progress, approve a quote, pay, or confirm the work.
              </p>
              <div className="grid gap-3">
                {myRepairs.map((r) => (
                  <Link
                    key={r.id}
                    to={`/repairs/${r.id}`}
                    className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-wrap items-center justify-between gap-3 hover:shadow-md hover:border-[#0F3D8C]/30 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#0F172A] truncate">
                        {r.device_description}
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {r.vendor?.business_name ?? "Technician"} · #{r.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.quoted_price_ksh != null && (
                        <span className="font-mono text-sm font-bold text-[#0F172A]">
                          KES {Number(r.quoted_price_ksh).toLocaleString()}
                        </span>
                      )}
                      {r.payment_status === "held" && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          In Float
                        </span>
                      )}
                      <span className="text-[11px] font-bold capitalize text-[#0F3D8C] bg-[#EEF2FF] border border-[#0F3D8C]/20 px-2.5 py-1 rounded-full">
                        {String(r.status).replace(/_/g, " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Verified technicians, straight from vendor_profiles. */}
        <section className="py-20 md:py-28 bg-white border-t border-[#E2E8F0]">
          <div className="max-w-container-max mx-auto px-6 md:px-12">
            <div className="mb-12">
              <h2 className="font-display-h2 text-3xl md:text-4xl text-[#0F172A] font-bold mb-2">
                Verified repair technicians
              </h2>
              <p className="text-base text-[#64748B]">
                Every shop below has passed our physical inspection. Pick one and book directly.
              </p>
            </div>

            {loadingTechs ? (
              <p className="text-sm text-[#64748B]">Loading technicians...</p>
            ) : techs.length === 0 ? (
              /* The old copy said a vendor appears here as soon as they tick
                 "Offer repair services", which is not true and is why a shop
                 that had signed up looked like it had vanished. Listing also
                 requires TechTrust to clear three vetting checks. */
              <div className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-12 text-center">
                <p className="font-semibold text-[#0F172A]">No repair technicians listed yet</p>
                <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto">
                  A shop appears here after it ticks <strong>Offer repair services</strong> and TechTrust
                  clears its three vetting checks - identity, repair skills, and safety. Applications
                  waiting on us are in the admin Repairs tab.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {techs.map((t) => (
                  <div key={t.id} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#0F3D8C]/10 flex items-center justify-center text-[#0F3D8C] font-bold">
                        {(t.business_name || "?").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[#0F172A] truncate">{t.business_name}</h3>
                        <p className="text-xs text-[#64748B] truncate">
                          {[t.physical_address, t.city].filter(Boolean).join(", ") || "Kenya"}
                        </p>
                      </div>
                    </div>

                    {isVendorVerified(t.verification_status) && (
                      <span className="inline-flex items-center gap-1 self-start bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2.5 py-1 rounded-full text-[11px] font-bold mb-4">
                        <span className="material-symbols-outlined text-[14px]">verified_user</span>
                        Physically Verified
                      </span>
                    )}

                    <Link
                      to={`/book-repair?vendor=${t.id}`}
                      className="mt-auto w-full text-center bg-[#0F3D8C] hover:bg-[#002766] text-white py-2.5 rounded-lg font-bold text-sm transition-colors"
                    >
                      Book with this technician
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Repairs;
