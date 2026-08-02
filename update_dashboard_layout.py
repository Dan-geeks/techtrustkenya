import re

filepath = r"C:\Users\Administrator\techtrustkenya\src\pages\admin\AdminDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the title and navigation section
old_nav_block = """      {/* Admin Sub-navigation */}
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
          </div>"""

# Ensure exact whitespace match by regex
import re
pattern = re.compile(r"\{\/\* Admin Sub-navigation \*\/\}.*?<p className=\"text-slate-500 mt-2\">Manage the TechTrust \{activeTab\} operations\.<\/p>\s*<\/div>", re.DOTALL)

new_nav_block = """{/* Header Section */}
      <div className="pt-28 pb-6 px-6 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm">Platform oversight and moderation</p>
      </div>

      {/* Admin Sub-navigation (Pills) */}
      <div className="max-w-7xl mx-auto px-6 mb-8 overflow-x-auto">
        <nav className="inline-flex bg-slate-100 p-1 rounded-lg gap-1">
          <button onClick={() => setActiveTab("overview")} className={`transition-all text-sm font-medium px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Overview
          </button>
          <button onClick={() => setActiveTab("verifications")} className={`transition-all text-sm font-medium px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'verifications' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Vendors
          </button>
          <button onClick={() => setActiveTab("disputes")} className={`transition-all text-sm font-medium px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'disputes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Disputes
          </button>
          <button onClick={() => setActiveTab("users")} className={`transition-all text-sm font-medium px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Users
          </button>
          <button onClick={() => setActiveTab("escrow")} className={`transition-all text-sm font-medium px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'escrow' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Escrow
          </button>
          <button onClick={() => setActiveTab("settings")} className={`transition-all text-sm font-medium px-4 py-2 rounded-md whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="px-6 max-w-7xl mx-auto w-full flex-1 space-y-8">"""

if pattern.search(content):
    content = pattern.sub(new_nav_block, content)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated navigation and header!")
else:
    print("Pattern not found!")
