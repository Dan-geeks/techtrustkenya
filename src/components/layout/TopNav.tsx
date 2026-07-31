import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, User as UserIcon, LogOut, Store, Package, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { CartIcon } from "@/components/cart/CartIcon";

export const TopNav = () => {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  };

  const isVendor = roles.includes("vendor");
  const isAdmin = roles.includes("admin");

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-[15px] font-medium transition-smooth hover:text-accent",
      isActive ? "text-accent" : "text-foreground/70"
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight font-display">
            Tech<span className="text-accent">Trust</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 ml-6">
          <NavLink to="/" end className={navLinkClass}>Home</NavLink>
          <NavLink to="/browse" className={navLinkClass}>Browse</NavLink>
          <NavLink to="/repairs" className={navLinkClass}>Repairs</NavLink>
          <NavLink to="/how-it-works" className={navLinkClass}>How It Works</NavLink>
        </nav>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search laptops, phones, repairs..."
              className="pl-9 bg-secondary/50 border-transparent focus:border-input"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          <CartIcon />
          {user ? (
            <>
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate("/admin")}
                      aria-label="Admin Dashboard"
                      className="text-accent hover:text-accent hover:bg-accent/10"
                    >
                      <Shield className="h-5 w-5" strokeWidth={2.25} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Admin Dashboard</TooltipContent>
                </Tooltip>
              )}
              <NotificationsBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="h-8 w-8 rounded-full gradient-accent grid place-items-center text-white text-sm font-semibold">
                      {(user.email?.[0] ?? "U").toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/orders")}>
                    <Package className="mr-2 h-4 w-4" /> My Orders
                  </DropdownMenuItem>
                  {isVendor && (
                    <DropdownMenuItem onClick={() => navigate("/vendor/dashboard")}>
                      <Store className="mr-2 h-4 w-4" /> Vendor Dashboard
                    </DropdownMenuItem>
                  )}
                  {roles.includes("admin") && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Store className="mr-2 h-4 w-4" /> Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="accent" asChild>
                <Link to="/vendor/register">List Your Shop</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
