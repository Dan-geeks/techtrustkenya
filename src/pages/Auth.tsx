import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPostLoginPath } from "@/lib/redirectByRole";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedArt, art } from "@/components/marketing/AnimatedArt";

/** Google's brand mark — lucide has no Google logo, and a generic icon is not allowed by their branding rules. */
const GoogleMark = () => (
  <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const trustBullets = [
  "Every vendor physically inspected by our team",
  "Payments held in Float escrow until you confirm",
  "Dispute resolution included at no extra cost",
];

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";
  /** Client-demo shortcut — see handleSignIn. Set to "false" to restore real auth. */
  const demoAuthBypass = import.meta.env.VITE_DEMO_AUTH_BYPASS === "true";
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({ email: "", password: "", full_name: "", phone_number: "" });

  useEffect(() => {
    if (!authLoading && user) {
      void getPostLoginPath(user.id).then((path) => navigate(path, { replace: true }));
    }
  }, [authLoading, user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Demo mode: any email/password is accepted. Rather than faking a session, an
    // unrecognised pair is provisioned as a real Supabase user — the tables are all
    // RLS-guarded on auth.uid(), so a fake session would clear the login screen and
    // then render empty dashboards. Supabase enforces a 6-char minimum, so short
    // passwords are padded deterministically and the same input logs in again later.
    const creds = demoAuthBypass
      ? { email: signin.email.trim(), password: signin.password.padEnd(6, "0") }
      : signin;

    let { data, error } = await supabase.auth.signInWithPassword(creds);

    if (error && demoAuthBypass && error.message.toLowerCase().includes("invalid login credentials")) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: creds.email,
        password: creds.password,
        options: { data: { full_name: creds.email.split("@")[0] } },
      });
      if (!signUpError) {
        ({ data, error } = await supabase.auth.signInWithPassword(creds));
      }
    }

    setLoading(false);
    if (error) {
      toast.error(error.message.toLowerCase().includes("invalid login credentials")
        ? "Incorrect email or password. Please try again."
        : error.message);
      return;
    }
    toast.success("Welcome back!");
    if (data.user) {
      const path = await getPostLoginPath(data.user.id);
      navigate(path, { replace: true });
    }
  };

  /**
   * Google sign-in hands off to Supabase, which bounces to Google and back to
   * /auth. The redirect must land on this same origin — BASE_URL keeps that
   * correct if the app is ever served from a sub-path again.
   */
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth`.replace(/\/{2,}auth$/, "/auth"),
      },
    });
    // On success the browser navigates away, so only failures land here.
    if (error) {
      setGoogleLoading(false);
      toast.error(
        error.message.toLowerCase().includes("provider is not enabled")
          ? "Google sign-in is not enabled yet. Use your email and password for now."
          : error.message,
      );
    }
  };

  const handleForgotPassword = async () => {
    if (!signin.email.trim()) {
      toast.error("Enter your email first.");
      return;
    }

    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(signin.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password reset link sent to your email.");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^(07\d{8}|2547\d{8})$/.test(signup.phone_number)) {
      toast.error("Phone must be 07XXXXXXXX or 2547XXXXXXXX");
      return;
    }
    setLoading(true);
    const email = signup.email;
    const password = signup.password;
    const { error } = await supabase.auth.signUp({
      email: signup.email,
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: signup.full_name, phone_number: signup.phone_number },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      toast.error(signInError.message.toLowerCase().includes("invalid login credentials")
        ? "Incorrect email or password. Please try again."
        : signInError.message);
      return;
    }
    toast.success("Account created! You can now browse and buy.");
    if (signInData.user) {
      const path = await getPostLoginPath(signInData.user.id);
      navigate(path, { replace: true });
    } else {
      navigate("/browse");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left editorial panel — desktop only */}
      <div className="hidden lg:flex lg:w-2/5 bg-primary text-primary-foreground flex-col justify-center px-12 py-16 shrink-0">
        <Link to="/" className="flex items-center gap-2 mb-12">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight">Tech<span className="text-accent">Trust</span></span>
        </Link>
        <h2 className="text-3xl font-bold leading-tight mb-8 text-balance">
          Buy and sell tech you can actually trust.
        </h2>
        <div className="space-y-4">
          {trustBullets.map((s) => (
            <div key={s} className="flex items-center gap-3 text-sm text-primary-foreground/70">
              <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
              {s}
            </div>
          ))}
        </div>
        <AnimatedArt
          src={art.escrow}
          alt=""
          className="mt-10"
        />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Mobile logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight">Tech<span className="text-accent">Trust</span></span>
        </Link>

        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card">
            {/* Google covers both sign-in and sign-up, so it sits above the tabs.
                Hidden unless the provider is actually enabled in Supabase: supabase-js
                redirects the browser to /auth/v1/authorize without checking first, so a
                disabled provider dumps the user on a raw 400 JSON page instead of
                returning an error we could toast. Flip VITE_GOOGLE_AUTH_ENABLED once
                Google is configured on the Supabase project. */}
            {googleAuthEnabled && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                    </>
                  ) : (
                    <>
                      <GoogleMark /> Continue with Google
                    </>
                  )}
                </Button>

                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" autoComplete="email" required value={signin.email} onChange={(e) => setSignin({ ...signin, email: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="si-pw">Password</Label>
                    <PasswordInput id="si-pw" autoComplete="current-password" required value={signin.password} onChange={(e) => setSignin({ ...signin, password: e.target.value })} className="mt-1.5" />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="link" className="h-auto px-0 text-sm" onClick={handleForgotPassword} disabled={resetting || loading}>
                      {resetting ? "Sending…" : "Forgot Password?"}
                    </Button>
                  </div>
                  <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="su-name">Full Name</Label>
                    <Input id="su-name" autoComplete="name" required value={signup.full_name} onChange={(e) => setSignup({ ...signup, full_name: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="su-phone">Phone (07XX or 2547XX)</Label>
                    <Input id="su-phone" type="tel" autoComplete="tel" required value={signup.phone_number} onChange={(e) => setSignup({ ...signup, phone_number: e.target.value })} className="mt-1.5" placeholder="0712345678" />
                  </div>
                  <div>
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" autoComplete="email" required value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="su-pw">Password (min 6 chars)</Label>
                    <PasswordInput id="su-pw" autoComplete="new-password" required minLength={6} value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} className="mt-1.5" />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Creating account…" : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
