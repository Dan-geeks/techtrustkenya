import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Tune, X, Shield, Verified, ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

interface Product {
  id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  image: string;
  vendor: string;
  vendorVerified: boolean;
  location: string;
  badge?: string;
}
import { SAMPLE_PRODUCTS } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Laptops", "Smartphones", "Tablets", "Components & Accessories", "Cameras", "Wearables"];
const CONDITIONS = ["Brand New", "Refurbished - Grade A", "Used - Good"];

const ITEMS_PER_PAGE = 6;

const Browse = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("All Locations");
  const [sortBy, setSortBy] = useState<string>("Recommended");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dbProducts, setDbProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select(`
          id,
          brand,
          model_name,
          category,
          condition,
          price_ksh,
          image_urls,
          vendor_profiles ( business_name, verification_status )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data) {
        setDbProducts(data);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    document.title = "Browse Verified Marketplace | TechTrust Kenya";

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedConditions, minPrice, maxPrice, selectedLocation, sortBy]);

  const handleCategoryToggle = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleConditionToggle = (cond: string) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const handleRemoveCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleRemoveCondition = (cond: string) => {
    setSelectedConditions((prev) => prev.filter((c) => c !== cond));
  };

  const handleClearAll = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSearchQuery("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedLocation("All Locations");
    setSearchParams({});
    setCurrentPage(1);
  };

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    const mappedDb = dbProducts.map((p) => {
      // Map category
      let cat = "Laptops";
      if (p.category === "smartphone") cat = "Smartphones";
      else if (p.category === "accessory" || p.category === "spare_part") cat = "Components & Accessories";
      
      // Map condition
      let cond = "Brand New";
      if (p.condition === "refurbished") cond = "Refurbished - Grade A";
      else if (p.condition === "used") cond = "Used - Good";

      return {
        id: p.id,
        title: `${p.brand} ${p.model_name}`,
        category: cat,
        condition: cond,
        price: p.price_ksh,
        image: p.image_urls?.[0] || "/placeholder.svg",
        vendor: p.vendor_profiles?.business_name || "Unknown Vendor",
        vendorVerified: p.vendor_profiles?.verification_status === "verified",
        location: "Nairobi",
      };
    });

    let result = [...mappedDb, ...SAMPLE_PRODUCTS];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.vendor.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }

    if (selectedConditions.length > 0) {
      result = result.filter((p) => selectedConditions.includes(p.condition));
    }

    if (selectedLocation !== "All Locations") {
      result = result.filter((p) => p.location.toLowerCase() === selectedLocation.toLowerCase());
    }

    if (minPrice) {
      const min = Number(minPrice);
      if (!isNaN(min)) result = result.filter((p) => p.price >= min);
    }

    if (maxPrice) {
      const max = Number(maxPrice);
      if (!isNaN(max)) result = result.filter((p) => p.price <= max);
    }

    if (sortBy === "Price: Low to High") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "Price: High to Low") {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [searchQuery, selectedCategories, selectedConditions, selectedLocation, minPrice, maxPrice, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const activeChips = [
    ...selectedCategories.map((cat) => ({ type: "cat", label: cat })),
    ...selectedConditions.map((cond) => ({ type: "cond", label: cond })),
  ];

  return (
    <div className="bg-background text-on-background antialiased min-h-screen">
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 md:px-12 py-8 md:py-10 flex flex-col md:flex-row gap-8 md:gap-10">
        {/* Filter Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-6">
          {/* Mobile Search & Filter Toggle */}
          <div className="md:hidden flex flex-col gap-4 mb-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-sm focus:border-[#0F3D8C]"
                placeholder="Search electronics..."
                type="text"
              />
            </div>
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="flex items-center justify-center gap-2 bg-[#EEF2FF] text-[#0F3D8C] py-2.5 rounded-xl border border-[#0F3D8C]/20 font-bold text-sm"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters ({activeChips.length})
            </button>
          </div>

          {/* Desktop & Mobile Responsive Filters Container */}
          <div
            className={`${
              mobileFilterOpen ? "flex" : "hidden md:flex"
            } flex-col gap-8 sticky top-24 bg-white md:bg-transparent p-6 md:p-0 rounded-2xl md:rounded-none border md:border-none border-slate-200 shadow-lg md:shadow-none z-30`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="font-display-h2 text-lg text-[#0F172A] font-bold">Filters</h2>
              {activeChips.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-[#0F3D8C] hover:underline font-bold"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-3">
              <h3 className="font-ui-label text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                Category
              </h3>
              <div className="flex flex-col gap-2.5">
                {[
                  { name: "Laptops", count: 124 },
                  { name: "Smartphones", count: 89 },
                  { name: "Tablets", count: 45 },
                  { name: "Components & Accessories", count: 210 },
                  { name: "Cameras", count: 12 },
                  { name: "Wearables", count: 34 },
                ].map((cat) => (
                  <label key={cat.name} className="flex items-center justify-between cursor-pointer select-none">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.name)}
                        onChange={() => handleCategoryToggle(cat.name)}
                        className="rounded border-[#CBD5E1] text-[#0F3D8C] focus:ring-[#0F3D8C] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm text-[#0F172A] font-medium">{cat.name}</span>
                    </div>
                    <span className="text-xs text-[#94A3B8] font-mono">{cat.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div className="flex flex-col gap-3">
              <h3 className="font-ui-label text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                Condition
              </h3>
              <div className="flex flex-col gap-2.5">
                {CONDITIONS.map((cond) => (
                  <label key={cond} className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedConditions.includes(cond)}
                      onChange={() => handleConditionToggle(cond)}
                      className="rounded border-[#CBD5E1] text-[#0F3D8C] focus:ring-[#0F3D8C] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-[#0F172A] font-medium">{cond}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="flex flex-col gap-3">
              <h3 className="font-ui-label text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                Price Range (KES)
              </h3>
              <div className="flex items-center gap-2">
                <input
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:border-[#0F3D8C]"
                  placeholder="Min"
                  type="number"
                />
                <span className="text-[#94A3B8]">-</span>
                <input
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:border-[#0F3D8C]"
                  placeholder="Max"
                  type="number"
                />
              </div>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-3">
              <h3 className="font-ui-label text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                Location
              </h3>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full appearance-none bg-white border border-[#CBD5E1] rounded-lg py-2.5 px-3 text-sm focus:border-[#0F3D8C] cursor-pointer"
              >
                <option>All Locations</option>
                <option>Nairobi</option>
                <option>Mombasa</option>
                <option>Kisumu</option>
                <option>Nakuru</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main Product Grid Area */}
        <div className="flex-grow flex flex-col gap-6">
          {/* Page Header & Active Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="font-display-h2 text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
                  Browse Verified Marketplace
                </h1>
                <p className="text-xs md:text-sm text-[#64748B]">
                  Every purchase is protected by Float escrow until delivery confirmation.
                </p>
              </div>

              {/* Desktop Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-xl text-sm focus:border-[#0F3D8C] outline-none shadow-sm"
                  placeholder="Search marketplace..."
                  type="text"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 border-t border-[#E2E8F0]">
              {/* Active Filter Chips */}
              <div className="flex flex-wrap gap-2 items-center">
                {activeChips.map((chip) => (
                  <div
                    key={`${chip.type}-${chip.label}`}
                    onClick={() =>
                      chip.type === "cat"
                        ? handleRemoveCategory(chip.label)
                        : handleRemoveCondition(chip.label)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF2FF] rounded-full text-xs font-semibold text-[#0F3D8C] border border-[#0F3D8C]/20 shadow-sm cursor-pointer hover:bg-[#E0E7FF] transition-colors"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        chip.type === "cat"
                          ? handleRemoveCategory(chip.label)
                          : handleRemoveCondition(chip.label);
                      }}
                      aria-label={`Remove filter ${chip.label}`}
                      className="p-0.5 rounded-full hover:bg-[#0F3D8C]/20 hover:text-[#0F3D8C] transition-colors focus:outline-none flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {activeChips.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-[#0F3D8C] hover:underline font-bold ml-1"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-[#64748B] font-semibold">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F3D8C] font-bold focus:border-[#0F3D8C] cursor-pointer outline-none"
                >
                  <option>Recommended</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Newest Arrivals</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A]">No products found</h3>
              <p className="text-sm text-[#64748B] max-w-md mx-auto">
                We couldn't find any products matching your filter criteria. Try clearing some filters or searching for something else.
              </p>
              <button
                onClick={handleClearAll}
                className="px-6 py-2.5 bg-[#0F3D8C] text-white rounded-xl font-bold text-sm hover:bg-[#0A2D6B] transition-all inline-block"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col overflow-hidden relative hover:shadow-md transition-all duration-300"
                >
                  <div className="h-[200px] w-full bg-[#f2f3ff]/60 relative overflow-hidden flex items-center justify-center px-8 py-4 rounded-t-xl">
                    <img
                      alt={product.title}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      src={product.image}
                    />
                    {product.badge && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <span className="px-2 py-0.5 bg-white/90 backdrop-blur text-[#0F3D8C] font-mono text-xs font-bold rounded shadow-sm border border-[#E2E8F0]">
                          {product.badge}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-3 flex-grow">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#64748B] font-medium">{product.vendor}</span>
                      <span
                        className="material-symbols-outlined text-[#10B981] text-[14px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-[#0F172A] line-clamp-2">
                      {product.title}
                    </h3>
                    <div className="mt-auto pt-4 border-t border-[#E2E8F0] flex flex-col gap-2">
                      <div className="font-mono text-xl font-bold text-[#0F172A] text-price font-data-price">
                        KES {product.price.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1 text-[#10B981] font-mono text-xs font-semibold">
                        <span
                          className="material-symbols-outlined text-[14px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          shield
                        </span>
                        Protected by Float
                      </div>
                      <div className="flex gap-2 mt-2 w-full">
                        <Link
                          to={`/product/${product.id}`}
                          className="flex-1 text-center py-2.5 bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-sm rounded-xl transition-all border border-[#E2E8F0] block shadow-sm"
                        >
                          View Description
                        </Link>
                        <Link
                          to={`/checkout?product=${product.id}`}
                          className="flex-1 text-center py-2.5 bg-[#EEF2FF] hover:bg-[#0F3D8C] hover:text-white text-[#0F3D8C] font-bold text-sm rounded-xl transition-all border border-[#0F3D8C]/20 block"
                        >
                          Buy with Float
                        </Link>
                      </div>
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
      </main>
    </div>
  );
};

export default Browse;
