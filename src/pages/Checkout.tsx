import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Shield,
  Loader2,
  CheckCircle2,
  Smartphone,
  Clock,
  Store,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKsh } from "@/lib/format";
import { fetchPaymentStatus, invokeFunction } from "@/lib/functions";
import { toast } from "sonner";

type Phase = "idle" | "sending" | "waiting" | "success" | "timeout" | "error";

type CheckoutOrder = {
  id: string;
  product_id: string;
  quantity: number;
  total_amount_ksh: number;
  platform_fee_ksh: number;
  product?: {
    brand?: string | null;
    model_name?: string | null;
    image_urls?: string[] | null;
    condition?: string | null;
  } | null;
  vendor?: {
    business_name?: string | null;
  } | null;
};

const validPhone = (s: string) =>
  /^(0\d{9})$/.test(s) || /^254\d{9}$/.test(s);

// An STK prompt stays on the handset for up to ~2 minutes before Safaricom
// expires it, so give the customer the full window plus a little slack.
const TIMEOUT_SECONDS = 150;

const conditionVariant: Record<string, "default" | "secondary" | "outline"> = {
  New: "default",
  Refurbished: "secondary",
};

const Checkout = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);

  const retry = async () => {
    if (!user || !order) {
      setPhase("idle");
      setErrMsg("");
      return;
    }
    setRetrying(true);
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("payment_status", "pending");
    const { data: newId, error } = await supabase.rpc("create_order_atomic", {
      _product_id: order.product_id,
      _quantity: order.quantity,
    });
    setRetrying(false);
    if (error || !newId) {
      setPhase("idle");
      setErrMsg("");
      toast.error(error?.message ?? "Could not start a new order");
      return;
    }
    navigate(`/checkout/${newId}`, { replace: true });
    setPhase("idle");
    setErrMsg("");
  };

  useEffect(() => {
    document.title = "Checkout - TechTrust";
    if (!orderId) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "*, product:products(brand, model_name, image_urls, condition), vendor:vendor_profiles(business_name)"
        )
        .eq("id", orderId)
        .maybeSingle();
      setOrder(data as CheckoutOrder | null);

      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("phone_number")
          .eq("id", user.id)
          .maybeSingle();
        if (prof?.phone_number) setPhone(prof.phone_number);
      }
      setLoading(false);
    })();
  }, [orderId, user]);

  // Response 2 of the STK Push. The push itself proved nothing — this loop is
  // what establishes that money actually moved into Float.
  useEffect(() => {
    if (phase !== "waiting" || !orderId) return;
    const start = Date.now();
    const TIMEOUT_MS = TIMEOUT_SECONDS * 1000;
    setSecondsLeft(TIMEOUT_SECONDS);
    let stopped = false;

    const countdown = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSecondsLeft(Math.max(0, TIMEOUT_SECONDS - elapsed));
    }, 1000);

    const finish = (next: Phase, message?: string) => {
      stopped = true;
      clearInterval(interval);
      clearInterval(countdown);
      setPhase(next);
      if (next === "success") {
        toast.success("Payment confirmed and held in TechTrust Float");
        setTimeout(() => navigate(`/orders/${orderId}`), 2000);
      } else if (message) {
        setErrMsg(message);
      }
    };

    const poll = async () => {
      if (stopped) return;

      // Ask the escrow API first: it can query the gateway directly when the
      // callback has not landed, so a paid customer is never left hanging.
      const remote = await fetchPaymentStatus(orderId);
      if (stopped) return;

      let paid = remote?.status === "paid";
      let failed = remote?.status === "failed";

      if (!remote) {
        const { data } = await supabase
          .from("orders")
          .select("payment_status, status")
          .eq("id", orderId)
          .maybeSingle();
        if (stopped) return;
        paid =
          data?.payment_status === "paid_float" ||
          data?.payment_status === "released" ||
          data?.status === "payment_held";
        failed =
          data?.payment_status === "failed" || data?.status === "cancelled";
      }

      if (paid) finish("success");
      else if (failed)
        finish(
          "error",
          "Payment was not completed. No money has left your account.",
        );
      else if (Date.now() - start > TIMEOUT_MS) finish("timeout");
    };

    const interval = setInterval(poll, 4000);
    void poll();

    return () => {
      stopped = true;
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, [phase, orderId, navigate]);

  const pay = async () => {
    if (!validPhone(phone)) {
      setPhoneError(true);
      toast.error("Enter a valid phone (07XXXXXXXXX or 254XXXXXXXXX)");
      return;
    }
    setPhoneError(false);
    setPhase("sending");
    setErrMsg("");
    const { data, error } = await invokeFunction("mpesa-stkpush", {
      body: { order_id: orderId, phone },
    });
    if (error || !data?.success) {
      setPhase("error");
      setErrMsg(error?.message ?? data?.error ?? "Failed to start payment");
      return;
    }
    const amount = data.amountKsh
      ? ` for ${formatKsh(Number(data.amountKsh))}`
      : "";
    toast.success(
      `${data.CustomerMessage ?? "STK Push sent"}${amount}. Check your phone and enter your PIN.`
    );
    setPhase("waiting");
  };

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        Loading order...
      </div>
    );
  }
  if (!order) {
    return <div className="container py-20 text-center">Order not found.</div>;
  }

  const product = order.product;
  const subtotal =
    Number(order.total_amount_ksh) - Number(order.platform_fee_ksh);
  const imageUrl = product?.image_urls?.[0] ?? "/placeholder.svg";
  const productName = [product?.brand, product?.model_name]
    .filter(Boolean)
    .join(" ");
  const condition = product?.condition;
  const isLocked =
    phase === "sending" || phase === "waiting" || phase === "success";

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column — Order Summary */}
        <Card className="overflow-hidden">
          <img
            src={imageUrl}
            alt={productName}
            className="w-full h-[200px] object-cover bg-muted"
          />
          <div className="p-6">
            <h2 className="text-xl font-bold leading-snug mb-1">
              {productName}
            </h2>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
              <Store className="h-3.5 w-3.5" />
              <span>{order.vendor?.business_name ?? "Unknown vendor"}</span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {condition && (
                <Badge variant={conditionVariant[condition] ?? "outline"}>{condition}</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                &times;&nbsp;{order.quantity}
              </span>
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatKsh(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  TechTrust service fee (10%)
                </span>
                <span className="text-muted-foreground">
                  {formatKsh(Number(order.platform_fee_ksh))}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatKsh(Number(order.total_amount_ksh))}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-success bg-success/5 border border-success/30 rounded-md px-3 py-2">
              <Shield className="h-3.5 w-3.5 shrink-0 text-success" />
              <span>Protected by Float</span>
            </div>
          </div>
        </Card>

        {/* Right column — Payment */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Complete Payment</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            A payment prompt will be sent to your phone via M-Pesa.
          </p>

          <Label htmlFor="phone" className="mb-1.5 block">
            M-Pesa phone number
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground bg-muted border border-border rounded-md px-3 py-2 whitespace-nowrap">
              🇰🇪 +254
            </span>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(false);
              }}
              onBlur={() => setPhoneError(phone !== "" && !validPhone(phone))}
              placeholder="07XXXXXXXXX or 254XXXXXXXXX"
              disabled={isLocked}
              className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
          </div>
          {phoneError && (
            <p className="text-xs text-destructive mt-1">
              Enter a valid phone number (07XXXXXXXXX or 254XXXXXXXXX)
            </p>
          )}

          <div className="mt-5">
            {phase === "idle" && (
              <Button
                onClick={pay}
                variant="hero"
                size="lg"
                className="w-full"
              >
                Pay {formatKsh(Number(order.total_amount_ksh))}
              </Button>
            )}

            {phase === "sending" && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending to your phone...
              </div>
            )}

            {phase === "waiting" && (
              <div className="p-4 bg-success/5 border border-success/30 rounded-lg flex items-center gap-2.5">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                </span>
                <span className="text-sm font-medium text-success">
                  Check your phone to complete payment
                </span>
              </div>
            )}

            {phase === "success" && (
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-success">
                    Payment confirmed!
                  </div>
                  <div className="text-xs text-success/80 mt-0.5">
                    Redirecting to your order...
                  </div>
                </div>
              </div>
            )}

            {phase === "timeout" && (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="text-sm font-semibold text-warning">
                    Payment timed out
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  We did not hear back from M-Pesa within {TIMEOUT_SECONDS}{" "}
                  seconds. If you were charged, the order will update on its own
                  — check your orders before paying again.
                </p>
                <Button
                  onClick={retry}
                  variant="outline"
                  size="sm"
                  disabled={retrying}
                >
                  {retrying ? "Starting fresh order..." : "Try again"}
                </Button>
              </div>
            )}

            {phase === "error" && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <X className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-semibold">Payment failed</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{errMsg}</p>
                <Button
                  onClick={retry}
                  variant="outline"
                  size="sm"
                  disabled={retrying}
                >
                  {retrying ? "Starting fresh order..." : "Try again"}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
