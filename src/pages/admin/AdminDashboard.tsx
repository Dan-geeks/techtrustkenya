import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, formatDate } from "@/lib/format";
import { invokeFunction } from "@/lib/functions";
import { toast } from "sonner";
import {
  Loader2, Users, Store, AlertTriangle, Wallet, MapPin, Phone, Mail, Map,
  FileText, CheckCircle2, XCircle, ShieldCheck, Search,
  TrendingUp, ChevronLeft, ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const AdminDashboard = () => {
  useEffect(() => {
    document.title = "Admin Dashboard — TechTrust";
  }, []);

  return (
    <div className="container py-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform oversight and moderation</p>
      </header>
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6"><AdminOverview /></TabsContent>
        <TabsContent value="vendors" className="mt-6"><AdminVendors /></TabsContent>
        <TabsContent value="disputes" className="mt-6"><AdminDisputes /></TabsContent>
        <TabsContent value="users" className="mt-6"><AdminUsers /></TabsContent>
        <TabsContent value="payments" className="mt-6"><AdminPayments /></TabsContent>
      </Tabs>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

interface OverviewStats {
  users: number;
  vendors: number;
  gmv: number;
  revenue: number;
  pendingVendors: number;
  disputes: number;
}

const AdminOverview = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    (async () => {
      const [users, vendors, orders, pendingVendors, disputes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vendor_profiles").select("id", { count: "exact", head: true }).in("verification_status", ["approved", "verified"]),
        supabase.from("orders").select("total_amount_ksh, platform_fee_ksh, status"),
        supabase.from("vendor_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      ]);
      const ordersList = orders.data ?? [];
      const completed = ordersList.filter((o) => o.status === "confirmed");
      setStats({
        users: users.count ?? 0,
        vendors: vendors.count ?? 0,
        gmv: completed.reduce((s, o) => s + Number(o.total_amount_ksh), 0),
        revenue: completed.reduce((s, o) => s + Number(o.platform_fee_ksh), 0),
        pendingVendors: pendingVendors.count ?? 0,
        disputes: disputes.count ?? 0,
      });
    })();
  }, []);

  if (!stats) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        icon={Users}
        label="Total Users"
        value={stats.users.toString()}
        borderColor="border-l-blue-500"
        iconBg="bg-blue-100 text-blue-600"
      />
      <StatCard
        icon={Store}
        label="Active Vendors"
        value={stats.vendors.toString()}
        borderColor="border-l-green-500"
        iconBg="bg-green-100 text-green-600"
      />
      <StatCard
        icon={Store}
        label="Pending Approvals"
        value={stats.pendingVendors.toString()}
        borderColor="border-l-amber-500"
        iconBg="bg-amber-100 text-amber-600"
        pulse={stats.pendingVendors > 0}
      />
      <StatCard
        icon={Wallet}
        label="Lifetime GMV"
        value={formatKsh(stats.gmv)}
        borderColor="border-l-indigo-500"
        iconBg="bg-indigo-100 text-indigo-600"
      />
      <StatCard
        icon={Wallet}
        label="Platform Revenue (10%)"
        value={formatKsh(stats.revenue)}
        borderColor="border-l-green-500"
        iconBg="bg-green-100 text-green-600"
      />
      <StatCard
        icon={AlertTriangle}
        label="Open Disputes"
        value={stats.disputes.toString()}
        borderColor="border-l-red-500"
        iconBg="bg-red-100 text-red-600"
        pulse={stats.disputes > 0}
      />
    </div>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  borderColor: string;
  iconBg: string;
  pulse?: boolean;
}

const StatCard = ({ icon: Icon, label, value, borderColor, iconBg, pulse }: StatCardProps) => (
  <Card className={`p-5 border-l-4 ${borderColor}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1.5">
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
        )}
        <div className={`p-1.5 rounded-md ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
    <div className="flex items-end justify-between">
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <TrendingUp className="h-3 w-3" />
        <span>trend</span>
      </div>
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// Vendors tab
// ---------------------------------------------------------------------------

interface VendorProfile {
  id: string;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  physical_address: string | null;
  county: string | null;
  city: string | null;
  sub_county: string | null;
  gps_latitude: number | null;
  latitude: number | null;
  gps_longitude: number | null;
  longitude: number | null;
  google_maps_link: string | null;
  operating_hours: string | null;
  verification_status: string;
  subscription_tier: string | null;
  business_certificate_url: string | null;
  id_document_url: string | null;
  shop_photo_urls: string[] | null;
  rejection_reason: string | null;
  suspension_reason: string | null;
  user_id: string | null;
  created_at: string;
}

type VendorTab = "pending" | "approved" | "suspended" | "rejected" | "all";

const vendorStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200" },
  verified: { label: "Verified", className: "bg-green-100 text-green-700 border-green-200" },
  suspended: { label: "Suspended", className: "bg-orange-100 text-orange-700 border-orange-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
};

const VendorStatusBadge = ({ status }: { status: string }) => {
  const cfg = vendorStatusConfig[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`capitalize ${cfg.className}`}>{cfg.label}</Badge>;
};

const getInitials = (name: string | null) =>
  (name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const AdminVendors = () => {
  const [list, setList] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<VendorTab>("pending");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [active, setActive] = useState<VendorProfile | null>(null);
  const [reason, setReason] = useState("");
  const [reasonAction, setReasonAction] = useState<"reject" | "suspend" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const load = async () => {
    setLoading(true);
    let query = supabase.from("vendor_profiles").select("*").order("created_at", { ascending: false });
    if (tab !== "all") query = query.eq("verification_status", tab);
    const { data } = await query;
    setList((data ?? []) as VendorProfile[]);

    const { data: all } = await supabase.from("vendor_profiles").select("verification_status");
    const c: Record<string, number> = { pending: 0, approved: 0, suspended: 0, rejected: 0, all: all?.length ?? 0 };
    (all ?? []).forEach((r) => {
      const k = r.verification_status === "verified" ? "approved" : r.verification_status;
      if (k in c) c[k] += 1;
    });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const updateStatus = async (id: string, status: string, extra: Record<string, string | null> = {}) => {
    const { error } = await supabase.from("vendor_profiles").update({ verification_status: status, ...extra }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    const v = list.find((x) => x.id === id);
    if (v?.user_id) {
      await supabase.from("notifications").insert({
        user_id: v.user_id,
        title: status === "approved" ? "Vendor application approved" : status === "rejected" ? "Vendor application rejected" : "Vendor account suspended",
        message: status === "approved" ? "Your shop is now live on TechTrust." : (extra.rejection_reason || extra.suspension_reason || "Contact support."),
        type: "vendor_application",
        reference_id: id,
      });
      if (status === "approved") {
        try {
          await invokeFunction("notify-vendor-approved", {
            body: { vendorUserId: v.user_id, businessName: v.business_name },
          });
        } catch (e) {
          console.warn("notify-vendor-approved failed", e);
        }
      }
    }
    toast.success("Vendor updated");
    setActive(null);
    setReason("");
    setReasonAction(null);
    load();
  };

  const closeDialog = () => { setActive(null); setReasonAction(null); setReason(""); setAdminNote(""); };

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-accent/5 border-accent/20 text-sm">
        <div className="flex gap-2 items-start">
          <ShieldCheck className="h-4 w-4 text-accent mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Verification team workflow:</span> Review each pending vendor
            using their submitted details, shop photos, GPS coordinates and Google Maps link. Click{" "}
            <b>View</b> to inspect the full application, then <b>Approve</b> or <b>Reject</b>. Decisions
            take effect immediately and notify the vendor.
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as VendorTab)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="pending">Pending{counts.pending ? ` (${counts.pending})` : ""}</TabsTrigger>
          <TabsTrigger value="approved">Approved{counts.approved ? ` (${counts.approved})` : ""}</TabsTrigger>
          <TabsTrigger value="suspended">Suspended{counts.suspended ? ` (${counts.suspended})` : ""}</TabsTrigger>
          <TabsTrigger value="rejected">Rejected{counts.rejected ? ` (${counts.rejected})` : ""}</TabsTrigger>
          <TabsTrigger value="all">All{counts.all ? ` (${counts.all})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No vendors in this state.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((v) => (
            <Card key={v.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                  {getInitials(v.business_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{v.business_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {v.owner_name ?? "—"} · Applied {formatDate(v.created_at)}
                  </div>
                </div>
                <VendorStatusBadge status={v.verification_status} />
              </div>

              <div className="grid grid-cols-1 gap-1 text-xs">
                {v.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />{v.email}
                  </div>
                )}
                {v.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />{v.phone}
                  </div>
                )}
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="truncate">
                    {v.county ?? v.city ?? "—"}{v.sub_county ? `, ${v.sub_county}` : ""}{v.physical_address ? ` · ${v.physical_address}` : ""}
                  </span>
                </div>
                {v.google_maps_link && (
                  <a href={v.google_maps_link} target="_blank" rel="noreferrer" className="text-accent flex items-center gap-1 hover:underline">
                    <Map className="h-3 w-3" /> Open Google Maps
                  </a>
                )}
                {v.business_certificate_url && (
                  <a href={v.business_certificate_url} target="_blank" rel="noreferrer" className="text-accent flex items-center gap-1 hover:underline">
                    <FileText className="h-3 w-3" /> Business certificate
                  </a>
                )}
              </div>

              {(v.shop_photo_urls?.length ?? 0) > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {(v.shop_photo_urls ?? []).slice(0, 4).map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="" className="w-14 h-14 object-cover rounded border" />
                    </a>
                  ))}
                  {(v.shop_photo_urls?.length ?? 0) > 4 && (
                    <div className="w-14 h-14 grid place-items-center text-xs text-muted-foreground border rounded">
                      +{(v.shop_photo_urls?.length ?? 0) - 4}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {v.verification_status === "pending" && (
                  <>
                    <Button size="sm" className="gap-1.5" onClick={() => updateStatus(v.id, "approved", { rejection_reason: null })}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => { setActive(v); setReasonAction("reject"); }}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                {(v.verification_status === "approved" || v.verification_status === "verified") && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => { setActive(v); setReasonAction("suspend"); }}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Suspend
                  </Button>
                )}
                {v.verification_status === "suspended" && (
                  <Button size="sm" className="gap-1.5" onClick={() => updateStatus(v.id, "approved", { suspension_reason: null })}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reinstate
                  </Button>
                )}
                {v.verification_status === "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(v.id, "pending", { rejection_reason: null })}>
                    Re-open as pending
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setActive(v)}>View Details</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {getInitials(active.business_name)}
                  </div>
                  {active.business_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Contact</div>
                  <div className="space-y-1.5">
                    <Row k="Owner" v={active.owner_name} />
                    <Row k="Email" v={active.email} />
                    <Row k="Phone" v={active.phone} />
                    <Row k="Operating hours" v={active.operating_hours} />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Location</div>
                  <div className="space-y-1.5">
                    <Row k="Address" v={active.physical_address} />
                    <Row k="County" v={active.county ?? active.city} />
                    {active.sub_county && <Row k="Sub-county / Town" v={active.sub_county} />}
                    {(active.gps_latitude ?? active.latitude) != null && (active.gps_longitude ?? active.longitude) != null && (
                      <Row k="GPS coordinates" v={`${(active.gps_latitude ?? active.latitude)!.toFixed(6)}, ${(active.gps_longitude ?? active.longitude)!.toFixed(6)}`} />
                    )}
                    {active.google_maps_link && (
                      <Row k="Google Maps" v={<a href={active.google_maps_link} target="_blank" rel="noreferrer" className="text-accent underline">Open link</a>} />
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Documents</div>
                  <div className="space-y-1.5">
                    <Row k="Status" v={<VendorStatusBadge status={active.verification_status} />} />
                    <Row k="Subscription" v={<Badge variant="outline" className="capitalize">{active.subscription_tier}</Badge>} />
                    {active.business_certificate_url && (
                      <Row k="Business certificate" v={<a href={active.business_certificate_url} target="_blank" rel="noreferrer" className="text-accent underline">View document</a>} />
                    )}
                    {active.id_document_url && (
                      <Row k="ID document" v={<a href={active.id_document_url} target="_blank" rel="noreferrer" className="text-accent underline">View document</a>} />
                    )}
                  </div>
                </div>

                {(active.shop_photo_urls?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Shop Photos</div>
                    <div className="flex gap-2 flex-wrap">
                      {(active.shop_photo_urls ?? []).map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer">
                          <img src={u} alt="" className="w-20 h-20 object-cover rounded border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(active.gps_latitude ?? active.latitude) != null && (active.gps_longitude ?? active.longitude) != null && (
                  <div className="rounded-lg overflow-hidden border">
                    <iframe
                      title="Shop location"
                      src={`https://www.google.com/maps?q=${active.gps_latitude ?? active.latitude},${active.gps_longitude ?? active.longitude}&z=16&output=embed`}
                      className="w-full h-56 border-0"
                      loading="lazy"
                    />
                  </div>
                )}

                {active.rejection_reason && (
                  <Row k="Rejection reason" v={<span className="text-destructive">{active.rejection_reason}</span>} />
                )}
                {active.suspension_reason && (
                  <Row k="Suspension reason" v={<span className="text-destructive">{active.suspension_reason}</span>} />
                )}

                {reasonAction && (
                  <div className="space-y-1.5 border-t pt-3">
                    <Label>Reason for {reasonAction === "reject" ? "rejection" : "suspension"}</Label>
                    <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>
                )}
                {!reasonAction && active.verification_status === "pending" && (
                  <div className="space-y-1.5 border-t pt-3">
                    <Label className="text-xs text-muted-foreground">Internal admin notes (optional)</Label>
                    <Textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Notes for the verification team…" />
                  </div>
                )}
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {active.verification_status === "pending" && !reasonAction && (
                  <>
                    <Button className="gap-1.5" onClick={() => updateStatus(active.id, "approved", { rejection_reason: null })}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button variant="outline" onClick={() => setReasonAction("reject")}>Reject…</Button>
                  </>
                )}
                {(active.verification_status === "approved" || active.verification_status === "verified") && !reasonAction && (
                  <Button variant="outline" className="text-destructive" onClick={() => setReasonAction("suspend")}>Suspend…</Button>
                )}
                {active.verification_status === "suspended" && !reasonAction && (
                  <Button onClick={() => updateStatus(active.id, "approved", { suspension_reason: null })}>Reinstate</Button>
                )}
                {reasonAction === "reject" && (
                  <Button variant="destructive" onClick={() => {
                    if (reason.trim()) updateStatus(active.id, "rejected", { rejection_reason: reason.trim() });
                    else toast.error("Reason required");
                  }}>Confirm reject</Button>
                )}
                {reasonAction === "suspend" && (
                  <Button variant="destructive" onClick={() => {
                    if (reason.trim()) updateStatus(active.id, "suspended", { suspension_reason: reason.trim() });
                    else toast.error("Reason required");
                  }}>Confirm suspend</Button>
                )}
                <Button variant="ghost" onClick={closeDialog}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-3 border-b pb-1">
    <span className="text-muted-foreground shrink-0">{k}</span>
    <span className="text-right">{v ?? "—"}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Disputes tab
// ---------------------------------------------------------------------------

interface DisputeOrder {
  id: string;
  total_amount_ksh: number;
  dispute_reason: string | null;
  customer_id: string;
  status: string;
  payment_status: string;
  product: { brand: string; model_name: string } | null;
  vendor: { business_name: string } | null;
  customer: { full_name: string | null; phone_number: string | null } | null;
}

const AdminDisputes = () => {
  const [list, setList] = useState<DisputeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, product:products(brand, model_name), vendor:vendor_profiles(business_name)")
      .eq("status", "disputed")
      .order("updated_at", { ascending: false });
    const orderList = (data ?? []) as DisputeOrder[];
    const ids = Array.from(new Set(orderList.map((o) => o.customer_id)));
    const map: Record<string, { full_name: string | null; phone_number: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone_number").in("id", ids);
      (profs ?? []).forEach((p) => { map[p.id] = p; });
    }
    setList(orderList.map((o) => ({ ...o, customer: map[o.customer_id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (o: DisputeOrder, outcome: "refund_customer" | "release_to_vendor") => {
    if (outcome === "refund_customer") {
      await supabase.from("orders").update({ status: "refunded", payment_status: "refunded", updated_at: new Date().toISOString() }).eq("id", o.id);
      await supabase.from("notifications").insert([
        { user_id: o.customer_id, title: "Dispute resolved: refund issued", message: `KES ${o.total_amount_ksh} will be refunded to your M-Pesa.`, type: "dispute", reference_id: o.id },
      ]);
    } else {
      await supabase.from("orders").update({ status: "confirmed", payment_status: "released", float_released_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", o.id);
      await supabase.from("notifications").insert([
        { user_id: o.customer_id, title: "Dispute resolved: in vendor's favor", message: "Payment was released to the vendor.", type: "dispute", reference_id: o.id },
      ]);
    }
    toast.success("Dispute resolved");
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (list.length === 0) {
    return <Card className="p-12 text-center text-muted-foreground">No open disputes.</Card>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product / Vendor</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dispute Reason</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {list.map((o) => (
            <tr key={o.id} className="hover:bg-muted/25 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
              <td className="px-4 py-3">
                <div className="font-medium">{o.product?.brand} {o.product?.model_name}</div>
                <div className="text-xs text-muted-foreground">{o.vendor?.business_name}</div>
              </td>
              <td className="px-4 py-3">
                <div>{o.customer?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{o.customer?.phone_number}</div>
              </td>
              <td className="px-4 py-3 font-medium">{formatKsh(o.total_amount_ksh)}</td>
              <td className="px-4 py-3 max-w-xs">
                {o.dispute_reason ? (
                  <p className="text-sm bg-red-50 text-red-800 border border-red-200 rounded px-2 py-1 line-clamp-2">{o.dispute_reason}</p>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => resolve(o, "refund_customer")}>
                    <XCircle className="h-3.5 w-3.5" /> Refund
                  </Button>
                  <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => resolve(o, "release_to_vendor")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Release
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  user_roles: { role: string }[];
}

const roleConfig: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  vendor: "bg-blue-100 text-blue-700 border-blue-200",
  customer: "bg-gray-100 text-gray-700 border-gray-200",
};

const AdminUsers = () => {
  const [list, setList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      const ids = (profiles ?? []).map((p) => p.id);
      const rolesMap: Record<string, string[]> = {};
      if (ids.length) {
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
        (roles ?? []).forEach((r) => {
          rolesMap[r.user_id] = rolesMap[r.user_id] || [];
          rolesMap[r.user_id].push(r.role);
        });
      }
      setList((profiles ?? []).map((p) => ({ ...p, user_roles: (rolesMap[p.id] ?? []).map((role) => ({ role })) })) as UserProfile[]);
      setLoading(false);
    })();
  }, []);

  const filtered = list.filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.full_name ?? "").toLowerCase().includes(s)
      || (u.email ?? "").toLowerCase().includes(s)
      || (u.phone_number ?? "").includes(s);
  });

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roles</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/25 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.full_name ?? "Unnamed"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(u.user_roles ?? []).map((r) => (
                        <Badge
                          key={r.role}
                          variant="outline"
                          className={`capitalize text-xs ${roleConfig[r.role] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {r.role}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Payments tab
// ---------------------------------------------------------------------------

type PaymentFilter = "all" | "pending" | "paid_float" | "released" | "failed";

interface PaymentOrder {
  id: string;
  total_amount_ksh: number;
  platform_fee_ksh: number;
  payment_status: string;
  payment_provider: string | null;
  mpesa_receipt_number: string | null;
  paid_amount_ksh: number | null;
  payout_status: string | null;
  created_at: string;
  customer_id: string;
  customer: { full_name: string | null; phone_number: string | null } | null;
}

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  released: { label: "Released", className: "bg-green-100 text-green-700 border-green-200" },
  paid_float: { label: "Held", className: "bg-amber-100 text-amber-700 border-amber-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700 border-gray-200" },
  refunded: { label: "Refunded", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const cfg = paymentStatusConfig[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`capitalize text-xs ${cfg.className}`}>{cfg.label}</Badge>;
};

const ProviderBadge = ({ provider }: { provider: string | null }) => {
  if (!provider) return <span className="text-muted-foreground text-xs">—</span>;
  const isKcb = provider.toLowerCase().includes("kcb");
  return (
    <Badge variant="outline" className={`text-xs ${isKcb ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"}`}>
      {isKcb ? "KCB" : "Daraja"}
    </Badge>
  );
};

const PAGE_SIZE = 20;

const AdminPayments = () => {
  const [allOrders, setAllOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("id, total_amount_ksh, platform_fee_ksh, payment_status, payment_provider, mpesa_receipt_number, paid_amount_ksh, payout_status, created_at, customer_id")
        .order("created_at", { ascending: false });
      const orderList = (data ?? []) as Omit<PaymentOrder, "customer">[];
      const ids = Array.from(new Set(orderList.map((o) => o.customer_id)));
      const map: Record<string, { full_name: string | null; phone_number: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, phone_number").in("id", ids);
        (profs ?? []).forEach((p) => { map[p.id] = p; });
      }
      setAllOrders(orderList.map((o) => ({ ...o, customer: map[o.customer_id] ?? null })));
      setLoading(false);
    })();
  }, []);

  const filtered = allOrders.filter((o) => filter === "all" || o.payment_status === filter);

  const statusCounts = allOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.payment_status] = (acc[o.payment_status] ?? 0) + 1;
    return acc;
  }, {});
  const totalHeld = allOrders.filter((o) => o.payment_status === "paid_float").reduce((s, o) => s + Number(o.total_amount_ksh), 0);
  const totalReleased = allOrders.filter((o) => o.payment_status === "released").reduce((s, o) => s + Number(o.total_amount_ksh), 0);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const filterButtons: { key: PaymentFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "paid_float", label: "Held" },
    { key: "released", label: "Released" },
    { key: "failed", label: "Failed" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Held (in float)</div>
          <div className="text-xl font-bold text-amber-700">{formatKsh(totalHeld)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Released</div>
          <div className="text-xl font-bold text-green-700">{formatKsh(totalReleased)}</div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterButtons.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => { setFilter(key); setPage(0); }}
          >
            {label}
            {key !== "all" && statusCounts[key] != null && (
              <span className="ml-1 text-xs opacity-70">({statusCounts[key]})</span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No payments found.</Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Receipt #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payout</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageItems.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/25 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3">{o.customer?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{o.customer?.phone_number ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatKsh(o.total_amount_ksh)}</td>
                    <td className="px-4 py-3"><ProviderBadge provider={o.payment_provider} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.mpesa_receipt_number ?? "—"}</td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={o.payment_status} /></td>
                    <td className="px-4 py-3">
                      {o.payout_status ? (
                        <Badge variant="outline" className="text-xs capitalize">{o.payout_status}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
