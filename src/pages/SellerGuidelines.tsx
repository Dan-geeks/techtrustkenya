import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Store, AlertTriangle, ShieldCheck, CheckCircle2, FileText, XCircle } from "lucide-react";

const prohibitedTable = [
  { violation: "Selling Counterfeit Goods", desc: "Listing fake, knockoff, or cloned electronics passed off as genuine brands.", penalty: "Immediate permanent ban + deposit forfeiture" },
  { violation: "Misrepresentation", desc: "Falsifying battery health, storage specs, cosmetic condition, or stock location.", penalty: "Dispute loss + rating drop + warning" },
  { violation: "Off-platform Solicitation", desc: "Directing buyers to pay outside Float escrow (cash, direct M-Pesa).", penalty: "Account suspension + loss of verified badge" },
  { violation: "Price Switching", desc: "Demanding additional money or altering prices after buyer completes checkout.", penalty: "Order cancellation + seller penalty" },
  { violation: "Non-fulfillment / Delay", desc: "Failing to dispatch orders within agreed timeline without valid reason.", penalty: "Full buyer refund + deposit penalty" }
];

const SellerGuidelines = () => {
  useEffect(() => {
    document.title = "Seller Guidelines | TechTrust Kenya";
  }, []);

  return (
    <div className="bg-background text-foreground font-body antialiased min-h-screen py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
          <Store className="w-4 h-4" />
          Vendor & Repair Technician Code of Conduct
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Seller & Technician Guidelines</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Standards for listing electronics, transparent pricing in KSH, order fulfillment, repair quality, and prohibited conduct on TechTrust Kenya.
        </p>

        {/* Listing Standards */}
        <section className="bg-card border border-border rounded-xl p-6 mb-8 space-y-3">
          <h2 className="text-xl font-bold text-foreground">1. Product Listing & Condition Standards</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every product listed on TechTrust must be genuine, accurately described, and honestly graded:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li><strong>New:</strong> Sealed original box with manufacturer warranty.</li>
            <li><strong>Refurbished:</strong> Professionally tested and restored to full functionality with clear spec disclosure.</li>
            <li><strong>Used:</strong> Genuine pre-owned device; must state battery health percentage, cosmetic rating (e.g. 8/10), and any minor flaws.</li>
            <li><strong>Real Photos:</strong> Sellers must upload actual photos of the item being sold, not generic stock images.</li>
          </ul>
        </section>

        {/* Pricing & Fees */}
        <section className="bg-card border border-border rounded-xl p-6 mb-8 space-y-3">
          <h2 className="text-xl font-bold text-foreground">2. Pricing & Platform Commission</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All prices must be listed in Kenyan Shillings (KSH) with all taxes included:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li><strong>10% Platform Commission:</strong> Deducted automatically when Float escrow is released to the vendor.</li>
            <li><strong>No Hidden Post-Sale Fees:</strong> Asking a buyer for extra delivery or dispatch fees after payment is strictly prohibited.</li>
            <li><strong>Transparent Repair Quotes:</strong> Repair technicians must provide itemized quotes covering parts and labor before work begins.</li>
          </ul>
        </section>

        {/* Prohibited Conduct Table */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4">Prohibited Conduct & Penalties</h2>
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 w-1/4">Violation</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 w-1/3">Penalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {prohibitedTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">{row.violation}</td>
                    <td className="p-3 text-muted-foreground">{row.desc}</td>
                    <td className="p-3 font-medium text-foreground">{row.penalty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
          <h3 className="font-bold text-foreground mb-2">Ready to Register as a Vendor?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Agree to our seller guidelines and start selling to thousands of protected buyers.
          </p>
          <Link to="/vendor/register" className="bg-primary text-primary-foreground font-semibold text-xs px-5 py-2.5 rounded-lg inline-block shadow-xs">
            Start Vendor Registration
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SellerGuidelines;
