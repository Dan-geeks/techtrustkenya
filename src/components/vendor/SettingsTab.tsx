import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, MapPin, Navigation, Building2, Store, Clock, CheckCircle2 } from "lucide-react";

/**
 * Onboarding stores the payout destination as a single formatted string in
 * `till_number` ("Till: 123456", "Paybill: 247247 | Acc: 12", "Bank: KCB |
 * Acc: 12", "M-Pesa Phone: 07..."). Settings only ever showed that raw string
 * in one free-text box, so a vendor could not switch from, say, Send Money to
 * Buy Goods without hand-crafting the format. Parse it back apart so the same
 * picker onboarding uses works here.
 */
type PayMethod = "till" | "paybill" | "bank" | "phone";

const parsePayout = (raw?: string | null) => {
  const s = (raw ?? "").trim();
  let m = s.match(/^Paybill:\s*(.+?)\s*\|\s*Acc:\s*(.+)$/i);
  if (m) return { method: "paybill" as PayMethod, till: "", biz: m[1], acc: m[2], bank: "", phone: "" };
  m = s.match(/^Bank:\s*(.+?)\s*\|\s*Acc:\s*(.+)$/i);
  if (m) return { method: "bank" as PayMethod, till: "", biz: "", acc: m[2], bank: m[1], phone: "" };
  m = s.match(/^M-Pesa Phone:\s*(.+)$/i);
  if (m) return { method: "phone" as PayMethod, till: "", biz: "", acc: "", bank: "", phone: m[1] };
  m = s.match(/^Till:\s*(.+)$/i);
  if (m) return { method: "till" as PayMethod, till: m[1], biz: "", acc: "", bank: "", phone: "" };
  // Anything unrecognised (including a bare number) is treated as a till.
  return { method: "till" as PayMethod, till: s, biz: "", acc: "", bank: "", phone: "" };
};

