import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  
  display_name: string | null;
  creator_id: string | null;
  avatar_url: string | null;
}

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  isCreator: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (uid: string) => {
      await (supabase as any).rpc("sync_current_user_creator_profile");
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (!mounted) return;
      setProfile((p as Profile) ?? null);
      setIsCreator((roles ?? []).some((r: { role: string }) => r.role === "creator"));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(() => loadProfile(u.id), 0);
      } else {
        setProfile(null);
        setIsCreator(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id).finally(() => mounted && setLoading(false));
      else mounted && setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, isCreator, loading };
}
