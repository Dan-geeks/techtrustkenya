import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck, Camera, FileText, Loader2, Upload, X,
  Sparkles, Copy, Check, ChevronLeft, ChevronRight, MapPin,
} from "lucide-react";
import { ShoppingBagIcon } from "@/components/icons/ShoppingBagIcon";
import { StoreIcon } from "@/components/icons/StoreIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput, generateStrongPassword } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getPostLoginPath } from "@/lib/redirectByRole";
import { cn } from "@/lib/utils";
import { KENYA_COUNTIES } from "@/lib/kenyaCounties";
import { invokeFunction } from "@/lib/functions";
import { AnimatedArt, art } from "@/components/marketing/AnimatedArt";

type Role = "customer" | "vendor";

const phoneOk = (v: string) => /^(07\d{8}|2547\d{8})$/.test(v);

const CUSTOMER_STEPS = ["Role", "Your details"];
const VENDOR_STEPS = ["Role", "Account", "Business", "Location & Photos", "Review"];

/**
 * All of these live OUTSIDE VendorRegister on purpose. Defining them inside a
 * component body gives them a fresh identity every render, so React treats
 * each keystroke as "a different component" and remounts the step — every
 * text input loses focus after one character. Keeping them at module scope
 * with props instead of closures fixes that.
 */
const ErrorText = ({ errors, name }: { errors: Record<string, string>; name: string }) =>
  errors[name] ? <p className="text-xs text-destructive mt-1">{errors[name]}</p> : null;

const BackLink = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="mb-4 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
  >
    <ChevronLeft className="h-3.5 w-3.5" /> Back
  </button>
);

const NextButton = ({ onClick }: { onClick: () => void }) => (
  <Button type="button" variant="hero" size="lg" className="w-full" onClick={onClick}>
    Continue <ChevronRight className="h-4 w-4" />
  </Button>
);

