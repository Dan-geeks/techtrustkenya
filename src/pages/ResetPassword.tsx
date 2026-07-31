import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = "Reset Password — TechTrust";
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const errCode = params.get("error_code") || params.get("error");
    if (errCode === "otp_expired" || errCode === "access_denied") {
      setLinkError("This password reset link has expired or is invalid. Please request a new one.");
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setLinkError("This password reset link has expired or is invalid. Please request a new one.");
          else {
            // Clean the URL
            window.history.replaceState({}, "", "/reset-password");
            setReady(true);
          }
        });
    } else {
      // No tokens — maybe user navigated here directly. Check if they already have a session.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true);
        else setLinkError("This password reset link has expired or is invalid. Please request a new one.");
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pwd.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pwd !== confirm) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    const { error: updErr } = await supabase.auth.updateUser({ password: pwd });
    setSubmitting(false);
    if (updErr) { setError(updErr.message); return; }
    setSuccess(true);
    setTimeout(() => navigate("/auth", { replace: true }), 3000);
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight font-display">Tech<span className="text-accent">Trust</span></span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card">
          <h1 className="text-2xl font-bold mb-2">Reset your password</h1>

          {linkError ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{linkError}</span>
              </div>
              <Button className="w-full" variant="hero" onClick={() => navigate("/auth")}>
                Back to sign in
              </Button>
            </div>
          ) : success ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Your password has been updated successfully. You can now sign in with your new password.</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">Redirecting to sign in…</p>
            </div>
          ) : !ready ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Enter a new password for your account.</p>
              <div>
                <Label htmlFor="np">New password</Label>
                <PasswordInput id="np" autoComplete="new-password" required minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cp">Confirm new password</Label>
                <PasswordInput id="cp" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5" />
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save New Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
