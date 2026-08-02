import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  };

  const isVendor = roles.includes("vendor");
  const isAdmin = roles.includes("admin");

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "font-body-md text-sm transition-colors duration-200 hover:text-secondary font-medium",
      isActive ? "text-primary font-bold" : "text-on-surface-variant"
    );

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-sm border-b border-outline-variant/20">
      <div className="flex justify-between items-center h-20 px-6 sm:px-10 md:px-16 lg:px-24 max-w-[1440px] mx-auto w-full">
        {/* Brand: "TechTrust" text then logo */}
        <Link to="/" className="font-display-h2 text-2xl font-bold text-primary flex items-center gap-2 shrink-0">
          <span>TechTrust</span>
          <img src="/logo.jpg" alt="TechTrust Logo" className="h-7 w-auto object-contain rounded-md" />
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex gap-8 items-center mx-6">
          <NavLink to="/browse" className={navLinkClass}>Browse</NavLink>
          <NavLink to="/repairs" className={navLinkClass}>Repairs</NavLink>
          <NavLink to="/how-it-works" className={navLinkClass}>How It Works</NavLink>
        </nav>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-sm mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search laptops, phones, gear..."
              className="pl-10 bg-surface-container-low border-transparent focus:border-primary text-sm rounded-xl py-2"
            />
          </div>
        </form>

        {/* Trailing Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          <CartIcon />

          {user ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate("/admin")}
                      aria-label="Admin Dashboard"
                      className="text-primary hover:bg-surface-container-high"
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
                    <div className="h-9 w-9 rounded-full bg-primary text-on-primary grid place-items-center text-sm font-bold shadow-sm">
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
                  {isVendor ? (
                    <DropdownMenuItem onClick={() => navigate("/vendor/dashboard")}>
                      <Store className="mr-2 h-4 w-4" /> Vendor Dashboard
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate("/vendor/onboarding", { state: { role: "vendor" } })}>
                      <Store className="mr-2 h-4 w-4" /> Become a Vendor
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
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-5">
              <Link
                to="/auth"
                state={{ from: location.pathname }}
                className="text-on-surface-variant font-body-md-bold text-sm hover:text-secondary transition-colors duration-200 font-semibold"
              >
                Sign In
              </Link>
              <Link
                to="/vendor/onboarding"
                className="bg-primary-container text-on-primary px-4 py-2 rounded-lg font-body-md-bold text-sm hover:bg-primary transition-all duration-150 active:scale-95 shadow-sm font-semibold"
              >
                List Your Shop
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