const Stepper = ({ steps, step }: { steps: string[]; step: number }) => {
  const pct = (step / (steps.length - 1)) * 100;
  return (
    <div className="mb-10">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{steps[step]}</span>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          Step {step + 1} of {steps.length}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full ring-2 ring-background transition-colors duration-300",
                i <= step ? "bg-accent" : "bg-secondary",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const VendorRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signup");
  const preselectedRole = (location.state as { role?: Role } | null)?.role ?? null;
  const [role, setRole] = useState<Role | null>(preselectedRole);
  const [step, setStep] = useState(preselectedRole ? 1 : 0);
  const [loading, setLoading] = useState(false);

  const steps = role === "vendor" ? VENDOR_STEPS : CUSTOMER_STEPS;

  // Sign in
  const [signin, setSignin] = useState({ email: "", password: "" });

  // Customer signup
  const [csu, setCsu] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });

  // Vendor signup
  const [vsu, setVsu] = useState({
    owner_name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    business_name: "",
    county: "",
    sub_county: "",
    physical_address: "",
    latitude: "",
    longitude: "",
    google_maps_link: "",
    agree: false,
  });
  const [shopPhotos, setShopPhotos] = useState<File[]>([]);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState(false);
  const [showManualGps, setShowManualGps] = useState(false);

  // Redirect logged-in approved vendors away
  useEffect(() => {
    if (!user) return;
    (async () => {
      const path = await getPostLoginPath(user.id);
      if (path === "/vendor/dashboard" || path === "/admin/dashboard") {
        navigate(path, { replace: true });
      }
    })();
  }, [user, navigate]);

  const chooseRole = (r: Role) => {
    setRole(r);
    setStep(1);
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access.");
      setShowManualGps(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVsu((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setErrors((prev) => ({ ...prev, latitude: "", longitude: "" }));
        setLocating(false);
        toast.success("Location captured — make sure you're at the shop before continuing.");
      },
      (err) => {
        setLocating(false);
        setShowManualGps(true);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Enter the coordinates manually or from Google Maps."
            : "Couldn't get your location. Enter the coordinates manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /* --------------------------------- Step validation --------------------------------- */
  const validateAccountStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (role === "vendor") {
      if (!vsu.owner_name.trim()) errs.owner_name = "Required";
      if (!vsu.email.trim()) errs.email = "Required";
      if (!phoneOk(vsu.phone)) errs.phone = "Use 07XXXXXXXX or 2547XXXXXXXX";
      if (vsu.password.length < 8) errs.password = "Min 8 characters";
      if (vsu.password !== vsu.confirm) errs.confirm = "Passwords do not match";
    } else {
      if (!csu.full_name.trim()) errs.full_name = "Required";
      if (!csu.email.trim()) errs.email = "Required";
      if (!phoneOk(csu.phone)) errs.phone = "Use 07XXXXXXXX or 2547XXXXXXXX";
      if (csu.password.length < 8) errs.password = "Min 8 characters";
      if (csu.password !== csu.confirm) errs.confirm = "Passwords do not match";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateBusinessStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (!vsu.business_name.trim()) errs.business_name = "Required";
    if (!vsu.county) errs.county = "Required";
    if (!vsu.sub_county.trim()) errs.sub_county = "Required";
    if (!vsu.physical_address.trim()) errs.physical_address = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateLocationStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (!vsu.latitude || isNaN(Number(vsu.latitude))) errs.latitude = "Valid latitude required";
    if (!vsu.longitude || isNaN(Number(vsu.longitude))) errs.longitude = "Valid longitude required";
    if (shopPhotos.length < 2) errs.photos = "Upload at least 2 shop photos";
    for (const f of shopPhotos) {
      if (f.size > 5 * 1024 * 1024) {
        errs.photos = `${f.name} exceeds 5MB`;
        break;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (role === "vendor") {
      if (step === 1 && !validateAccountStep()) return;
      if (step === 2 && !validateBusinessStep()) return;
      if (step === 3 && !validateLocationStep()) return;
    }
    setErrors({});
    setStep((s) => Math.min(steps.length - 1, s + 1));
  };

  /* ---------------------------------- Sign In ---------------------------------- */
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

  /* ------------------------------ Customer Sign Up ----------------------------- */
  const handleCustomerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAccountStep()) return;

    setLoading(true);
    const email = csu.email;
    const password = csu.password;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: csu.full_name, phone_number: csu.phone },
      },
    });
    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes("registered") || error.message.toLowerCase().includes("exists")) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else toast.error(error.message);
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
    toast.success("Account created!");
    if (signInData.user) {
      const path = await getPostLoginPath(signInData.user.id);
      navigate(path, { replace: true });
    } else {
      navigate("/browse");
    }
  };

  /* ------------------------------- Vendor Sign Up ------------------------------ */
  const uploadFile = async (bucket: string, file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadCertificate = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/cert-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("vendor-documents").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return path; // private bucket — store path, not public URL
  };

  const handleVendorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAccountStep() || !validateBusinessStep() || !validateLocationStep()) {
      toast.error("Please fix the errors and try again");
      return;
    }
    if (!vsu.agree) {
      setErrors({ agree: "You must accept the vendor terms" });
      toast.error("Please fix the errors and try again");
      return;
    }

    setLoading(true);
    try {
      // 1. Auth signup
      const email = vsu.email;
      const password = vsu.password;
      const { data: auth, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: vsu.owner_name, phone_number: vsu.phone },
        },
      });
      if (authErr) {
        if (authErr.message.toLowerCase().includes("registered") || authErr.message.toLowerCase().includes("exists")) {
          toast.error("An account with this email already exists. Please sign in instead.");
        } else toast.error(authErr.message);
        setLoading(false);
        return;
      }
      const userId = auth.user?.id;
      if (!userId) {
        toast.error("Sign-up succeeded but no user ID returned. Please sign in.");
        setLoading(false);
        return;
      }

      // 2. Upload photos
      const photoUrls: string[] = [];
      for (const f of shopPhotos) {
        const url = await uploadFile("shop-photos", f, userId);
        photoUrls.push(url);
      }

      // 3. Upload certificate (optional)
      let certPath: string | null = null;
      if (certificate) {
        try {
          certPath = await uploadCertificate(certificate, userId);
        } catch (err) {
          console.warn("Certificate upload failed", err);
        }
      }

      // 4. Force an active session using the exact submitted credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast.error(signInError.message.toLowerCase().includes("invalid login credentials")
          ? "Incorrect email or password. Please try again."
          : signInError.message);
        setLoading(false);
        return;
      }

      // 5. Create vendor profile + role via privileged edge function (bypasses RLS safely)
      const { data: fnRes, error: fnErr } = await invokeFunction("create-vendor-profile", {
        body: {
          userId,
          businessName: vsu.business_name,
          ownerName: vsu.owner_name,
          phone: vsu.phone,
          email: vsu.email,
          county: vsu.county,
          subCounty: vsu.sub_county,
          physicalAddress: vsu.physical_address,
          gpsLatitude: Number(vsu.latitude),
          gpsLongitude: Number(vsu.longitude),
          googleMapsLink: vsu.google_maps_link || null,
          shopPhotoUrls: photoUrls,
          businessCertificateUrl: certPath,
        },
      });
      if (fnErr || !fnRes?.success) {
        toast.error(`Failed to create vendor profile: ${fnErr?.message ?? fnRes?.error ?? "Unknown error"}`);
        setLoading(false);
        return;
      }

      toast.success("Application submitted!");
      navigate("/vendor/pending", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branded panel — desktop only, mirrors the Auth page's split layout */}
      <div className="hidden lg:flex lg:w-2/5 bg-primary text-primary-foreground flex-col justify-center px-12 py-16 shrink-0">
        <Link to="/" className="flex items-center gap-2 mb-12">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight font-display">Tech<span className="text-accent">Trust</span></span>
        </Link>
        <h2 className="text-3xl font-bold leading-tight mb-4 text-balance">
          Verified marketplace for laptops, phones and repairs.
        </h2>
        <span className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Free for your first month — no listing fees
        </span>
        <div className="space-y-4">
          {["Every vendor physically inspected", "Payments held in Float until confirmed", "Cancel anytime, no lock-in"].map((s) => (
            <div key={s} className="flex items-center gap-3 text-sm text-primary-foreground/70">
              <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
              {s}
            </div>
          ))}
        </div>
        <AnimatedArt src={art.steps} alt="" className="mt-10" />
      </div>

      {/* Right panel — the wizard, full height */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 lg:py-16">
        <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight font-display">Tech<span className="text-accent">Trust</span></span>
        </Link>

        <div className="w-full max-w-2xl">
          <div className="text-center mb-6 lg:hidden">
            <h1 className="text-2xl font-bold">Welcome to TechTrust</h1>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as any);
              setRole(preselectedRole);
              setStep(preselectedRole ? 1 : 0);
              setErrors({});
            }}
          >
            <TabsList className="grid grid-cols-2 w-full max-w-sm mx-auto">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            {/* SIGN IN */}
            <TabsContent value="signin" className="mt-8">
              <form onSubmit={handleSignIn} className="space-y-4 max-w-sm mx-auto">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" autoComplete="email" required value={signin.email}
                    onChange={(e) => setSignin({ ...signin, email: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="si-pw">Password</Label>
                  <PasswordInput id="si-pw" autoComplete="current-password" required value={signin.password}
                    onChange={(e) => setSignin({ ...signin, password: e.target.value })} className="mt-1.5" />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            {/* SIGN UP WIZARD */}
            <TabsContent value="signup" className="mt-8">
              <Stepper steps={steps} step={step} />

              <div key={`${role ?? "none"}-${step}`} className="animate-in fade-in-0 duration-300">
                {/* Step 0 — role */}
                {step === 0 && (
                  <>
                    <p className="text-sm text-muted-foreground mb-4 text-center">What brings you to TechTrust?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                      <button
                        type="button"
                        onClick={() => chooseRole("customer")}
                        className="flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 text-left transition-all hover:border-accent hover:bg-accent-soft hover:shadow-md hover:-translate-y-0.5"
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-soft text-accent">
                          <ShoppingBagIcon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-semibold">I'm a Customer</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">Buy and request repairs.</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => chooseRole("vendor")}
                        className="flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 text-left transition-all hover:border-accent hover:bg-accent-soft hover:shadow-md hover:-translate-y-0.5"
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-soft text-accent">
                          <StoreIcon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-semibold">I'm a Vendor</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">Sell and offer repairs.</span>
                        </span>
                      </button>
                    </div>
                  </>
                )}

                {/* Step 1 — account (both roles) */}
                {step === 1 && role === "customer" && (
                  <div className="max-w-sm mx-auto">
                    <BackLink onClick={goBack} />
                    <form onSubmit={handleCustomerSignUp} className="space-y-4">
                      <div>
                        <Label>Full name</Label>
                        <Input value={csu.full_name} onChange={(e) => setCsu({ ...csu, full_name: e.target.value })} className="mt-1.5" />
                        <ErrorText errors={errors} name="full_name" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Email</Label>
                          <Input type="email" autoComplete="email" value={csu.email} onChange={(e) => setCsu({ ...csu, email: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="email" />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input type="tel" autoComplete="tel" value={csu.phone} placeholder="07XXXXXXXX" onChange={(e) => setCsu({ ...csu, phone: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="phone" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Password</Label>
                          <PasswordInput autoComplete="new-password" value={csu.password} onChange={(e) => setCsu({ ...csu, password: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="password" />
                        </div>
                        <div>
                          <Label>Confirm</Label>
                          <PasswordInput autoComplete="new-password" value={csu.confirm} onChange={(e) => setCsu({ ...csu, confirm: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="confirm" />
                        </div>
                      </div>
                      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create customer account"}
                      </Button>
                    </form>
                  </div>
                )}

                {step === 1 && role === "vendor" && (
                  <div className="max-w-lg mx-auto">
                    <BackLink onClick={goBack} />
                    <div className="space-y-4">
                      <div>
                        <Label>Owner / Manager full name</Label>
                        <Input value={vsu.owner_name} onChange={(e) => setVsu({ ...vsu, owner_name: e.target.value })} className="mt-1.5" />
                        <ErrorText errors={errors} name="owner_name" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Email</Label>
                          <Input type="email" autoComplete="email" value={vsu.email} onChange={(e) => setVsu({ ...vsu, email: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="email" />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input type="tel" autoComplete="tel" value={vsu.phone} placeholder="07XXXXXXXX" onChange={(e) => setVsu({ ...vsu, phone: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="phone" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm">Password</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const pwd = generateStrongPassword(14);
                              setVsu((prev) => ({ ...prev, password: pwd, confirm: pwd }));
                              toast.success("Strong password generated — copy it before submitting");
                            }}
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate strong password
                          </Button>
                          {vsu.password && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await navigator.clipboard.writeText(vsu.password);
                                toast.success("Password copied to clipboard");
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Password (min 8)</Label>
                          <PasswordInput autoComplete="new-password" value={vsu.password} onChange={(e) => setVsu({ ...vsu, password: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="password" />
                        </div>
                        <div>
                          <Label>Confirm password</Label>
                          <PasswordInput autoComplete="new-password" value={vsu.confirm} onChange={(e) => setVsu({ ...vsu, confirm: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="confirm" />
                        </div>
                      </div>
                      <NextButton onClick={goNext} />
                    </div>
                  </div>
                )}

                {/* Step 2 — business (vendor only) */}
                {step === 2 && role === "vendor" && (
                  <div className="max-w-lg mx-auto">
                    <BackLink onClick={goBack} />
                    <div className="space-y-4">
                      <div>
                        <Label>Business name</Label>
                        <Input value={vsu.business_name} onChange={(e) => setVsu({ ...vsu, business_name: e.target.value })} className="mt-1.5" />
                        <ErrorText errors={errors} name="business_name" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>County</Label>
                          <Select value={vsu.county} onValueChange={(v) => setVsu({ ...vsu, county: v })}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select county" /></SelectTrigger>
                            <SelectContent className="max-h-72">
                              {KENYA_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <ErrorText errors={errors} name="county" />
                        </div>
                        <div>
                          <Label>Sub-County or Town</Label>
                          <Input value={vsu.sub_county} placeholder="e.g. Juja, Westlands, Kisumu CBD, Eldoret Town" onChange={(e) => setVsu({ ...vsu, sub_county: e.target.value })} className="mt-1.5" />
                          <ErrorText errors={errors} name="sub_county" />
                        </div>
                      </div>
                      <div>
                        <Label>Physical shop address</Label>
                        <Input value={vsu.physical_address} onChange={(e) => setVsu({ ...vsu, physical_address: e.target.value })} className="mt-1.5" placeholder="Building name, street, floor / shop number" />
                        <ErrorText errors={errors} name="physical_address" />
                      </div>
                      <NextButton onClick={goNext} />
                    </div>
                  </div>
                )}

                {/* Step 3 — location & photos (vendor only) */}
                {step === 3 && role === "vendor" && (
                  <div className="max-w-lg mx-auto">
                    <BackLink onClick={goBack} />
                    <div className="space-y-4">
                      <div>
                        <Label>Shop GPS location</Label>
                        <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border p-3">
                          {vsu.latitude && vsu.longitude ? (
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                              <Check className="h-4.5 w-4.5" />
                            </span>
                          ) : (
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                              <MapPin className="h-4.5 w-4.5" />
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {vsu.latitude && vsu.longitude ? "Location captured" : "Location not captured yet"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Stand at the shop, then tap the button
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
                            {locating ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Locating…</>
                            ) : (
                              <><MapPin className="h-3.5 w-3.5 mr-1" /> Use current location</>
                            )}
                          </Button>
                        </div>
                        <ErrorText errors={errors} name="latitude" />
                        {!showManualGps && (
                          <button
                            type="button"
                            onClick={() => setShowManualGps(true)}
                            className="mt-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                          >
                            Enter coordinates manually instead
                          </button>
                        )}
                      </div>
                      {showManualGps && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>GPS Latitude</Label>
                            <Input type="number" step="any" placeholder="-1.1023" value={vsu.latitude} onChange={(e) => setVsu({ ...vsu, latitude: e.target.value })} className="mt-1.5" />
                          </div>
                          <div>
                            <Label>GPS Longitude</Label>
                            <Input type="number" step="any" placeholder="37.0144" value={vsu.longitude} onChange={(e) => setVsu({ ...vsu, longitude: e.target.value })} className="mt-1.5" />
                            <ErrorText errors={errors} name="longitude" />
                          </div>
                        </div>
                      )}
                      <div>
                        <Label>Google Maps link <span className="text-muted-foreground">(optional)</span></Label>
                        <Input placeholder="https://maps.google.com" value={vsu.google_maps_link} onChange={(e) => setVsu({ ...vsu, google_maps_link: e.target.value })} className="mt-1.5" />
                      </div>

                      <div>
                        <Label>Shop photos (minimum 2)</Label>
                        <label className="mt-1.5 flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent transition-smooth">
                          <Camera className="h-7 w-7 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload shop photos, minimum 2</span>
                          <span className="text-[10px] text-muted-foreground">JPG, PNG, WEBP — max 5MB each</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              setShopPhotos((prev) => [...prev, ...files]);
                            }}
                          />
                        </label>
                        {shopPhotos.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {shopPhotos.map((f, i) => (
                              <div key={i} className="relative group animate-in fade-in-0 zoom-in-95 duration-200">
                                <img src={URL.createObjectURL(f)} alt={f.name} className="h-16 w-16 object-cover rounded border" />
                                <button
                                  type="button"
                                  onClick={() => setShopPhotos((p) => p.filter((_, j) => j !== i))}
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white grid place-items-center"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <ErrorText errors={errors} name="photos" />
                      </div>

                      <div>
                        <Label>Business certificate <span className="text-muted-foreground">(optional)</span></Label>
                        <label className="mt-1.5 flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent transition-smooth">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground flex-1">
                            {certificate ? certificate.name : "Upload certificate (PDF, JPG, PNG)"}
                          </span>
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => setCertificate(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>
                      <NextButton onClick={goNext} />
                    </div>
                  </div>
                )}

                {/* Step 4 — review & submit (vendor only) */}
                {step === 4 && role === "vendor" && (
                  <div className="max-w-lg mx-auto">
                    <BackLink onClick={goBack} />
                    <form onSubmit={handleVendorSignUp} className="space-y-4">
                      <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-2 text-sm">
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Owner</span><span className="font-medium text-right">{vsu.owner_name || "—"}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Email</span><span className="font-medium text-right">{vsu.email || "—"}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span className="font-medium text-right">{vsu.phone || "—"}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Business</span><span className="font-medium text-right">{vsu.business_name || "—"}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Location</span><span className="font-medium text-right">{[vsu.sub_county, vsu.county].filter(Boolean).join(", ") || "—"}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Shop photos</span><span className="font-medium text-right">{shopPhotos.length} uploaded</span></div>
                      </div>

                      <div className="flex items-start gap-2 pt-2">
                        <Checkbox
                          id="agree"
                          checked={vsu.agree}
                          onCheckedChange={(c) => setVsu({ ...vsu, agree: !!c })}
                          className="mt-1"
                        />
                        <Label htmlFor="agree" className="text-sm font-normal leading-relaxed">
                          I agree to the TechTrust Vendor Terms. I confirm my shop physically exists at
                          the address above and accept that approval requires admin verification.
                        </Label>
                      </div>
                      <ErrorText errors={errors} name="agree" />

                      <Button type="submit" variant="success" size="lg" className="w-full" disabled={loading}>
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit application"}
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
