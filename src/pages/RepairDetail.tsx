import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatKsh, formatDate } from "@/lib/format";
import { invokeFunction, fetchRepairPaymentStatus } from "@/lib/functions";
import { toast } from "sonner";
import {
  Loader2, Wrench, ArrowLeft, CheckCircle2, Phone, MapPin, User, AlertTriangle,
  ShieldCheck, Smartphone, ThumbsUp, ThumbsDown,
} from "lucide-react";

/**
 * A single repair request.
 *
 * This route did not exist. `routeForNotification` has always sent
 * repair_update notifications to `/repairs/:id`, so every "New repair request"
 * or "Repair quotation received" notification landed on the 404 page — and a
 * customer who booked a repair had no way to ever look at it again.
 *
 * RLS already scopes the row to the customer who booked it and the vendor it
 * was assigned to, so one page serves both; we only pick which actions to show.
 */

// The happy path, in order. `quotation_sent` sits between submitted and
// received because the vendor quotes before taking the device in.
const FLOW = [
  { key: "submitted", label: "Request sent" },
  { key: "quotation_sent", label: "Quote received" },
  { key: "received", label: "Paid & device handed over" },
  { key: "diagnosing", label: "Diagnosing" },
  { key: "in_repair", label: "Under repair" },
  { key: "ready_for_collection", label: "Ready for collection" },
  { key: "completed", label: "Inspected and confirmed" },
] as const;

// `repair_in_progress` is a legacy synonym for `in_repair` in the enum; treat
// them as the same milestone so old rows don't render as "unknown".
const stageIndex = (status: string) => {
  if (status === "cancelled") return -1;
  const normalised = status === "repair_in_progress" ? "in_repair" : status;
  return FLOW.findIndex((s) => s.key === normalised);
};

const RepairDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [req, setReq] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState("");

  const load = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    // Never return early without clearing `loading` — that is exactly how the
    // order page used to hang on "Loading order...".
    try {
      const { data, error } = await supabase
        .from("repair_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      setReq(data ?? null);

      if (data) {
        const [{ data: v }, { data: c }] = await Promise.all([
          supabase
            .from("vendor_profiles")
            .select("id, user_id, business_name, phone, city, county, physical_address")
            .eq("id", data.vendor_id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id, full_name, phone_number")
            .eq("id", data.customer_id)
            .maybeSingle(),
        ]);
        setVendor(v ?? null);
        setCustomer(c ?? null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Could not load this repair.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Repair | TechTrust Kenya";
    load();
  }, [id]);

  const isCustomer = !!user && !!req && user.id === req.customer_id;
  const isVendor = !!user && !!vendor && user.id === vendor.user_id;

  const current = useMemo(() => (req ? stageIndex(req.status) : -1), [req]);

  const patch = async (values: Record<string, unknown>, success: string) => {
    setBusy(true);
    const { error } = await supabase.from("repair_requests").update(values).eq("id", req.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(success);
    load();
  };

  const approveQuote = async () => {
    await patch({ customer_approved_quote: true }, "Quote approved — the technician has been notified.");
    if (vendor?.user_id) {
      // notify_counterparty, not a direct insert: notifications' INSERT policy
      // is "auth.uid() = user_id", so notifying the other side silently fails.
      await supabase.rpc("notify_counterparty", {
        _user_id: vendor.user_id,
        _title: "Quote approved",
        _message: `${customer?.full_name ?? "The customer"} approved your quote of ${formatKsh(req.quoted_price_ksh ?? 0)}. They can now pay it into Float.`,
        _type: "repair_update",
        _reference_id: req.id,
      });
    }
  };

  const declineRepair = async () => {
    await patch({ status: "cancelled" }, "Repair cancelled.");
    if (vendor?.user_id) {
      await supabase.rpc("notify_counterparty", {
        _user_id: vendor.user_id,
        _title: "Repair cancelled",
        _message: `${customer?.full_name ?? "The customer"} cancelled the repair request.`,
        _type: "repair_update",
        _reference_id: req.id,
      });
    }
  };

  /**
   * Pay the quote into Float. Two responses: the push returns once the PIN
   * prompt is delivered — which is NOT payment — then we poll
   * /repair-payment-status until it stops being pending.
   */
  const payQuote = async () => {
    if (!phone.trim()) {
      setPayError("Enter the M-Pesa number to charge.");
      return;
    }
    setPaying(true);
    setPayError(null);

    const { data, error } = await invokeFunction<{ success: boolean; error?: string }>("repair-stkpush", {
      body: { repair_id: req.id, phone: phone.trim() },
    });

    if (error || !data?.success) {
      setPaying(false);
      setPayError(error?.message ?? data?.error ?? "Could not start the payment. Try again.");
      return;
    }

    toast.success("Check your phone and enter your M-Pesa PIN.");

    // Response 2. Give up after 2.5 minutes rather than spinning forever — the
    // gateway reports an expired prompt identically to a live one.
    const GIVE_UP_AFTER = 150_000;
    const startedAt = Date.now();
    const poll = async () => {
      const status = await fetchRepairPaymentStatus(req.id);
      if (status?.status === "paid") {
        setPaying(false);
        toast.success("Payment held in Float. The technician can start work.");
        load();
        return;
      }
      if (Date.now() - startedAt > GIVE_UP_AFTER) {
        setPaying(false);
        setPayError(
          "We didn't get a confirmation. If you were charged it will show here shortly — otherwise try again.",
        );
        load();
        return;
      }
      setTimeout(poll, 4000);
    };
    setTimeout(poll, 4000);
  };

  /** Inspection outcome. Passing releases the money; failing sends it back. */
  const confirmCollection = async (passed: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("confirm_repair_collection", {
      _repair_id: req.id,
      _inspection_passed: passed,
      _inspection_notes: inspectionNotes.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      passed
        ? "Repair confirmed. The technician has been paid from Float."
        : "Reported back to the technician. Your payment stays in Float.",
    );
    setInspectionNotes("");
    load();
  };

  // The status change itself already fires notify_customer_repair_status, so
  // this only patches; a second manual notification would double up.
  const advance = (status: string) => async () => {
    await patch({ status }, "Status updated.");
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // Reachable when the id is a stale reference, or belongs to someone else and
  // RLS hides it. A clear message beats the generic 404 this used to give.
  if (!req) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-xl font-bold mb-2">Repair not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This repair request either doesn't exist, or it isn't yours to view.
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild variant="outline"><Link to="/repairs">Browse technicians</Link></Button>
          <Button asChild><Link to="/book-repair">Book a repair</Link></Button>
        </div>
      </div>
    );
  }

  const cancelled = req.status === "cancelled";

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <Link to="/repairs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Repairs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            {req.device_description}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Reference #{req.id.slice(0, 8).toUpperCase()} · Booked {formatDate(req.created_at)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`capitalize ${cancelled ? "border-red-500 text-red-600" : "border-primary text-primary"}`}
        >
          {String(req.status).replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Progress */}
      <Card className="p-5">
        <h2 className="font-semibold mb-4 text-sm">Progress</h2>
        {cancelled ? (
          <p className="text-sm text-red-600">This repair was cancelled.</p>
        ) : (
          <ol className="space-y-3">
            {FLOW.map((step, i) => {
              const done = i <= current;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span
                    className={`h-6 w-6 shrink-0 rounded-full grid place-items-center text-xs font-bold ${
                      done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`text-sm ${done ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {/* What's wrong with it */}
      <Card className="p-5 space-y-2">
        <h2 className="font-semibold text-sm">Reported problem</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{req.problem_description}</p>
        {req.technician_notes && (
          <>
            <h2 className="font-semibold text-sm pt-3">Technician notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{req.technician_notes}</p>
          </>
        )}
      </Card>

      {/* Quote */}
      {req.quoted_price_ksh != null && (
        <Card className="p-5">
          <h2 className="font-semibold text-sm mb-2">Quotation</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-2xl font-bold">{formatKsh(req.quoted_price_ksh)}</span>
            {req.customer_approved_quote ? (
              <Badge className="bg-emerald-100 text-emerald-700">Approved by customer</Badge>
            ) : (
              <Badge variant="outline">Awaiting customer approval</Badge>
            )}
          </div>

          {/* The only place a customer can accept a quote. Without this the
              vendor's "Mark received" button stays disabled forever, because it
              is gated on customer_approved_quote. */}
          {isCustomer && !req.customer_approved_quote && !cancelled && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" disabled={busy} onClick={approveQuote}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve quote"}
              </Button>
              <Button size="sm" variant="outline" className="text-red-600" disabled={busy} onClick={declineRepair}>
                Decline &amp; cancel
              </Button>
            </div>
          )}

          {/* Pay the quote into Float. Same escrow promise as a product order:
              the technician is not paid until the customer confirms. */}
          {isCustomer && req.customer_approved_quote && req.payment_status === "unpaid" && !cancelled && (
            <div className="mt-4 border-t pt-4 space-y-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Your payment is held in <strong>Float</strong>. {vendor?.business_name ?? "The technician"} is
                  paid only after you collect the device and confirm the repair.
                </span>
              </div>
              <div className="space-y-1">
                <Label htmlFor="repair-phone">M-Pesa number</Label>
                <Input
                  id="repair-phone"
                  inputMode="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPayError(null); }}
                  disabled={paying}
                />
              </div>
              {payError && (
                <p className="text-xs text-red-600 flex items-start gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {payError}
                </p>
              )}
              <Button className="w-full sm:w-auto" disabled={paying} onClick={payQuote}>
                {paying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Waiting for your M-Pesa PIN…</>
                ) : (
                  <><Smartphone className="h-4 w-4 mr-2" /> Pay {formatKsh(req.quoted_price_ksh)} into Float</>
                )}
              </Button>
            </div>
          )}

          {req.payment_status === "held" && (
            <p className="mt-4 text-xs text-emerald-700 flex items-center gap-1.5 border-t pt-4">
              <ShieldCheck className="h-4 w-4" />
              Held in Float{req.mpesa_receipt_number ? ` · M-Pesa ${req.mpesa_receipt_number}` : ""} — released when
              the customer confirms the repair.
            </p>
          )}
          {req.payment_status === "released" && (
            <p className="mt-4 text-xs text-emerald-700 flex items-center gap-1.5 border-t pt-4">
              <CheckCircle2 className="h-4 w-4" />
              Released to {vendor?.business_name ?? "the technician"}
              {req.mpesa_receipt_number ? ` · M-Pesa ${req.mpesa_receipt_number}` : ""}.
            </p>
          )}
        </Card>
      )}

      {/* Inspection + confirmation. This is the end of the flow that was
          missing entirely: the vendor could mark a repair "completed" on their
          own, with no customer involvement and no money ever moving. */}
      {isCustomer && req.status === "ready_for_collection" && !cancelled && (
        <Card className="p-5 border-primary/40">
          <h2 className="font-semibold text-sm mb-1">Inspect your device</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Collect the device and check the original fault is actually fixed, and that nothing else was damaged.
            {req.payment_status === "held"
              ? " Confirming releases your payment to the technician, so check before you confirm."
              : ""}
          </p>
          <div className="space-y-2 mb-4">
            <Label htmlFor="inspection-notes">Inspection notes (optional)</Label>
            <Textarea
              id="inspection-notes"
              rows={3}
              placeholder="e.g. Keyboard works, but the trackpad is still loose."
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => confirmCollection(true)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ThumbsUp className="h-4 w-4 mr-1" /> Device received &amp; repair confirmed</>}
            </Button>
            <Button variant="outline" className="text-red-600" disabled={busy} onClick={() => confirmCollection(false)}>
              <ThumbsDown className="h-4 w-4 mr-1" /> Not fixed — send it back
            </Button>
          </div>
        </Card>
      )}

      {req.inspection_passed === false && req.inspection_notes && (
        <Card className="p-5 border-red-200 bg-red-50/50">
          <h2 className="font-semibold text-sm mb-1 text-red-700">Customer reported the repair as incomplete</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{req.inspection_notes}</p>
        </Card>
      )}

      {req.customer_confirmed_at && (
        <Card className="p-5 border-emerald-200 bg-emerald-50/50">
          <p className="text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Confirmed by the customer on {formatDate(req.customer_confirmed_at)}.
          </p>
        </Card>
      )}

      {/* Who is doing the work / who it is for */}
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold text-sm">{isVendor ? "Customer" : "Technician"}</h2>
        {isVendor ? (
          <div className="text-sm space-y-1">
            <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{customer?.full_name ?? "Customer"}</p>
            {customer?.phone_number && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{customer.phone_number}</p>
            )}
          </div>
        ) : (
          <div className="text-sm space-y-1">
            <p className="font-medium">{vendor?.business_name ?? "Technician"}</p>
            {vendor?.phone && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{vendor.phone}</p>
            )}
            {(vendor?.physical_address || vendor?.city) && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {[vendor.physical_address, vendor.city, vendor.county].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Vendor controls, so a technician can act straight from the notification
          instead of hunting through the dashboard. Mirrors RepairsTab. */}
      {isVendor && !cancelled && (
        <Card className="p-5">
          <h2 className="font-semibold text-sm mb-3">Update this repair</h2>
          <div className="flex flex-wrap gap-2">
            {req.status === "submitted" && (
              <Button asChild size="sm">
                <Link to="/vendor/dashboard?tab=Repairs">Send a quote</Link>
              </Button>
            )}
            {/* No "Mark received" button: paying is what hands the device
                over, and mark_repair_paid advances quotation_sent -> received
                itself. A vendor marking it received manually would let work
                start on an unpaid repair. */}
            {req.status === "received" && (
              <Button size="sm" disabled={busy} onClick={advance("diagnosing")}>
                Start diagnosis
              </Button>
            )}
            {req.status === "diagnosing" && (
              <Button size="sm" disabled={busy} onClick={advance("in_repair")}>
                Start repair
              </Button>
            )}
            {req.status === "in_repair" && (
              <Button size="sm" disabled={busy} onClick={advance("ready_for_collection")}>
                Ready for collection
              </Button>
            )}
            {/* The vendor cannot mark a repair completed. Only the customer
                closes it out, by inspecting and confirming — that is what
                releases the money from Float. */}
            {req.status === "ready_for_collection" && (
              <p className="text-xs text-muted-foreground self-center">
                Waiting for the customer to collect, inspect and confirm. Their confirmation releases your payment.
              </p>
            )}
            {req.status === "quotation_sent" && (
              <p className="text-xs text-muted-foreground self-center">
                {req.customer_approved_quote
                  ? "Quote approved — waiting for the customer to pay into Float."
                  : "Waiting for the customer to approve your quote."}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RepairDetail;
