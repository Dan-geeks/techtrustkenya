import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Copy, Check, Gift, Wallet, User, Phone, Mail, MapPin, Key, Shield, ArrowLeft, MessageCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [fullName, setFullName] = useState("Kipchoge Keino");
  const [email] = useState("k.keino@example.com");
  const [phone, setPhone] = useState("712345678");
  const [conversations, setConversations] = useState<any[]>([]);
  const referralCode = "TECH500";
  const shareLink = `https://techtrustkenya.web.app/auth?mode=signup&ref=${referralCode}`;

  useEffect(() => {
    document.title = "Profile & Referral Wallet | TechTrust Kenya";
    
    if (user?.id) {
      const fetchConversations = async () => {
        const { data } = await supabase
          .from("messages")
          .select("*, sender:sender_id(full_name), receiver:receiver_id(full_name)")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (data) {
          const uniquePartners = new Map();
          data.forEach((msg) => {
            const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            const partnerName = msg.sender_id === user.id ? msg.receiver?.full_name : msg.sender?.full_name;
            if (!uniquePartners.has(partnerId)) {
              uniquePartners.set(partnerId, {
                partnerId,
                partnerName: partnerName || "User",
                lastMessage: msg.content,
                isUnread: msg.receiver_id === user.id && !msg.is_read,
                timestamp: msg.created_at,
              });
            }
          });
          setConversations(Array.from(uniquePartners.values()));
        }
      };
      fetchConversations();
    }
  }, [user]);

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

            {/* Messages */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-4">
              <h2 className="text-lg font-bold text-[#0F172A] pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-[#0F3D8C]" />
                  <span>My Messages</span>
                </div>
              </h2>
              <div className="space-y-3">
                {conversations.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No messages yet.</p>
                ) : (
                  conversations.map((conv) => (
                    <div 
                      key={conv.partnerId} 
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("open-chat", {
                            detail: { partnerId: conv.partnerId, partnerName: conv.partnerName },
                          })
                        );
                      }}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-[#0F3D8C]/30 bg-slate-50 hover:bg-[#EEF2FF] cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0F3D8C]/10 flex items-center justify-center text-[#0F3D8C] font-bold">
                          {conv.partnerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                            {conv.partnerName}
                            {conv.isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            )}
                          </h3>
                          <p className={`text-xs truncate max-w-[200px] sm:max-w-[300px] ${conv.isUnread ? 'text-[#0F172A] font-semibold' : 'text-slate-500'}`}>
                            {conv.lastMessage}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F3D8C]" />
                    </div>
                  ))
                )}
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
