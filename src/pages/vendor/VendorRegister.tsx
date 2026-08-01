import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, MapPin, Upload, Check, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { KENYA_COUNTIES } from "@/lib/kenyaCounties";

const VendorRegister = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    business_name: "",
    trading_name: "",
    kra_pin: "",
    phone: "",
    email: "",
    category: "Smartphones & Tablets",
    county: "Nairobi",
    sub_county: "",
    physical_address: "",
    latitude: "",
    longitude: "",
    google_maps_link: "",
    online_only: false,
    till_number: "",
    agree_terms: false,
  });

  const [locating, setLocating] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [certificate, setCertificate] = useState<File | null>(null);

  useEffect(() => {
    document.title = "Vendor Registration | TechTrust Kenya";
    if (user?.email) {
      setFormData((prev) => ({ ...prev, email: prev.email || user.email || "" }));
    }
  }, [user]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        toast.success("Location coordinates captured!");
      },
      (err) => {
        setLocating(false);
        toast.error("Could not fetch location. You can enter address manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleNextToLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.business_name.trim()) {
      toast.error("Please enter your legal business name");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Please enter a primary contact phone number");
      return;
    }
    setStep(2);
    toast.success("Business details saved. Proceeding to Location.");
  };

  const handleNextToDocuments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.county) {
      toast.error("Please select a county");
      return;
    }
    if (!formData.online_only && !formData.physical_address.trim()) {
      toast.error("Please enter your physical shop address or check 'online-only business'");
      return;
    }
    setStep(3);
    toast.success("Location details saved. Proceeding to Verification Documents.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.till_number.trim()) {
      toast.error("Please enter your M-Pesa Till or Paybill number");
      return;
    }
    if (!formData.agree_terms) {
      toast.error("You must accept the vendor terms & conditions");
      return;
    }

    setSubmitting(true);
    try {
      if (user) {
        const { error } = await supabase.from("vendor_profiles").upsert({
          user_id: user.id,
          business_name: formData.business_name,
          phone: formData.phone,
          physical_address: formData.online_only ? "Online-Only Business" : formData.physical_address,
          county: formData.county,
          sub_county: formData.sub_county,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          google_maps_link: formData.google_maps_link,
          verification_status: "pending",
        });

        if (error) throw error;
      }
      toast.success("Application submitted successfully!");
      navigate("/vendor/pending", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col py-margin-desktop">
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Main Form Area */}
        <div className="md:col-span-8 space-y-gutter">
          {/* Stepper Header */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-variant flex items-center justify-between mb-8">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === 1 ? "bg-secondary-container text-on-secondary-container font-bold" : "opacity-70 hover:opacity-100"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-body-md-bold">
                1
              </div>
              <span className="font-ui-label text-ui-label text-primary">Business Details</span>
            </button>
            <div className="h-px bg-outline-variant flex-grow mx-2"></div>
            <button
              onClick={() => step > 1 && setStep(2)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === 2 ? "bg-secondary-container text-on-secondary-container font-bold" : "opacity-70 hover:opacity-100"
              }`}
            >
              <div className="w-8 h-8 rounded-full border border-outline flex items-center justify-center font-body-md-bold">
                2
              </div>
              <span className="font-ui-label text-ui-label text-on-surface">Location</span>
            </button>
            <div className="h-px bg-outline-variant flex-grow mx-2"></div>
            <button
              onClick={() => step > 2 && setStep(3)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === 3 ? "bg-secondary-container text-on-secondary-container font-bold" : "opacity-70 hover:opacity-100"
              }`}
            >
              <div className="w-8 h-8 rounded-full border border-outline flex items-center justify-center font-body-md-bold">
                3
              </div>
              <span className="font-ui-label text-ui-label text-on-surface">Documents</span>
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/30">
            {step === 1 && (
              <form onSubmit={handleNextToLocation} className="space-y-6">
                <h1 className="font-display-h2 text-display-h2 text-primary mb-2">Step 1: Register Your Business</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Provide accurate business contact details to ensure smooth merchant verification.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                      Legal Business Name *
                    </label>
                    <input
                      required
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0"
                      placeholder="e.g. TechHub Nairobi Ltd"
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                      Trading Name (Optional)
                    </label>
                    <input
                      value={formData.trading_name}
                      onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0"
                      placeholder="Storefront name if different"
                      type="text"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                    KRA PIN / Registration Number (Optional)
                  </label>
                  <input
                    value={formData.kra_pin}
                    onChange={(e) => setFormData({ ...formData, kra_pin: e.target.value.toUpperCase() })}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-data-id focus:border-primary focus:ring-0 uppercase"
                    placeholder="P000000000A (Optional)"
                    type="text"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                      Primary Contact Number *
                    </label>
                    <input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0"
                      placeholder="07XX XXX XXX or 2547XXXXXXXX"
                      type="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                      Business Email Address *
                    </label>
                    <input
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0"
                      placeholder="info@yourbusiness.co.ke"
                      type="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                    Primary Category of Electronics
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0 cursor-pointer"
                  >
                    <option>Smartphones &amp; Tablets</option>
                    <option>Laptops &amp; Computers</option>
                    <option>Audio &amp; Wearables</option>
                    <option>Cameras &amp; Gear</option>
                    <option>Other Consumer Electronics</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-surface-container flex justify-end">
                  <button
                    type="submit"
                    className="bg-primary-container text-on-primary hover:bg-[#0A2D6B] px-6 py-3 rounded-lg font-ui-label text-ui-label transition-colors duration-200 shadow-sm"
                  >
                    Continue to Location →
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleNextToDocuments} className="space-y-6">
                <h1 className="font-display-h2 text-display-h2 text-primary mb-2">Step 2: Store Physical Location</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Provide your physical address for inspection or mark your business as online-only.
                </p>

                <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/30 mb-4">
                  <input
                    type="checkbox"
                    id="online_only"
                    checked={formData.online_only}
                    onChange={(e) => setFormData({ ...formData, online_only: e.target.checked })}
                    className="w-5 h-5 rounded border-outline-variant text-primary-container focus:ring-primary-container cursor-pointer"
                  />
                  <label htmlFor="online_only" className="font-body-md text-on-surface cursor-pointer">
                    I don't have a physical store (online-only business)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                      County *
                    </label>
                    <select
                      value={formData.county}
                      onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0 cursor-pointer"
                    >
                      {KENYA_COUNTIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                      Sub-County / Area
                    </label>
                    <input
                      value={formData.sub_county}
                      onChange={(e) => setFormData({ ...formData, sub_county: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0"
                      placeholder="e.g. Westlands / Starehe"
                      type="text"
                    />
                  </div>
                </div>

                {!formData.online_only && (
                  <div className="space-y-2">
                    <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                      Physical Shop Address &amp; Building *
                    </label>
                    <input
                      value={formData.physical_address}
                      onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0"
                      placeholder="e.g. Luthuli Avenue, Kimathi House, 2nd Floor Shop 204"
                      type="text"
                    />
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                    GPS Coordinates (Recommended for Store Inspection)
                  </label>
                  <div className="flex flex-wrap gap-4 items-center">
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={locating}
                      className="bg-surface-container-high text-primary hover:bg-surface-dim px-4 py-2 rounded-lg font-ui-label text-sm flex items-center gap-2 border border-outline-variant/40"
                    >
                      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4 text-secondary" />}
                      Use My Current Geolocation
                    </button>
                    {formData.latitude && formData.longitude && (
                      <span className="text-xs text-emerald-600 font-medium">
                        ✓ Captured: {formData.latitude}, {formData.longitude}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                    Google Maps Link (Optional)
                  </label>
                  <input
                    value={formData.google_maps_link}
                    onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md focus:border-primary focus:ring-0"
                    placeholder="https://maps.google.com/?q=..."
                    type="url"
                  />
                </div>

                <div className="pt-6 border-t border-surface-container flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="border border-outline-variant text-on-surface px-6 py-3 rounded-lg font-ui-label hover:bg-surface-container-low transition-colors"
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-container text-on-primary hover:bg-[#0A2D6B] px-6 py-3 rounded-lg font-ui-label text-ui-label transition-colors duration-200 shadow-sm"
                  >
                    Continue to Documents →
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h1 className="font-display-h2 text-display-h2 text-primary mb-2">Step 3: Verification &amp; Payment Details</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Provide your payout M-Pesa Till or Paybill number and complete your application.
                </p>

                <div className="space-y-2">
                  <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                    M-Pesa Buy Goods Till Number or Paybill *
                  </label>
                  <input
                    required
                    value={formData.till_number}
                    onChange={(e) => setFormData({ ...formData, till_number: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-data-id focus:border-primary focus:ring-0"
                    placeholder="e.g. Till 542109 or Paybill 400200"
                    type="text"
                  />
                  <p className="text-xs text-on-surface-variant">Escrow funds will be released directly to this M-Pesa till upon delivery confirmation.</p>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                    Shop Photos (Upload at least 2 photos)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && setPhotos(Array.from(e.target.files))}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 text-sm cursor-pointer"
                  />
                  {photos.length > 0 && <p className="text-xs text-emerald-600 font-medium">✓ {photos.length} photo(s) selected</p>}
                </div>

                <div className="space-y-3">
                  <label className="font-ui-label text-ui-label text-on-surface block font-semibold">
                    Business Permit / KRA Certificate (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files && setCertificate(e.target.files[0])}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 text-sm cursor-pointer"
                  />
                  {certificate && <p className="text-xs text-emerald-600 font-medium">✓ {certificate.name} selected</p>}
                </div>

                <div className="flex items-start gap-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
                  <input
                    required
                    type="checkbox"
                    id="agree"
                    checked={formData.agree_terms}
                    onChange={(e) => setFormData({ ...formData, agree_terms: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-outline-variant text-primary-container focus:ring-primary-container cursor-pointer"
                  />
                  <label htmlFor="agree" className="text-sm text-on-surface cursor-pointer leading-relaxed">
                    I confirm that the business information provided is accurate and agree to the TechTrust Merchant Escrow Terms &amp; Conditions.
                  </label>
                </div>

                <div className="pt-6 border-t border-surface-container flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="border border-outline-variant text-on-surface px-6 py-3 rounded-lg font-ui-label hover:bg-surface-container-low transition-colors"
                  >
                    ← Back to Location
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary-container text-on-primary hover:bg-[#0A2D6B] px-8 py-3.5 rounded-lg font-ui-label text-ui-label transition-colors duration-200 shadow-md disabled:opacity-60 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting Application…
                      </>
                    ) : (
                      "Complete Application & Submit →"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar Guidance */}
        <div className="md:col-span-4">
          <div className="bg-surface-container-low rounded-xl p-6 border border-surface-variant sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
              <h2 className="font-body-md-bold text-body-md-bold text-primary">Physical Verification Process</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              To maintain a secure marketplace, all vendors undergo mandatory verification. Here is what to expect:
            </p>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">schedule</span>
                </div>
                <div>
                  <h3 className="font-ui-label text-ui-label text-on-surface mb-1">1. Scheduling</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                    Our compliance team will review your submission within 24 hours.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">badge</span>
                </div>
                <div>
                  <h3 className="font-ui-label text-ui-label text-on-surface mb-1">2. Inspection</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                    A representative verifies your business license and shop location.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">verified</span>
                </div>
                <div>
                  <h3 className="font-ui-label text-ui-label text-on-surface mb-1">3. Approval</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                    Upon approval, your vendor account is activated with full store access.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorRegister;
