import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck, Scale, Clock, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKsh, formatDate } from "@/lib/format";

const groundsTable = [
  { ground: "Non-delivery", desc: "Item was paid for but never delivered or courier failed to supply item." },
  { ground: "Wrong item", desc: "Delivered item is a different brand, model, color, or spec than listed." },
  { ground: "Not as described", desc: "Item condition, battery health, storage capacity, or faults differ from listing." },
  { ground: "Damaged or faulty", desc: "Item arrived physically cracked, broken, water-damaged, or non-functional." },
  { ground: "Counterfeit or fake", desc: "Item is a knockoff, cloned device, or unauthentic brand imitation." },
  { ground: "Incomplete repair", desc: "Technician failed to resolve requested fault or caused secondary damage." }
];

const STATUS_STYLE: Record<string, string> = {
  disputed: "border-amber-400 bg-amber-50 text-amber-800",
  refunded: "border-emerald-400 bg-emerald-50 text-emerald-800",
  confirmed: "border-slate-300 bg-slate-50 text-slate-700",
};

/**
 * The viewer's own disputes, above the policy text.
 *
 * This page was pure policy copy, and the order tracker's "Open Dispute" button
 * simply linked here — so a buyer could read about disputes but never raise or
 * track one.
 */
const MyDisputes = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    if (!user) { setRows([]); return; }
    (async () => {
      // RLS already limits orders to the ones you are party to, so this is the
      // same query for a buyer and a seller.
      const { data } = await supabase
        .from("orders")
        .select("id, status, dispute_reason, disputed_at, dispute_resolution, dispute_resolved_at, total_amount_ksh, product:products(brand, model_name)")
        .not("disputed_at", "is", null)
        .order("disputed_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, [user]);

  if (!user) return null;
  if (rows === null) {
    return (
      <div className="mb-10 flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (rows.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-lg font-bold mb-3">Your disputes</h2>
      <div className="space-y-3">
        {rows.map((o) => (
          <Link
            key={o.id}
            to={`/orders/${o.id}`}
            className={`block rounded-xl border p-4 transition-colors hover:brightness-[0.98] ${
              STATUS_STYLE[o.status] ?? "border-slate-300 bg-slate-50 text-slate-700"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm">
                  {o.product?.brand} {o.product?.model_name}{" "}
                  <span className="font-mono text-xs opacity-70">#{o.id.slice(0, 8).toUpperCase()}</span>
                </p>
                <p className="text-xs mt-1 opacity-90">Raised {formatDate(o.disputed_at)} · {formatKsh(Number(o.total_amount_ksh))}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide shrink-0">
                {o.status === "disputed" ? "Under review" : o.status === "refunded" ? "Refunded" : "Resolved"}
              </span>
            </div>
            {o.dispute_reason && <p className="text-xs mt-2">You reported: {o.dispute_reason}</p>}
            {o.dispute_resolution && (
              <p className="text-xs mt-1 font-semibold">Outcome: {o.dispute_resolution}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

const DisputePolicy = () => {
  useEffect(() => {
    document.title = "Disputes | TechTrust Kenya";
  }, []);

  return (
    <div className="bg-background text-foreground font-body antialiased min-h-screen py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
          <Scale className="w-4 h-4" />
          Neutral Escrow Adjudication Protocol
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Disputes</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Raise a dispute from the order itself — open the order and choose <strong>Report a problem</strong>. Your
          payment stays frozen in Float until we've reviewed it.
        </p>

        <MyDisputes />

        {/* 4 Objectives */}
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <ShieldCheck className="w-6 h-6 text-primary mx-auto mb-2" />
            <h4 className="font-bold text-xs text-foreground">Buyer Protection</h4>
            <p className="text-[11px] text-muted-foreground mt-1">100% money back for valid claims.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-xs text-foreground">Honest Vendor Safety</h4>
            <p className="text-[11px] text-muted-foreground mt-1">Fair payout for genuine sales.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Scale className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <h4 className="font-bold text-xs text-foreground">Neutral Review</h4>
            <p className="text-[11px] text-muted-foreground mt-1">Impartial evidence review.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <h4 className="font-bold text-xs text-foreground">Fast Resolution</h4>
            <p className="text-[11px] text-muted-foreground mt-1">Decisions within 48-72 hours.</p>
          </div>
        </div>

        {/* 48-Hour Inspection Window */}
        <section className="bg-card border border-border rounded-xl p-6 mb-10">
          <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            The Confirmation & Dispute Window
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A buyer must raise a dispute in their order dashboard during the confirmation window:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-3 space-y-1">
            <li><strong>Local Store Pickup / Direct Delivery:</strong> 48 hours from delivery timestamp.</li>
            <li><strong>Courier Delivery (Online Sellers):</strong> 72 hours from courier delivery tracking confirmation.</li>
            <li><strong>Repair Services:</strong> Opens when technician marks repair ready for pickup.</li>
          </ul>
          <p className="text-xs text-amber-600 font-medium mt-3">
            âš ï¸ Once a dispute is opened, Float escrow funds are frozen immediately. Neither party can withdraw or auto-release funds until TechTrust issues a decision.
          </p>
        </section>

        {/* Valid Grounds Table */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4">Valid Grounds for a Dispute</h2>
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 w-1/3">Ground</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {groundsTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="p-3 font-semibold text-primary">{row.ground}</td>
                    <td className="p-3 text-muted-foreground">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Resolution Outcomes */}
        <section className="bg-card border border-border rounded-xl p-6 mb-10 space-y-4">
          <h2 className="text-xl font-bold text-foreground">Resolution Outcomes</h2>
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <strong className="text-emerald-700 dark:text-emerald-400 block mb-1">Full Refund to Buyer:</strong>
              Float escrow payment is returned 100% via M-Pesa to the buyer when non-delivery, counterfeit, or major flaw is proven.
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <strong className="text-blue-700 dark:text-blue-400 block mb-1">Full Release to Vendor:</strong>
              Float escrow payment is released minus 10% platform fee to vendor if item matches listing and dispute is invalid.
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <strong className="text-amber-700 dark:text-amber-400 block mb-1">Replacement / Partial Refund:</strong>
              Vendor replaces item or buyer agrees to a partial price reduction for minor cosmetic variances.
            </div>
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg">
              <strong className="text-rose-700 dark:text-rose-400 block mb-1">Deposit Forfeiture & Vendor Suspension:</strong>
              Fraudulent vendors lose security deposits and face immediate permanent ban and law enforcement reporting.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DisputePolicy;
