import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Search, User as UserIcon, LogOut, Store, Package, Shield } from "lucide-react";
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
      "font-body-md text-base transition-colors duration-200 hover:text-[#0058be] font-medium",
      isActive ? "text-[#002766] font-bold" : "text-[#434651]"
    );

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex justify-between items-center h-20 w-full">
        {/* Brand: logo image followed by "TechTrust" text */}
        <Link to="/" className="font-display-h2 text-2xl md:text-3xl font-bold text-[#002766] tracking-tight shrink-0 flex items-center gap-1">
          <img src="/logo-transparent.png" alt="TechTrust Logo" className="h-16 md:h-20 scale-110 w-auto object-contain" />
          <span>TechTrust</span>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex gap-8 items-center mx-8">
          <NavLink to="/" className={navLinkClass}>Home</NavLink>
          <NavLink to="/browse" className={navLinkClass}>Browse</NavLink>
          <NavLink to="/repairs" className={navLinkClass}>Repairs</NavLink>
          <NavLink to="/how-it-works" className={navLinkClass}>How It Works</NavLink>
        </nav>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xs mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#747782]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search marketplace..."
              className="pl-10 bg-slate-100/80 border-transparent focus:border-[#0f3d8c] text-sm rounded-xl py-2"
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
                      className="text-[#0f3d8c] hover:bg-slate-100"
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
                    <div className="h-9 w-9 rounded-full bg-[#0f3d8c] text-white grid place-items-center text-sm font-bold shadow-sm">
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
                className="text-[#434651] font-bold text-sm hover:text-[#0058be] transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/vendor/onboarding"
                className="bg-[#0f3d8c] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#002766] transition-all duration-150 active:scale-95 shadow-sm"
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
