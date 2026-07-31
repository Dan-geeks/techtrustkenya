import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wrench, Star, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh } from "@/lib/format";
import { RepairRequestDialog } from "@/components/repairs/RepairRequestDialog";
import { AnimatedArt, art } from "@/components/marketing/AnimatedArt";

const Repairs = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<any | null>(null);

  useEffect(() => {
    document.title = "Repairs | TechTrust";
    (async () => {
      const { data } = await supabase
        .from("repair_services")
        .select("*, vendor:vendor_profiles!inner(id,user_id,business_name,city,average_rating,physical_address,verification_status)")
        .eq("is_active", true)
        .eq("vendor.verification_status", "approved");
      setServices(data ?? []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, { vendor: any; services: any[] }>();
    for (const s of services) {
      const key = s.vendor.id;
      if (!map.has(key)) map.set(key, { vendor: s.vendor, services: [] });
      map.get(key)!.services.push(s);
    }
    return Array.from(map.values());
  }, [services]);

  return (
    <div className="container py-10">
      <header className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Repair Services</h1>
          <p className="text-muted-foreground mt-2">Get your laptop or phone fixed by certified technicians. Pay only after the job is done.</p>
        </div>
        <AnimatedArt
          src={art.repairs}
          alt="Certified technicians repairing laptops and phones"
          eager
        />
      </header>

      {loading ? (
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="mt-12 text-center py-20">
          <p className="text-lg font-medium">No repair services available yet</p>
          <p className="text-sm text-muted-foreground mt-2">Check back soon as more vendors join.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {grouped.map(({ vendor, services }) => (
            <section key={vendor.id}>
              <div className="flex items-center gap-2 mb-3">
                <Link to={`/shop/${vendor.id}`} className="text-lg font-semibold hover:text-accent">
                  {vendor.business_name}
                </Link>
                {(vendor.verification_status === "verified" || vendor.verification_status === "approved") && (
                  <ShieldCheck className="h-4 w-4 text-success" />
                )}
                {vendor.city && <Badge variant="outline">{vendor.city}</Badge>}
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground ml-auto">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {Number(vendor.average_rating).toFixed(1)}
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s) => (
                  <div key={s.id} className="p-5 bg-card border border-border rounded-xl hover:border-accent/40 transition-colors flex flex-col">
                    <div className="flex items-start gap-3">
                      <Wrench className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{s.service_name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{s.device_type}</p>
                      </div>
                    </div>
                    {s.description && (
                      <p className="text-sm text-muted-foreground mt-3 flex-1">{s.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {s.estimated_turnaround_days} day{s.estimated_turnaround_days !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">From</div>
                        <div className="font-bold text-primary">{formatKsh(s.price_min_ksh)}</div>
                      </div>
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => {
                          setActive(s);
                          setOpen(true);
                        }}
                      >
                        Request Repair
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <RepairRequestDialog open={open} onOpenChange={setOpen} service={active} />
    </div>
  );
};

export default Repairs;
