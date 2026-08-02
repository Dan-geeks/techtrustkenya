import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Mail } from "lucide-react";

const privacySections = [
  {
    title: "1. Overview",
    content: `TechTrust Kenya ("TechTrust", "we", "our", "us") is a verified digital marketplace for buying, selling, and repairing laptops, smartphones, and related technology in Kenya. To operate the platform, we collect and use personal data from buyers, vendors, and repair technicians.

This Privacy Policy explains what data we collect, why we collect it, how we use and protect it, who we share it with, and the rights you have over your data. It applies to everyone who uses the TechTrust platform.

We are committed to protecting your privacy and handling your data lawfully, fairly, and transparently, in accordance with the Data Protection Act No. 24 of 2019 of Kenya.`
  },
  {
    title: "2. Who We Are (Data Controller)",
    content: `TechTrust Kenya is the data controller responsible for your personal data.
Platform: TechTrust Kenya
Contact for privacy matters: johnmwangimegwe@gmail.com / support@techtrust.co.ke`
  },
  {
    title: "3. What Data We Collect",
    content: `We collect only the data needed to operate the platform and provide our services:

From all users:
â€¢ Name, email address, phone number
â€¢ Account login credentials (passwords are stored salted and hashed; never in readable form)
â€¢ Device, IP, and usage information to ensure security

From buyers:
â€¢ M-Pesa phone number used to process Float escrow payments
â€¢ Delivery or collection address for orders
â€¢ Order and transaction history, reviews, and dispute records

From vendors and repair technicians:
â€¢ National ID or Passport details for identity verification
â€¢ KRA PIN certificate where required
â€¢ Store location, GPS coordinates, and shop photographs (physical vendors)
â€¢ M-Pesa / bank account details for payout releases
â€¢ Refundable security deposit records (online sellers)`
  },
  {
    title: "4. Why We Collect Your Data (Lawful Basis)",
    content: `Under the Data Protection Act 2019 of Kenya, we process your personal data on the following legal bases:
1. Performance of a contract: To operate your account, process Float escrow payments via Safaricom M-Pesa Daraja API, deliver orders, and administer repairs.
2. Legal obligation: To verify vendor identities, comply with tax regulations (KRA), and assist law enforcement when legally required.
3. Legitimate interests: To prevent fraud, verify vendors, resolve transaction disputes, and maintain platform security.
4. Consent: Where you opt in to receiving promotional communications or non-essential updates.`
  },
  {
    title: "5. How We Use Your Data",
    content: `We use your personal data to:
â€¢ Create and manage your account.
â€¢ Facilitate M-Pesa payments through Float escrow and release funds upon confirmed delivery.
â€¢ Verify vendor identities and display appropriate physical/identity badges.
â€¢ Investigate and resolve disputes between buyers and sellers.
â€¢ Send order updates, delivery notifications, and security alerts.
â€¢ Detect and prevent fraudulent listings, counterfeit items, and unauthorized account access.`
  },
  {
    title: "6. How We Share Your Data",
    content: `We do not sell your personal data to third parties. We share data only as necessary to operate TechTrust:
â€¢ With counter-parties: A buyer's delivery address and phone number are shared with the vendor fulfilling the order. A vendor's business name and verified status are visible to buyers.
â€¢ Service providers: Payment processors (Safaricom Daraja API for M-Pesa payouts), hosting services, and SMS notification gateways.
â€¢ Legal and regulatory authorities: When required under Kenyan law, court order, or formal investigation by police or ODPC.`
  },
  {
    title: "7. How We Protect Your Data",
    content: `We implement robust technical and organizational security measures:
â€¢ Passwords and sensitive tokens are encrypted using industry-standard hashing algorithms.
â€¢ All web traffic is encrypted via TLS/SSL (HTTPS).
â€¢ Access to vendor verification documents and ID photos is restricted strictly to authorized administrators.`
  },
  {
    title: "8. How Long We Keep Your Data",
    content: `We retain your data for as long as your account remains active. Transaction logs, M-Pesa payment records, and dispute archives are retained for up to 7 years to satisfy accounting, auditing, and legal obligations under Kenyan law.`
  },
  {
    title: "9. Your Rights Under Kenyan Law",
    content: `Under the Data Protection Act 2019, you have the right to:
â€¢ Be informed about how your data is collected and used.
â€¢ Access personal data we hold about you.
â€¢ Request correction of inaccurate or incomplete data.
â€¢ Request deletion/erasure of your personal data where no legal ground requires its retention.
â€¢ Object to direct marketing communications.
To exercise any of these rights, contact us at support@techtrust.co.ke.`
  },
  {
    title: "10. Contact Us & Data Protection Officer",
    content: `If you have any questions or complaints regarding this Privacy Policy or our data protection practices, please contact:
Data Controller: TechTrust Kenya
Email: support@techtrust.co.ke
Alternative contact: johnmwangimegwe@gmail.com`
  }
];

const Privacy = () => {
  useEffect(() => {
    document.title = "Privacy Policy | TechTrust Kenya";
  }, []);

  return (
    <div className="bg-background text-foreground font-body antialiased min-h-screen py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" />
          Kenya Data Protection Act 2019 Compliant
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated <span className="font-semibold text-foreground">August 2026</span>. Grounded in the Data Protection Act No. 24 of 2019.
        </p>

        <div className="space-y-8">
          {privacySections.map((section, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-6 shadow-xs">
              <h2 className="text-xl font-bold text-foreground mb-3">{section.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-card border border-border rounded-xl text-center">
          <Mail className="w-6 h-6 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-foreground mb-1">Privacy Officer Contact</h3>
          <p className="text-xs text-muted-foreground mb-3">
            For access requests, data corrections, or privacy questions:
          </p>
          <a href="mailto:support@techtrust.co.ke" className="text-primary hover:underline font-semibold text-sm">
            support@techtrust.co.ke
          </a>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
