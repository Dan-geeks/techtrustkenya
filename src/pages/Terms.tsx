import { useEffect } from "react";

const sections = [
  {
    title: "1. What TechTrust is",
    body: "TechTrust is a marketplace connecting buyers with physically-verified vendors of laptops, smartphones, and related repairs in Kenya. We are not the seller of record for marketplace listings — vendors are.",
  },
  {
    title: "2. Float escrow",
    body: "Payments made through TechTrust are held in Float, our escrow system, until you confirm that a delivered product matches its listing. Vendors cannot access funds until you confirm, or until the automatic release window passes without a dispute.",
  },
  {
    title: "3. Referral program",
    body: "Users may share a personal referral code. When a referred user completes their first confirmed order, both the referred user and the referrer receive a KES 500 credit to their TechTrust wallet. TechTrust may change or end the referral program at any time; credits already granted are not affected retroactively.",
  },
  {
    title: "4. Vendor verification",
    body: "Vendors listed as \"Verified\" have had their physical premises inspected by our team. Verification reduces but does not eliminate risk — always use Float and inspect goods on delivery.",
  },
  {
    title: "5. Disputes",
    body: "If a delivered product does not match its listing, raise a dispute before confirming delivery. TechTrust reviews evidence from both parties before releasing or refunding a held payment.",
  },
  {
    title: "6. Account responsibility",
    body: "You are responsible for keeping your account credentials secure and for the accuracy of information you provide at signup, including your phone number used for M-Pesa payments.",
  },
  {
    title: "7. Changes",
    body: "We may update these terms from time to time. Continued use of TechTrust after a change means you accept the updated terms.",
  },
];

const Terms = () => {
  useEffect(() => {
    document.title = "Terms & Conditions | TechTrust";
  }, []);

  return (
    <div className="container py-12 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Terms &amp; Conditions</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated 29 July 2026.</p>

      <div className="space-y-8">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="font-semibold text-foreground mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        Questions? Contact us at{" "}
        <a href="mailto:support@techtrust.co.ke" className="text-accent underline">
          support@techtrust.co.ke
        </a>
        .
      </p>
    </div>
  );
};

export default Terms;
