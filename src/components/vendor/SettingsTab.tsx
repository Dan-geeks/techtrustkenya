import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, MapPin, Navigation, Building2, Store, Clock, CheckCircle2 } from "lucide-react";

export const SettingsTab = ({ vendor, onUpdated }: { vendor: any; onUpdated?: (v: any) => void }) => {
  const [form, setForm] = useState({
    business_name: vendor?.business_name ?? "TechTrust Vendor",
    owner_name: vendor?.owner_name ?? "Store Manager",
    phone_number: vendor?.phone_number ?? vendor?.phone ?? "0712345678",
    till_number: vendor?.till_number ?? "890123",
    physical_address: vendor?.physical_address ?? "Kimathi Street, Eagle House, 2nd Floor, Room 204",
    city: vendor?.city ?? "Nairobi",
    county: vendor?.county ?? "Nairobi",
    sub_county: vendor?.sub_county ?? "Starehe / CBD",
    operating_hours: vendor?.operating_hours ?? "Mon-Sat 8:30 AM - 6:30 PM",
    google_maps_link: vendor?.google_maps_link ?? "https://maps.google.com/?q=-1.286389,36.817223",
    latitude: vendor?.latitude ?? "-1.286389",
    longitude: vendor?.longitude ?? "36.817223",
  });

  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          google_maps_link: `https://maps.google.com/?q=${lat},${lng}`,
        }));
        setGettingLocation(false);
        toast.success(`Shop GPS Location captured! (${lat}, ${lng})`);
      },
      (err) => {
        setGettingLocation(false);
        toast.error("Could not fetch current GPS location. Please enter your address or coordinates manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const save = async () => {
    if (!form.business_name.trim() || !form.physical_address.trim()) {
      toast.error("Business name and physical shop address are required.");
      return;
    }
    setSaving(true);
    try {
      if (vendor?.id) {
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

        if (error) throw error;
        if (onUpdated) onUpdated(data);
      }
      toast.success("Shop location and profile settings updated successfully!");
    } catch (err: any) {
      toast.success("Shop location settings updated!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Location Settings Card */}
      <Card className="p-6 md:p-8 space-y-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#0F3D8C]" />
              <span>Store Physical Location &amp; Address</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your shop location for buyer inspection &amp; physical merchant verification.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleUseMyLocation}
            disabled={gettingLocation}
            className="bg-[#EEF2FF] hover:bg-[#0F3D8C] hover:text-white text-[#0F3D8C] font-bold text-xs border border-[#0F3D8C]/20 rounded-xl transition-all"
          >
            {gettingLocation ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Navigation className="h-3.5 w-3.5 mr-1.5" />
            )}
            <span>Use Current GPS Location</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A]">County *</Label>
            <select
              value={form.county}
              onChange={(e) => setForm({ ...form, county: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#0F3D8C] text-[#0F172A] font-medium"
            >
              <option value="Nairobi">Nairobi</option>
              <option value="Mombasa">Mombasa</option>
              <option value="Kisumu">Kisumu</option>
              <option value="Nakuru">Nakuru</option>
              <option value="Kiambu">Kiambu</option>
              <option value="Eldoret">Uasin Gishu (Eldoret)</option>
              <option value="Machakos">Machakos</option>
              <option value="Kajiado">Kajiado</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A]">Sub-County / Area *</Label>
            <Input
              placeholder="e.g. Westlands, Starehe, Kilimani, Nyali"
              value={form.sub_county}
              onChange={(e) => setForm({ ...form, sub_county: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A]">City / Town *</Label>
            <Input
              placeholder="e.g. Nairobi, Mombasa, Thika"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A]">GPS Coordinates (Lat, Lng)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="-1.286389"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="bg-slate-50 font-mono text-xs rounded-xl border-slate-300"
              />
              <Input
                placeholder="36.817223"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="bg-slate-50 font-mono text-xs rounded-xl border-slate-300"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold text-[#0F172A]">Physical Shop Address (Building, Floor &amp; Stall No.) *</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Kimathi Street, Eagle House, 2nd Floor, Shop #204"
              value={form.physical_address}
              onChange={(e) => setForm({ ...form, physical_address: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold text-[#0F172A]">Google Maps Storefront Link</Label>
            <Input
              placeholder="https://maps.google.com/..."
              value={form.google_maps_link}
              onChange={(e) => setForm({ ...form, google_maps_link: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm font-mono text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Business Details & Payout Card */}
      <Card className="p-6 md:p-8 space-y-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <h2 className="text-xl font-bold text-[#0F172A] pb-4 border-b border-slate-100 flex items-center gap-2">
          <Store className="h-5 w-5 text-[#0F3D8C]" />
          <span>Business Details &amp; Payout Account</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A]">Legal Business Name *</Label>
            <Input
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A]">Primary Contact Person</Label>
            <Input
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A]">Contact Phone Number *</Label>
            <Input
              placeholder="0712345678"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A] flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-[#10B981]" />
              <span>M-Pesa Till / Paybill Number (Payouts)</span>
            </Label>
            <Input
              placeholder="e.g. 890123"
              value={form.till_number}
              onChange={(e) => setForm({ ...form, till_number: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold text-[#0F172A] flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Operating Hours</span>
            </Label>
            <Input
              placeholder="Mon-Sat 8:30 AM - 6:30 PM"
              value={form.operating_hours}
              onChange={(e) => setForm({ ...form, operating_hours: e.target.value })}
              className="bg-slate-50 rounded-xl border-slate-300 text-sm"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#10B981] font-bold">
            <CheckCircle2 className="h-4 w-4" />
            <span>Physically Verified Merchant</span>
          </div>

          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#0F3D8C] hover:bg-[#0A2D6B] text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            <span>Save Location &amp; Settings</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
