import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Role = "customer" | "vendor" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchRoles = async (userId: string) => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (mounted) setRoles((data?.map((r) => r.role as Role)) ?? []);
    };

    const handleSession = async (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        await fetchRoles(nextSession.user.id);
      } else if (mounted) {
        setRoles([]);
      }
    };

    void supabase.auth.getSession().then(({ data: { session: existing } }) => {
      void handleSession(existing).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void handleSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signOut }}>
      {loading ? (
        <div className="grid min-h-screen place-items-center bg-background px-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <span className="text-sm font-medium">Checking your session…</span>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
