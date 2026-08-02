import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Footer = () => {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  return (
    <footer className="border-t border-border bg-secondary/30 mt-16">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-1.5">
              <img src="/logo.jpg" alt="TechTrust" className="h-6 w-auto object-contain rounded-sm" />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              Kenya's verified marketplace for buying, selling, and repairing laptops and smartphones.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/browse" className="hover:text-accent transition-smooth">Browse Products</Link></li>
              <li><Link to="/repairs" className="hover:text-accent transition-smooth">Repair Services</Link></li>
              <li><Link to="/vendor/onboarding" className="hover:text-accent transition-smooth">Become a Vendor</Link></li>
              <li><Link to="/seller-guidelines" className="hover:text-accent transition-smooth">Seller Guidelines</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Trust & Safety</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/how-it-works" className="hover:text-accent transition-smooth">How Float Works</Link></li>
              <li><Link to="/verification" className="hover:text-accent transition-smooth">Vendor Verification</Link></li>
              <li><Link to="/disputes" className="hover:text-accent transition-smooth">Dispute Resolution</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/how-it-works" className="hover:text-accent transition-smooth">About</Link></li>
              <li><a href="mailto:support@techtrust.co.ke" className="hover:text-accent transition-smooth">Contact</a></li>
              <li><Link to="/terms" className="hover:text-accent transition-smooth">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-accent transition-smooth">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} TechTrust Kenya. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <p>
              Contact us at{" "}
              <a href="mailto:johnmwangimegwe@gmail.com" className="hover:text-accent underline">johnmwangimegwe@gmail.com</a>{" "}
              or{" "}
              <a href="mailto:support@techtrust.co.ke" className="hover:text-accent underline">support@techtrust.co.ke</a>
            </p>
            {isAdmin && (
              <>
                <span className="opacity-40">·</span>
                <Link to="/admin/dashboard" className="hover:text-accent underline opacity-70">
                  Admin
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
