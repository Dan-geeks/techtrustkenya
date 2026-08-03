import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { routeForNotification } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  reference_id: string | null;
  created_at: string;
}

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const NotificationsBell = () => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchItems = async () => {
    if (!user) return;
    const { data: notificationsData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Message notifications are now real rows written by trg_messages_notify,
    // so nothing is synthesised here. Synthesising from unread messages meant a
    // thread vanished from notifications the moment ChatWidget marked it read.
    setItems((notificationsData ?? []).slice(0, 15) as Notification[]);

  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    fetchItems();

    const notificationsChannel = supabase
      .channel(`notifications:${user.id}:${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchItems()
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`unread_messages:${user.id}:${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((i) => !i.is_read).length;

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAll = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  };

  const handleClick = async (n: Notification & { _partnerName?: string }) => {
    if (n.type === "message") {
      setOpen(false);
      if (!n.is_read) await markOne(n.id);
      const partnerName = n.title.replace(/^New message from /, "");

      // Land on the inbox for whichever side you are, rather than leaving the
      // user to navigate there themselves, then open the thread so they can
      // reply straight away. reference_id holds the sender's profiles(id).
      navigate(roles?.includes("vendor") ? "/vendor/dashboard?tab=Messages" : "/profile#messages");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("open-chat", { detail: { partnerId: n.reference_id, partnerName } })
        );
      }, 250);
      fetchItems();
      return;
    }
    
    if (!n.is_read) await markOne(n.id);
    const route = routeForNotification(n, roles ?? []);
    setOpen(false);
    if (route) navigate(route);
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full text-left px-3 py-3 border-b last:border-b-0 hover:bg-secondary/50 transition-colors flex gap-2",
                  !n.is_read && "bg-accent/5"
                )}
              >
                {!n.is_read && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                )}
                <div className={cn("flex-1 min-w-0", n.is_read && "pl-4")}>
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t text-center">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs text-accent hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
