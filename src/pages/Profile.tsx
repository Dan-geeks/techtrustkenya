import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Copy, Check, Gift, Wallet, User, Phone, Mail, MapPin, Key, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const [copied, setCopied] = useState(false);
  const [fullName, setFullName] = useState("Kipchoge Keino");
  const [email] = useState("k.keino@example.com");
  const [phone, setPhone] = useState("712345678");
  const referralCode = "TECH500";
  const shareLink = `https://techtrustkenya.web.app/auth?mode=signup&ref=${referralCode}`;

  useEffect(() => {
    document.title = "Profile & Referral Wallet | TechTrust Kenya";
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile details updated successfully!");
  };

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen">
      <main className="w-full max-w-container-max mx-auto px-6 md:px-12 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="font-display-h2 text-3xl md:text-4xl font-bold text-[#0F172A]">Account Settings</h1>
            <div className="bg-[#10B981]/10 text-[#10B981] px-3 py-1 rounded-full border border-[#10B981]/20 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>Verified Buyer</span>
            </div>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0F3D8C] hover:underline bg-white px-4 py-2 rounded-xl border border-[#CBD5E1]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Marketplace</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Personal Details & M-Pesa */}
          <div className="lg:col-span-8 space-y-6">
            {/* Personal Information */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-6">
              <h2 className="text-lg font-bold text-[#0F172A] pb-3 border-b border-slate-100 flex items-center gap-2">
                <User className="h-5 w-5 text-[#0F3D8C]" />
                <span>Personal Details</span>
              </h2>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#0F172A]">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#0F3D8C] text-[#0F172A]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#0F172A]">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#0F172A]">Primary M-Pesa Phone</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-[#64748B] text-xs font-mono font-semibold">
                      +254
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-r-xl border border-slate-300 py-2.5 px-3.5 text-sm bg-slate-50 focus:bg-white focus:border-[#0F3D8C] text-[#0F172A] font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#0F3D8C] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#0A2D6B] transition-all shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </section>

            {/* Saved Shipping Addresses */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-4">
              <h2 className="text-lg font-bold text-[#0F172A] pb-3 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#0F3D8C]" />
                <span>Shipping Addresses</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-[#0F3D8C] bg-[#EEF2FF] rounded-xl p-4 relative">
                  <span className="absolute top-3 right-3 bg-[#0F3D8C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Default
                  </span>
                  <h3 className="font-bold text-sm text-[#0F172A]">Office / Work</h3>
                  <p className="text-xs text-[#64748B] mt-1">Westlands Commercial Center, Nairobi</p>
                  <p className="text-xs text-[#64748B]">Building B, 3rd Floor</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <h3 className="font-bold text-sm text-[#0F172A]">Home</h3>
                  <p className="text-xs text-[#64748B] mt-1">Kilimani, Argwings Kodhek Rd</p>
                  <p className="text-xs text-[#64748B]">Apt 4B</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Referral Program & Wallet Balance */}
          <div className="lg:col-span-4 space-y-6">
            {/* Referral Program Card */}
            <section className="bg-white rounded-2xl p-6 shadow-md border border-[#E2E8F0] space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center flex-shrink-0">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-[#0F172A]">Referral Program</h2>
                  <p className="text-xs text-[#64748B]">Earn KES 500 per friend</p>
                </div>
              </div>

              {/* Wallet Balance Display */}
              <div className="bg-[#EEF2FF] border border-[#0F3D8C]/20 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#0F3D8C]" />
                  <span className="text-xs font-bold text-[#0F3D8C]">Wallet Bonus</span>
                </div>
                <span className="font-mono text-xl font-bold text-[#0F3D8C] text-price font-data-price">
                  KES 500
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#0F172A]">Your Unique Referral Code</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-4 py-2.5 font-mono text-base font-bold text-[#0F3D8C] tracking-wider text-data-id">
                    {referralCode}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="bg-[#0F3D8C] hover:bg-[#0A2D6B] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed border-t border-slate-100 pt-4">
                Give friends your referral link. When they register and place their first order, both of you get <strong>KES 500</strong> credited directly to your TechTrust wallet balance!
              </p>
            </section>

            {/* Security Status */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#10B981]" />
                  <span>2FA Security Status</span>
                </span>
                <span className="text-[11px] font-bold bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full border border-[#10B981]/20">
                  Active
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                Your account is protected with SMS 2FA verification on M-Pesa transactions.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
