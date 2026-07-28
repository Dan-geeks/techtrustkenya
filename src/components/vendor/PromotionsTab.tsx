import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Megaphone, Loader2 } from "lucide-react";

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

  const create = async () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + Number(days));
    const { error } = await supabase.from("promotions").insert({
      vendor_id: vendor.id,
      product_id: productId || null,
      promotion_type: type as any,
      amount_paid_ksh: PRICES[type] * Number(days) / 7,
      expires_at: expires.toISOString(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Promotion created. Awaiting payment confirmation.");
      setOpen(false);
      load();
    }
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
                <div className="font-semibold">{formatKsh(p.amount_paid_ksh)}</div>
                <Badge variant="outline">{p.is_active ? "Active" : "Inactive"}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New promotion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured_homepage">Featured on homepage — KES 2,000/wk</SelectItem>
                  <SelectItem value="top_search">Top of search — KES 1,500/wk</SelectItem>
                  <SelectItem value="trending_carousel">Trending carousel — KES 1,000/wk</SelectItem>
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
              Total: {formatKsh(PRICES[type] * Number(days) / 7)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
