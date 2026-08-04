import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, CheckCircle2, Building2, UserCheck, AlertCircle, FileText } from "lucide-react";

const documentTable = [
  { doc: "National ID or Passport", purpose: "Confirms legal identity of seller", physical: "Required", online: "Required" },
  { doc: "Verified Phone Number", purpose: "Confirms reachable contact & M-Pesa account", physical: "Required", online: "Required" },
  { doc: "Store Location & GPS", purpose: "Physical shop address verification", physical: "Required", online: "Not applicable" },
  { doc: "Shop Photos (Interior/Exterior)", purpose: "Visual verification of shop premises", physical: "Required", online: "Not applicable" },
  { doc: "KRA PIN Certificate", purpose: "Tax registration & accountability", physical: "Optional", online: "Required" },
  { doc: "M-Pesa / Bank Name Match", purpose: "Confirms payout account ownership", physical: "Optional", online: "Required" },
  { doc: "Proof of Business (Import/Social)", purpose: "Demonstrates genuine trading history", physical: "Optional", online: "Required" },
  { doc: "Refundable Security Deposit", purpose: "Financial accountability against fraud", physical: "Not applicable", online: "Required" },
  { doc: "Business Registration Certificate", purpose: "Formal legal entity registration", physical: "Optional", online: "Optional" }
];

const VendorVerification = () => {
  useEffect(() => {
    document.title = "Vendor Verification Policy | TechTrust Kenya";
  }, []);

  return (
    <div className="bg-background text-foreground font-body antialiased min-h-screen py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" />
          Trust & Marketplace Security Protocol
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Vendor Verification Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Official Documentation - How TechTrust eliminates fraud by physically inspecting and identity-checking sellers before listing.
        </p>

        {/* 2 Tracks Banner */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Physically Verified</h3>
                <span className="text-xs text-emerald-600 font-semibold">Physical Shop Badge</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Assigned to merchants with a confirmed brick-and-mortar store in Kenya. Includes physical site visits, shop floor photos, GPS mapping, and business permit validation.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Identity Verified</h3>
                <span className="text-xs text-blue-600 font-semibold">Online Seller Badge</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Assigned to online-only sellers who pass strict identity, KRA PIN, and M-Pesa name matching checks, and maintain a refundable security deposit to guarantee delivery.
            </p>
          </div>
        </div>

        {/* Workflow */}
        <section className="bg-card border border-border rounded-xl p-6 mb-12">
          <h2 className="text-xl font-bold text-foreground mb-4">Verification Workflow</h2>
          <ol className="space-y-4 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              <div><strong className="text-foreground">Registration:</strong> Seller registers account and selects physical shop or online seller track.</div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              <div><strong className="text-foreground">Document Submission:</strong> Uploads National ID/Passport, phone number, store details, or KRA PIN.</div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              <div><strong className="text-foreground">Admin Review & Inspection:</strong> TechTrust team validates document authenticity, runs phone checks, or conducts physical site inspection.</div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              <div><strong className="text-foreground">Security Deposit (Online Sellers):</strong> Online sellers deposit refundable security funds.</div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">5.</span>
              <div><strong className="text-foreground">Badge Assignment & Access:</strong> Upon approval, verified badge is awarded and product/repair listing privileges are unlocked.</div>
            </li>
          </ol>
        </section>

        {/* Required Documents Table */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-4">Required Verification Documents</h2>
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">Document</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Physical Shop</th>
                  <th className="p-3">Online Seller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {documentTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="p-3 font-semibold">{row.doc}</td>
                    <td className="p-3 text-muted-foreground">{row.purpose}</td>
                    <td className="p-3">{row.physical}</td>
                    <td className="p-3">{row.online}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
          <h3 className="font-bold text-foreground mb-2">Want to Become a Verified Vendor?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Start your vendor onboarding and submit your verification documents today.
          </p>
          <Link to="/vendor/onboarding" className="bg-primary text-primary-foreground font-semibold text-xs px-5 py-2.5 rounded-lg inline-block shadow-xs">
            Apply for Vendor Verification
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorVerification;
