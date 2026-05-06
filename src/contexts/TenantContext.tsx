import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  id: string;
  role: 'auksys_admin' | 'client_analyst' | string;
  client_id: string | null;
  full_name: string | null;
}

export interface ClientRow {
  id: string;
  name: string;
  is_active: boolean;
  primary_color: string;
  logo_url: string | null;
}

interface TenantContextType {
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  impersonatedClientId: string | null;
  impersonatedClient: ClientRow | null;
  effectiveClientId: string | null;
  setImpersonatedClient: (c: ClientRow | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const IMPERSONATE_KEY = 'auksys_impersonate_client';

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedClient, setImpersonatedClientState] = useState<ClientRow | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setProfile(null); setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile(data as UserProfile | null);
      setLoading(false);
    })();
  }, [user, authLoading]);

  // Restore impersonation from localStorage (admin only)
  useEffect(() => {
    if (profile?.role === 'auksys_admin') {
      const raw = localStorage.getItem(IMPERSONATE_KEY);
      if (raw) {
        try { setImpersonatedClientState(JSON.parse(raw)); } catch {}
      }
    } else {
      setImpersonatedClientState(null);
    }
  }, [profile?.role]);

  const setImpersonatedClient = (c: ClientRow | null) => {
    setImpersonatedClientState(c);
    if (c) localStorage.setItem(IMPERSONATE_KEY, JSON.stringify(c));
    else localStorage.removeItem(IMPERSONATE_KEY);
    // Force reload of all queries by reloading the page
    setTimeout(() => window.location.reload(), 100);
  };

  const isAdmin = profile?.role === 'auksys_admin';
  const effectiveClientId = isAdmin
    ? (impersonatedClient?.id || null)
    : (profile?.client_id || null);

  return (
    <TenantContext.Provider value={{
      profile, isAdmin, loading,
      impersonatedClientId: impersonatedClient?.id || null,
      impersonatedClient,
      effectiveClientId,
      setImpersonatedClient,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be inside TenantProvider');
  return ctx;
}
