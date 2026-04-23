import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) console.error("Roles fetch error:", error.message);
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      });
  }, [user]);

  return {
    roles,
    loading,
    isKitchen: roles.includes("kitchen") || roles.includes("admin"),
    isAdmin: roles.includes("admin"),
  };
}
