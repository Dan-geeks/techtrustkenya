import { useEffect, useState } from "react";
import { MessageCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const MessagesTab = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*, sender:sender_id(full_name), receiver:receiver_id(full_name)")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (data) {
      const uniquePartners = new Map();
      data.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const partnerName = msg.sender_id === user.id ? msg.receiver?.full_name : msg.sender?.full_name;
        if (!uniquePartners.has(partnerId)) {
          uniquePartners.set(partnerId, {
            partnerId,
            partnerName: partnerName || "Customer",
            lastMessage: msg.content,
            isUnread: msg.receiver_id === user.id && !msg.is_read,
            timestamp: msg.created_at,
          });
        }
      });
      setConversations(Array.from(uniquePartners.values()));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground text-sm">Loading messages...</div>;
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Customer Inquiries
        </h2>
      </div>

      <div className="space-y-3">
        {conversations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/50">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm font-semibold text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">When customers message you, they will appear here.</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div 
              key={conv.partnerId} 
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-chat", {
                    detail: { partnerId: conv.partnerId, partnerName: conv.partnerName },
                  })
                );
              }}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {conv.partnerName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    {conv.partnerName}
                    {conv.isUnread && (
                      <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        New
                      </span>
                    )}
                  </h3>
                  <p className={`text-xs truncate max-w-[200px] sm:max-w-[400px] mt-1 ${conv.isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(conv.timestamp).toLocaleDateString()}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
