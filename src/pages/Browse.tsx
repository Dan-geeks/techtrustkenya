import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SlidersHorizontal, X, Package, Star } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { KENYA_COUNTIES } from "@/lib/kenyaCounties";

const CATEGORIES = ["laptop", "smartphone", "accessory", "spare_part"] as const;
const CONDITIONS = ["new", "refurbished", "used"] as const;
const SORTS = [
  { value: "boost_new", label: "Featured" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];
const PER_PAGE = 24;

const DEFAULT_PRICE: [number, number] = [500, 200000];

const SkeletonCard = () => (
  <div className="rounded-xl overflow-hidden border border-border bg-card">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  </div>
);

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <Badge
    variant="secondary"
    className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
    onClick={onRemove}
  >
    {label}
    <X className="h-3 w-3" />
  </Badge>
);

const Browse = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState(initialQuery);
  const [categories, setCategories] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("boost_new");
  const [county, setCounty] = useState<string>("all");

  useEffect(() => {
    document.title = "Browse Products — TechTrust";
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    (async () => {
      let q = supabase
        .from("products")
        .select("*, vendor:vendor_profiles!inner(id,business_name,city,county,sub_county,average_rating,verification_status)")
        .eq("is_active", true)
        .gt("quantity_in_stock", 0)
        .in("vendor.verification_status", ["verified", "approved"]);

      if (categories.length) q = q.in("category", categories as any);
      if (conditions.length) q = q.in("condition", conditions as any);
      if (selectedBrands.length) q = q.in("brand", selectedBrands);
      q = q.gte("price_ksh", priceRange[0]).lte("price_ksh", priceRange[1]);
      if (search.trim()) q = q.or(`brand.ilike.%${search}%,model_name.ilike.%${search}%,description.ilike.%${search}%`);

      switch (sort) {
        case "price_asc": q = q.order("price_ksh", { ascending: true }); break;
        case "price_desc": q = q.order("price_ksh", { ascending: false }); break;
        case "newest": q = q.order("created_at", { ascending: false }); break;
        case "rating": q = q.order("average_rating", { ascending: false }); break;
        default:
          q = q.order("is_boosted", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data } = await q;
      let result = data ?? [];
      if (minRating > 0) {
        result = result.filter((p: any) => Number(p.vendor?.average_rating ?? 0) >= minRating);
      }
      if (county !== "all") {
        result = result.filter((p: any) => (p.vendor?.county ?? p.vendor?.city) === county);
      }
      setProducts(result);

      const allBrands = Array.from(new Set((data ?? []).map((p: any) => p.brand))).sort() as string[];
      if (brands.length === 0) setBrands(allBrands);
      setLoading(false);
    })();
  }, [categories, conditions, selectedBrands, priceRange, search, sort, minRating, county]);

  const paginated = useMemo(() => products.slice((page - 1) * PER_PAGE, page * PER_PAGE), [products, page]);
  const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const clearAll = () => {
    setCategories([]); setConditions([]); setSelectedBrands([]);
    setPriceRange(DEFAULT_PRICE); setMinRating(0); setSearch(""); setCounty("all");
  };

  const activeChips: { label: string; remove: () => void }[] = [
    ...categories.map((c) => ({ label: c.replace("_", " "), remove: () => toggle(categories, setCategories, c) })),
    ...conditions.map((c) => ({ label: c, remove: () => toggle(conditions, setConditions, c) })),
    ...selectedBrands.map((b) => ({ label: b, remove: () => toggle(selectedBrands, setSelectedBrands, b) })),
    ...(county !== "all" ? [{ label: county, remove: () => setCounty("all") }] : []),
    ...(minRating > 0 ? [{ label: `${minRating}+ stars`, remove: () => setMinRating(0) }] : []),
    ...(priceRange[0] !== DEFAULT_PRICE[0] || priceRange[1] !== DEFAULT_PRICE[1]
      ? [{ label: `KSH ${priceRange[0].toLocaleString()}–${priceRange[1].toLocaleString()}`, remove: () => setPriceRange(DEFAULT_PRICE) }]
      : []),
  ];

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Search</Label>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Brand, model…" className="text-sm" />
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Category</Label>
        <div className="space-y-2">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox checked={categories.includes(c)} onCheckedChange={() => toggle(categories, setCategories, c)} />
              <span className="capitalize">{c.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Condition</Label>
        <div className="space-y-2">
          {CONDITIONS.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox checked={conditions.includes(c)} onCheckedChange={() => toggle(conditions, setConditions, c)} />
              <span className="capitalize">{c}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Price Range (KSH)</Label>
        <div className="flex gap-2 mb-3">
          <Input
            type="number"
            min={500}
            max={priceRange[1]}
            value={priceRange[0]}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="text-xs h-8"
            placeholder="Min"
          />
          <Input
            type="number"
            min={priceRange[0]}
            max={200000}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="text-xs h-8"
            placeholder="Max"
          />
        </div>
        <Slider
          min={500}
          max={200000}
          step={500}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
        />
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Min Rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMinRating(minRating === r ? 0 : r)}
              className="focus:outline-none"
              title={`${r} star${r > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-5 w-5 transition-colors ${r <= minRating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
              />
            </button>
          ))}
          {minRating > 0 && (
            <button type="button" onClick={() => setMinRating(0)} className="ml-1 text-xs text-muted-foreground underline">
              clear
            </button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">County</Label>
        <Select value={county} onValueChange={setCounty}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All counties</SelectItem>
            {KENYA_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {brands.length > 0 && (
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Brand</Label>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {brands.map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox checked={selectedBrands.includes(b)} onCheckedChange={() => toggle(selectedBrands, setSelectedBrands, b)} />
                <span className="truncate">{b}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={clearAll}>
        <X className="h-3.5 w-3.5" />
        Clear all filters
      </Button>
    </div>
  );

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Browse Products</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {products.length} {products.length === 1 ? "product" : "products"} found
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeChips.length > 0 && (
                  <Badge className="ml-0.5 h-4 w-4 p-0 text-[10px] grid place-items-center rounded-full">
                    {activeChips.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">{FilterPanel}</div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeChips.map((chip) => (
            <FilterChip key={chip.label} label={chip.label} onRemove={chip.remove} />
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors self-center"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-4">
            {FilterPanel}
          </div>
        </aside>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Package className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h2 className="text-lg font-semibold mb-1">No products found</h2>
              <p className="text-sm text-muted-foreground max-w-xs mb-5">
                No products match your current filters. Try adjusting your search or clearing the filters.
              </p>
              <Button variant="outline" onClick={clearAll} className="gap-1.5">
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginated.map((p) => <ProductCard key={p.id} {...p} />)}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Browse;
