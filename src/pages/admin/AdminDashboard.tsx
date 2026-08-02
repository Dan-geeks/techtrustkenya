import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Bell, Search, User, FileText, MapPin, MoreHorizontal, Check, X, LogOut, LayoutDashboard, Users, FileCheck, AlertTriangle, Shield, Settings, Home, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopNav } from "@/components/layout/TopNav";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [escrowStats, setEscrowStats] = useState({ totalFloat: 0, cleared: 0, pending: 0, ledger: [] as any[] });

  // Settings State
  const [escrowFee, setEscrowFee] = useState("1.5");
  const [referralBonus, setReferralBonus] = useState("500");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    document.title = "Admin Dashboard | TechTrust";
    loadVendors();
    loadEscrowStats();
    loadUsers();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase.from("app_settings").select("*");
    if (!error && data) {
      data.forEach((setting) => {
        if (setting.key === "escrow_fee") setEscrowFee(setting.value);
        if (setting.key === "referral_bonus") setReferralBonus(setting.value);
      });
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updates = [
        { key: "escrow_fee", value: escrowFee, updated_at: new Date().toISOString() },
        { key: "referral_bonus", value: referralBonus, updated_at: new Date().toISOString() }
      ];

      const { error } = await supabase.from("app_settings").upsert(updates, { onConflict: 'key' });

      if (error) throw error;
      toast.success("Settings updated successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").limit(50).order("id", { ascending: false });
    if (data) setUsers(data);
  };

  const loadVendors = async () => {
    const { data: vendorData, error: vendorError } = await supabase
      .from("vendor_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (vendorError) {
      console.error(vendorError);
      return;
    }

    if (vendorData) {
      setVendors(vendorData);
    }
  };

  const loadEscrowStats = async () => {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, status, payment_status, total_amount_ksh, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (orders) {
      let totalFloat = 0;
      let cleared = 0;
      let pending = 0;

      orders.forEach(o => {
        const amt = o.total_amount_ksh || 0;
        if (o.status === "confirmed" || o.payout_status === "paid") {
          cleared += amt;
        } else if (o.payment_status === "paid_float" || o.status === "payment_held" || o.status === "pending_payment") {
          pending += amt;
        }
      });
      totalFloat = cleared + pending;

      setEscrowStats({
        totalFloat,
        cleared,
        pending,
        ledger: orders.slice(0, 10)
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("vendor_profiles")
      .update({ verification_status: status })
      .eq("id", id);
      
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Vendor ${status}`);
      loadVendors();
    }
  };

  const approvePayout = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ payout_status: 'paid' })
      .eq("id", orderId);
    
    if (error) {
      toast.error("Failed to approve payout");
    } else {
      toast.success("Payout Approved and Funds Released to Vendor!");
      loadEscrowStats();
    }
  };

  const renderTabContent = () => {
    if (activeTab === "overview") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("users")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Users</h3>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{users.length}</p>
              <p className="text-xs text-slate-500 mt-1">Platform members</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("verifications")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Vendors</h3>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{vendors.length}</p>
              <p className="text-xs text-slate-500 mt-1">Pending and verified</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("escrow")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Float Escrow</h3>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">KES {(escrowStats.totalFloat || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Total protected volume</p>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "verifications") {
      const pendingVendors = vendors.filter(v => v.verification_status === 'pending');
      const approvedVendors = vendors.filter(v => v.verification_status === 'approved');

      return (
        <div className="space-y-8">
          {/* Pending Actions Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-900">Pending Actions ({pendingVendors.length})</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-9 h-9 w-64 bg-white" placeholder="Search pending vendors..." />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pendingVendors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No pending vendor verifications.
                      </td>
                    </tr>
                  ) : (
                    pendingVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                              {vendor.business_name?.substring(0, 2).toUpperCase() || "??"}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{vendor.business_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-600">{vendor.physical_address || "No location"}</p>
                          <p className="text-xs text-slate-400 font-mono mt-1">{vendor.id.substring(0, 8)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3 text-slate-400">
                            <User className="h-5 w-5 hover:text-blue-600 cursor-pointer" title="ID Document" />
                            <FileText className="h-5 w-5 hover:text-blue-600 cursor-pointer" title="Business Registration" />
                            {vendor.physical_address && <MapPin className="h-5 w-5 hover:text-blue-600 cursor-pointer" title="Location Proof" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => updateStatus(vendor.id, 'approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs">
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(vendor.id, 'rejected')} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8 px-3 text-xs">
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approved Vendors Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50/50">
              <h2 className="font-semibold text-emerald-900">Verified Vendors ({approvedVendors.length})</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                <Input className="pl-9 h-9 w-64 bg-white border-emerald-200 focus-visible:ring-emerald-500" placeholder="Search verified vendors..." />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {approvedVendors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                        No verified vendors yet.
                      </td>
                    </tr>
                  ) : (
                    approvedVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold relative">
                              {vendor.business_name?.substring(0, 2).toUpperCase() || "??"}
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 flex items-center gap-1">
                                {vendor.business_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-600">{vendor.physical_address || "No location"}</p>
                          <p className="text-xs text-slate-400 font-mono mt-1">{vendor.id.substring(0, 8)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <Check className="h-3 w-3" /> Approved
                          </span>
                          <div className="mt-2">
                            <Button size="sm" variant="outline" onClick={() => updateStatus(vendor.id, 'suspended')} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 h-7 px-2 text-xs">
                              Suspend
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "users") {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-semibold text-slate-900">Registered Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Onboarding Complete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{u.full_name || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {u.onboarding_complete ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold">Yes</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs">No</span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-slate-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === "escrow") {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Escrow Overview</h3>
              <div className="mb-6">
                <p className="text-sm text-slate-500 mb-1">Total Float Volume</p>
                <p className="text-3xl font-bold text-slate-900">KES {(escrowStats.totalFloat || 0).toLocaleString()}</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: escrowStats.totalFloat > 0 ? `${(escrowStats.cleared / escrowStats.totalFloat) * 100}%` : '0%' }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>Cleared: <span className="text-slate-900">{(escrowStats.cleared || 0).toLocaleString()}</span></span>
                <span>Pending: <span className="text-slate-900">{(escrowStats.pending || 0).toLocaleString()}</span></span>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-900 text-sm">Action Required: Payout Approvals</h2>
              </div>
              <div className="p-0">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {escrowStats.ledger.filter(t => t.payment_status === "paid_float" && t.status !== "confirmed").length === 0 ? (
                      <tr>
                        <td className="px-6 py-8 text-center text-slate-500">No pending payouts.</td>
                      </tr>
                    ) : (
                      escrowStats.ledger.filter(t => t.payment_status === "paid_float" && t.status !== "confirmed").map((txn) => (
                        <tr key={txn.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{txn.id.substring(0, 8)}</td>
                          <td className="px-6 py-4">KES {(txn.total_amount_ksh || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => approvePayout(txn.id)}>
                              Approve Payout
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-900 text-sm">Recent Ledger Activity</h2>
              </div>
              <div className="p-0">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {escrowStats.ledger.length === 0 ? (
                      <tr>
                        <td className="px-6 py-8 text-center text-slate-500">No recent activity.</td>
                      </tr>
                    ) : (
                      escrowStats.ledger.map((txn) => (
                        <tr key={txn.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{txn.id.substring(0, 8)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              txn.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {txn.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900">KES {(txn.total_amount_ksh || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (activeTab === "disputes") {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No Active Disputes</h2>
          <p className="text-slate-500">There are currently no active transaction disputes requiring arbitration.</p>
        </div>
      );
    }
    
    if (activeTab === "settings") {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Platform Settings</h2>
          <div className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Escrow Fee Percentage</label>
              <Input 
                type="number" 
                value={escrowFee} 
                onChange={(e) => setEscrowFee(e.target.value)} 
                className="bg-slate-50" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Referral Bonus (KES)</label>
              <Input 
                type="number" 
                value={referralBonus} 
                onChange={(e) => setReferralBonus(e.target.value)} 
                className="bg-slate-50" 
              />
            </div>
            <Button 
              className="bg-primary text-white" 
              onClick={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <TopNav />
      
      {/* Admin Sub-navigation */}
      <div className="bg-white border-b border-slate-200 mt-20 sticky top-20 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
          <nav className="flex gap-2">
            <button onClick={() => setActiveTab("overview")} className={`transition-all text-sm font-bold flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'text-primary border-primary bg-primary/5' : 'text-slate-500 border-transparent hover:text-primary hover:bg-slate-50'}`}>
              <Activity className="h-4 w-4" /> Overview
            </button>
            <button onClick={() => setActiveTab("users")} className={`transition-all text-sm font-bold flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'text-primary border-primary bg-primary/5' : 'text-slate-500 border-transparent hover:text-primary hover:bg-slate-50'}`}>
              <Users className="h-4 w-4" /> Users
            </button>
            <button onClick={() => setActiveTab("verifications")} className={`transition-all text-sm font-bold flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap ${activeTab === 'verifications' ? 'text-primary border-primary bg-primary/5' : 'text-slate-500 border-transparent hover:text-primary hover:bg-slate-50'}`}>
              <FileCheck className="h-4 w-4" /> Verifications
            </button>
            <button onClick={() => setActiveTab("disputes")} className={`transition-all text-sm font-bold flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap ${activeTab === 'disputes' ? 'text-primary border-primary bg-primary/5' : 'text-slate-500 border-transparent hover:text-primary hover:bg-slate-50'}`}>
              <AlertTriangle className="h-4 w-4" /> Disputes
            </button>
            <button onClick={() => setActiveTab("escrow")} className={`transition-all text-sm font-bold flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap ${activeTab === 'escrow' ? 'text-primary border-primary bg-primary/5' : 'text-slate-500 border-transparent hover:text-primary hover:bg-slate-50'}`}>
              <Shield className="h-4 w-4" /> Escrow
            </button>
            <button onClick={() => setActiveTab("settings")} className={`transition-all text-sm font-bold flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap ${activeTab === 'settings' ? 'text-primary border-primary bg-primary/5' : 'text-slate-500 border-transparent hover:text-primary hover:bg-slate-50'}`}>
              <Settings className="h-4 w-4" /> Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-8 pb-12 px-6 max-w-7xl mx-auto w-full flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 capitalize">{activeTab}</h1>
          <p className="text-slate-500 mt-2">Manage the TechTrust {activeTab} operations.</p>
        </div>

        {renderTabContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;
