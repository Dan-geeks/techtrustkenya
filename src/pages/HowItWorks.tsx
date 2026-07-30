import { AnimatedArt, art } from "@/components/marketing/AnimatedArt";

const steps = [
  {
    num: "01",
    title: "Vendor Verification",
    body: "Every vendor on TechTrust has been physically inspected. We visit their shop, check their documents, and only approve businesses with a real, traceable presence.",
  },
  {
    num: "02",
    title: "Float Protected Payment",
    body: "When you pay via M-Pesa, your money goes into Float — a protected account TechTrust controls. The vendor sees your order but cannot access the funds until you confirm receipt.",
  },
  {
    num: "03",
    title: "Confirm and Release",
    body: "Once you receive the product and verify it matches the listing, you tap Confirm. Float releases the payment to the vendor instantly via M-Pesa B2C.",
  },
  {
    num: "04",
    title: "Disputes & Protection",
    body: "Something wrong? Raise a dispute within 48 hours. Float stays frozen until our team reviews evidence from both sides. Refunds happen quickly when warranted.",
  },
];

const HowItWorks = () => {
  return (
    <div className="container py-12 max-w-5xl">
      <header className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">How TechTrust Works</h1>
          <p className="text-lg text-muted-foreground mt-3">
            Trust isn't a promise — it's a system. Here's exactly how we protect every transaction.
          </p>
        </div>
        <AnimatedArt
          src={art.steps}
          alt="Working through the TechTrust Float protection checklist step by step"
          eager
        />
      </header>

      <section className="mt-8 divide-y divide-border">
        {steps.map(({ num, title, body }) => (
          <div key={num} className="py-8 flex gap-8 group">
            <div className="text-3xl font-black text-border group-hover:text-accent/30 transition-colors tabular-nums shrink-0 w-12 leading-none pt-1">
              {num}
            </div>
            <div>
              <h2 className="font-semibold text-foreground mb-2">{title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default HowItWorks;
