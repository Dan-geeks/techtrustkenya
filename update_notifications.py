import re

filepath = r"C:\Users\Administrator\techtrustkenya\src\pages\Notifications.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Notification interface
content = content.replace(
    "  created_at: string;\n}",
    "  created_at: string;\n  _partnerName?: string;\n}"
)

# 2. Update handleClick
old_handleClick = """  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id);
    const route = routeForNotification(notif);
    if (route) {
      navigate(route);
    } else {
      setExpanded((v) => !v);
    }
  };"""

new_handleClick = """  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id);
    
    if (notif.type === "new_message") {
      window.dispatchEvent(
        new CustomEvent("open-chat", {
          detail: { partnerId: notif.reference_id, partnerName: notif._partnerName || "User" },
        })
      );
      return;
    }
    
    const route = routeForNotification(notif);
    if (route) {
      navigate(route);
    } else {
      setExpanded((v) => !v);
    }
  };"""
content = content.replace(old_handleClick, new_handleClick)

# 3. Update useEffect
old_effect = """  useEffect(() => {
    document.title = "Notifications | TechTrust";
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifs((data as Notification[]) ?? []);
      setLoading(false);
    })();
  }, [user]);"""

new_effect = """  useEffect(() => {
    document.title = "Notifications | TechTrust";
    if (!user) return;

    (async () => {
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: messagesData } = await supabase
        .from("messages")
        .select("*, sender:sender_id(full_name)")
        .eq("receiver_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      const messageNotifications = (messagesData || []).map((msg: any) => ({
        id: msg.id,
        title: "New Message",
        message: `${msg.sender?.full_name || "Someone"}: ${msg.content}`,
        type: "new_message",
        is_read: false,
        reference_id: msg.sender_id,
        created_at: msg.created_at,
        _partnerName: msg.sender?.full_name || "User"
      }));

      const merged = [...((notificationsData as Notification[]) ?? []), ...messageNotifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setNotifs(merged);
      setLoading(false);
    })();
  }, [user]);"""
content = content.replace(old_effect, new_effect)

# 4. Update markRead
old_markRead = """  const markRead = async (id: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };"""

new_markRead = """  const markRead = async (id: string) => {
    const notif = notifs.find(n => n.id === id);
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (notif?.type === "new_message") {
      await supabase.from("messages").update({ is_read: true }).eq("id", id);
    } else {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }
  };"""
content = content.replace(old_markRead, new_markRead)

# 5. Update markAllRead
old_markAllRead = """  const markAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    
    setMarkingAll(false);
    if (error) {
      toast.error("Failed to mark notifications as read");
    } else {
      toast.success("All caught up!");
    }
  };"""

new_markAllRead = """  const markAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
      
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);
    
    setMarkingAll(false);
    toast.success("All caught up!");
  };"""
content = content.replace(old_markAllRead, new_markAllRead)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Notifications.tsx")
