import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Mail, Phone, Save, User } from "lucide-react";
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
  admin: "bg-purple-100 text-purple-700",
  vendor: "bg-blue-100 text-blue-700",
  customer: "bg-gray-100 text-gray-700",
};

const phoneRegex = /^(07\d{8}|254\d{9})$/;

const Profile = () => {
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "My Profile — TechTrust";
    if (!user) return;

    (async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name,phone_number,avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name ?? "");
        setPhone(profileRes.data.phone_number ?? "");
        setAvatarUrl(profileRes.data.avatar_url ?? null);
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

      <Card className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted text-foreground grid place-items-center font-bold text-2xl border border-border">
                {initials || <User className="h-10 w-10 text-muted-foreground" />}
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
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Change photo
          </Button>
        </div>

        <div className="space-y-4">
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
      </Card>
    </div>
  );
};

export default Profile;
