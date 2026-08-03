import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShieldCheck, MessageCircle, Lock, Verified, Star, CheckCircle, MapPin, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SAMPLE_PRODUCTS } from "@/data/products";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isVendorVerified } from "@/lib/format";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState("");
  
  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      // Check Supabase first
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          vendor_profiles ( business_name, verification_status, user_id )
        `)
        .eq("id", id)
        .maybeSingle();

      if (data) {
        setProduct({
          id: data.id,
          title: data.brand + " " + data.model_name,
          price: data.price_ksh,
          // Was price_ksh * 1.2, which made EVERY product look 20% off even
          // when nothing was discounted. Only a real vendor-set value counts.
          originalPrice:
            data.original_price_ksh && data.original_price_ksh > data.price_ksh
              ? data.original_price_ksh
              : null,
          category: data.category,
          condition: data.condition,
          vendor: data.vendor_profiles?.business_name || "Unknown Vendor",
          vendor_id: data.vendor_id,
          // messages.receiver_id -> profiles(id), so chat must target the
          // vendor's OWNER account, not the vendor_profiles row id.
          vendorUserId: data.vendor_profiles?.user_id ?? null,
          vendorVerified: isVendorVerified(data.vendor_profiles?.verification_status),
          location: "Nairobi", // Default or fetch if location exists
          gallery: data.image_urls || [data.image_urls?.[0] || "/placeholder.svg"],
          // Only rows the vendor actually filled in. Previously this table
          // read columns that did not exist, so every line rendered "N/A".
          specs: (() => {
            const sp = (data.specifications ?? {}) as Record<string, string>;
            const rows: Record<string, string> = {};
            if (sp.processor) rows.Processor = sp.processor;
            if (sp.ram) rows.Memory = sp.ram;
            if (sp.storage) rows.Storage = sp.storage;
            if (sp.display) rows.Display = sp.display;
            if (data.condition_notes) rows["Condition Notes"] = data.condition_notes;
            if (data.serial_number) rows["Device ID"] = data.serial_number;
            // Always-known facts, so the panel is never empty.
            if (data.brand) rows.Brand = data.brand;
            if (data.condition) {
              rows.Condition = data.condition.charAt(0).toUpperCase() + data.condition.slice(1);
            }
            if (data.year_of_manufacture) rows.Year = String(data.year_of_manufacture);
            if (data.warranty_status && data.warranty_duration_months) {
              rows.Warranty = `${data.warranty_duration_months} months`;
            }
            return rows;
          })(),
        });
        setActiveImage(data.image_urls?.[0] || "/placeholder.svg");
      } else {
        // Fallback to SAMPLE_PRODUCTS
        const sp = SAMPLE_PRODUCTS.find(p => p.id === id) || SAMPLE_PRODUCTS[5];
        setProduct(sp);
        const gallery = (sp as any).gallery || [sp.image];
        setActiveImage(gallery[0]);
      }
      setLoading(false);
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      document.title = `${product.title} | TechTrust`;
      window.scrollTo(0, 0);
    }
  }, [product]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return <div>Product not found</div>;
  }
  
  const gallery = product.gallery || [product.image];

  return (
    <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden aspect-video relative border border-border group">
            <img 
              src={activeImage} 
              alt="MacBook Pro" 
              className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500" 
            />
          </div>
          
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3 md:gap-4">
              {gallery.map((img: string, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`bg-white rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                    activeImage === img ? 'border-primary ring-2 ring-primary/20' : 'border-border opacity-70 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className={`w-full h-full object-cover ${idx > 0 && product.category === 'Laptops' ? 'mix-blend-multiply' : ''}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info & Actions */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Header & Price */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Protected by Float
              </span>
              <span className="text-slate-600 bg-slate-100 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200">
                {product.condition || "Refurbished - Excellent"}
              </span>
            </div>
            
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-3">{product.title}</h1>
            
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-slate-900 tracking-tight text-price font-data-price">KES {product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-lg text-slate-400 line-through mb-1 font-medium">KES {product.originalPrice?.toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Float Protection Card */}
          <div className="bg-[#EEF2FF] rounded-2xl p-6 border border-[#B1C5FF] shadow-sm flex flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-blue-900 text-lg">Financial-Grade Escrow</h3>
            </div>
            <p className="text-sm text-blue-800/80 leading-relaxed relative z-10">
              Your funds are held securely in a regulated escrow account. You have a 48-hour window upon delivery to verify the device condition before funds are released to the vendor.
            </p>
            <div className="flex items-center gap-2 relative z-10">
              <span className="w-full h-1.5 bg-blue-600 rounded-full"></span>
              <span className="w-full h-1.5 bg-blue-600/20 rounded-full"></span>
              <span className="w-full h-1.5 bg-blue-600/20 rounded-full"></span>
            </div>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider relative z-10">Step 1: Secure Funds</span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
              className="w-full text-base h-14 bg-primary hover:bg-primary-deep shadow-md font-bold gap-2"
              onClick={() => navigate(`/checkout?product=${product.id}`)}
            >
              <Lock className="w-5 h-5" />
              Buy Now with Float
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" variant="outline" className="w-full text-base h-14 border-2 font-bold gap-2 text-slate-700 hover:text-slate-900 cursor-pointer">
                  <MessageCircle className="w-5 h-5" />
                  Message Vendor
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuItem 
                  className="cursor-pointer flex items-center gap-2 py-3"
                  onClick={() => {
                    if (!product.vendorUserId) {
                      toast.error("This vendor has no contactable account yet.");
                      return;
                    }
                    window.dispatchEvent(new CustomEvent("open-chat", {
                      detail: { partnerId: product.vendorUserId, partnerName: product.vendor }
                    }));
                  }}
                >
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  <span>In-App Chat</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a href={`https://wa.me/254700000000?text=${encodeURIComponent(`Hi, I am interested in the ${product.title} (KES ${product.price})`)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-3 w-full">
                    <Phone className="w-4 h-4 text-green-500" />
                    <span>WhatsApp</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Seller Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start gap-4 mt-2">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-xl object-cover border border-slate-100 bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl uppercase">
                {product.vendor.substring(0, 1)}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-900 truncate">{product.vendor}</h4>
                <span className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  4.9 <span className="text-slate-400 font-normal">(128)</span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                {product.vendorVerified && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-md">
                    <Verified className="w-3.5 h-3.5" />
                    Physically Verified
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {product.location}, Kenya
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Table — driven by whatever the vendor actually filled
          in, so blank fields disappear instead of rendering "N/A". */}
      {Object.keys(product.specs ?? {}).length > 0 && (
        <div className="mt-16 max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Technical Specifications</h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-200">
                {Object.entries(product.specs as Record<string, string>).map(([label, value]) => (
                  <tr key={label} className="hover:bg-slate-50 transition-colors">
                    <th className="py-4 px-6 text-sm font-semibold text-slate-700 bg-slate-50/50 w-1/3 border-r border-slate-200">
                      {label}
                    </th>
                    <td
                      className={
                        label === "Device ID"
                          ? "py-4 px-6 text-sm font-mono font-medium text-slate-500 tracking-wider"
                          : "py-4 px-6 text-sm text-slate-600 leading-relaxed"
                      }
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProductDetail;
