import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Camera, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getPostLoginPath } from "@/lib/redirectByRole";
import { KENYA_COUNTIES } from "@/lib/kenyaCounties";
import { invokeFunction } from "@/lib/functions";

const phoneOk = (v: string) => /^(07\d{8}|2547\d{8})$/.test(v);

/**
 * Vendor onboarding for users who are already authenticated (Google sign-in
 * via /welcome). Collects the same business details as /vendor/register minus
 * email/password — there's already a session — plus the M-Pesa till number.
 */
const VendorOnboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const [vsu, setVsu] = useState({
    owner_name: "",
    phone: "",
    till_number: "",
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (user) {
      setVsu((prev) => ({ ...prev, owner_name: prev.owner_name || (user.user_metadata?.full_name as string) || "" }));
    }
  }, [authLoading, user, navigate]);

  // Already-onboarded users (or already-approved vendors) shouldn't land back here.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const path = await getPostLoginPath(user.id);
      if (path !== "/welcome" && path.startsWith("/vendor")) {
        navigate(path, { replace: true });
      }
    })();
  }, [user, navigate]);

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
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const errs: Record<string, string> = {};
    if (!vsu.owner_name.trim()) errs.owner_name = "Required";
    if (!phoneOk(vsu.phone)) errs.phone = "Use 07XXXXXXXX or 2547XXXXXXXX";
    if (!vsu.till_number.trim()) errs.till_number = "Required";
    if (!vsu.business_name.trim()) errs.business_name = "Required";
    if (!vsu.county) errs.county = "Required";
    if (!vsu.sub_county.trim()) errs.sub_county = "Required";
    if (!vsu.physical_address.trim()) errs.physical_address = "Required";
    if (!vsu.latitude || isNaN(Number(vsu.latitude))) errs.latitude = "Valid latitude required";
    if (!vsu.longitude || isNaN(Number(vsu.longitude))) errs.longitude = "Valid longitude required";
    if (shopPhotos.length < 2) errs.photos = "Upload at least 2 shop photos";
    for (const f of shopPhotos) {
      if (f.size > 5 * 1024 * 1024) {
        errs.photos = `${f.name} exceeds 5MB`;
        break;
      }
    }
    if (!vsu.agree) errs.agree = "You must accept the vendor terms";
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Please fix the errors and try again");
      return;
    }

    setLoading(true);
    try {
      const photoUrls: string[] = [];
      for (const f of shopPhotos) {
        const url = await uploadFile("shop-photos", f, user.id);
        photoUrls.push(url);
      }

      let certPath: string | null = null;
      if (certificate) {
        try {
          certPath = await uploadCertificate(certificate, user.id);
        } catch (err) {
          console.warn("Certificate upload failed", err);
        }
      }

      const { data: fnRes, error: fnErr } = await invokeFunction("create-vendor-profile", {
        body: {
          userId: user.id,
          businessName: vsu.business_name,
          ownerName: vsu.owner_name,
          phone: vsu.phone,
          email: user.email,
          county: vsu.county,
          subCounty: vsu.sub_county,
          physicalAddress: vsu.physical_address,
          gpsLatitude: Number(vsu.latitude),
          gpsLongitude: Number(vsu.longitude),
          googleMapsLink: vsu.google_maps_link || null,
          shopPhotoUrls: photoUrls,
          businessCertificateUrl: certPath,
          tillNumber: vsu.till_number,
        },
      });
      if (fnErr || !fnRes?.success) {
        toast.error(`Failed to create vendor profile: ${fnErr?.message ?? fnRes?.error ?? "Unknown error"}`);
        setLoading(false);
        return;
      }

      const { error: onboardErr } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", user.id);
      if (onboardErr) console.warn("Failed to flag onboarding complete", onboardErr);

      toast.success("Application submitted!");
      navigate("/vendor/pending", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const Err = ({ name }: { name: string }) =>
    errors[name] ? <p className="text-xs text-destructive mt-1">{errors[name]}</p> : null;

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-primary">
      <div className="w-full max-w-3xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight text-white">
            Tech<span className="text-accent">Trust</span>
          </span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-elegant">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Set up your shop</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Signed in as {user.email}. Tell us about your business so we can verify it.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Owner / Manager full name</Label>
              <Input value={vsu.owner_name} onChange={(e) => setVsu({ ...vsu, owner_name: e.target.value })} className="mt-1.5" />
              <Err name="owner_name" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input type="tel" autoComplete="tel" value={vsu.phone} placeholder="07XXXXXXXX" onChange={(e) => setVsu({ ...vsu, phone: e.target.value })} className="mt-1.5" />
                <Err name="phone" />
              </div>
              <div>
                <Label>M-Pesa till number</Label>
                <Input value={vsu.till_number} placeholder="e.g. 123456" onChange={(e) => setVsu({ ...vsu, till_number: e.target.value })} className="mt-1.5" />
                <Err name="till_number" />
              </div>
            </div>

            <div>
              <Label>Business name</Label>
              <Input value={vsu.business_name} onChange={(e) => setVsu({ ...vsu, business_name: e.target.value })} className="mt-1.5" />
              <Err name="business_name" />
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
                <Err name="county" />
              </div>
              <div>
                <Label>Sub-County or Town</Label>
                <Input value={vsu.sub_county} placeholder="e.g. Juja, Westlands, Kisumu CBD, Eldoret Town" onChange={(e) => setVsu({ ...vsu, sub_county: e.target.value })} className="mt-1.5" />
                <Err name="sub_county" />
              </div>
            </div>
            <div>
              <Label>Physical shop address</Label>
              <Input value={vsu.physical_address} onChange={(e) => setVsu({ ...vsu, physical_address: e.target.value })} className="mt-1.5" placeholder="Building name, street, floor / shop number" />
              <Err name="physical_address" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>GPS Latitude</Label>
                <Input type="number" step="any" placeholder="-1.1023" value={vsu.latitude} onChange={(e) => setVsu({ ...vsu, latitude: e.target.value })} className="mt-1.5" />
                <Err name="latitude" />
              </div>
              <div>
                <Label>GPS Longitude</Label>
                <Input type="number" step="any" placeholder="37.0144" value={vsu.longitude} onChange={(e) => setVsu({ ...vsu, longitude: e.target.value })} className="mt-1.5" />
                <Err name="longitude" />
              </div>
            </div>

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
                    <div key={i} className="relative group">
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
              <Err name="photos" />
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
            <Err name="agree" />

            <Button type="submit" variant="success" size="lg" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit application"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorOnboarding;
