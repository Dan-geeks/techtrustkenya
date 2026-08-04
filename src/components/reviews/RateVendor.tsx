import { useEffect, useState } from "react";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Rate the vendor once an order is confirmed.
 *
 * The `reviews` table and its RLS policy (own order, confirmed only) already
 * existed but nothing in the product ever wrote to it - zero rows - so
 * vendor_profiles.average_rating had nothing to be computed from and the
 * landing page fell back to a hardcoded 4.8.
 */
const Stars = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) => (
  <div>
    <p className="text-xs font-semibold text-[#0F172A] mb-1.5">{label}</p>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"} for ${label}`}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${
              n <= value ? "text-amber-400 fill-amber-400" : "text-slate-300"
            }`}
          />
        </button>
      ))}
    </div>
  </div>
);

export const RateVendor = ({
  orderId,
  vendorId,
  productId,
  customerId,
  vendorName,
}: {
  orderId: string;
  vendorId: string;
  productId?: string | null;
  customerId: string;
  vendorName?: string | null;
}) => {
  const [existing, setExisting] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [productRating, setProductRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      setExisting(data ?? null);
      setChecking(false);
    })();
  }, [orderId]);

  const submit = async () => {
    if (productRating < 1 || serviceRating < 1) {
      toast.error("Give both the item and the service a star rating.");
      return;
    }
    if (!productId) {
      toast.error("This order has no product attached, so it can't be reviewed.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      customer_id: customerId,
      vendor_id: vendorId,
      product_id: productId,
      product_rating: productRating,
      service_rating: serviceRating,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks! Your rating is now on the vendor's profile.");
    setExisting({ product_rating: productRating, service_rating: serviceRating, comment });
  };

  if (checking) return null;

  if (existing) {
    const avg = ((existing.product_rating + existing.service_rating) / 2).toFixed(1);
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#E2E8F0]">
        <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          You rated this order
        </h3>
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`h-5 w-5 ${
                n <= Math.round(Number(avg)) ? "text-amber-400 fill-amber-400" : "text-slate-300"
              }`}
            />
          ))}
          <span className="ml-2 text-sm font-bold text-[#0F172A]">{avg}</span>
        </div>
        {existing.comment && (
          <p className="text-xs text-[#64748B] mt-2 italic">"{existing.comment}"</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border-2 border-amber-200 space-y-4">
      <div>
        <h3 className="font-bold text-base text-[#0F172A]">
          How was {vendorName || "this vendor"}?
        </h3>
        <p className="text-xs text-[#64748B] mt-0.5">
          Your rating is what builds a shop's reputation here, so other buyers know who to trust.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <Stars value={productRating} onChange={setProductRating} label="The item" />
        <Stars value={serviceRating} onChange={setServiceRating} label="The service" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-comment" className="text-xs">Anything to add? (optional)</Label>
        <Textarea
          id="review-comment"
          rows={3}
          placeholder="e.g. Exactly as described, and they let me test it before paying."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <Button onClick={submit} disabled={saving} className="w-full sm:w-auto">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Submit rating"}
      </Button>
    </div>
  );
};
