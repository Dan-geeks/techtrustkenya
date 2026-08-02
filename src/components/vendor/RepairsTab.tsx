import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Wrench, Loader2 } from "lucide-react";

export const RepairsTab = ({ vendor }: { vendor: any }) => {
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [quote, setQuote] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("repair_requests")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false });
    const list = data ?? [];
    const ids = Array.from(new Set(list.map((r: any) => r.customer_id)));
    const map: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone_number").in("id", ids);
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
    }
    setReqs(list.map((r: any) => ({ ...r, customer: map[r.customer_id] ?? null })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [vendor.id]);

  const sendQuote = async () => {
    if (!quote || Number(quote) <= 0) {
      toast.error("Enter a valid quote.");
      return;
    }
    const { error } = await supabase
      .from("repair_requests")
      .update({ quoted_price_ksh: Number(quote), status: "quotation_sent", technician_notes: notes || null })
      .eq("id", active.id);
    if (error) toast.error(error.message);
    else {
      await supabase.from("notifications").insert({
        user_id: active.customer_id,
        title: "Repair quotation received",
        message: `${vendor.business_name} sent a quote of KES ${quote} for your repair.`,
        type: "repair_update",
        reference_id: active.id,
      });
      toast.success("Quote sent");
      setQuoteOpen(false);
      setQuote("");
      setNotes("");
      load();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("repair_requests").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status updated");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Repair requests</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : reqs.length === 0 ? (
        <Card className="p-12 text-center">
          <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No repair requests yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reqs.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span>{r.device_description}</span>
                    <span className="text-data-id text-xs text-muted-foreground">#{r.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.customer?.full_name} · {r.customer?.phone_number} · {formatDate(r.created_at)}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{r.status.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm">{r.problem_description}</p>
              {r.quoted_price_ksh && (
                <div className="text-sm mt-2">
                  Quote: <span className="font-semibold"><span className="text-price">{formatKsh(r.quoted_price_ksh)}</span></span>{" "}
                  {r.customer_approved_quote ? <Badge className="bg-success/10 text-success">Approved</Badge> : <Badge variant="outline">Pending approval</Badge>}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {r.status === "submitted" && (
                  <Button size="sm" onClick={() => { setActive(r); setQuote(""); setNotes(""); setQuoteOpen(true); }}>Send quote</Button>
                )}
                {r.status === "quotation_sent" && r.customer_approved_quote && (
                  <Button size="sm" onClick={() => updateStatus(r.id, "received")}>Mark received</Button>
                )}
                {r.status === "received" && <Button size="sm" onClick={() => updateStatus(r.id, "diagnosing")}>Start diagnosis</Button>}
                {r.status === "diagnosing" && <Button size="sm" onClick={() => updateStatus(r.id, "in_repair")}>Start repair</Button>}
                {r.status === "in_repair" && <Button size="sm" onClick={() => updateStatus(r.id, "ready_for_collection")}>Ready for collection</Button>}
                {r.status === "ready_for_collection" && <Button size="sm" onClick={() => updateStatus(r.id, "completed")}>Mark completed</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send quotation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Quote (KSH)</Label>
              <Input type="number" min="1" step="1" value={quote} onChange={(e) => setQuote(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Technician notes (optional)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>Cancel</Button>
            <Button onClick={sendQuote}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
