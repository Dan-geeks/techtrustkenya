import { Link } from "react-router-dom";
import { ShieldCheck, Star, MapPin } from "lucide-react";

interface VendorCardProps {
  id: string;
  business_name: string;
  physical_address: string;
  average_rating: number;
  total_completed_transactions: number;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const VendorCard = ({
  id,
  business_name,
  physical_address,
  average_rating,
  total_completed_transactions,
}: VendorCardProps) => {
  return (
    <Link
      to={`/shop/${id}`}
      className="group flex items-start gap-4 p-4 bg-card border border-border rounded-lg hover:border-accent/40 transition-colors duration-200"
    >
      <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm shrink-0">
        {initials(business_name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-accent transition-colors">
            {business_name}
          </h3>
          <span className="flex items-center gap-0.5 text-[10px] text-success font-medium shrink-0">
            <ShieldCheck className="h-2.5 w-2.5" />
            Verified
          </span>
        </div>

        {physical_address && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {physical_address}
          </p>
        )}

        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          {average_rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span className="text-stat">{Number(average_rating).toFixed(1)}</span>
            </span>
          )}
          {total_completed_transactions > 0 && (
            <span><span className="text-stat">{total_completed_transactions}</span> completed</span>
          )}
        </div>
      </div>
    </Link>
  );
};
