import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getPostLoginPath } from "@/lib/redirectByRole";

/** Dedicated sign-in for /admin — deliberately separate from /auth (no Google, no signup, no role picker). */
const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Landing here already signed in (not right after this form's own submit,
  // which routes itself below) — e.g. a direct visit while a session exists.
  useEffect(() => {
    if (!authLoading && user) {
      void getPostLoginPath(user.id).then((path) =>
        navigate(path.startsWith("/admin") ? path : "/", { replace: true }),
      );
    }
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message.toLowerCase().includes("invalid login credentials")
        ? "Incorrect email or password."
        : error.message);
      return;
    }
    // Query roles directly rather than trusting AuthProvider's `roles` state,
    // which updates asynchronously after `user` and can still read stale
    // (empty) for a render or two right after sign-in.
    if (data.user) {
      const path = await getPostLoginPath(data.user.id);
      setLoading(false);
      if (path.startsWith("/admin")) {
        navigate(path, { replace: true });
      } else {
        toast.error("This account doesn't have admin access.");
        await supabase.auth.signOut();
      }
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-primary px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="font-display text-base font-bold tracking-tight text-white">
            Tech<span className="text-accent">Trust</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-card p-6 shadow-elegant md:p-8">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <ShieldCheck className="h-3 w-3" /> Internal
          </span>
          <h1 className="mb-1 text-xl font-bold">Admin sign in</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Restricted to TechTrust staff accounts.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="admin-pw">Password</Label>
              <PasswordInput
                id="admin-pw"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
