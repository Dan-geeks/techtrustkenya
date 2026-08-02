import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const Footer = () => {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  return (
    <footer className="bg-[#F8FAFC] border-t border-outline-variant/20 pt-16 pb-8">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
        {/* CTA Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-12 border-b border-outline-variant/20 mb-12">
          <h3 className="font-display-h2 text-2xl md:text-3xl font-bold text-on-background">
            Ready to trade safely?
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/browse"
              className="bg-primary-container text-on-primary px-6 py-2.5 rounded-lg font-body-md-bold text-sm hover:bg-primary transition-colors shadow-sm font-semibold"
            >
              Start Shopping
            </Link>
            <Link
              to="/vendor/onboarding"
              className="border border-primary-container text-primary-container px-6 py-2.5 rounded-lg font-body-md-bold text-sm hover:bg-primary-container hover:text-on-primary transition-colors font-semibold"
            >
              List Your Shop
            </Link>
          </div>
        </div>

        {/* Link Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/logo.jpg" alt="TechTrust Logo" className="h-10 md:h-12 w-auto object-contain rounded-md" />
              <span className="font-display-h2 text-2xl font-bold text-primary">TechTrust</span>
            </Link>
            <p className="font-ui-label text-xs md:text-sm text-on-surface-variant max-w-xs leading-relaxed">
              Kenya's premier verified tech marketplace with Float escrow protection.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-body-md-bold text-sm font-bold text-on-background">Marketplace</h4>
            <Link to="/browse?category=smartphones" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Smartphones
            </Link>
            <Link to="/browse?category=laptops" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Laptops &amp; PCs
            </Link>
            <Link to="/browse?category=cameras" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Cameras
            </Link>
            <Link to="/browse?category=audio" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Audio &amp; Wearables
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-body-md-bold text-sm font-bold text-on-background">Trust &amp; Safety</h4>
            <Link to="/how-it-works" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              How Float Works
            </Link>
            <Link to="/verification" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Vendor Verification
            </Link>
            <Link to="/disputes" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Dispute Policy
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-body-md-bold text-sm font-bold text-on-background">Buyers &amp; Sellers</h4>
            <Link to="/how-it-works" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Buyer Protection
            </Link>
            <Link to="/vendor/onboarding" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Become a Vendor
            </Link>
            <Link to="/seller-guidelines" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Seller Guidelines
            </Link>
            <Link to="/vendor/dashboard" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Vendor Portal
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-body-md-bold text-sm font-bold text-on-background">Company</h4>
            <Link to="/how-it-works" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              About Us
            </Link>
            <a href="mailto:support@techtrust.co.ke" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Contact Us
            </a>
            <Link to="/privacy" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="font-body-md text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-on-surface-variant">
          <p>© {new Date().getFullYear()} TechTrust Kenya. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="mailto:johnmwangimegwe@gmail.com" className="text-primary-container underline hover:text-primary transition-colors">
              johnmwangimegwe@gmail.com
            </a>
            <a href="mailto:support@techtrust.co.ke" className="text-primary-container underline hover:text-primary transition-colors">
              support@techtrust.co.ke
            </a>
            {isAdmin && (
              <Link to="/admin/dashboard" className="text-primary-container underline hover:text-primary font-bold">
                Admin Panel
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
