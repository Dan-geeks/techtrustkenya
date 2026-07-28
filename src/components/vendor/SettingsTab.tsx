import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const SettingsTab = ({ vendor, onUpdated }: { vendor: any; onUpdated: (v: any) => void }) => {
  const [form, setForm] = useState({
    business_name: vendor.business_name ?? "",
    owner_name: vendor.owner_name ?? "",
    physical_address: vendor.physical_address ?? "",
    city: vendor.city ?? "",
    operating_hours: vendor.operating_hours ?? "",
    google_maps_link: vendor.google_maps_link ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.business_name.trim() || !form.physical_address.trim()) {
      toast.error("Business name and address are required.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("vendor_profiles")
      .update({
        ...form,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendor.id)
      .select()
      .single();
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Shop settings updated");
      onUpdated(data);
    }
  };

  return (
    <Card className="p-5 max-w-2xl space-y-3">
      <h2 className="text-xl font-semibold">Shop settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Business name *</Label>
          <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Owner name</Label>
          <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Physical address *</Label>
          <Textarea rows={2} value={form.physical_address} onChange={(e) => setForm({ ...form, physical_address: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Operating hours</Label>
          <Input placeholder="Mon-Sat 9am - 6pm" value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Google Maps link</Label>
          <Input value={form.google_maps_link} onChange={(e) => setForm({ ...form, google_maps_link: e.target.value })} />
        </div>
      </div>
      <div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save changes
        </Button>
      </div>
      <div className="border-t pt-3 text-xs text-muted-foreground">
        Verification status: <span className="font-medium capitalize">{vendor.verification_status}</span> · Subscription: <span className="font-medium capitalize">{vendor.subscription_tier}</span>
      </div>
    </Card>
  );
};
