import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "techtrust_cookie_consent";

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const dismiss = (value: "accepted" | "declined") => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-in fade-in-0 slide-in-from-bottom-4 duration-300 px-4 pb-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:flex-row sm:items-center sm:gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <Cookie className="h-4.5 w-4.5" />
        </span>
        <p className="flex-1 text-sm text-muted-foreground">
          We use cookies to keep you signed in and understand how TechTrust is used. See our{" "}
          <Link to="/terms" className="text-accent underline hover:text-accent/80">
            Terms &amp; Conditions
          </Link>{" "}
          for details.
        </p>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => dismiss("declined")}>
            Decline
          </Button>
          <Button variant="hero" size="sm" onClick={() => dismiss("accepted")}>
            Accept
          </Button>
          <button
            type="button"
            onClick={() => dismiss("declined")}
            aria-label="Dismiss"
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors sm:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
