import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPostLoginPath } from "@/lib/redirectByRole";
import { toast } from "sonner";
import { ShieldCheck, Mail, Key, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, ArrowLeft, User, ShoppingBag, Store, Gift, Wand2 } from "lucide-react";

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const urlRef = searchParams.get("ref") || searchParams.get("referral") || "";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode);
  const [accountType, setAccountType] = useState<"customer" | "vendor">("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState(urlRef);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
    toast.success("Secure password generated!");
  };

  // Determine smart redirect target
  const getTargetRedirect = async (userId?: string, chosenRole: "customer" | "vendor" = accountType) => {
    const fromParam = searchParams.get("redirect");
    const fromState = (location.state as any)?.from;

    if (fromParam && fromParam !== "/auth" && fromParam !== "/" && fromParam !== "/profile") return fromParam;
    if (fromState && fromState !== "/auth" && fromState !== "/" && fromState !== "/profile") return fromState;

    if (chosenRole === "vendor" || (mode === "signup" && accountType === "vendor")) {
      return "/vendor/onboarding";
    }

    if (userId) {
      const path = await getPostLoginPath(userId);
      if (path === "/") return "/browse";
      return path;
    }
    return "/browse";
  };

  useEffect(() => {
    if (mode === "signin") {
      document.title = "Sign In | TechTrust Kenya";
    } else if (mode === "signup") {
      document.title = "Create Account | TechTrust Kenya";
    } else {
      document.title = "Reset Password | TechTrust Kenya";
    }
  }, [mode]);

  useEffect(() => {
    if (user) {
      void (async () => {
        const target = await getTargetRedirect(user.id);
        navigate(target, { replace: true });
      })();
    }
  }, [user, navigate, searchParams, location]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const fromParam = searchParams.get("redirect");
      const fromState = (location.state as any)?.from;
      let targetRedirect = (fromParam && fromParam !== "/auth") ? fromParam : (fromState && fromState !== "/auth") ? fromState : "";

      if (targetRedirect) {
        localStorage.setItem("auth_redirect_target", targetRedirect);
      } else {
        localStorage.removeItem("auth_redirect_target");
      }

      if (mode === "signup" && accountType === "vendor") {
        localStorage.setItem("pending_role", "vendor");
      } else {
        localStorage.removeItem("pending_role");
      }

      if (referralCode.trim()) {
        localStorage.setItem("pending_referral_code", referralCode.trim().toUpperCase());
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate Google sign-in.");
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Password reset link sent! Please check your email inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error, data } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back to TechTrust!");
        const redirect = await getTargetRedirect(data.user?.id);
        navigate(redirect, { replace: true });
      } else {
        const cleanFullName = fullName.trim();
        if (!cleanFullName) {
          toast.error("Please enter your full name.");
          setLoading(false);
          return;
        }

        const formattedPhone = phone.trim()
          ? `+254${phone.trim().replace(/^(\+254|254|0)/, "")}`
          : undefined;

        const cleanRefCode = referralCode.trim().toUpperCase();

        const { error, data } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanFullName,
              phone: formattedPhone,
              account_type: accountType,
              referral_code: cleanRefCode || undefined,
            },
          },
        });
        if (error) throw error;

        if (cleanRefCode) {
          try {
            await supabase.rpc("apply_referral_code", { p_code: cleanRefCode });
          } catch (refErr) {
            console.warn("Referral code application warning:", refErr);
          }
        }

        if (accountType === "vendor") {
          toast.success("Vendor account created! Starting onboarding...");
          navigate("/vendor/onboarding", { replace: true });
        } else if (data.session) {
          toast.success("Account created successfully!");
          navigate("/browse", { replace: true });
        } else {
          toast.success("Account created! Please check your email to confirm registration.");
          navigate("/browse", { replace: true });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col md:flex-row bg-background antialiased">
      {/* Left Split: Branding & Security Narrative */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0F172A] p-12 md:p-16 relative overflow-hidden text-white">
        {/* Ambient Gradient Background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 0%, #0F3D8C 0%, transparent 50%), radial-gradient(circle at 0% 100%, #10B981 0%, transparent 50%)",
          }}
        ></div>

        <div className="relative z-10 flex flex-col space-y-6 max-w-lg">
          <Link to="/" className="flex items-center gap-3 text-[#3B82F6] hover:opacity-90 transition-opacity">
            <img src="/logo.jpg" alt="TechTrust Kenya" className="h-10 w-auto object-contain rounded-lg shadow-md" />
          </Link>
          <h1 className="font-display-h1 text-4xl font-bold leading-tight">
            Financial-Grade Escrow for Electronics Trading
          </h1>
          <p className="text-[#94A3B8] text-base leading-relaxed">
            Every transaction is protected. Payments are held safely in Float until the device is inspected and approved by both parties.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="relative z-10 space-y-6 max-w-lg my-8">
          <div className="flex items-start space-x-4 bg-slate-800/80 backdrop-blur p-6 rounded-2xl border border-slate-700/60 shadow-lg">
            <div className="flex-shrink-0 w-12 h-12 bg-[#0F3D8C]/50 rounded-xl flex items-center justify-center text-[#3B82F6]">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Float Escrow Protection</h3>
              <p className="text-[#94A3B8] text-sm mt-1 leading-relaxed">
                Funds are held in a secure, financial-grade escrow account until you inspect and accept your delivery.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4 bg-slate-800/80 backdrop-blur p-6 rounded-2xl border border-slate-700/60 shadow-lg">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-950/50 rounded-xl flex items-center justify-center text-[#10B981]">
              <Gift className="w-6 h-6 text-[#10B981]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">KES 500 Referral Rewards</h3>
              <p className="text-[#94A3B8] text-sm mt-1 leading-relaxed">
                Share your referral code with friends and earn KES 500 wallet credit on every successful tech order.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-4 border-t border-slate-800">
          <p className="text-xs text-[#64748B]">
            &copy; {new Date().getFullYear()} TechTrust Kenya. Financial-grade escrow protection.
          </p>
        </div>
      </div>

      {/* Right Split: Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 bg-slate-50/50">
        <div className="w-full max-w-md space-y-6 my-auto">
          {/* Mobile Branding Header */}
          <div className="md:hidden text-center space-y-2 mb-4">
            <Link to="/" className="inline-flex justify-center items-center gap-2 text-[#0F3D8C]">
              <img src="/logo.jpg" alt="TechTrust" className="h-10 w-auto object-contain rounded-lg shadow-sm" />
            </Link>
            <p className="text-xs text-[#64748B] font-medium">Verified Escrow Electronics Marketplace</p>
          </div>

          {/* Form Card Container */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 md:p-10 space-y-6">

            {mode === "forgot" ? (
              /* Forgot Password View */
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="font-display-h2 text-2xl md:text-3xl font-bold text-[#0F172A]">
                    Reset Your Password
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    Enter your account email to receive a password reset link.
                  </p>
                </div>

                {resetSent ? (
                  <div className="space-y-4 text-center">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
                      Password reset link dispatched! Please check your email inbox.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResetSent(false);
                        setMode("signin");
                      }}
                      className="text-xs font-semibold text-[#0F3D8C] hover:underline"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#0F172A]">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                        <input
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          type="email"
                          placeholder="merchant@example.com"
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#0F3D8C] focus:ring-2 focus:ring-[#0F3D8C]/20 transition-all text-[#0F172A]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#0F3D8C] hover:bg-[#0A2D6B] text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Link"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] pt-2 font-medium"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Sign In / Sign Up View */
              <>
                <div className="text-center space-y-1">
                  <h2 className="font-display-h2 text-2xl md:text-3xl font-bold text-[#0F172A]">
                    {mode === "signin" ? "Welcome Back" : "Create Your Account"}
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    {mode === "signin"
                      ? "Sign in to manage your orders, escrow holds, or shop."
                      : "Join Kenya's verified tech marketplace."}
                  </p>
                </div>

                {/* Mode Switcher Tabs */}
                <div className="flex border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className={`w-1/2 pb-3 font-bold text-sm transition-all border-b-2 text-center ${
                      mode === "signin"
                        ? "border-[#0F3D8C] text-[#0F3D8C]"
                        : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`w-1/2 pb-3 font-bold text-sm transition-all border-b-2 text-center ${
                      mode === "signup"
                        ? "border-[#0F3D8C] text-[#0F3D8C]"
                        : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Account Role Selector Card (Customer vs Vendor) */}
                {mode === "signup" && (
                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <label className="block text-xs font-bold text-[#0F172A]">
                      I want to register as a:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountType("customer")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          accountType === "customer"
                            ? "border-[#0F3D8C] bg-[#EEF2FF] text-[#0F3D8C]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <ShoppingBag className="h-5 w-5 text-[#0F3D8C]" />
                          <input
                            type="radio"
                            name="accountType"
                            checked={accountType === "customer"}
                            onChange={() => setAccountType("customer")}
                            className="accent-[#0F3D8C]"
                          />
                        </div>
                        <span className="font-bold text-xs mt-1">Customer (Buyer)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType("vendor")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          accountType === "vendor"
                            ? "border-[#0F3D8C] bg-[#EEF2FF] text-[#0F3D8C]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Store className="h-5 w-5 text-[#0F3D8C]" />
                          <input
                            type="radio"
                            name="accountType"
                            checked={accountType === "vendor"}
                            onChange={() => setAccountType("vendor")}
                            className="accent-[#0F3D8C]"
                          />
                        </div>
                        <span className="font-bold text-xs mt-1">Vendor (Seller)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Google Sign In Option */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 bg-slate-50 border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-900 py-3.5 px-4 rounded-xl font-bold text-base transition-all shadow-sm hover:shadow disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#0F3D8C]" />
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-xs text-[#64748B] uppercase tracking-wider font-bold absolute">
                    Or with Email
                  </span>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#0F172A]">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                        <input
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          type="text"
                          placeholder="John Doe"
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#0F3D8C] focus:ring-2 focus:ring-[#0F3D8C]/20 transition-all text-[#0F172A]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#0F172A]">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                      <input
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="merchant@example.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#0F3D8C] focus:ring-2 focus:ring-[#0F3D8C]/20 transition-all text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-[#0F172A]">Password</label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs text-[#0F3D8C] hover:underline font-semibold"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                      <input
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`w-full pl-11 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#0F3D8C] focus:ring-2 focus:ring-[#0F3D8C]/20 transition-all text-[#0F172A] ${mode === "signup" ? "pr-[120px]" : "pr-12"}`}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                        {mode === "signup" && (
                          <button
                            type="button"
                            onClick={generatePassword}
                            className="text-[#10B981] hover:text-[#059669] p-1 flex items-center gap-1 text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 rounded px-2 transition-colors shadow-sm"
                            title="Generate Secure Password"
                          >
                            <Wand2 className="h-3 w-3" />
                            Generate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[#94A3B8] hover:text-[#0F172A] p-1.5 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {mode === "signup" && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#0F172A]">
                          M-Pesa Mobile Number <span className="text-[#64748B] font-normal">(Optional)</span>
                        </label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-[#64748B] text-xs font-mono font-semibold">
                            +254
                          </span>
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            type="tel"
                            placeholder="712 345 678"
                            className="w-full rounded-r-xl border border-slate-300 py-3.5 px-3.5 text-sm bg-slate-50 focus:bg-white focus:border-[#0F3D8C] focus:ring-2 focus:ring-[#0F3D8C]/20 transition-all text-[#0F172A]"
                          />
                        </div>
                      </div>

                      {/* Referral Code Optional Input Field */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                            <Gift className="h-3.5 w-3.5 text-[#10B981]" />
                            <span>Referral Code</span>
                            <span className="text-[#64748B] font-normal">(Optional)</span>
                          </label>
                          <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/20">
                            Earn KES 500 Bonus
                          </span>
                        </div>
                        <div className="relative">
                          <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                          <input
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                            type="text"
                            placeholder="e.g. TECH500"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase focus:bg-white focus:border-[#0F3D8C] focus:ring-2 focus:ring-[#0F3D8C]/20 transition-all text-[#0F172A] text-data-id"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#0F3D8C] hover:bg-[#0A2D6B] active:bg-[#082252] text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" /> Processing…
                        </>
                      ) : (
                        <>
                          {mode === "signin"
                            ? "Sign In & Access Dashboard"
                            : accountType === "vendor"
                            ? "Register as Vendor"
                            : "Create Customer Account"}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            <div className="flex items-center justify-center gap-2 p-3 bg-[#EEF2FF] rounded-xl text-center border border-[#0F3D8C]/10">
              <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
              <span className="text-xs text-[#0F3D8C] font-bold">
                Protected by M-Pesa Escrow Float Engine
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
