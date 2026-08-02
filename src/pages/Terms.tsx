import { useEffect } from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: `These Terms of Service ("Terms") govern your access to and use of TechTrust Kenya ("TechTrust", "we", "our", "us"), a verified digital marketplace for buying, selling, and repairing laptops, smartphones, and related technology in Kenya, available at https://techtrust.co.ke. By creating an account or using the platform, you agree to these Terms. If you do not agree, you should not use TechTrust. These Terms apply to everyone who uses the platform, including buyers, vendors, and repair technicians.`
  },
  {
    id: "definitions",
    title: "2. Definitions",
    content: `• Platform — the TechTrust website, application, and related services.\n• Buyer — a user who purchases products or repair services.\n• Vendor — a verified seller who lists products for sale.\n• Technician — a verified provider of repair services.\n• Float escrow — TechTrust's escrow payment system that holds a buyer's payment until the buyer confirms receipt.\n• Verified — a vendor or technician who has passed TechTrust's physical or identity verification process.\n• Dispute — a formal complaint raised by a buyer about a transaction.`
  },
  {
    id: "eligibility",
    title: "3. Eligibility",
    content: `To use TechTrust, you must:\n1. Be at least 18 years old.\n2. Be able to enter into a legally binding agreement under Kenyan law.\n3. Provide accurate and truthful information when creating an account.\n4. Use the platform only for lawful purposes.\nBy using TechTrust, you confirm that you meet these requirements.`
  },
  {
    id: "accounts",
    title: "4. Accounts",
    content: `• Account creation: You must register an account to transact on the platform, providing accurate and complete information.\n• Account security: You are responsible for keeping your login details secure and for all activity that occurs under your account. Notify us immediately if you suspect unauthorized access.\n• One account per user: You may not operate multiple accounts, or create a new account to circumvent a suspension, unless expressly permitted by TechTrust.\n• Accurate information: You must keep your account information up to date. Providing false information is a breach of these Terms.`
  },
  {
    id: "role-of-techtrust",
    title: "5. The Role of TechTrust",
    content: `TechTrust is a marketplace connecting buyers with verified vendors and technicians, providing payment protection through Float escrow.\nWhat TechTrust does: We verify vendors and technicians, hold payments securely in Float escrow, facilitate transactions, and provide a neutral dispute resolution process.\nWhat TechTrust is not: Except where we act as an intermediary holding funds in Float escrow, TechTrust is not the seller of record for marketplace products listed and is not the direct provider of repair services. The contract of sale or service is between the buyer and the vendor or technician.`
  },
  {
    id: "buyer-terms",
    title: "6. Buyer Terms",
    content: `As a buyer, you agree to:\n• Provide accurate delivery or collection information.\n• Pay for orders through the Float escrow payment system.\n• Inspect items on receipt and confirm the order, or raise a dispute, within the 48-hour confirmation window.\n• Raise disputes honestly and only on valid grounds.\n• Treat vendors and technicians respectfully.\nWhen you pay, your money is held in Float escrow and is only released to the vendor when you confirm receipt, or automatically after the 48-hour confirmation window closes with no dispute.`
  },
  {
    id: "vendor-technician-terms",
    title: "7. Vendor and Technician Terms",
    content: `As a vendor or technician, you agree to:\n• Complete verification honestly before listing anything.\n• List only genuine products and describe them accurately.\n• Price fairly in KSH and not change agreed prices after payment.\n• Fulfill orders and complete repairs promptly and honestly.\n• Provide tracking for shipped orders where required.\n• Accept and cooperate with the dispute resolution process.\n• Comply with the Seller Guidelines and all platform policies.\nOnline sellers additionally agree to maintain a security deposit as a condition of selling, which may be forfeited in cases of fraud or non-delivery.`
  },
  {
    id: "payments-float-fees",
    title: "8. Payments, Float escrow, and Fees",
    content: `• Float escrow: All payments are processed through Float escrow. TechTrust holds the buyer's payment until the buyer confirms receipt or the confirmation window closes.\n• 10% Platform Fee / Commission: TechTrust charges a platform fee / commission of 10% on completed transactions, deducted automatically when Float escrow is released to the vendor. Vendors see the net amount they will receive before agreeing to a sale.\n• Subscriptions & Promotions: Vendors may pay optional subscription and promotion fees as published on the platform.\n• Payment method: Payments are processed via M-Pesa through the Safaricom Daraja API.\n• Refunds: Refunds are issued through Float escrow in line with the Dispute Policy, where a dispute is resolved in the buyer's favor.`
  },
  {
    id: "verification-trust",
    title: "9. Verification and Trust",
    content: `TechTrust operates two verification tracks: Physically Verified for shops confirmed at a real location, and Identity Verified for online sellers confirmed through identity and payment checks. Verified status and the associated badge remain the property of TechTrust and may be withdrawn if a vendor breaches these Terms or platform policies.\nVerification confirms identity and accountability. It is not a guarantee of every individual item, which is why Float escrow protection and the dispute process exist alongside it.`
  },
  {
    id: "disputes",
    title: "10. Disputes",
    content: `Disputes are handled through the process set out in the Dispute Policy. By using the platform, both buyers and vendors agree to accept TechTrust's role as a neutral decision-maker in disputes, and to accept the outcome of a properly conducted dispute review, including refunds, releases, or partial resolutions, and any associated consequences such as suspension or deposit forfeiture.`
  },
  {
    id: "prohibited-conduct",
    title: "11. Prohibited Conduct",
    content: `You must not:\n• Provide false information or impersonate another person.\n• List or sell counterfeit, stolen, or misrepresented goods.\n• Manipulate prices, reviews, or ratings.\n• Take transactions off the platform to avoid protection or 10% platform fees.\n• Use the platform for fraud, money laundering, or any unlawful purpose.\n• Attempt to interfere with, hack, or disrupt the platform.\n• Harass, threaten, or abuse other users or staff.\n• Operate duplicate accounts or evade a suspension.`
  },
  {
    id: "suspension-termination",
    title: "12. Suspension and Termination",
    content: `By TechTrust: We may suspend or terminate an account that breaches these Terms or platform policies, engages in fraud, or poses a risk to other users. Where practical, we will provide a reason.\nBy you: You may close your account at any time, subject to the completion of any open transactions and disputes.`
  },
  {
    id: "intellectual-property",
    title: "13. Intellectual Property",
    content: `The TechTrust name, logo, platform, design, and content are the property of TechTrust Kenya and are protected by law. You may not copy, reproduce, or use them without our permission. Content you submit, such as listings and reviews, remains yours, but you grant TechTrust a licence to display and use it for operating the platform.`
  },
  {
    id: "limitation-of-liability",
    title: "14. Limitation of Liability",
    content: `To the fullest extent permitted by Kenyan law:\n• TechTrust provides the platform on a reasonable-effort basis and does not guarantee uninterrupted or error-free operation.\n• TechTrust's role is to operate the marketplace and administer Float escrow and disputes.\n• TechTrust is not liable for indirect or consequential losses arising from use of the platform, except where such limitation is not permitted by law.`
  },
  {
    id: "privacy",
    title: "15. Privacy",
    content: `Your use of TechTrust is also governed by our Privacy Policy, which explains how we collect, use, and protect your personal data in accordance with the Data Protection Act 2019 of Kenya. By using the platform, you acknowledge the Privacy Policy.`
  },
  {
    id: "changes-to-terms",
    title: "16. Changes to These Terms",
    content: `We may update these Terms from time to time to reflect changes in our services or the law. When we make significant changes, we will notify users and update the "last updated" date. Continued use of the platform after an update means you accept the revised Terms.`
  },
  {
    id: "governing-law",
    title: "17. Governing Law and Disputes with TechTrust",
    content: `These Terms are governed by the laws of the Republic of Kenya. Any dispute between you and TechTrust that cannot be resolved amicably will be subject to the jurisdiction of the courts of Kenya. This is separate from the buyer-vendor Dispute Policy.`
  },
  {
    id: "contact-us",
    title: "18. Contact Us",
    content: `If you have any questions about these Terms, please contact us:\nEmail: support@techtrust.co.ke\nAlternative contact: johnmwangimegwe@gmail.com`
  }
];

