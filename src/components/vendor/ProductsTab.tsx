import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Package, Upload, X, ArrowUp, ArrowDown } from "lucide-react";

interface Props {
  vendor: any;
}

const MAX_IMAGES = 5;
const MAX_DESC = 500;

const empty = {
  category: "laptop" as "laptop" | "smartphone" | "accessory" | "spare_part",
  brand: "",
  model_name: "",
  year_of_manufacture: "",
  condition: "new" as "new" | "refurbished" | "used",
  price_ksh: "",
  quantity_in_stock: "1",
  warranty_status: false,
  warranty_duration_months: "",
  description: "",
  image_urls: [] as string[],
};

export const ProductsTab = ({ vendor }: Props) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [priceError, setPriceError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [vendor.id]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setPriceError("");
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      category: p.category,
      brand: p.brand,
      model_name: p.model_name,
      year_of_manufacture: p.year_of_manufacture?.toString() ?? "",
      condition: p.condition,
      price_ksh: p.price_ksh.toString(),
      quantity_in_stock: p.quantity_in_stock.toString(),
      warranty_status: p.warranty_status,
      warranty_duration_months: p.warranty_duration_months?.toString() ?? "",
      description: p.description ?? "",
      image_urls: p.image_urls ?? [],
    });
    setPriceError("");
    setOpen(true);
  };

  const handleFiles = async (files: File[]) => {
    const allowed = files.filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    const slots = MAX_IMAGES - form.image_urls.length;
    const toUpload = allowed.slice(0, slots);
    if (toUpload.length === 0) return;

    const startIdx = form.image_urls.length;
    const placeholders = toUpload.map((_, i) => `__uploading__${startIdx + i}`);
    setForm((p) => ({ ...p, image_urls: [...p.image_urls, ...placeholders] }));

    const results: string[] = [];
    for (let i = 0; i < toUpload.length; i++) {
      const f = toUpload[i];
      const path = `${vendor.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("product-images").upload(path, f);
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        results.push("");
      } else {
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        results.push(data.publicUrl);
      }
    }

    setForm((p) => {
      const urls = [...p.image_urls];
      for (let i = 0; i < results.length; i++) {
        urls[startIdx + i] = results[i];
      }
      return { ...p, image_urls: urls.filter(Boolean) };
    });
  };

  const removeImage = (idx: number) =>
    setForm((p) => ({ ...p, image_urls: p.image_urls.filter((_, i) => i !== idx) }));

  const moveImage = (idx: number, dir: -1 | 1) => {
    setForm((p) => {
      const urls = [...p.image_urls];
      const target = idx + dir;
      if (target < 0 || target >= urls.length) return p;
      [urls[idx], urls[target]] = [urls[target], urls[idx]];
      return { ...p, image_urls: urls };
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const validatePrice = (val: string) => {
    if (!val) { setPriceError(""); return; }
    setPriceError(Number(val) < 500 ? "Price must be at least KSH 500" : "");
  };

  const save = async () => {
    if (!form.brand.trim() || !form.model_name.trim() || !form.price_ksh) {
      toast.error("Brand, model and price are required.");
      return;
    }
    if (Number(form.price_ksh) < 500) {
      toast.error("Price must be at least KSH 500.");
      return;
    }
    setSaving(true);
    const payload = {
      vendor_id: vendor.id,
      category: form.category,
      brand: form.brand.trim(),
      model_name: form.model_name.trim(),
      year_of_manufacture: form.year_of_manufacture ? Number(form.year_of_manufacture) : null,
      condition: form.condition,
      price_ksh: Number(form.price_ksh),
      quantity_in_stock: Number(form.quantity_in_stock || 0),
      warranty_status: form.warranty_status,
      warranty_duration_months:
        form.warranty_status && form.warranty_duration_months
          ? Number(form.warranty_duration_months)
          : null,
      description: form.description.trim() || null,
      image_urls: form.image_urls,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Product updated" : "Product added");
    setOpen(false);
    load();
  };

  const toggleActive = async (p: any) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success(p.is_active ? "Hidden from marketplace" : "Listed on marketplace");
      load();
    }
  };

  const remove = async (p: any) => {
    if (!confirm(`Delete ${p.brand} ${p.model_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Product deleted");
      load();
    }
  };

  const stockBadge = (qty: number) => {
    if (qty === 0) return <Badge variant="destructive">Out of stock</Badge>;
    if (qty <= 5) return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Low: <span className="text-stat">{qty}</span></Badge>;
    return <Badge variant="outline" className="bg-success/10 text-success border-success/30">In stock: <span className="text-stat">{qty}</span></Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Products</h2>
        <Button onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">No products yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first listing to start selling.
          </p>
          <Button onClick={openNew}>Add product</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={p.image_urls?.[0] ?? "/placeholder.svg"}
                  alt={p.model_name}
                  className="w-full h-40 object-cover bg-muted"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge className="bg-background/90 text-foreground border font-semibold">
                    <span className="text-price">{formatKsh(p.price_ksh)}</span>
                  </Badge>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {p.brand} {p.model_name}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {p.condition} · {p.category}
                    </div>
                  </div>
                  {stockBadge(p.quantity_in_stock)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={!!p.is_active}
                      onCheckedChange={() => toggleActive(p)}
                      className="scale-90"
                    />
                    <span className="text-xs text-muted-foreground">
                      {p.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(p)}
                      className="h-7 px-2"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remove(p)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v: any) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="smartphone">Smartphone</SelectItem>
                    <SelectItem value="accessory">Accessory</SelectItem>
                    <SelectItem value="spare_part">Spare part</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Condition</Label>
                <Select
                  value={form.condition}
                  onValueChange={(v: any) => setForm({ ...form, condition: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Brand *</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Model *</Label>
                <Input
                  value={form.model_name}
                  onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Year of manufacture</Label>
                <Input
                  type="number"
                  value={form.year_of_manufacture}
                  onChange={(e) =>
                    setForm({ ...form, year_of_manufacture: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Price (KSH) *</Label>
                <Input
                  type="number"
                  value={form.price_ksh}
                  className={priceError ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={(e) => {
                    setForm({ ...form, price_ksh: e.target.value });
                    validatePrice(e.target.value);
                  }}
                />
                {priceError && (
                  <p className="text-xs text-destructive">{priceError}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Quantity in stock</Label>
                <Input
                  type="number"
                  value={form.quantity_in_stock}
                  onChange={(e) =>
                    setForm({ ...form, quantity_in_stock: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Switch
                    checked={form.warranty_status}
                    onCheckedChange={(v) => setForm({ ...form, warranty_status: v })}
                  />
                  Warranty
                </Label>
                {form.warranty_status && (
                  <Input
                    type="number"
                    placeholder="Duration (months)"
                    value={form.warranty_duration_months}
                    onChange={(e) =>
                      setForm({ ...form, warranty_duration_months: e.target.value })
                    }
                  />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <span className="text-xs text-muted-foreground">
                  {form.description.length}/{MAX_DESC}
                </span>
              </div>
              <Textarea
                rows={3}
                maxLength={MAX_DESC}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Images</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer py-6 transition-colors",
                  dragOver ? "border-accent bg-accent/10" : "border-muted-foreground/30 hover:bg-muted/40",
                  form.image_urls.length >= MAX_IMAGES && "pointer-events-none opacity-50",
                )}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">Drag images here or click to browse</p>
                <p className="text-xs text-muted-foreground">
                  Max {MAX_IMAGES} images · JPG / PNG / WEBP
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
              />

              {form.image_urls.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                  {form.image_urls.map((u, idx) => {
                    const isUploading = u.startsWith("__uploading__");
                    return (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border aspect-square bg-muted">
                        {isUploading ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-accent" />
                          </div>
                        ) : (
                          <img
                            src={u}
                            alt={`Image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {idx === 0 && !isUploading && (
                          <span className="absolute bottom-1 left-1 bg-accent text-accent-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            Main
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>

                        <div className="absolute bottom-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => moveImage(idx, -1)}
                            disabled={idx === 0}
                            className="bg-background/80 rounded p-0.5 disabled:opacity-30"
                          >
                            <ArrowUp className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 1)}
                            disabled={idx === form.image_urls.length - 1}
                            className="bg-background/80 rounded p-0.5 disabled:opacity-30"
                          >
                            <ArrowDown className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
