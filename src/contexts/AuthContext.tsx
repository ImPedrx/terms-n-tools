import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'auksys_admin' | 'client_analyst';

export interface UserProfile {
  id: string;
  client_id: string | null;
  role: UserRole;
  full_name: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuksysAdmin: boolean;
  /** ID do cliente em uso. Para analista = seu próprio. Para admin = client_id selecionado (impersonate) ou null. */
  effectiveClientId: string | null;
  /** Nome do cliente impersonado (apenas admin). */
  impersonatingClientName: string | null;
  setImpersonatedClient: (id: string | null, name?: string | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const IMPERSONATE_KEY = 'auksys_impersonate';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonate, setImpersonate] = useState<{ id: string; name: string } | null>(() => {
    try {
      const raw = sessionStorage.getItem(IMPERSONATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, client_id, role, full_name')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data as UserProfile | null);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else setProfile(null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const setImpersonatedClient = (id: string | null, name?: string | null) => {
    if (id && name) {
      const v = { id, name };
      sessionStorage.setItem(IMPERSONATE_KEY, JSON.stringify(v));
      setImpersonate(v);
    } else {
      sessionStorage.removeItem(IMPERSONATE_KEY);
      setImpersonate(null);
    }
  };

  const isAuksysAdmin = profile?.role === 'auksys_admin';
  const effectiveClientId = isAuksysAdmin ? (impersonate?.id ?? null) : (profile?.client_id ?? null);
  const impersonatingClientName = isAuksysAdmin ? (impersonate?.name ?? null) : null;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };
  const signOut = async () => {
    sessionStorage.removeItem(IMPERSONATE_KEY);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      isAuksysAdmin, effectiveClientId, impersonatingClientName,
      setImpersonatedClient, signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
