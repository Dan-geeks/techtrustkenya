import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Star, Loader2, MessageSquare } from "lucide-react";

export const ReviewsTab = ({ vendor }: { vendor: any }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, product:products(brand, model_name)")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });
      const list = data ?? [];
      const ids = Array.from(new Set(list.map((r: any) => r.customer_id)));
      const map: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      }
      setReviews(list.map((r: any) => ({ ...r, customer: map[r.customer_id] ?? null })));
      setLoading(false);
    })();
  }, [vendor.id]);

  const avgProduct = reviews.length ? reviews.reduce((s, r) => s + r.product_rating, 0) / reviews.length : 0;
  const avgService = reviews.length ? reviews.reduce((s, r) => s + r.service_rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Reviews</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : reviews.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No reviews yet.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Avg product rating</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <span className="text-stat">{avgProduct.toFixed(1)}</span> <Star className="h-5 w-5 fill-warning text-warning" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Avg service rating</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <span className="text-stat">{avgService.toFixed(1)}</span> <Star className="h-5 w-5 fill-warning text-warning" />
              </div>
            </Card>
          </div>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="font-medium text-sm">{r.customer?.full_name ?? "Anonymous"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.product?.brand} {r.product?.model_name} · {formatDate(r.created_at)}
                    </div>
                  </div>
                  <div className="text-xs text-right">
                    <div>Product: {"â˜…".repeat(r.product_rating)}</div>
                    <div>Service: {"â˜…".repeat(r.service_rating)}</div>
                  </div>
                </div>
                {r.comment && <p className="text-sm mt-2">{r.comment}</p>}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
