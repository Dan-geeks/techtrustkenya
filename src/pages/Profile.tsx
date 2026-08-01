import { useEffect, useRef, useState } from "react";
import { Camera, Copy, Gift, Loader2, Mail, Phone, Save, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "vendor" | "customer";

const roleBadge: Record<Role, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  vendor: "bg-accent-soft text-accent border-accent/20",
  customer: "bg-muted text-muted-foreground border-border",
};

const phoneRegex = /^(07\d{8}|254\d{9})$/;

const Profile = () => {
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "My Profile | TechTrust";
    if (!user) return;

    (async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name,phone_number,avatar_url,referral_code,wallet_balance_ksh").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name ?? "");
        setPhone(profileRes.data.phone_number ?? "");
        setAvatarUrl(profileRes.data.avatar_url ?? null);
        setReferralCode((profileRes.data as any).referral_code ?? null);
        setWalletBalance((profileRes.data as any).wallet_balance_ksh ?? 0);
      }
      setRoles((rolesRes.data?.map((r) => r.role as Role)) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    setUploading(true);
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload photo");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      toast.error("Failed to save photo URL");
    } else {
      setAvatarUrl(publicUrl);
      toast.success("Profile photo updated");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    if (phone && !phoneRegex.test(phone)) {
      toast.error("Phone must be in format 07XXXXXXXX or 254XXXXXXXXX");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone_number: phone })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Profile updated");
    }
    setSaving(false);
  };

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied");
  };

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <Card className="overflow-hidden">
        <div className="bg-primary px-6 pt-8 pb-14 flex flex-col items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-primary-foreground/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-foreground/10 text-primary-foreground grid place-items-center font-bold text-2xl border-4 border-primary-foreground/10">
                {initials || <User className="h-10 w-10 text-primary-foreground/60" />}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Button
            variant="outlineLight"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Change photo
          </Button>
        </div>

        <div className="relative z-10 -mt-8 space-y-4 rounded-t-2xl bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX or 254XXXXXXXXX"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={user?.email ?? ""}
                readOnly
                className="pl-9 bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          {roles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Roles</Label>
              <div className="flex gap-2 flex-wrap">
                {roles.map((r) => (
                  <Badge key={r} className={roleBadge[r]} variant="outline">
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-4 w-4 text-accent" />
          <h2 className="font-semibold">Refer friends, earn <span className="text-price">KES 500</span></h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Share your code. You both get <span className="text-price">KES 500</span> credited to your wallet once they complete their first order.
        </p>
        <div className="flex items-center gap-2">
          <Input value={referralCode ?? "…"} readOnly className="text-data-id font-mono tracking-wider bg-muted" />
          <Button variant="outline" size="icon" onClick={copyReferralCode} disabled={!referralCode} aria-label="Copy referral code">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
          <Wallet className="h-4 w-4 text-success shrink-0" />
          <p className="text-sm">
            Wallet balance:{" "}
            <span className="text-price font-semibold text-foreground">KES {walletBalance.toLocaleString()}</span>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
