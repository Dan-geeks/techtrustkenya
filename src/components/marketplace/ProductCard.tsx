import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Package, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatKsh } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  brand: string;
  model_name: string;
  price_ksh: number;
  condition: "new" | "refurbished" | "used";
  image_urls: string[];
  is_boosted?: boolean;
  average_rating?: number;
  vendor?: {
    id: string;
    business_name: string;
    average_rating: number;
    verification_status: string;
  } | null;
  quantity_in_stock?: number;
}

const conditionConfig: Record<string, { label: string; cls: string }> = {
  new:         { label: "New",         cls: "bg-success text-success-foreground border-0" },
  refurbished: { label: "Refurbished", cls: "bg-warning text-warning-foreground border-0" },
  used:        { label: "Used",        cls: "bg-muted text-muted-foreground border-muted-foreground/20" },
};

export const ProductCard = ({
  id,
  brand,
  model_name,
  price_ksh,
  condition,
  image_urls,
  is_boosted,
  average_rating,
  vendor,
  quantity_in_stock,
}: ProductCardProps) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imgFailed, setImgFailed] = useState(false);

  const firstImage = image_urls?.[0];
  const showImage = firstImage && !imgFailed;
  const cond = conditionConfig[condition] ?? conditionConfig.used;
  const outOfStock = quantity_in_stock === 0;
  const lowStock = !outOfStock && quantity_in_stock !== undefined && quantity_in_stock <= 3;
  const isVerified = vendor?.verification_status === "verified" || vendor?.verification_status === "approved";

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    const ok = await addToCart(id, 1);
    if (ok) toast.success("Added to cart");
  };

  return (
    <Link
      to={`/product/${id}`}
      className="group flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-accent/40 transition-colors duration-200"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {showImage ? (
          <img
            src={firstImage}
            alt={`${brand} ${model_name}`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground/30">
            <Package className="h-10 w-10" />
          </div>
        )}
        <Badge className={cn("absolute top-2 left-2 text-[10px] px-1.5 py-0.5", cond.cls)}>
          {cond.label}
        </Badge>
        {is_boosted && (
          <span className="absolute top-2 right-2 bg-primary/80 text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
            Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        {vendor && (
          <div className="flex items-center gap-1">
            {isVerified && <ShieldCheck className="h-2.5 w-2.5 text-success shrink-0" />}
            <span className="text-[10px] text-muted-foreground truncate">{vendor.business_name}</span>
          </div>
        )}

        <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-snug">
          {brand} {model_name}
        </h3>

        <div className="mt-1">
          <span className="text-sm font-bold text-foreground">{formatKsh(price_ksh)}</span>
        </div>

        {lowStock && (
          <p className="text-[10px] text-warning font-medium">Only {quantity_in_stock} left</p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className={cn(
            "mt-auto pt-2 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-semibold transition-colors",
            outOfStock
              ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
              : "bg-accent text-accent-foreground hover:bg-accent/90"
          )}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {outOfStock ? "Out of stock" : "Buy with Float"}
        </button>
      </div>
    </Link>
  );
};
