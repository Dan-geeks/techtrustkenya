import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Store, Shield, CheckCircle, Package, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

const Orders = () => {
  useEffect(() => {
    document.title = "Order History - TechTrust Kenya";
  }, []);

  return (
    <div className="bg-background min-h-screen">
      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-5xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Order History</h1>
            <p className="text-muted-foreground text-lg">Track and manage your secured electronics purchases.</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filter
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                className="bg-background border border-input rounded-md pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full md:w-64 transition-colors" 
                placeholder="Search orders..." 
                type="text"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Order Card 1: Funds Held */}
          <div className="bg-card rounded-xl shadow-sm hover:shadow-md border border-border transition-all duration-200 p-6 group">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground uppercase tracking-wider">#ORD-2024-892A</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                  <span className="text-sm text-muted-foreground">Oct 24, 2024</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">Nairobi Tech Hub</span>
                  <span className="bg-green-500 text-white rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-medium">
                    <Shield className="h-3 w-3" /> Verified
                  </span>
                </div>
              </div>

              <div className="flex-grow">
                <div className="flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-md bg-secondary flex-shrink-0 overflow-hidden border border-border">
                    <img alt="MacBook Pro" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">MacBook Pro 16" M3 Max</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">Space Black, 36GB RAM, 1TB SSD. Condition: Brand New.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:items-end gap-2 min-w-[150px]">
                <span className="font-semibold text-foreground">KES 450,000</span>
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="text-xs font-semibold">Funds in Escrow</span>
                </div>
              </div>

              <div className="flex flex-row lg:flex-col gap-2 min-w-[140px] mt-2 lg:mt-0">
                <Button className="flex-1 flex items-center justify-center gap-2">
                  <Package className="h-4 w-4" /> Track
                </Button>
                <Button variant="secondary" className="flex-1 flex items-center justify-center gap-2">
                  Dispute
                </Button>
              </div>
            </div>
          </div>

          {/* Order Card 2: Released */}
          <div className="bg-card rounded-xl shadow-sm hover:shadow-md border border-border transition-all duration-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground uppercase tracking-wider">#ORD-2024-710B</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                  <span className="text-sm text-muted-foreground">Oct 15, 2024</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">ElectroWorld KE</span>
                </div>
              </div>

              <div className="flex-grow">
                <div className="flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-md bg-secondary flex-shrink-0 overflow-hidden border border-border">
                    <img alt="iPhone 15 Pro Max" className="w-full h-full object-cover grayscale opacity-80" src="https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=800" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">iPhone 15 Pro Max</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">Natural Titanium, 256GB. Condition: Refurbished.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:items-end gap-2 min-w-[150px]">
                <span className="font-semibold text-foreground">KES 185,000</span>
                <div className="flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-semibold">Funds Released</span>
                </div>
              </div>

              <div className="flex flex-row lg:flex-col gap-2 min-w-[140px] mt-2 lg:mt-0">
                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2">
                  <Receipt className="h-4 w-4" /> Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Orders;
