import re

filepath = r"C:\Users\Administrator\techtrustkenya\src\pages\admin\AdminDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update state
content = content.replace(
    "const [escrowStats, setEscrowStats] = useState({ totalFloat: 0, cleared: 0, pending: 0, ledger: [] as any[] });",
    "const [escrowStats, setEscrowStats] = useState({ totalFloat: 0, cleared: 0, pending: 0, ledger: [] as any[], lifetimeGMV: 0, platformRevenue: 0, openDisputes: 0 });"
)

# 2. Update loadEscrowStats
old_load = """  const loadEscrowStats = async () => {
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
  };"""

new_load = """  const loadEscrowStats = async () => {
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
      let lifetimeGMV = 0;
      let openDisputes = 0;

      orders.forEach(o => {
        const amt = o.total_amount_ksh || 0;
        lifetimeGMV += amt;
        
        if (o.status === "confirmed" || o.payout_status === "paid") {
          cleared += amt;
        } else if (o.payment_status === "paid_float" || o.status === "payment_held" || o.status === "pending_payment") {
          pending += amt;
        }
        
        if (o.status === "disputed") {
          openDisputes += 1;
        }
      });
      totalFloat = cleared + pending;

      setEscrowStats({
        totalFloat,
        cleared,
        pending,
        lifetimeGMV,
        platformRevenue: lifetimeGMV * 0.10,
        openDisputes,
        ledger: orders.slice(0, 10)
      });
    }
  };"""

content = content.replace(old_load, new_load)

# 3. Replace overview tab content
old_overview = """    if (activeTab === "overview") {
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
    }"""

new_overview = """    if (activeTab === "overview") {
      const activeVendorsCount = vendors.filter(v => v.verification_status === 'approved').length;
      const pendingVendorsCount = vendors.filter(v => v.verification_status === 'pending').length;

      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center cursor-pointer transition-colors" onClick={() => setActiveTab("users")}>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-normal text-slate-500">Total users</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{users.length}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center cursor-pointer transition-colors" onClick={() => setActiveTab("verifications")}>
            <div className="flex items-center gap-3 mb-4">
              <Store className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-normal text-slate-500">Active vendors</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{activeVendorsCount}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center cursor-pointer transition-colors" onClick={() => setActiveTab("verifications")}>
            <div className="flex items-center gap-3 mb-4">
              <Store className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-normal text-slate-500">Pending vendor approvals</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{pendingVendorsCount}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center cursor-pointer transition-colors" onClick={() => setActiveTab("escrow")}>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-normal text-slate-500">Lifetime GMV</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">KSH {(escrowStats.lifetimeGMV || 0).toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center cursor-pointer transition-colors" onClick={() => setActiveTab("escrow")}>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-normal text-slate-500">Platform revenue (10%)</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">KSH {(escrowStats.platformRevenue || 0).toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center cursor-pointer transition-colors" onClick={() => setActiveTab("disputes")}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-normal text-slate-500">Open disputes</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{escrowStats.openDisputes || 0}</p>
          </div>
        </div>
      );
    }"""

content = content.replace(old_overview, new_overview)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated AdminDashboard.tsx")
