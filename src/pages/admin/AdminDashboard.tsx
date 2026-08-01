import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, formatDate } from "@/lib/format";
import { invokeFunction } from "@/lib/functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2, Users, Store, AlertTriangle, Wallet, MapPin, Phone, Mail, Map,
  FileText, CheckCircle2, XCircle, ShieldCheck, Search, UserCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const ADMIN_TABS = [
  { value: "overview", label: "Overview" },
  { value: "vendors", label: "Verifications" },
  { value: "disputes", label: "Disputes" },
  { value: "users", label: "Users" },
  { value: "payments", label: "Escrow" },
] as const;

const AdminDashboard = () => {
  const [tab, setTab] = useState<string>("overview");

  useEffect(() => {
    document.title = "Admin Dashboard | TechTrust";
  }, []);

  const heading = ADMIN_TABS.find((t) => t.value === tab);

  return (
    <div className="container py-8">
      {/* Stitch admin chrome: light canvas, underlined nav, big Sora page title. */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border">
        <nav className="flex flex-wrap items-center gap-6">
          {ADMIN_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm transition-colors",
                tab === t.value
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-accent",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-eyebrow text-accent">
          <ShieldCheck className="h-3 w-3" /> Internal
        </span>
      </div>

      <div className="mt-8">
        <h1 className="font-display text-4xl font-bold text-primary">
          {tab === "vendors" ? "Verification Queue" : tab === "payments" ? "Float & Escrow" : heading?.label}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {tab === "overview" && "Platform oversight at a glance."}
          {tab === "vendors" && "Review and manage pending vendor applications."}
          {tab === "disputes" && "Resolve orders where the buyer and vendor disagree."}
          {tab === "users" && "Everyone with a TechTrust account."}
          {tab === "payments" && "Every shilling held, released or refunded through Float."}
        </p>
      </div>

      <div className="mt-8">
        {tab === "overview" && <AdminOverview onOpenTab={setTab} />}
        {tab === "vendors" && <AdminVendors />}
        {tab === "disputes" && <AdminDisputes />}
        {tab === "users" && <AdminUsers />}
        {tab === "payments" && <AdminPayments />}
      </div>
    </div>
  );
};

// Card shell used by every admin panel — matches the mockup's white
// rounded-xl surface with a tinted header strip.
const Panel = ({
  title,
  action,
  children,
  className,
  footer,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) => (
  <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-card", className)}>
    <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-5 py-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {action}
    </div>
    {children}
    {footer && <div className="border-t border-border bg-secondary/60 px-5 py-3">{footer}</div>}
  </div>
);

// Dense table header cells, per the mockup's uppercase micro-labels.
const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={cn("px-4 py-3 text-eyebrow text-muted-foreground", right ? "text-right" : "text-left")}>
    {children}
  </th>
);

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

interface FloatSnapshot {
  held: number;
  released: number;
  ledger: { id: string; amount: number; status: string; created_at: string }[];
}

const AdminOverview = ({ onOpenTab }: { onOpenTab: (tab: string) => void }) => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [float, setFloat] = useState<FloatSnapshot | null>(null);
  const [queue, setQueue] = useState<VendorProfile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [queueQuery, setQueueQuery] = useState("");
  const [rejectVendor, setRejectVendor] = useState<VendorProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = async () => {
    const [users, vendors, orders, pendingVendors, disputes, pendingList] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("vendor_profiles").select("id", { count: "exact", head: true }).in("verification_status", ["approved", "verified"]),
      supabase.from("orders").select("id, total_amount_ksh, platform_fee_ksh, status, payment_status, created_at").order("created_at", { ascending: false }),
      supabase.from("vendor_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      supabase.from("vendor_profiles").select("*").eq("verification_status", "pending").order("created_at", { ascending: true }).limit(5),
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
    setFloat({
      held: ordersList.filter((o) => o.payment_status === "paid_float").reduce((s, o) => s + Number(o.total_amount_ksh), 0),
      released: ordersList.filter((o) => o.payment_status === "released").reduce((s, o) => s + Number(o.total_amount_ksh), 0),
      ledger: ordersList
        .filter((o) => o.payment_status === "paid_float" || o.payment_status === "released")
        .slice(0, 5)
        .map((o) => ({ id: o.id, amount: Number(o.total_amount_ksh), status: o.payment_status, created_at: o.created_at })),
    });
    setQueue((pendingList.data ?? []) as VendorProfile[]);
  };

  useEffect(() => { load(); }, []);

  const decide = async (v: VendorProfile, status: "approved" | "rejected") => {
    if (status === "rejected") {
      setRejectVendor(v);
      setRejectReason("");
      return;
    }
    setBusyId(v.id);
    const ok = await applyVendorDecision(v, status, { rejection_reason: null });
    setBusyId(null);
    if (ok) load();
  };

  const confirmReject = async () => {
    if (!rejectVendor) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    setRejecting(true);
    const ok = await applyVendorDecision(rejectVendor, "rejected", { rejection_reason: rejectReason.trim() });
    setRejecting(false);
    if (ok) {
      setRejectVendor(null);
      setRejectReason("");
      load();
    }
  };

  if (!stats || !float) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  const totalFloat = float.held + float.released;
  const clearedPct = totalFloat > 0 ? Math.round((float.released / totalFloat) * 100) : 0;
  const q = queueQuery.trim().toLowerCase();
  const visibleQueue = q
    ? queue.filter(
        (v) =>
          (v.business_name ?? "").toLowerCase().includes(q) ||
          (v.owner_name ?? "").toLowerCase().includes(q) ||
          v.id.slice(0, 5).toLowerCase().includes(q.replace(/^vnd-/, "")),
      )
    : queue;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Users} label="Total Users" value={stats.users.toString()} accent="text-accent" />
        <StatCard icon={Store} label="Active Vendors" value={stats.vendors.toString()} accent="text-success" />
        <StatCard icon={Store} label="Pending Approvals" value={stats.pendingVendors.toString()} accent="text-warning" pulse={stats.pendingVendors > 0} />
        <StatCard icon={Wallet} label="Lifetime GMV" value={formatKsh(stats.gmv)} accent="text-primary" />
        <StatCard icon={Wallet} label="Platform Revenue (10%)" value={formatKsh(stats.revenue)} accent="text-success" />
        <StatCard icon={AlertTriangle} label="Open Disputes" value={stats.disputes.toString()} accent="text-destructive" pulse={stats.disputes > 0} />
      </div>

      {/* Bento grid, 8/4 split — verification queue beside the Float position. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-8"
          title="Pending Actions"
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={queueQuery}
                onChange={(e) => setQueueQuery(e.target.value)}
                placeholder="Search ID..."
                aria-label="Search the pending queue by vendor name or reference"
                className="text-data-id h-8 w-48 bg-card pl-9"
              />
            </div>
          }
          footer={
            <button
              type="button"
              onClick={() => onOpenTab("vendors")}
              className="mx-auto block text-sm font-medium text-accent transition-colors hover:text-primary"
            >
              View all pending
            </button>
          }
        >
          {visibleQueue.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {queue.length === 0
                ? "Nothing waiting. Every vendor application has been reviewed."
                : "No pending application matches that search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <Th>Vendor</Th>
                    <Th>ID / Reference</Th>
                    <Th>Documents</Th>
                    <Th right>Decision</Th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {visibleQueue.map((v) => (
                    <tr key={v.id} className="h-12 border-b border-border/60 transition-colors hover:bg-secondary/60">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-muted text-xs font-bold text-primary">
                            {getInitials(v.business_name)}
                          </div>
                          <span className="font-medium">{v.business_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-data-id text-muted-foreground">
                        VND-{v.id.slice(0, 5).toUpperCase()}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 text-primary">
                          <DocIcon icon={UserCircle} href={v.id_document_url} title="ID document" />
                          <DocIcon icon={FileText} href={v.business_certificate_url} title="Business certificate" />
                          <DocIcon icon={MapPin} href={v.google_maps_link} title="Shop location" />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="approve"
                            className="h-7 px-3 text-xs"
                            disabled={busyId === v.id}
                            onClick={() => decide(v, "approved")}
                          >
                            {busyId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-destructive/40 px-3 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => decide(v, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-eyebrow mb-4 text-muted-foreground">Float Overview</h3>
            <p className="mb-1 text-sm text-muted-foreground">Total Float volume</p>
            <p className="text-price text-3xl font-bold text-primary">{formatKsh(totalFloat)}</p>
            <div className="mb-2 mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-float transition-all" style={{ width: `${clearedPct}%` }} />
            </div>
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Released: <span className="text-price">{formatKsh(float.released)}</span></span>
              <span>Held: <span className="text-price">{formatKsh(float.held)}</span></span>
            </div>
          </div>

          <Panel
            className="flex-1"
            title="Float Ledger"
            action={
              <button
                type="button"
                onClick={() => onOpenTab("payments")}
                className="text-xs font-medium text-accent hover:underline"
              >
                All transactions
              </button>
            }
          >
            {float.ledger.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No Float movement yet.</p>
            ) : (
              <table className="w-full border-collapse text-left">
                <tbody className="text-sm">
                  {float.ledger.map((t) => (
                    <tr key={t.id} className="h-10 border-b border-border/40 hover:bg-secondary/50">
                      <td className="w-1/2 px-4 py-2 text-data-id text-muted-foreground">
                        TXN-{t.id.slice(0, 4).toUpperCase()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-price text-primary">{formatKsh(t.amount)}</span>
                        <span className={cn("ml-2 text-[10px] font-semibold uppercase", t.status === "released" ? "text-success" : "text-warning")}>
                          {t.status === "released" ? "out" : "held"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </div>

      <Dialog open={!!rejectVendor} onOpenChange={(open) => !open && setRejectVendor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Reject Vendor Application
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              You are rejecting <span className="font-semibold">{rejectVendor?.business_name}</span>. Please enter the reason for rejection (this will be displayed to the vendor):
            </p>
            <div className="space-y-1">
              <Label>Rejection Reason *</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Incomplete business certificate, invalid ID document..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectVendor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={rejecting}>
              {rejecting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DocIcon = ({ icon: Icon, href, title }: { icon: React.ElementType; href: string | null; title: string }) =>
  href ? (
    <a href={href} target="_blank" rel="noreferrer" title={title} className="transition-colors hover:text-accent">
      <Icon className="h-[18px] w-[18px]" />
    </a>
  ) : (
    <span title={`${title} — not submitted`} className="text-border">
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
  pulse?: boolean;
}

const StatCard = ({ icon: Icon, label, value, accent, pulse }: StatCardProps) => (
  <Card className="relative overflow-hidden p-5 shadow-card transition-shadow hover:shadow-md">
    <Icon className={`pointer-events-none absolute -right-3 -top-3 h-24 w-24 ${accent} opacity-[0.08]`} strokeWidth={1.5} />
    <div className="relative mb-4 flex items-center gap-1.5">
      <span className="text-eyebrow text-muted-foreground">{label}</span>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
        </span>
      )}
    </div>
    <div className="text-stat relative text-3xl font-bold text-primary">{value}</div>
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
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/30" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/30" },
  verified: { label: "Verified", className: "bg-success/10 text-success border-success/30" },
  suspended: { label: "Suspended", className: "bg-destructive/10 text-destructive border-destructive/30" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const VendorStatusBadge = ({ status }: { status: string }) => {
  const cfg = vendorStatusConfig[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`capitalize ${cfg.className}`}>{cfg.label}</Badge>;
};

const getInitials = (name: string | null) =>
  (name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/**
 * Single source of truth for a verification decision: writes the status, notifies
 * the vendor in-app, and (on approval) fires the email function. Shared by the
 * Overview queue and the Verifications tab so both paths behave identically.
 */
type VerificationStatus = "pending" | "verified" | "approved" | "suspended" | "rejected";

const applyVendorDecision = async (
  v: Pick<VendorProfile, "id" | "user_id" | "business_name">,
  status: string,
  extra: Record<string, string | null> = {},
): Promise<boolean> => {
  const { error } = await supabase
    .from("vendor_profiles")
    .update({ verification_status: status as VerificationStatus, ...extra })
    .eq("id", v.id);
  if (error) { toast.error(error.message); return false; }

  if (v.user_id) {
    await supabase.from("notifications").insert({
      user_id: v.user_id,
      title:
        status === "approved" ? "Vendor application approved"
        : status === "rejected" ? "Vendor application rejected"
        : "Vendor account suspended",
      message:
        status === "approved"
          ? "Your shop is now live on TechTrust."
          : (extra.rejection_reason || extra.suspension_reason || "Contact support."),
      type: "vendor_application",
      reference_id: v.id,
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
  return true;
};

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
    if (tab === "approved") {
      query = query.in("verification_status", ["approved", "verified"]);
    } else if (tab !== "all") {
      query = query.eq("verification_status", tab);
    }
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
    const v = list.find((x) => x.id === id);
    if (!v) return;
    const ok = await applyVendorDecision(v, status, extra);
    if (!ok) return;
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
        /* Dense review table, per the mockup — one row per application, docs and
           the decision reachable without opening anything. */
        <Panel title={`${list.length} ${list.length === 1 ? "application" : "applications"}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-card">
                  <Th>Vendor</Th>
                  <Th>ID / Reference</Th>
                  <Th>Location</Th>
                  <Th>Documents</Th>
                  <Th>Status</Th>
                  <Th right>Decision</Th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {list.map((v) => (
                  <tr key={v.id} className="border-b border-border/60 transition-colors hover:bg-secondary/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-muted text-xs font-bold text-primary">
                          {getInitials(v.business_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{v.business_name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {v.owner_name ?? "—"} · Applied {formatDate(v.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-data-id text-muted-foreground">VND-{v.id.slice(0, 5).toUpperCase()}</div>
                      <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {v.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{v.email}</span>}
                        {v.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{v.phone}</span>}
                      </div>
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-xs text-muted-foreground">
                      <span className="flex items-start gap-1">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {v.county ?? v.city ?? "—"}{v.sub_county ? `, ${v.sub_county}` : ""}
                        </span>
                      </span>
                      {v.google_maps_link && (
                        <a href={v.google_maps_link} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-accent hover:underline">
                          <Map className="h-3 w-3" /> Google Maps
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 text-primary">
                        <DocIcon icon={UserCircle} href={v.id_document_url} title="ID document" />
                        <DocIcon icon={FileText} href={v.business_certificate_url} title="Business certificate" />
                        <DocIcon icon={Store} href={(v.shop_photo_urls ?? [])[0] ?? null} title="Shop photos" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><VendorStatusBadge status={v.verification_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {v.verification_status === "pending" && (
                          <>
                            <Button size="sm" variant="approve" className="h-7 gap-1 px-3 text-xs"
                              onClick={() => updateStatus(v.id, "approved", { rejection_reason: null })}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 gap-1 border-destructive/40 px-3 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => { setActive(v); setReasonAction("reject"); }}>
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}
                        {(v.verification_status === "approved" || v.verification_status === "verified") && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 border-destructive/40 px-3 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => { setActive(v); setReasonAction("suspend"); }}>
                            <AlertTriangle className="h-3.5 w-3.5" /> Suspend
                          </Button>
                        )}
                        {v.verification_status === "suspended" && (
                          <Button size="sm" variant="approve" className="h-7 gap-1 px-3 text-xs"
                            onClick={() => updateStatus(v.id, "approved", { suspension_reason: null })}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Reinstate
                          </Button>
                        )}
                        {v.verification_status === "rejected" && (
                          <Button size="sm" variant="outline" className="h-7 px-3 text-xs"
                            onClick={() => updateStatus(v.id, "pending", { rejection_reason: null })}>
                            Re-open
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={() => setActive(v)}>
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
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
      const { data: res, error } = await invokeFunction("release-float-payment", { body: { orderId: o.id } });
      if (error || (res && !res.success)) {
        console.warn("release-float-payment warning or fallback:", error?.message ?? res?.error);
        await supabase.from("orders").update({
          status: "confirmed",
          payment_status: "released",
          float_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", o.id);
      }
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
    <Panel title={`${list.length} open ${list.length === 1 ? "dispute" : "disputes"}`}>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card">
            <Th>Order</Th>
            <Th>Product / Vendor</Th>
            <Th>Customer</Th>
            <Th>Amount</Th>
            <Th>Dispute Reason</Th>
            <Th right>Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {list.map((o) => (
            <tr key={o.id} className="transition-colors hover:bg-secondary/60">
              <td className="px-4 py-3 text-data-id text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</td>
              <td className="px-4 py-3">
                <div className="font-medium">{o.product?.brand} {o.product?.model_name}</div>
                <div className="text-xs text-muted-foreground">{o.vendor?.business_name}</div>
              </td>
              <td className="px-4 py-3">
                <div>{o.customer?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{o.customer?.phone_number}</div>
              </td>
              <td className="px-4 py-3 font-medium"><span className="text-price">{formatKsh(o.total_amount_ksh)}</span></td>
              <td className="px-4 py-3 max-w-xs">
                {o.dispute_reason ? (
                  <p className="text-sm bg-destructive/5 text-destructive border border-destructive/20 rounded px-2 py-1 line-clamp-2">{o.dispute_reason}</p>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="destructive" className="h-7 gap-1 px-3 text-xs" onClick={() => resolve(o, "refund_customer")}>
                    <XCircle className="h-3.5 w-3.5" /> Refund
                  </Button>
                  <Button size="sm" variant="approve" className="h-7 gap-1 px-3 text-xs" onClick={() => resolve(o, "release_to_vendor")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Release
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </Panel>
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
  admin: "bg-primary/10 text-primary border-primary/20",
  vendor: "bg-accent-soft text-accent border-accent/20",
  customer: "bg-muted text-muted-foreground border-border",
};

const AdminUsers = () => {
  const [list, setList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const loadUsers = async () => {
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
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const assignRole = async (userId: string, targetRole: "admin" | "vendor" | "customer") => {
    const existingRoles = list.find((u) => u.id === userId)?.user_roles.map((r) => r.role) ?? [];
    if (existingRoles.includes(targetRole)) {
      toast.info(`User already has the ${targetRole} role.`);
      return;
    }
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: targetRole,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Assigned ${targetRole} role`);
    loadUsers();
  };

  const revokeRole = async (userId: string, roleToRemove: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", roleToRemove as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Removed ${roleToRemove} role`);
    loadUsers();
  };

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
        <Panel title={`${filtered.length} ${filtered.length === 1 ? "account" : "accounts"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Roles</Th>
                <Th>Joined</Th>
                <Th right>Manage Role</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-secondary/60">
                  <td className="px-4 py-3 font-medium">{u.full_name ?? "Unnamed"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {(u.user_roles ?? []).map((r) => (
                        <Badge
                          key={r.role}
                          variant="outline"
                          className={`capitalize text-xs flex items-center gap-1 ${roleConfig[r.role] ?? "bg-muted text-muted-foreground"}`}
                        >
                          <span>{r.role}</span>
                          <button
                            type="button"
                            onClick={() => revokeRole(u.id, r.role)}
                            title={`Revoke ${r.role} role`}
                            className="hover:text-destructive text-muted-foreground border-0 bg-transparent p-0 font-bold ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Select onValueChange={(val) => assignRole(u.id, val as any)}>
                      <SelectTrigger className="h-7 w-28 text-xs ml-auto">
                        <SelectValue placeholder="+ Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </Panel>
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
  released: { label: "Released", className: "bg-success/10 text-success border-success/30" },
  paid_float: { label: "Held", className: "bg-warning/10 text-warning border-warning/30" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/30" },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
  refunded: { label: "Refunded", className: "bg-accent-soft text-accent border-accent/20" },
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const cfg = paymentStatusConfig[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`capitalize text-xs ${cfg.className}`}>{cfg.label}</Badge>;
};

const ProviderBadge = ({ provider }: { provider: string | null }) => {
  if (!provider) return <span className="text-muted-foreground text-xs">—</span>;
  const isKcb = provider.toLowerCase().includes("kcb");
  return (
    <Badge variant="outline" className={`text-xs ${isKcb ? "bg-accent-soft text-accent border-accent/20" : "bg-success/10 text-success border-success/30"}`}>
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
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-warning p-5 shadow-card">
          <div className="text-eyebrow mb-2 text-muted-foreground">Held in Float</div>
          <div className="text-price text-2xl font-bold text-warning">{formatKsh(totalHeld)}</div>
        </Card>
        <Card className="border-l-4 border-l-success p-5 shadow-card">
          <div className="text-eyebrow mb-2 text-muted-foreground">Released to vendors</div>
          <div className="text-price text-2xl font-bold text-success">{formatKsh(totalReleased)}</div>
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
          <Panel title="Float ledger">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <Th>Order ID</Th>
                  <Th>Customer</Th>
                  <Th>Phone</Th>
                  <Th right>Amount</Th>
                  <Th>Provider</Th>
                  <Th>Receipt #</Th>
                  <Th>Payment</Th>
                  <Th>Payout</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pageItems.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-secondary/60">
                    <td className="px-4 py-3 text-data-id text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3">{o.customer?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-data-id text-muted-foreground">{o.customer?.phone_number ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium"><span className="text-price">{formatKsh(o.total_amount_ksh)}</span></td>
                    <td className="px-4 py-3"><ProviderBadge provider={o.payment_provider} /></td>
                    <td className="px-4 py-3 text-data-id text-muted-foreground">{o.mpesa_receipt_number ?? "—"}</td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={o.payment_status} /></td>
                    <td className="px-4 py-3">
                      {o.payout_status ? (
                        <Badge variant="outline" className="text-xs capitalize">{o.payout_status}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Panel>

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
