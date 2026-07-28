import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

export const CartIcon = () => {
  const { count } = useCart();
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/cart" aria-label="View cart">
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
};
