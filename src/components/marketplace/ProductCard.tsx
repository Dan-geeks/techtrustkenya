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
  variant?: "light" | "dark";
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
  variant = "light",
}: ProductCardProps) => {
  const dark = variant === "dark";
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
      className={cn(
        "group flex flex-col rounded-lg overflow-hidden transition-colors duration-200",
        dark
          ? "bg-primary border border-primary-foreground/10 hover:border-accent/50"
          : "bg-card border border-border hover:border-accent/40",
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50/80 p-2.5 flex items-center justify-center">
        {showImage ? (
          <img
            src={firstImage}
            alt={`${brand} ${model_name}`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground/30">
            <Package className="h-10 w-10" />
          </div>
        )}
        {/* Mockup puts the condition chip top-right and keeps it quiet, so the
            green "Protected by Float" line stays the loudest signal on the card. */}
        <Badge className={cn("absolute top-2 right-2 text-data-id px-1.5 py-0.5", cond.cls)}>
          {cond.label}
        </Badge>
        {is_boosted && (
          <span className="absolute top-2 left-2 rounded bg-primary/80 px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        {vendor && (
          <div className="flex items-center gap-1">
            <span className={cn("text-data-id truncate", dark ? "text-primary-foreground/60" : "text-muted-foreground")}>
              {vendor.business_name}
            </span>
            {isVerified && <ShieldCheck className="h-3 w-3 shrink-0 text-success" />}
          </div>
        )}

        <h3 className={cn("font-medium text-sm line-clamp-2 leading-snug", dark ? "text-primary-foreground" : "text-foreground")}>
          {brand} {model_name}
        </h3>

        <div className="mt-1">
          <span className={cn("text-price text-base font-bold", dark ? "text-primary-foreground" : "text-accent")}>
            {formatKsh(price_ksh)}
          </span>
        </div>

        <div className={cn("flex items-center gap-1 text-data-id", dark ? "text-success/90" : "text-success")}>
          <ShieldCheck className="h-3 w-3 shrink-0" />
          Protected by Float
        </div>

        {lowStock && (
          <p className="text-[10px] font-medium text-warning">Only <span className="text-stat">{quantity_in_stock}</span> left</p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className={cn(
            "mt-auto pt-2 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-semibold transition-colors",
            outOfStock
              ? dark
                ? "bg-primary-foreground/10 text-primary-foreground/30 cursor-not-allowed"
                : "bg-muted text-muted-foreground/40 cursor-not-allowed"
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
