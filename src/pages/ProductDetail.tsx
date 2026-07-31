import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ShieldCheck,
  Star,
  Minus,
  Plus,
  ArrowRight,
  MapPin,
  Clock,
  Package,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { CartLargeIcon } from "@/components/icons/CartLargeIcon";
import { StoreIcon } from "@/components/icons/StoreIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

function conditionColor(condition: string) {
  switch (condition?.toLowerCase()) {
    case "new":
      return "border-transparent bg-success text-success-foreground";
    case "refurbished":
      return "border-transparent bg-accent text-accent-foreground";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
}

function nameInitials(name: string) {
  return (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();
}

function Stars({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(cls, i < Math.round(rating) ? "fill-warning text-warning" : "fill-muted text-muted")}
        />
      ))}
    </div>
  );
}

function StarRow({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-right text-muted-foreground">{star}</span>
      <Star className="h-3.5 w-3.5 fill-warning text-warning shrink-0" />
      <Progress value={pct} className="h-2 flex-1" />
      <span className="w-6 text-right text-muted-foreground text-xs">{count}</span>
    </div>
  );
}

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [buying, setBuying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendor:vendor_profiles(*)")
        .eq("id", id)
        .maybeSingle();
      setProduct(data);
      if (data) {
        document.title = `${data.brand} ${data.model_name} | TechTrust`;
        const { data: rel } = await supabase
          .from("products")
          .select("*, vendor:vendor_profiles(id,business_name,average_rating,verification_status)")
          .eq("vendor_id", data.vendor_id)
          .eq("is_active", true)
          .neq("id", id)
          .limit(4);
        setRelated(rel ?? []);
        const { data: revs } = await supabase
          .from("reviews")
          .select("*, customer:profiles(full_name)")
          .eq("product_id", id)
          .order("created_at", { ascending: false });
        setReviews(revs ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-10">
          <div className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 aspect-square rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-11 flex-1 rounded-lg" />
              <Skeleton className="h-11 flex-1 rounded-lg" />
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg font-semibold">Product not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  const buy = async () => {
    if (!user) {
      navigate("/auth", { state: { from: `/product/${id}` } });
      return;
    }
    if (product.quantity_in_stock < 1) {
      toast.error("Out of stock");
      return;
    }
    setBuying(true);
    const { data: existing } = await supabase
      .from("orders")
      .select("id, quantity")
      .eq("customer_id", user.id)
      .eq("product_id", product.id)
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      setBuying(false);
      navigate(`/checkout/${existing.id}`);
      return;
    }
    const { data, error } = await supabase.rpc("create_order_atomic", {
      _product_id: product.id,
      _quantity: qty,
    });
    setBuying(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not create order");
      return;
    }
    navigate(`/checkout/${data}`);
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/auth", { state: { from: `/product/${id}` } });
      return;
    }
    setAdding(true);
    const ok = await addToCart(product.id, qty);
    setAdding(false);
    if (ok) toast.success(`Added ${qty} to cart`);
  };

  const images: string[] =
    product.image_urls?.length ? product.image_urls.slice(0, 5) : ["/placeholder.svg"];

  const avgRating = reviews.length
    ? reviews.reduce((s: number, r: any) => s + (r.product_rating ?? 0), 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r: any) => Math.round(r.product_rating) === star).length,
  }));

  const outOfStock = product.quantity_in_stock < 1;
  const lowStock = product.quantity_in_stock > 0 && product.quantity_in_stock <= 3;
  const descLong = (product.description ?? "").length > 180;
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  const ctaAddToCart = (
    <Button variant="outline" size="lg" className="flex-1" onClick={handleAddToCart} disabled={outOfStock || adding}>
      <CartLargeIcon className="h-4 w-4" />
      {outOfStock ? "Out of Stock" : adding ? "Adding…" : "Add to Cart"}
    </Button>
  );

  const ctaBuyNow = (
    <Button variant="hero" size="lg" className="flex-1" onClick={buy} disabled={outOfStock || buying}>
      <Zap className="h-4 w-4" />
      {outOfStock ? "Out of Stock" : buying ? "Creating order…" : "Buy Now"}
    </Button>
  );

  return (
    <>
      <div className="container py-8 pb-32 md:pb-8 animate-in fade-in-0 duration-300">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-10">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted shadow-card">
              <img
                src={images[activeImageIdx] ?? "/placeholder.svg"}
                alt={product.model_name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((src: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={cn(
                      "flex-1 aspect-square rounded-lg overflow-hidden border-2 transition-smooth",
                      i === activeImageIdx
                        ? "ring-2 ring-accent border-transparent"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("capitalize", conditionColor(product.condition))}>
                {product.condition}
              </Badge>
              <Badge variant="outline">{product.brand}</Badge>
              {product.year_of_manufacture && (
                <span className="text-xs text-muted-foreground">{product.year_of_manufacture}</span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {product.brand} {product.model_name}
            </h1>

            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <Stars rating={avgRating} />
                <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            )}

            <div className="text-4xl font-extrabold text-accent">
              {formatKsh(product.price_ksh)}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {product.warranty_status ? (
                <span className="flex items-center gap-1.5 text-success font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  {product.warranty_duration_months
                    ? `${product.warranty_duration_months} months warranty`
                    : "Warranty included"}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  No warranty
                </span>
              )}
              {outOfStock ? (
                <span className="flex items-center gap-1.5 text-destructive font-medium">
                  <Package className="h-4 w-4" />
                  Out of stock
                </span>
              ) : lowStock ? (
                <span className="flex items-center gap-1.5 text-warning font-medium">
                  <Package className="h-4 w-4" />
                  Low stock — only {product.quantity_in_stock} left
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-success font-medium">
                  <Package className="h-4 w-4" />
                  In stock ({product.quantity_in_stock} units)
                </span>
              )}
            </div>

            {product.description && (
              <div>
                <p
                  className={cn(
                    "text-foreground/80 leading-relaxed text-sm transition-all",
                    !descExpanded && descLong ? "line-clamp-3" : ""
                  )}
                >
                  {product.description}
                </p>
                {descLong && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-1 flex items-center gap-1 text-xs text-accent font-medium hover:underline"
                  >
                    {descExpanded ? <>Show less <ChevronUp className="h-3.5 w-3.5" /></> : <>Show more <ChevronDown className="h-3.5 w-3.5" /></>}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-lg">
                <Button variant="ghost" size="icon" onClick={() => setQty(Math.max(1, qty - 1))} disabled={outOfStock}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <Button variant="ghost" size="icon" onClick={() => setQty(Math.min(product.quantity_in_stock, qty + 1))} disabled={outOfStock}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{formatKsh(product.price_ksh * qty)}</span>
              </span>
            </div>

            <div className="hidden md:flex gap-3">
              {ctaAddToCart}
              {ctaBuyNow}
            </div>

            {product.vendor && (
              <div className="p-5 bg-card border border-border rounded-xl shadow-card">
                <Link
                  to={`/shop/${product.vendor.id}`}
                  className="flex items-center gap-4 hover:opacity-90 transition-smooth"
                >
                  <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm shrink-0">
                    {nameInitials(product.vendor.business_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold truncate">{product.vendor.business_name}</span>
                      {(product.vendor.verification_status === "verified" ||
                        product.vendor.verification_status === "approved") && (
                        <Badge className="border-transparent bg-success text-success-foreground text-[10px] px-1.5 py-0.5 gap-0.5">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {Number(product.vendor.average_rating ?? 0).toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <StoreIcon className="h-3 w-3" />
                        {product.vendor.total_completed_transactions ?? 0} sales
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-accent font-medium flex items-center gap-0.5 shrink-0">
                    Visit Shop <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>

                {(product.vendor.operating_hours || product.vendor.google_maps_link) && (
                  <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                    {product.vendor.operating_hours && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{product.vendor.operating_hours}</span>
                      </div>
                    )}
                    {product.vendor.google_maps_link && (
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <a href={product.vendor.google_maps_link} target="_blank" rel="noopener noreferrer">
                          <MapPin className="h-4 w-4" />
                          Get Directions to Shop
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="reviews" className="mt-16">
          <TabsList>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="related">More from this vendor</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-6">
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">
                No reviews yet. Be the first after your purchase.
              </p>
            ) : (
              <div className="grid lg:grid-cols-[280px_1fr] gap-8">
                <div className="p-5 bg-card border border-border rounded-xl shadow-card self-start">
                  <div className="text-4xl font-extrabold text-center mb-1">{avgRating.toFixed(1)}</div>
                  <div className="flex justify-center mb-1">
                    <Stars rating={avgRating} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mb-4">
                    {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-2">
                    {ratingCounts.map(({ star, count }) => (
                      <StarRow key={star} star={star} count={count} total={reviews.length} />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {visibleReviews.map((r: any) => (
                    <div key={r.id} className="p-5 bg-card border border-border rounded-xl shadow-card">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground grid place-items-center text-xs font-bold shrink-0">
                          {nameInitials(r.customer?.full_name ?? "Customer")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{r.customer?.full_name ?? "Customer"}</span>
                            <span className="text-xs text-muted-foreground">
                              {r.created_at ? formatDate(r.created_at) : ""}
                            </span>
                          </div>
                          <div className="mt-0.5">
                            <Stars rating={r.product_rating} size="sm" />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>
                    </div>
                  ))}

                  {reviews.length > 3 && (
                    <Button variant="outline" className="w-full" onClick={() => setShowAllReviews(!showAllReviews)}>
                      {showAllReviews
                        ? <><span>Show less</span><ChevronUp className="h-4 w-4" /></>
                        : <><span>Show all {reviews.length} reviews</span><ChevronDown className="h-4 w-4" /></>}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="related" className="mt-6">
            {related.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">
                No other products from this vendor.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {related.map((p: any) => <ProductCard key={p.id} {...p} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile sticky CTA — fixed so it doesn't scroll with content */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex gap-3 shadow-elegant">
        {ctaAddToCart}
        {ctaBuyNow}
      </div>
    </>
  );
};

export default ProductDetail;
