import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

export const SettingsTab = ({ vendor, onUpdated }: { vendor: any; onUpdated: (v: any) => void }) => {
  const [form, setForm] = useState({
    business_name: vendor.business_name ?? "",
    owner_name: vendor.owner_name ?? "",
    phone_number: vendor.phone_number ?? vendor.phone ?? "",
    till_number: vendor.till_number ?? "",
    physical_address: vendor.physical_address ?? "",
    city: vendor.city ?? "",
    county: vendor.county ?? "",
    sub_county: vendor.sub_county ?? "",
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
        business_name: form.business_name,
        owner_name: form.owner_name,
        physical_address: form.physical_address,
        city: form.city,
        county: form.county,
        sub_county: form.sub_county,
        phone: form.phone_number,
        till_number: form.till_number,
        operating_hours: form.operating_hours,
        google_maps_link: form.google_maps_link,
        updated_at: new Date().toISOString(),
      } as any)
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
    <Card className="p-5 max-w-2xl space-y-4">
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
        <div className="space-y-1">
          <Label>Contact Phone Number</Label>
          <Input placeholder="07XXXXXXXX or 2547XXXXXXXX" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5 text-accent" /> M-Pesa Till / Paybill Number
          </Label>
          <Input placeholder="5-7 digit till number (for payouts)" value={form.till_number} onChange={(e) => setForm({ ...form, till_number: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>County</Label>
          <Input placeholder="e.g. Nairobi, Kiambu, Mombasa" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Sub-County / Constituency</Label>
          <Input placeholder="e.g. Westlands, Starehe, Ruiru" value={form.sub_county} onChange={(e) => setForm({ ...form, sub_county: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>City / Town</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Operating hours</Label>
          <Input placeholder="Mon-Sat 9am - 6pm" value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Physical address *</Label>
          <Textarea rows={2} value={form.physical_address} onChange={(e) => setForm({ ...form, physical_address: e.target.value })} />
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
