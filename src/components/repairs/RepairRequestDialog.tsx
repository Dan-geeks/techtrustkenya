import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  service: any | null;
}

export const RepairRequestDialog = ({ open, onOpenChange, service }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deviceType, setDeviceType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [problem, setProblem] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeviceType(service?.device_type ?? "");
    setBrand("");
    setModel("");
    setProblem("");
    if (user) {
      supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => setPhone(data?.phone_number ?? ""));
    }
  }, [open, service, user]);

  const submit = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!service) return;
    if (!brand.trim() || !model.trim() || !problem.trim()) {
      toast.error("Brand, model and problem description are required.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("repair_requests").insert({
      customer_id: user.id,
      vendor_id: service.vendor_id ?? service.vendor?.id,
      repair_service_id: service.id,
      device_description: `${brand.trim()} ${model.trim()}`.trim(),
      problem_description: problem.trim(),
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    // Notify vendor
    if (service.vendor?.user_id || service.vendor_user_id) {
      const vendorUserId = service.vendor?.user_id ?? service.vendor_user_id;
      await supabase.from("notifications").insert({
        user_id: vendorUserId,
        type: "repair_update",
        title: "New repair request",
        message: `A customer requested ${service.service_name}.`,
      });
    }
    toast.success("Repair request submitted");
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request {service?.service_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Device type</Label>
              <Input value={deviceType} disabled className="mt-1.5 capitalize" />
            </div>
            <div>
              <Label>Phone (for contact)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="712 345 678"
                className="mt-1.5"
                autoComplete="tel"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Brand</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1.5" placeholder="HP, Apple, Samsung..." />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} className="mt-1.5" placeholder="EliteBook 840, iPhone 13..." />
            </div>
          </div>
          <div>
            <Label>Describe the problem</Label>
            <Textarea
              rows={4}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="mt-1.5"
              placeholder="What's wrong with the device? When did it start?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
