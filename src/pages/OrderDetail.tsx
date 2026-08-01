import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Clock,
  Package,
  Shield,
  Star,
  Loader2,
  Truck,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKsh, formatDate } from "@/lib/format";
import { invokeFunction } from "@/lib/functions";
import { toast } from "sonner";

type TimelineStep = {
  key: string;
  label: string;
};

/** Steps shown in the horizontal tracker. Labels match the client's mockup. */
const TIMELINE: TimelineStep[] = [
  { key: "payment_held", label: "Payment Held" },
  { key: "vendor_preparing", label: "Being Prepared" },
  { key: "out_for_delivery", label: "In Transit" },
  { key: "delivered_awaiting_confirmation", label: "Delivered" },
  { key: "confirmed", label: "Complete" },
];

type OrderDetailRecord = {
  id: string;
  customer_id: string;
  vendor_id: string;
  status: string;
  payment_status: string;
  payout_status?: string | null;
  payout_error?: string | null;
  total_amount_ksh: number;
  platform_fee_ksh: number;
  vendor_payout_ksh: number;
  quantity: number;
  dispute_reason?: string | null;
  created_at: string;
  product?: {
    brand?: string | null;
    model_name?: string | null;
    image_urls?: string[] | null;
  } | null;
  vendor?: {
    id?: string | null;
    business_name?: string | null;
  } | null;
};

const STATUS_ORDER = [
  "pending_payment",
  "payment_held",
  "vendor_preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered_awaiting_confirmation",
  "confirmed",
];

const reachedIndex = (status: string): number => STATUS_ORDER.indexOf(status);

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  payment_held: "Payment held",
  vendor_preparing: "Being prepared",
  out_for_delivery: "In transit",
  ready_for_pickup: "Ready for pickup",
  delivered_awaiting_confirmation: "Delivered",
  confirmed: "Complete",
  disputed: "Disputed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const statusLabel = (status: string): string =>
  STATUS_LABELS[status] ?? status.replace(/_/g, " ");

const floatStatusText = (order: OrderDetailRecord): string => {
  if (order.payout_status === "pending") return "Delivery confirmed. Vendor payout is processing.";
  if (order.payout_status === "failed") return "Payout failed. TechTrust needs to retry or review it.";
  if (order.payout_status === "auto_release_due") return "Confirmation deadline expired. Release needs review.";
  if (order.payment_status === "paid_float") return "Held safely until delivery is confirmed.";
  if (order.payment_status === "released") return "Released to vendor.";
  if (order.payment_status === "refunded") return "Refunded to your mobile money.";
  if (order.payment_status === "pending") return "Awaiting payment.";
  if (order.payment_status === "failed") return "Payment failed.";
  return String(order.payment_status ?? "Unknown");
};

