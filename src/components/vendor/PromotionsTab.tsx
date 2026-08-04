import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESCROW_API_BASE } from "@/lib/functions";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Megaphone, Loader2, Smartphone, CheckCircle2, ShieldCheck } from "lucide-react";

const PRICES: Record<string, number> = {
  featured_homepage: 2000,
  top_search: 1500,
  trending_carousel: 1000,
};

export const PromotionsTab = ({ vendor }: { vendor: any }) => {
  const [promos, setPromos] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("featured_homepage");
  const [productId, setProductId] = useState<string>("");
  const [days, setDays] = useState<string>("7");

  // STK Push Simulation State
  const [stkOpen, setStkOpen] = useState(false);
  const [phone, setPhone] = useState(vendor.phone ?? vendor.phone_number ?? "0712345678");
  const [stkPhase, setStkPhase] = useState<"idle" | "sending" | "success">("idle");

  const load = async () => {
    setLoading(true);
    const [p, pr] = await Promise.all([
      supabase.from("promotions").select("*, product:products(brand, model_name)").eq("vendor_id", vendor.id).order("created_at", { ascending: false }),
      supabase.from("products").select("id, brand, model_name").eq("vendor_id", vendor.id).eq("is_active", true),
    ]);
    setPromos(p.data ?? []);
    setProducts(pr.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [vendor.id]);

  const handleStartPayment = () => {
    setOpen(false);
    setStkPhase("idle");
    setStkOpen(true);
  };

  const executeStkPush = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid M-Pesa phone number");
      return;
    }
    setStkPhase("sending");

    // Charge what the vendor is actually shown and what gets recorded on the
    // promotion row. This was hardcoded to 1, so every promotion - however
    // long or expensive - collected exactly KES 1.
    const totalAmount = (PRICES[type] * Number(days)) / 7;

    const digits = String(phone ?? "").replace(/^\+/, "").replace(/\D/g, "");
    let formattedPhone = digits;
    if (/^0[71]\d{8}$/.test(digits)) formattedPhone = `254${digits.slice(1)}`;
    else if (/^[71]\d{8}$/.test(digits)) formattedPhone = `254${digits}`;

    try {
      await fetch(`${ESCROW_API_BASE}/mpesa-stkpush`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
          amount_ksh: totalAmount,
          amountKsh: totalAmount,
          amount: totalAmount,
        }),
      });
    } catch (err) {
      console.warn("STK Push call error:", err);
    }

    setTimeout(async () => {
      const expires = new Date();
      expires.setDate(expires.getDate() + Number(days));

      const { error } = await supabase.from("promotions").insert({
        vendor_id: vendor.id,
        product_id: productId || null,
        promotion_type: type as any,
        amount_paid_ksh: totalAmount,
        is_active: true,
        expires_at: expires.toISOString(),
      });

      if (error) {
        toast.error(error.message);
        setStkPhase("idle");
      } else {
        setStkPhase("success");
        toast.success(`M-Pesa payment confirmed! Promotion activated.`);
        setTimeout(() => {
          setStkOpen(false);
          load();
        }, 1200);
      }
    }, 1800);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Promotions</h2>
        <Button onClick={() => setOpen(true)}>New promotion</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : promos.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No promotions yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {promos.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium capitalize">{p.promotion_type.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground">
                  {p.product ? `${p.product.brand} ${p.product.model_name}` : "Shop-wide"} · Expires {formatDate(p.expires_at)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold"><span className="text-price">{formatKsh(p.amount_paid_ksh)}</span></div>
                <Badge variant={p.is_active ? "default" : "outline"} className={p.is_active ? "bg-success text-success-foreground" : ""}>
                  {p.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Promotion Configuration Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New promotion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured_homepage">Featured on homepage - KES 2,000/wk</SelectItem>
                  <SelectItem value="top_search">Top of search - KES 1,500/wk</SelectItem>
                  <SelectItem value="trending_carousel">Trending carousel - KES 1,000/wk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Product (optional, leave empty for shop-wide)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.brand} {p.model_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Duration (days)</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Total: <span className="text-price">{formatKsh((PRICES[type] * Number(days)) / 7)}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleStartPayment} className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground font-semibold">
              <Smartphone className="h-4 w-4" /> Pay with M-Pesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* M-Pesa STK Push Simulation Modal */}
      <Dialog open={stkOpen} onOpenChange={setStkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <Smartphone className="h-5 w-5 text-success" /> M-Pesa Express Checkout
            </DialogTitle>
          </DialogHeader>
          {stkPhase === "idle" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary p-3 text-sm space-y-1 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Promotion:</span>
                  <span className="font-semibold capitalize">{type.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{days} days</span>
                </div>
                <div className="flex justify-between pt-1 border-t">
                  <span className="font-semibold">Amount to Pay:</span>
                  <span className="text-price font-bold text-success">{formatKsh((PRICES[type] * Number(days)) / 7)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>M-Pesa Phone Number</Label>
                <Input
                  placeholder="712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent" /> An STK push prompt will be sent to your phone.
                </p>
              </div>
            </div>
          )}

          {stkPhase === "sending" && (
            <div className="py-8 text-center space-y-3">
              <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-success" />
              </div>
              <p className="font-medium text-foreground">STK Push Sent!</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Please check phone <span className="font-bold text-foreground">{phone}</span> and enter your M-Pesa PIN to complete payment of <span className="text-price font-semibold">{formatKsh((PRICES[type] * Number(days)) / 7)}</span>.
              </p>
            </div>
          )}

          {stkPhase === "success" && (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto animate-bounce" />
              <p className="font-bold text-lg text-foreground">Payment Received!</p>
              <p className="text-xs text-muted-foreground">Your promotion has been successfully activated.</p>
            </div>
          )}

          {stkPhase === "idle" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setStkOpen(false)}>Cancel</Button>
              <Button onClick={executeStkPush} className="bg-success hover:bg-success/90 text-success-foreground font-semibold">
                Confirm & Pay
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
