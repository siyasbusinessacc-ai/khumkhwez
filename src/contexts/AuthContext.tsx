import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const BOOTSTRAP_EMAIL = "siyasbusinessacc@gmail.com";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const REF_KEY = "khumkhwez_pending_ref";

    const tryRedeemPendingReferral = async () => {
      const stored = localStorage.getItem(REF_KEY);
      if (!stored) return;
      try {
        const { data, error } = await supabase.rpc("redeem_referral_code", { _code: stored });
        if (error) {
          console.warn("Referral redeem error:", error.message);
          return;
        }
        const result = data as { ok: boolean; reason?: string } | null;
        if (result?.ok || result?.reason === "already_referred") {
          localStorage.removeItem(REF_KEY);
        }
      } catch (e) {
        console.error("Referral redeem exception:", e);
      }
    };

    const handleBootstrap = async (user: User | null) => {
      if (user?.email?.toLowerCase() === BOOTSTRAP_EMAIL.toLowerCase()) {
        try {
          await supabase.rpc("claim_first_admin");
        } catch (e) {
          console.error("Bootstrap exception:", e);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
        if (session?.user) {
          handleBootstrap(session.user);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        handleBootstrap(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