const paymentStatusBadge = (ps: string): { label: string; cls: string } => {
  const map: Record<string, { label: string; cls: string }> = {
    paid_float: { label: "Float Protected", cls: "bg-warning/10 text-warning border-warning/30" },
    released: { label: "Released", cls: "bg-success/10 text-success border-success/30" },
    refunded: { label: "Refunded", cls: "bg-muted text-muted-foreground" },
    pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
    failed: { label: "Failed", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  };
  return map[ps] ?? { label: ps, cls: "bg-muted text-muted-foreground" };
};

const OrderDetail = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    const { data } = await supabase
      .from("orders")
      .select(
        "*, product:products(brand, model_name, image_urls), vendor:vendor_profiles(id, business_name)"
      )
      .eq("id", orderId)
      .maybeSingle();
    setOrder(data as OrderDetailRecord | null);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    document.title = "Order Detail | TechTrust";
    load();
  }, [load]);

  const confirmReceipt = async () => {
    if (!orderId || !order) return;
    setSubmitting(true);
    const { data: res, error } = await invokeFunction("release-float-payment", {
      body: { orderId },
    });
    setSubmitting(false);
    if (error || !res?.success) {
      toast.error("Could not release payment: " + (error?.message ?? res?.error ?? "unknown"));
      return;
    }
    if (res.payoutPending) {
      toast.success("Delivery confirmed. Vendor payout is processing.");
    } else {
      toast.success("Payment released. The vendor has been paid.");
    }
    load();
  };

  const submitDispute = async () => {
    if (!orderId || disputeText.trim().length < 10) {
      toast.error("Please describe the problem (min 10 chars)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "disputed", dispute_reason: disputeText })
      .eq("id", orderId);
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit: " + error.message);
      return;
    }
    setDisputeOpen(false);
    toast.success("Dispute submitted. We'll be in touch within 24 hours.");
    load();
  };

  if (loading)
    return <div className="container py-20 text-center text-muted-foreground">Loading order...</div>;
  if (!order) return <div className="container py-20 text-center">Order not found.</div>;

  const reached = reachedIndex(order.status);
  const isCustomer = user?.id === order.customer_id;
  const payoutStatus = order.payout_status ?? "not_started";
  const canConfirm =
    isCustomer &&
    order.payment_status === "paid_float" &&
    (order.status === "delivered_awaiting_confirmation" ||
      (order.status === "confirmed" && payoutStatus === "failed")) &&
    !["pending", "sent"].includes(payoutStatus);

  const shortId = order.id.slice(0, 8).toUpperCase();
  // TIMELINE is a 5-step summary of the 7-value STATUS_ORDER, so map the order's
  // position back onto the visible steps rather than indexing them directly.
  const activeStep = TIMELINE.reduce(
    (acc, step, i) => (reachedIndex(step.key) <= reached ? i : acc),
    -1,
  );
  const psBadge = paymentStatusBadge(order.payment_status);
  const isFloatProtected = order.payment_status === "paid_float";
  const isReleased = order.payment_status === "released";

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">Order <span className="text-data-id align-middle">#{shortId}</span></h1>
      </div>

      {/* Status banner — headline state on the left, the Float position as a
          pill on the right, exactly as in the order-tracker mockup. */}
      <Card className="mb-5 p-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="mb-1 font-semibold">Status: {statusLabel(order.status)}</h2>
            <p className="text-sm text-muted-foreground">{floatStatusText(order)}</p>
          </div>
          <div
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-primary-foreground shadow-card ${
              isReleased ? "bg-success" : isFloatProtected ? "bg-float" : "bg-muted-foreground"
            }`}
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span className="text-price font-semibold">
              {isReleased ? "Float: Released " : isFloatProtected ? "Float: Holding " : "Float: Pending "}
              {formatKsh(Number(order.total_amount_ksh))}
            </span>
          </div>
        </div>
      </Card>

      {/* Horizontal stepper, per the mockup — scrolls sideways rather than
          wrapping, so the sequence always reads left to right. */}
      <Card className="mb-5 overflow-x-auto p-8">
        <div className="relative min-w-[600px]">
          <div className="absolute left-0 top-4 h-1 w-full -translate-y-1/2 rounded-full bg-muted" aria-hidden="true" />
          <div
            className="absolute left-0 top-4 h-1 -translate-y-1/2 rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(Math.max(0, activeStep) / (TIMELINE.length - 1)) * 100}%` }}
            aria-hidden="true"
          />
          <ol className="relative flex items-start justify-between">
            {TIMELINE.map((step, i) => {
              // The final step counts as done once the order is confirmed —
              // otherwise "Complete" would sit in the pulsing "current" state.
              const done = i < activeStep || (i === activeStep && order.status === "confirmed");
              const isCurrent = i === activeStep && !done;
              return (
                <li key={step.key} className="relative z-10 flex w-24 flex-col items-center">
                  <div
                    className={`mb-2 grid h-8 w-8 place-items-center rounded-full shadow-card transition-colors ${
                      done
                        ? "bg-success text-success-foreground"
                        : isCurrent
                          ? "bg-accent text-accent-foreground"
                          : "border-2 border-muted bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : isCurrent ? (
                      <span className="h-3 w-3 rounded-full bg-current opacity-90" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </div>
                  <span
                    className={`text-center text-xs leading-tight ${
                      isCurrent ? "font-semibold text-primary" : done ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <Card className="p-5 mb-5">
        <div className="flex gap-4 items-center">
          <img
            src={order.product?.image_urls?.[0] ?? "/placeholder.svg"}
            alt={order.product?.model_name ?? "Product"}
            className="w-16 h-16 rounded-lg object-cover bg-muted shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">
              {order.product?.brand} {order.product?.model_name}
            </div>
            <div className="text-sm text-muted-foreground">{order.vendor?.business_name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Qty <span className="text-stat">{order.quantity}</span> · {formatDate(order.created_at)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground mb-0.5">Total paid</div>
            <div className="font-bold text-lg"><span className="text-price">{formatKsh(Number(order.total_amount_ksh))}</span></div>
          </div>
        </div>
      </Card>

      <Card className="p-5 mb-5">
        <h2 className="font-semibold text-sm mb-3">Payment</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-muted px-2 py-1 rounded font-medium">M-Pesa</span>
            <span className="text-sm text-muted-foreground">{floatStatusText(order)}</span>
          </div>
          <Badge className={`${psBadge.cls} text-xs`} variant="outline">
            {psBadge.label}
          </Badge>
        </div>
        {payoutStatus !== "not_started" && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Payout status</span>
            <span className="font-medium capitalize">{String(payoutStatus).replace(/_/g, " ")}</span>
          </div>
        )}
      </Card>

      {(isFloatProtected || isReleased) && (
        <Card
          className={`p-5 mb-5 ${
            isReleased ? "bg-success/5 border-success/30" : "bg-warning/5 border-warning/30"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <Shield className={`h-6 w-6 shrink-0 ${isReleased ? "text-success" : "text-warning"}`} />
            <div className="flex-1">
              <div className="font-semibold">
                {isReleased ? "Payment Released" : "Float Protected"}
              </div>
              <div className="text-sm text-muted-foreground">
                {isReleased
                  ? "Payment has been released to the vendor."
                  : "Your payment is held safely until you confirm delivery."}
              </div>
            </div>
          </div>

          {canConfirm && (
            <>
              <div className="rounded-lg border border-warning/30 bg-background/60 p-3 text-sm mb-4">
                <p className="text-foreground">
                  When you confirm receipt, TechTrust will release{" "}
                  <strong><span className="text-price">{formatKsh(Number(order.vendor_payout_ksh))}</span></strong> to the vendor. TechTrust
                  retains <strong><span className="text-price">{formatKsh(Number(order.platform_fee_ksh))}</span></strong> as the service fee.
                </p>
              </div>
              <h3 className="font-semibold mb-3">
                {payoutStatus === "failed" ? "Retry vendor payout?" : "Did you receive your order?"}
              </h3>
              <div className="flex gap-3">
                <Button
                  variant="hero"
                  onClick={confirmReceipt}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Releasing
                    </>
                  ) : payoutStatus === "failed" ? (
                    "Retry payout"
                  ) : (
                    "Confirm Receipt"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDisputeOpen(true)}
                  disabled={submitting}
                  className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/5"
                >
                  Raise Dispute
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {isCustomer && order.status === "confirmed" && order.payment_status === "released" && (
        <Card className="p-5 mb-5 bg-success/5 border-success/30">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-warning" />
            <div>
              <div className="font-semibold">Order completed</div>
              <p className="text-sm text-muted-foreground">Leave a review to help other buyers.</p>
            </div>
          </div>
        </Card>
      )}

      {order.status === "confirmed" && order.payment_status === "paid_float" && payoutStatus === "pending" && (
        <Card className="p-5 mb-5 bg-warning/5 border-warning/30">
          <div className="flex items-start gap-3">
            <Loader2 className="h-6 w-6 text-warning shrink-0 animate-spin" />
            <div>
              <div className="font-semibold">Vendor payout processing</div>
              <p className="text-sm text-muted-foreground mt-1">
                The order is confirmed. The payout gateway is still returning a final success callback.
              </p>
            </div>
          </div>
        </Card>
      )}

      {order.status === "disputed" && (
        <Card className="p-5 mb-5 bg-destructive/5 border-destructive/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
            <div>
              <div className="font-semibold">Dispute active</div>
              <p className="text-sm text-muted-foreground mt-1">
                TechTrust will contact you within 24 hours to help resolve this.
              </p>
              {order.dispute_reason && (
                <p className="text-sm mt-2 italic">"{order.dispute_reason}"</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a dispute</DialogTitle>
            <DialogDescription>
              Describe what went wrong. Our team will review within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={disputeText}
            onChange={(e) => setDisputeText(e.target.value)}
            placeholder="What was the problem with your order?"
            rows={5}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitDispute} disabled={submitting}>
              Submit dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetail;
