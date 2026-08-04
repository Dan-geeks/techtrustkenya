import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wrench, ArrowRight, ShieldCheck, Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const BookRepair = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Everything below used to be uncontrolled: the form collected nothing and
  // handleSubmit was a setTimeout labelled "Simulate API call", so no repair
  // request ever reached a technician.
  const [deviceType, setDeviceType] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [issue, setIssue] = useState("");
  const [problemDetail, setProblemDetail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [techs, setTechs] = useState<any[]>([]);

  useEffect(() => {
    // Only vendors the admin has vetted and listed as repair technicians -
    // ticking "offers repairs" at onboarding just files an application.
    (async () => {
      const { data } = await supabase
        .from("vendor_profiles")
        .select("id, business_name, city, county")
        .eq("offers_repairs", true)
        .eq("repair_application_status", "approved")
        .order("business_name");
      setTechs(data ?? []);
      const preset = new URLSearchParams(window.location.search).get("vendor");
      if (preset && (data ?? []).some((v: any) => v.id === preset)) setVendorId(preset);
    })();
  }, []);

  useEffect(() => {
    document.title = "Book a Repair | TechTrust";
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    
    if (!user) {
      toast.error("Please sign in so the technician can reach you.");
      navigate("/auth");
      return;
    }
    if (!vendorId) {
      toast.error("Please choose a technician.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("repair_requests").insert({
      customer_id: user.id,
      vendor_id: vendorId,
      device_description: [deviceType, brandModel].filter(Boolean).join(" - "),
      problem_description: [
        issue ? `Issue: ${issue}` : null,
        problemDetail,
        fullName ? `Contact: ${fullName}` : null,
        phone ? `Phone: ${phone}` : null,
        location ? `Location: ${location}` : null,
      ].filter(Boolean).join("\n"),
      status: "submitted",
    });
    setLoading(false);

    if (error) {
      toast.error("Could not submit your repair request: " + error.message);
      return;
    }
    toast.success("Repair request sent to the technician.");
    setIsSubmitted(true);
    window.scrollTo(0, 0);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 max-w-lg w-full text-center animate-in zoom-in-95 duration-500">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">Request Received!</h2>
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            Your repair request has been successfully submitted. We're currently matching you with a verified technician in your area. You'll receive an SMS with your quote shortly.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={() => navigate("/browse")}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-bold text-white shadow-md rounded-xl transition-all"
            >
              Browse Marketplace
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full h-12 text-base font-bold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
            >
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 mb-6 shadow-sm">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
            Book a Tech Repair
          </h1>
          <p className="text-slate-600 text-lg">
            Tell us about your device issue. We'll connect you with a verified technician for a secure, Float-protected repair.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Progress Bar */}
          <div className="bg-slate-100 flex h-2 w-full">
            <div className="bg-blue-600 h-full transition-all duration-500 ease-in-out w-1/3" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>

          <div className="p-6 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Step {step} of 3</span>
              {step === 1 && <span className="text-sm text-slate-500 font-medium">Device Details</span>}
              {step === 2 && <span className="text-sm text-slate-500 font-medium">Issue Description</span>}
              {step === 3 && <span className="text-sm text-slate-500 font-medium">Contact Info</span>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Step 1: Device Details */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-slate-900">Device Type</Label>
                    <Select required value={deviceType} onValueChange={setDeviceType}>
                      <SelectTrigger className="h-12 border-slate-200 text-base">
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smartphone">Smartphone</SelectItem>
                        <SelectItem value="laptop">Laptop / MacBook</SelectItem>
                        <SelectItem value="tablet">Tablet / iPad</SelectItem>
                        <SelectItem value="console">Gaming Console</SelectItem>
                        <SelectItem value="other">Other Electronics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-slate-900">Brand & Model</Label>
                    <Input required value={brandModel} onChange={(e) => setBrandModel(e.target.value)} placeholder="e.g. iPhone 13 Pro Max, MacBook Air M1" className="h-12 border-slate-200 text-base" />
                  </div>
                </div>
              )}

              {/* Step 2: Issue */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-slate-900">What needs to be repaired?</Label>
                    <Select required value={issue} onValueChange={setIssue}>
                      <SelectTrigger className="h-12 border-slate-200 text-base">
                        <SelectValue placeholder="Select primary issue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="screen">Screen Replacement</SelectItem>
                        <SelectItem value="battery">Battery Replacement</SelectItem>
                        <SelectItem value="charging">Charging Port Issue</SelectItem>
                        <SelectItem value="water">Water Damage</SelectItem>
                        <SelectItem value="power">Won't Turn On</SelectItem>
                        <SelectItem value="software">Software / Unlocking</SelectItem>
                        <SelectItem value="other">Other / Not Sure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-slate-900">Describe the problem in detail</Label>
                    <textarea 
                      required
                      className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent transition-all"
                      value={problemDetail}
                      onChange={(e) => setProblemDetail(e.target.value)}
                      placeholder="Tell us exactly what happened and what's not working..."
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Step 3: Contact */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 mb-6">
                    <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Your repair will be backed by our <strong>Float Escrow Protection</strong>. The technician won't be paid until you've tested your repaired device.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold text-slate-900">Full Name</Label>
                      <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="h-12 border-slate-200 text-base" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base font-semibold text-slate-900">Phone Number</Label>
                      <Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="h-12 border-slate-200 text-base" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-slate-900">Choose a technician</Label>
                    <Select required value={vendorId} onValueChange={setVendorId}>
                      <SelectTrigger className="h-12 border-slate-200 text-base">
                        <SelectValue placeholder={techs.length ? "Select a verified technician" : "No repair technicians available yet"} />
                      </SelectTrigger>
                      <SelectContent>
                        {techs.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.business_name}{t.city ? ` - ${t.city}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {techs.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No vendors have enabled repair services yet. A vendor enables this by ticking
                        "Offer repair services" during onboarding.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-slate-900">Your Location / County</Label>
                    <Input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Nairobi, Mombasa" className="h-12 border-slate-200 text-base" />
                    <p className="text-xs text-slate-500 mt-1">We'll use this to match you with a verified technician nearby.</p>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                {step > 1 ? (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setStep(step - 1)}
                    className="text-slate-600 font-semibold"
                  >
                    Back
                  </Button>
                ) : (
                  <div></div>
                )}
                
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 h-12 px-8 text-base font-bold text-white shadow-md rounded-xl transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    "Submitting..."
                  ) : step < 3 ? (
                    <span className="flex items-center gap-2">Continue <ArrowRight className="w-4 h-4" /></span>
                  ) : (
                    <span className="flex items-center gap-2">Submit Repair Request <CheckCircle2 className="w-4 h-4" /></span>
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-70">
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Verified Technicians
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
            <Wrench className="w-5 h-5 text-blue-600" />
            90-Day Warranty
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            Original Parts Guarantee
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookRepair;
