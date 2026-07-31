import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { CartLargeIcon } from "@/components/icons/CartLargeIcon";

export const CartIcon = () => {
  const { count } = useCart();
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/cart" aria-label="View cart">
        <CartLargeIcon className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
};
