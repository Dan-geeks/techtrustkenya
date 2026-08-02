import { NavLink } from "react-router-dom";
import { Home, Search, Package, Wrench, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/browse", icon: Search, label: "Browse" },
  { to: "/orders", icon: Package, label: "Orders" },
  { to: "/repairs", icon: Wrench, label: "Repairs" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const MobileBottomNav = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg">
      <div className="grid grid-cols-5">
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-smooth",
                isActive ? "text-accent" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
