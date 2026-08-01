import { useEffect } from "react";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  useEffect(() => {
    document.title = "How Float Escrow Works | TechTrust Kenya";

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
      <main className="w-full max-w-container-max mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-20 md:pb-28">
        {/* Hero Section */}
        <section className="mb-16 md:mb-24 text-center max-w-3xl mx-auto">
          <span className="font-ui-label text-xs md:text-sm text-[#0F3D8C] uppercase tracking-wider font-bold mb-3 block">
            Escrow Protection Overview
          </span>
          <h1 className="font-display-h1 text-3xl md:text-5xl font-bold text-[#0F172A] mb-6 leading-tight">
            Financial-Grade Security for Electronics Trading
          </h1>
          <p className="font-body-lg text-base md:text-lg text-[#64748B] leading-relaxed">
            We operate a strict escrow process to guarantee the safety of your funds and the authenticity of your devices. Understand exactly how your transaction is protected every step of the way.
          </p>
        </section>

        {/* Process Timeline */}
        <section className="space-y-24 md:space-y-36 relative">
          {/* Central Line (Desktop) */}
          <div className="hidden md:block absolute left-[50%] top-12 bottom-12 w-px bg-[#E2E8F0] z-0 -translate-x-1/2"></div>

          {/* Step 1: Verification */}
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
            {/* Content Left */}
            <div className="md:w-1/2 order-2 md:order-1 text-left md:text-right md:pr-12">
              <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#0F3D8C] px-3.5 py-1.5 rounded-full mb-4 font-bold text-xs">
                <span>STEP 01</span>
              </div>
              <h2 className="font-display-h2 text-2xl md:text-3xl text-[#0F172A] font-bold mb-4">
                Physical Inspection &amp; Vetting of Vendors
              </h2>
              <p className="font-body-md text-base text-[#64748B] mb-6 leading-relaxed">
                Before a merchant can list high-value electronics on our platform, they undergo rigorous vetting. We conduct physical site visits to verify store premises, business permits, and inventory storage conditions.
              </p>
              <ul className="space-y-3 inline-block text-left">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <span className="font-body-md text-sm text-[#0F172A] font-medium">Physical address &amp; shop building confirmation</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <span className="font-body-md text-sm text-[#0F172A] font-medium">KRA PIN &amp; Business Permit license validation</span>
                </li>
              </ul>
            </div>
            {/* Center Marker */}
            <div className="hidden md:flex w-16 h-16 rounded-full bg-white border-4 border-[#E2E8F0] items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-sm group-hover:border-[#0F3D8C] transition-all duration-300 z-20">
              <span className="material-symbols-outlined text-[#0F3D8C] text-3xl">storefront</span>
            </div>
            {/* Visual Right */}
            <div className="md:w-1/2 order-1 md:order-2 w-full">
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-2 w-full h-[320px] hover:shadow-md transition-all duration-300">
                <div
                  className="bg-cover bg-center w-full h-full rounded-xl"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCEDU3mXcgzsogAN1cju7drN7f8ojrnD0WXewJTgbkGYei0-0pZWIYrWmKZvJpPzzXnlkPLxtIj7KEZ4Tw1aeZrkWU7hiKtRXw9QH3xPt5w51_LvB92C1aj76CkCxpaRFV1hXlczvg5_drdSe7Zec1uTzqhBaCKa6wac7Ag7eTC9dB6rt8RaqmZBx7gEXJ7TPtIEViQvonkB5amzKu7EWPrmBYAq_wQK8m8xpf6IOOEs51C3dIAPt77Vw')",
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Step 2: Escrow Hold */}
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
            {/* Visual Left */}
            <div className="md:w-1/2 w-full">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-sm border border-[#E2E8F0] p-6 w-full h-[320px] flex flex-col justify-center items-center">
                <div className="bg-white w-full max-w-sm rounded-xl shadow-md border border-[#E2E8F0] p-6 space-y-5">
                  <div className="flex justify-between items-center pb-4 border-b border-[#E2E8F0]">
                    <span className="font-body-md text-sm text-[#64748B] font-medium">M-Pesa Escrow Status</span>
                    <div className="bg-[#0F3D8C] text-white px-3 py-1 rounded-full font-mono text-xs uppercase tracking-wider flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[14px]">lock</span> Held in Float
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs text-[#64748B] mb-1 font-medium">Secured Payment Amount</span>
                    <span className="font-mono text-2xl font-bold text-[#0F3D8C]">KES 145,000</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-[#10B981] h-2.5 rounded-full w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Center Marker */}
            <div className="hidden md:flex w-16 h-16 rounded-full bg-white border-4 border-[#E2E8F0] items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-sm group-hover:border-[#0F3D8C] transition-all duration-300 z-20">
              <span className="material-symbols-outlined text-[#0F3D8C] text-3xl">account_balance</span>
            </div>
            {/* Content Right */}
            <div className="md:w-1/2 text-left md:pl-12">
              <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#0F3D8C] px-3.5 py-1.5 rounded-full mb-4 font-bold text-xs">
                <span>STEP 02</span>
              </div>
              <h2 className="font-display-h2 text-2xl md:text-3xl text-[#0F172A] font-bold mb-4">
                The Payment Float Hold
              </h2>
              <p className="font-body-md text-base text-[#64748B] mb-6 leading-relaxed">
                When you place an order, your payment is deposited directly into a financial-grade escrow float account. The vendor is notified to package and dispatch the item, but funds remain locked in Float until you confirm receipt.
              </p>
              <p className="font-body-md-bold text-base text-[#0F3D8C] font-bold">
                ✓ Your money remains yours until you test and confirm your order.
              </p>
            </div>
          </div>

          {/* Step 3: Release */}
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
            {/* Content Left */}
            <div className="md:w-1/2 order-2 md:order-1 text-left md:text-right md:pr-12">
              <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#0F3D8C] px-3.5 py-1.5 rounded-full mb-4 font-bold text-xs">
                <span>STEP 03</span>
              </div>
              <h2 className="font-display-h2 text-2xl md:text-3xl text-[#0F172A] font-bold mb-4">
                Inspection Window &amp; Payout Release
              </h2>
              <p className="font-body-md text-base text-[#64748B] mb-6 leading-relaxed">
                Upon delivery, you have a 48-hour inspection window to test the device. Verify that the specifications, battery health, and condition match the vendor's listing. Once you approve the item in your order dashboard, funds are released to the vendor.
              </p>
              <Link
                to="/browse"
                className="bg-[#0F3D8C] text-white hover:bg-[#0A2D6B] transition-colors duration-200 px-6 py-3 rounded-lg font-body-md-bold text-sm inline-flex items-center gap-2 font-bold shadow-md"
              >
                Browse Protected Products <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
            {/* Center Marker */}
            <div className="hidden md:flex w-16 h-16 rounded-full bg-white border-4 border-[#E2E8F0] items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-sm group-hover:border-[#0F3D8C] transition-all duration-300 z-20">
              <span className="material-symbols-outlined text-[#10B981] text-3xl">task_alt</span>
            </div>
            {/* Visual Right */}
            <div className="md:w-1/2 order-1 md:order-2 w-full">
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-2 w-full h-[320px] hover:shadow-md transition-all duration-300">
                <div
                  className="bg-cover bg-center w-full h-full rounded-xl"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD7BXDCgKlvJmsHQQAJwqXMLE0-jPS6Z01x2_EvGgRc565m4c6ifThJBSfOxv4UwTc8sLOkOoCSxFb3D-Cd5F1kyPZaWKQY4HAPIKVe8qdQm3z4ptiN-ZcWbWmqUmZyREHRt7nYKzSscLqFFnR7nznzR-Fep1n8DmMiy_YYAChaylU2482qoGRcAonjJgiq51MwZZxk8h-KleUYWjFQ613N-ENKuU00XIrdRBkG1BoinJpiGKEd72RLpw')",
                  }}
                ></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HowItWorks;