const Terms = () => {
  useEffect(() => {
    document.title = "Terms of Service | TechTrust Kenya";
  }, []);

  return (
    <div className="bg-background text-foreground font-body antialiased min-h-screen py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated <span className="font-semibold text-foreground">August 2026</span>. Grounded in Kenyan Law and Data Protection Regulations.
        </p>

        {/* Quick Links Banner */}
        <div className="bg-card border border-border rounded-xl p-4 mb-10 text-xs text-muted-foreground flex flex-wrap gap-4 items-center">
          <span className="font-semibold text-foreground">Related Legal Policies:</span>
          <Link to="/privacy" className="hover:text-primary underline">Privacy Policy</Link>
          <Link to="/verification" className="hover:text-primary underline">Vendor Verification Policy</Link>
          <Link to="/disputes" className="hover:text-primary underline">Dispute Policy</Link>
          <Link to="/seller-guidelines" className="hover:text-primary underline">Seller Guidelines</Link>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="bg-card border border-border rounded-xl p-6 shadow-xs">
              <h2 className="text-xl font-bold text-foreground mb-3">{section.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-xl text-center">
          <h3 className="font-semibold text-foreground mb-2">Have Questions About Our Terms?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Our support and compliance team is available to address any inquiries.
          </p>
          <a
            href="mailto:support@techtrust.co.ke"
            className="text-primary hover:underline font-semibold text-sm"
          >
            Contact Legal Support: support@techtrust.co.ke
          </a>
        </div>
      </div>
    </div>
  );
};

export default Terms;
