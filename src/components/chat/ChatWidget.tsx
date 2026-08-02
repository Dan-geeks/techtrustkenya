import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, CheckCheck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("Chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenChat = async (e: Event) => {
      if (!user) {
        toast.error("Please login to send messages");
        return;
      }
      const customEvent = e as CustomEvent;
      const { partnerId, partnerName: pName } = customEvent.detail;
      
      if (partnerId === user.id) {
        toast.error("You cannot message yourself");
        return;
      }

      setActivePartnerId(partnerId);
      setPartnerName(pName || "Chat");
      setIsOpen(true);
      fetchMessages(partnerId);
      markMessagesAsRead(partnerId);
    };

    window.addEventListener("open-chat", handleOpenChat);
    return () => window.removeEventListener("open-chat", handleOpenChat);
  }, [user]);

  const fetchMessages = async (partnerId: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const markMessagesAsRead = async (partnerId: string) => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("sender_id", partnerId)
      .eq("is_read", false);
  };

  useEffect(() => {
    if (!user || !activePartnerId) return;

    // Realtime subscription
    const channel = supabase
      .channel("messages_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === activePartnerId) {
              setMessages((prev) => [...prev, newMsg]);
              scrollToBottom();
              markMessagesAsRead(activePartnerId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activePartnerId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activePartnerId) return;

    const tempMessage = newMessage;
    setNewMessage("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: activePartnerId,
        content: tempMessage,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    } else {
      toast.error("Failed to send message: " + (error?.message || "Unknown error"));
      console.error("Chat send error:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-[350px] bg-white rounded-2xl shadow-2xl border border-border z-50 overflow-hidden flex flex-col h-[500px] max-h-[80vh]">
      {/* Header */}
      <div className="bg-[#0f3d8c] text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">{partnerName}</h3>
            <span className="text-[10px] text-white/80">Online</span>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#f8fafc] space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs mt-10">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div 
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    isMe 
                      ? "bg-[#0f3d8c] text-white rounded-br-sm" 
                      : "bg-white text-foreground border border-border shadow-sm rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && (
                    <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-blue-500' : 'text-slate-300'}`} />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-border flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d8c]/30"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="w-10 h-10 bg-[#0f3d8c] text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-[#002766] transition-colors shrink-0"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
};
