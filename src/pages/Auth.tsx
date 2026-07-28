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
    const { data, error } = await supabase.auth.signInWithPassword(signin);
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
