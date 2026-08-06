import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, CheckCircle2, Clock, RotateCcw, AlertTriangle, ArrowRight, Store, Wrench } from "lucide-react";

interface ProcessStep {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  bulletPoints: string[];
  iconName: string;
}

const buyerSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Vendor Vetting & Verification",
    subtitle: "Step 1: Physical & Identity Vetting",
    description: "Before any merchant lists electronics on TechTrust, they undergo physical inspection or identity verification, KRA PIN validation, and business checks.",
    bulletPoints: [
      "Physical store location & address validation",
      "KRA PIN & National ID / Passport confirmation",
      "Refundable security deposit for online sellers"
    ],
    iconName: "storefront"
  },
  {
    number: "02",
    title: "Float Protected Payment",
    subtitle: "Step 2: Escrow Payment Hold",
    description: "When you place an order, your payment is deposited directly into TechTrust's Float escrow account via M-Pesa. The seller is notified to dispatch, but funds stay locked.",
    bulletPoints: [
      "Payment held safely in Float escrow",
      "Seller cannot access funds until you inspect and approve",
      "Instant M-Pesa STK Push payment integration"
    ],
    iconName: "lock"
  },
  {
    number: "03",
    title: "Dispatch & Inspection Window",
    subtitle: "Step 3: 48-Hour Testing Period",
    description: "Upon receiving your device, you have a 48-hour inspection window to test all specifications, battery health, and condition against the seller's listing.",
    bulletPoints: [
      "48 hours for local purchases / 72 hours for courier delivery",
      "Test device thoroughly before approving payment",
      "Option to open a formal dispute if anything is wrong"
    ],
    iconName: "task_alt"
  },
  {
    number: "04",
    title: "Payout Release or Refund",
    subtitle: "Step 4: Confirmed Release",
    description: "Once you confirm receipt or the 48-hour window passes with no issue, funds are released to the vendor minus a 10% platform commission. In case of a dispute, funds are refunded.",
    bulletPoints: [
      "Vendor paid via M-Pesa upon receipt confirmation",
      "Automatic release after 48h if no dispute is raised",
      "Full M-Pesa refund if dispute is resolved in buyer favor"
    ],
    iconName: "verified"
  }
];

const vendorSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Submit Verification Documents",
    subtitle: "Step 1: Verification Track Selection",
    description: "Register your business and choose between Physically Verified (physical shop) or Identity Verified (online seller) tracks.",
    bulletPoints: [
      "Provide National ID, KRA PIN, store photos, and address",
      "Online sellers submit a refundable security deposit",
      "Receive official TechTrust Verification Badge"
    ],
    iconName: "badge"
  },
  {
    number: "02",
    title: "List Genuine Tech & Repair Services",
    subtitle: "Step 2: Product & Repair Listing",
    description: "Create detailed listings with genuine photos, exact specifications, battery health, and transparent pricing in KSH.",
    bulletPoints: [
      "Set transparent prices with no hidden post-sale fees",
      "Specify condition: New, Refurbished, or Used",
      "Offer repair services with clear component quotes"
    ],
    iconName: "inventory_2"
  },
  {
    number: "03",
    title: "Fulfill Orders & Secure Payments",
    subtitle: "Step 3: Instant Float Notification",
    description: "Receive instant notifications when a buyer pays into Float. Ship or prepare the item with complete confidence that funds are secured.",
    bulletPoints: [
      "Secured M-Pesa payment held in Float escrow",
      "Guaranteed payout upon buyer receipt or 48-hour auto-release",
      "Fair and neutral dispute review process"
    ],
    iconName: "payments"
  }
];

const faqs = [
  {
    q: "What is Float escrow?",
    a: "Float is TechTrust's escrow payment system. When a buyer pays for a product or repair, the money is held safely by TechTrust and is not given to the vendor until the buyer confirms they received what they paid for."
  },
  {
    q: "How does the 48-Hour Inspection Rule work?",
    a: "After the item is marked delivered, the buyer has 48 hours to inspect the item and either confirm receipt or raise a dispute. If no action is taken within 48 hours, Float automatically releases payment to the vendor."
  },
  {
    q: "What platform fees or commissions apply?",
    a: "TechTrust charges a 10% platform commission on completed transactions, automatically deducted when Float is released to the vendor. Buyers pay no additional hidden fees."
  },
  {
    q: "How does Float work for repairs?",
    a: "Repairs use the same escrow protection: the buyer approves a quote and pays into Float. The technician completes the repair, and funds are only released after the buyer inspects and approves the repaired device."
  },
  {
    q: "What happens if a delivered item is faulty or fake?",
    a: "If an item is damaged, faulty, counterfeit, or not as described, click 'Raise Dispute' in your order dashboard within 48 hours. Float funds remain frozen while TechTrust reviews evidence and issues a full refund if valid."
  }
];

const HowItWorks = () => {
  const [activeTab, setActiveTab] = useState<"buyer" | "vendor">("buyer");

  const steps = activeTab === "buyer" ? buyerSteps : vendorSteps;

  return (
    <div className="bg-background text-foreground font-body antialiased overflow-x-hidden min-h-screen">
      <main className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-10 pb-20">
        
        {/* Main Title Header */}
        <section className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Trust & Escrow Protocol
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            How TechTrust Works
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Financial-grade escrow protection for electronics trading in Kenya. Discover how Float keeps your money safe from order placement to final delivery.
          </p>

          {/* Toggle Buyer / Vendor view */}
          <div className="flex justify-center gap-3 mt-8">
            <button
              onClick={() => setActiveTab("buyer")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === "buyer"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Buyer Guide
            </button>
            <button
              onClick={() => setActiveTab("vendor")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === "vendor"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Vendor & Technician Guide
            </button>
          </div>
        </section>

        {/* Float Escrow Summary Banner */}
        <section className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-16 shadow-sm">
          <div className="grid md:grid-cols-4 gap-6 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">1. Pending</h3>
              <p className="text-xs text-muted-foreground mt-1">Checkout initiated; no money moved yet.</p>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">2. Held (Float Escrow)</h3>
              <p className="text-xs text-muted-foreground mt-1">Paid via M-Pesa; frozen until buyer inspects device.</p>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">3. Released</h3>
              <p className="text-xs text-muted-foreground mt-1">Buyer confirms receipt; vendor paid minus 10% commission.</p>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mb-3">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">4. Refunded</h3>
              <p className="text-xs text-muted-foreground mt-1">Dispute upheld; 100% money returned via M-Pesa.</p>
            </div>
          </div>
        </section>

        {/* Process Timeline Steps (mapped array) */}
        <section className="space-y-12 mb-20">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            {activeTab === "buyer" ? "4-Step Buyer Protection Process" : "4-Step Vendor Onboarding & Sales Process"}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step) => (
              <div key={step.number} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {step.number}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">{step.subtitle}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
                <ul className="space-y-2">
                  {step.bulletPoints.map((point, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl p-5 shadow-xs">
                <h3 className="font-semibold text-foreground text-base mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call To Action Buttons */}
        <section className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to Trade Tech Safely?</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
            Join thousands of buyers and verified sellers across Kenya trading laptops, phones, and repair services with complete Float protection.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/browse"
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-6 py-3 rounded-lg font-semibold text-sm inline-flex items-center gap-2 shadow-sm"
            >
              Start Shopping <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/vendor/onboarding"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-6 py-3 rounded-lg font-semibold text-sm inline-flex items-center gap-2 border border-border"
            >
              Become a Vendor <Store className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
};

export default HowItWorks;