export const SettingsTab = ({ vendor, onUpdated }: { vendor: any; onUpdated?: (v: any) => void }) => {
  const payout = parsePayout(vendor?.till_number);
  const [form, setForm] = useState({
    // These all used to default to invented sample data - "TechTrust Vendor",
    // "Store Manager", till 890123, an address on Kimathi Street and Nairobi
    // CBD coordinates - so a vendor who opened Settings and pressed Save wrote
    // someone else's details over their own. Blank means blank.
    business_name: vendor?.business_name ?? "",
    owner_name: vendor?.owner_name ?? "",
    phone_number: vendor?.phone_number ?? vendor?.phone ?? "",
    payment_method: payout.method,
    payment_till: payout.till,
    payment_paybill_biz: payout.biz,
    payment_paybill_acc: payout.acc,
    payment_bank_name: payout.bank,
    payment_phone: payout.phone,
    physical_address: vendor?.physical_address ?? "",
    city: vendor?.city ?? "",
    county: vendor?.county ?? "",
    sub_county: vendor?.sub_county ?? "",
    operating_hours: vendor?.operating_hours ?? "",
    google_maps_link: vendor?.google_maps_link ?? "",
    latitude: vendor?.latitude ?? "",
    longitude: vendor?.longitude ?? "",
    // Was only settable during onboarding, so a vendor who skipped it could
    // never turn repairs on, and the Repairs tab keys off this flag.
    offers_products: vendor?.offers_products ?? true,
    offers_repairs: vendor?.offers_repairs ?? false,
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

  // Rebuild the single string onboarding writes, so both places stay readable
  // by whatever eventually pays vendors out.
  const buildPayoutString = (): string | null => {
    const f = form;
    if (f.payment_method === "till") return f.payment_till.trim() ? `Till: ${f.payment_till.trim()}` : null;
    if (f.payment_method === "paybill")
      return f.payment_paybill_biz.trim() && f.payment_paybill_acc.trim()
        ? `Paybill: ${f.payment_paybill_biz.trim()} | Acc: ${f.payment_paybill_acc.trim()}`
        : null;
    if (f.payment_method === "bank")
      return f.payment_bank_name.trim() && f.payment_paybill_acc.trim()
        ? `Bank: ${f.payment_bank_name.trim()} | Acc: ${f.payment_paybill_acc.trim()}`
        : null;
    if (f.payment_method === "phone")
      return f.payment_phone.trim() ? `M-Pesa Phone: ${f.payment_phone.trim()}` : null;
    return null;
  };

  const save = async () => {
    if (!form.business_name.trim() || !form.physical_address.trim()) {
      toast.error("Business name and physical shop address are required.");
      return;
    }
    const payoutString = buildPayoutString();
    if (!payoutString) {
      toast.error("Fill in the payout details for the payment method you picked.");
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
            till_number: payoutString,
            operating_hours: form.operating_hours,
            google_maps_link: form.google_maps_link,
            offers_products: form.offers_products,
            offers_repairs: form.offers_repairs,
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
      // This used to toast SUCCESS on failure, so a rejected save looked saved.
      toast.error(err?.message || "Could not save your settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* What this shop offers - drives the Repairs tab and the technician
          picker customers see on /book-repair. */}
      <Card className="p-6 md:p-8 space-y-4 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg text-slate-900">Services you offer</h3>
        </div>

        <div className="flex items-start justify-between gap-4 py-2 border-t border-slate-100 pt-4">
          <div>
            <Label className="text-base font-semibold text-slate-900">Sell products</Label>
            <p className="text-xs text-slate-500 mt-1">List devices for sale on the marketplace.</p>
          </div>
          <Switch
            checked={form.offers_products}
            onCheckedChange={(c) => setForm({ ...form, offers_products: !!c })}
          />
        </div>

        <div className="flex items-start justify-between gap-4 py-2 border-t border-slate-100 pt-4">
          <div>
            <Label className="text-base font-semibold text-slate-900">Offer repair services</Label>
            <p className="text-xs text-slate-500 mt-1">
              Adds a <strong>Repairs</strong> tab here for incoming requests. TechTrust vets every
              technician before listing them publicly, so this files an application first.
            </p>
          </div>
          <Switch
            checked={form.offers_repairs}
            onCheckedChange={(c) => setForm({ ...form, offers_repairs: !!c })}
          />
        </div>

        {/* Where the application actually stands. Without this the vendor ticks
            the box, never appears on /repairs, and has no idea why. */}
        {form.offers_repairs && vendor?.repair_application_status && vendor.repair_application_status !== "none" && (
          <div
            className={`rounded-xl border p-4 text-xs ${
              vendor.repair_application_status === "approved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : vendor.repair_application_status === "rejected"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {vendor.repair_application_status === "approved" ? (
              <p><strong>Listed as a repair technician.</strong> Customers can find and book you on the Repairs page.</p>
            ) : vendor.repair_application_status === "rejected" ? (
              <p>
                <strong>Repair application not approved.</strong>{" "}
                {vendor.repair_rejection_reason || "Contact support if you'd like this reviewed again."}
              </p>
            ) : (
              <>
                <p className="mb-2">
                  <strong>Repair application under review.</strong> You'll appear on the Repairs page once TechTrust
                  clears all three checks:
                </p>
                <ul className="space-y-1">
                  {[
                    ["repair_step_identity", "Identity & business verified"],
                    ["repair_step_skills", "Repair skills reviewed"],
                    ["repair_step_safety", "Safety & data handling briefing"],
                  ].map(([col, label]) => (
                    <li key={col} className="flex items-center gap-2">
                      <span className={vendor[col] ? "text-emerald-600" : "text-slate-400"}>
                        {vendor[col] ? "✓" : "○"}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>

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

          {/* The same picker onboarding offers. Previously this was one free-text
              box holding the raw stored string, so switching from Buy Goods to
              Paybill or Send Money meant guessing the exact format. */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#0F172A] flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-[#10B981]" />
              <span>How you receive payouts</span>
            </Label>
            <Select
              value={form.payment_method}
              onValueChange={(v: any) => setForm({ ...form, payment_method: v })}
            >
              <SelectTrigger className="bg-slate-50 rounded-xl border-slate-300 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="till">M-Pesa Till (Buy Goods)</SelectItem>
                <SelectItem value="paybill">M-Pesa Paybill</SelectItem>
                <SelectItem value="phone">M-Pesa Phone (Send Money)</SelectItem>
                <SelectItem value="bank">Bank Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.payment_method === "till" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#0F172A]">Till Number *</Label>
              <Input
                placeholder="e.g. 890123"
                value={form.payment_till}
                onChange={(e) => setForm({ ...form, payment_till: e.target.value })}
                className="bg-slate-50 rounded-xl border-slate-300 text-sm font-mono font-bold"
              />
            </div>
          )}

          {form.payment_method === "phone" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#0F172A]">M-Pesa Phone Number *</Label>
              <Input
                placeholder="e.g. 0712345678"
                value={form.payment_phone}
                onChange={(e) => setForm({ ...form, payment_phone: e.target.value })}
                className="bg-slate-50 rounded-xl border-slate-300 text-sm font-mono font-bold"
              />
            </div>
          )}

          {form.payment_method === "paybill" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0F172A]">Paybill Business No. *</Label>
                <Input
                  placeholder="e.g. 247247"
                  value={form.payment_paybill_biz}
                  onChange={(e) => setForm({ ...form, payment_paybill_biz: e.target.value })}
                  className="bg-slate-50 rounded-xl border-slate-300 text-sm font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0F172A]">Account Number *</Label>
                <Input
                  placeholder="e.g. 123456"
                  value={form.payment_paybill_acc}
                  onChange={(e) => setForm({ ...form, payment_paybill_acc: e.target.value })}
                  className="bg-slate-50 rounded-xl border-slate-300 text-sm font-mono font-bold"
                />
              </div>
            </>
          )}

          {form.payment_method === "bank" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0F172A]">Bank Name *</Label>
                <Input
                  placeholder="e.g. KCB"
                  value={form.payment_bank_name}
                  onChange={(e) => setForm({ ...form, payment_bank_name: e.target.value })}
                  className="bg-slate-50 rounded-xl border-slate-300 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0F172A]">Bank Account Number *</Label>
                <Input
                  placeholder="e.g. 1234567890"
                  value={form.payment_paybill_acc}
                  onChange={(e) => setForm({ ...form, payment_paybill_acc: e.target.value })}
                  className="bg-slate-50 rounded-xl border-slate-300 text-sm font-mono font-bold"
                />
              </div>
            </>
          )}

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
