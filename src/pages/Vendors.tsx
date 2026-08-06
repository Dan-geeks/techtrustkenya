import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Search, MapPin, Store, Star, ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ITEMS_PER_PAGE = 6;
const LOCATIONS = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Kiambu"];

const Vendors = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("vendor_profiles")
        .select("*")
        .order("average_rating", { ascending: false });

      if (data) {
        setDbVendors(data);
      }
      setIsLoading(false);
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    
    const ensureStylesheet = (href: string) => {
      const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
        (link) => link.getAttribute("href") === href
      );
      if (exists) return;
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      document.head.appendChild(el);
    };
    ensureStylesheet("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLocations]);

  const handleLocationToggle = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const handleClearAll = () => {
    setSelectedLocations([]);
    setSearchQuery("");
  };

  const filteredVendors = useMemo(() => {
    return dbVendors.filter((v) => {
      const matchesSearch = v.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const matchesLocation = selectedLocations.length === 0 || (v.city && selectedLocations.some(l => v.city.includes(l)));
      return matchesSearch && matchesLocation;
    });
  }, [dbVendors, searchQuery, selectedLocations]);

  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[#faf8ff] pb-24 pt-32">
      {/* Header section */}
      <div className="bg-[#0F3D8C] text-white py-12 md:py-16 mb-8 mt-[-120px] pt-[150px]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center">
          <h1 className="text-3xl md:text-5xl font-bold font-display-h2 tracking-tight mb-4">
            Verified Vendors
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Discover trusted electronics sellers in Kenya. Every vendor is verified for your protection.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-8 items-start">
        {/* Mobile Filter Toggle */}
        <button 
          className="md:hidden w-full flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
        >
          <span className="font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" /> Filters
          </span>
          {mobileFilterOpen ? <ChevronLeft className="w-5 h-5 rotate-90" /> : <ChevronRight className="w-5 h-5 rotate-90" />}
        </button>

        {/* Filters Sidebar */}
        <div className={`w-full md:w-[280px] shrink-0 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-8 h-fit sticky top-24 shadow-sm ${mobileFilterOpen ? 'block' : 'hidden md:flex'}`}>
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h2 className="font-bold text-lg text-[#0F172A]">Filters</h2>
            {(selectedLocations.length > 0 || searchQuery) && (
              <button 
                onClick={handleClearAll}
                className="text-sm font-semibold text-[#0F3D8C] hover:text-[#0A2D6B]"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-sm text-[#0F172A] uppercase tracking-wider">Location</h3>
            <div className="flex flex-col gap-3">
              {LOCATIONS.map((loc) => (
                <label key={loc} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedLocations.includes(loc) ? 'bg-[#0F3D8C] border-[#0F3D8C]' : 'border-slate-300 group-hover:border-[#0F3D8C]'}`}>
                    {selectedLocations.includes(loc) && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedLocations.includes(loc)}
                    onChange={() => handleLocationToggle(loc)}
                  />
                  <span className="text-sm text-slate-700 font-medium">{loc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search vendors..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D8C]/20 transition-all font-medium"
              />
            </div>
            <div className="text-sm font-medium text-slate-500 whitespace-nowrap">
              Showing <span className="text-[#0F172A] font-bold">{filteredVendors.length}</span> vendors
            </div>
          </div>

          {/* Vendors Grid */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              Loading vendors...
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A]">No vendors found</h3>
              <p className="text-sm text-[#64748B] max-w-md mx-auto">
                We couldn't find any vendors matching your filter criteria. Try clearing some filters or searching for something else.
              </p>
              <button
                onClick={handleClearAll}
                className="px-6 py-2.5 bg-[#0F3D8C] text-white rounded-xl font-bold text-sm hover:bg-[#0A2D6B] transition-all inline-block"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  onClick={() => navigate(`/shop/${vendor.id}`)}
                  className="group bg-white rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col overflow-hidden relative hover:shadow-md transition-all duration-300 cursor-pointer p-6"
                >
                  <div className="flex items-center gap-4 mb-6">
                    {vendor.shop_photo_urls && vendor.shop_photo_urls.length > 0 ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                        <img src={vendor.shop_photo_urls[0]} alt={vendor.business_name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[#0f3d8c] text-white flex items-center justify-center font-display-h2 text-[24px] font-bold shrink-0">
                        {vendor.business_name?.charAt(0) || "V"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-body-md-bold text-base md:text-lg text-[#131b2e] font-bold line-clamp-1">{vendor.business_name}</h3>
                        <span className="material-symbols-outlined text-[16px] text-[#25c65f]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          verified
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[#434651] font-ui-label text-sm">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        <span>{vendor.city || "Nairobi"}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Same rule as the home page: a stat only appears once it is
                      earned. The "4.8" was a hardcoded fallback. */}
                  <div className="flex items-center justify-between mb-4 min-h-[28px]">
                    {Number(vendor.average_rating) > 0 ? (
                      <div className="flex items-center gap-1.5 bg-[#fff8e6] px-2.5 py-1 rounded-md">
                        <Star className="w-3.5 h-3.5 text-[#f59e0b] fill-[#f59e0b]" />
                        <span className="font-bold text-[#b45309] text-sm">
                          {Number(vendor.average_rating).toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-[#94a3b8]">Not yet rated</span>
                    )}
                    {Number(vendor.total_completed_transactions) > 0 && (
                      <div className="text-sm font-medium text-[#434651]">
                        {vendor.total_completed_transactions}{" "}
                        {Number(vendor.total_completed_transactions) === 1 ? "sale" : "sales"}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-[#E2E8F0] flex flex-col gap-2">
                    <div className="flex items-center gap-1 text-[#10B981] font-mono text-xs font-semibold">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                      Protected by Float
                    </div>
                    <div className="flex gap-2 mt-2 w-full">
                      <Link
                        to={`/shop/${vendor.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-center py-2.5 bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-sm rounded-xl transition-all border border-[#E2E8F0] block shadow-sm"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dynamic Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Previous Page"
                className="p-2.5 rounded-lg border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                    currentPage === pageNum
                      ? "bg-[#0F3D8C] text-white shadow-sm"
                      : "hover:bg-slate-100 text-[#0F172A]"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next Page"
                className="p-2.5 rounded-lg border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Vendors;
