import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  Star,
  Store,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, routeForNotification } from "@/lib/format";
import { cn } from "@/lib/utils";

type NotifType = "order_update" | "payment" | "repair_update" | "review_request" | "promotion" | string;

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  _partnerName?: string;
}

const typeIcon = (type: NotifType) => {
  const cls = "h-5 w-5 shrink-0";
  switch (type) {
    case "order_update":
      return <Store className={cls} />;
    case "payment":
      return <Wallet className={cls} />;
    case "repair_update":
      return <AlertTriangle className={cls} />;
    case "review_request":
      return <Star className={cls} />;
    default:
      return <Bell className={cls} />;
  }
};

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
};

const NotificationItem = ({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isVendor = !!roles?.includes("vendor");

  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id);
    
    if (notif.type === "message") {
      const partnerName = (notif.title || "").replace(/^New message from /, "") || "User";
      // Go to the inbox for whichever side this user is, then open the thread
      // so they can read and reply without navigating there manually.
      navigate(isVendor ? "/vendor/dashboard?tab=Messages" : "/profile#messages");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("open-chat", { detail: { partnerId: notif.reference_id, partnerName } })
        );
      }, 250);
      return;
    }
    
    const route = routeForNotification(notif);
    if (route) {
      navigate(route);
    } else {
      setExpanded((v) => !v);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50",
        !notif.is_read && "border-l-4 border-l-accent"
      )}
    >
      <div className={cn("mt-0.5", notif.is_read ? "text-muted-foreground" : "text-accent")}>
        {typeIcon(notif.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm", !notif.is_read && "font-semibold")}>
          {notif.title}
        </div>
        <p className={cn("text-sm text-muted-foreground mt-0.5", !expanded && "line-clamp-2")}>
          {notif.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{relativeTime(notif.created_at)}</span>
          {!notif.is_read && (
            <Badge className="bg-accent/10 text-accent px-1.5 py-0 text-[10px]" variant="outline">
              New
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    document.title = "Notifications | TechTrust";
    if (!user) return;

    (async () => {
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Message notifications are real rows now (trg_messages_notify), so
      // nothing is synthesised. Synthesising from unread messages meant a thread
      // disappeared from this page as soon as ChatWidget marked it read.
      setNotifs((notificationsData as Notification[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const markRead = async (id: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (error) toast.error("Failed to mark all as read");
    else toast.success("All notifications marked as read");
    setMarkingAll(false);
  };

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const unread = notifs.filter((n) => !n.is_read);
  const read = notifs.filter((n) => n.is_read);

  return (
    <div className="container py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {unread.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {notifs.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-semibold mb-1">No notifications yet</h2>
          <p className="text-sm text-muted-foreground">
            We'll let you know when something happens.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section>
              <h2 className="text-eyebrow text-muted-foreground mb-2">
                Unread (<span className="text-stat">{unread.length}</span>)
              </h2>
              <Card className="divide-y overflow-hidden p-0">
                {unread.map((n) => (
                  <NotificationItem key={n.id} notif={n} onRead={markRead} />
                ))}
              </Card>
            </section>
          )}

          {read.length > 0 && (
            <section>
              {unread.length > 0 && (
                <h2 className="text-eyebrow text-muted-foreground mb-2">
                  Earlier
                </h2>
              )}
              <Card className="divide-y overflow-hidden p-0">
                {read.map((n) => (
                  <NotificationItem key={n.id} notif={n} onRead={markRead} />
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
