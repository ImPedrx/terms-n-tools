import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import type { Database } from '@/integrations/supabase/types';

type Term = Database['public']['Tables']['responsibility_terms']['Row'];
type Equipment = Database['public']['Tables']['equipment']['Row'];

export interface Collaborator {
  key: string;
  displayName: string;
  rawNames: string[];
  terms: Term[];
  heldEquipment: Equipment[];
  termCount: number;
  equipmentCount: number;
  sector: string | null;
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Picks the most "complete" raw variant: most word tokens, then longest, then most frequent.
function pickDisplayName(rawNames: string[]): string {
  const freq = new Map<string, number>();
  for (const n of rawNames) freq.set(n, (freq.get(n) || 0) + 1);
  return [...freq.keys()].sort((a, b) => {
    const ta = a.trim().split(/\s+/).length;
    const tb = b.trim().split(/\s+/).length;
    if (tb !== ta) return tb - ta;
    if (b.length !== a.length) return b.length - a.length;
    return (freq.get(b) || 0) - (freq.get(a) || 0);
  })[0];
}

function aggregate(terms: Term[], equipment: Equipment[]): Collaborator[] {
  const groups = new Map<string, { rawNames: string[]; terms: Term[]; held: Map<string, Equipment> }>();

  const ensure = (key: string) => {
    let g = groups.get(key);
    if (!g) { g = { rawNames: [], terms: [], held: new Map() }; groups.set(key, g); }
    return g;
  };

  for (const t of terms) {
    if (!t.collaborator_name?.trim()) continue;
    const g = ensure(normalizeName(t.collaborator_name));
    g.rawNames.push(t.collaborator_name);
    g.terms.push(t);
  }

  for (const e of equipment) {
    for (const raw of [e.assigned_to, e.legacy_user_name]) {
      if (!raw?.trim()) continue;
      const g = ensure(normalizeName(raw));
      g.rawNames.push(raw);
      g.held.set(e.id, e);
    }
  }

  return [...groups.entries()]
    .map(([key, g]) => {
      const rawNames = [...new Set(g.rawNames)];
      const heldEquipment = [...g.held.values()];
      return {
        key,
        displayName: pickDisplayName(rawNames),
        rawNames,
        terms: g.terms,
        heldEquipment,
        termCount: g.terms.length,
        equipmentCount: heldEquipment.length,
        sector: deriveSector(g.terms, heldEquipment),
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
}

// Setor preferido: termo mais recente com collaborator_sector preenchido; fallback para o
// setor mais comum entre os equipamentos em posse.
function deriveSector(terms: Term[], heldEquipment: Equipment[]): string | null {
  for (const t of terms) {
    const s = t.collaborator_sector?.trim();
    if (s) return s;
  }
  const counts = new Map<string, number>();
  for (const e of heldEquipment) {
    const s = e.sector?.trim();
    if (s) counts.set(s, (counts.get(s) || 0) + 1);
  }
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// Suggests collaborators that may be the same person: one's token list is a prefix of the
// other's (covers a missing surname, e.g. "miriam de oliveira" ⊂ "miriam de oliveira da silva").
export function findSimilar(all: Collaborator[], target: Collaborator): Collaborator[] {
  const tt = target.key.split(' ');
  return all.filter((c) => {
    if (c.key === target.key) return false;
    const ct = c.key.split(' ');
    const [shorter, longer] = tt.length <= ct.length ? [tt, ct] : [ct, tt];
    return shorter.every((tok, i) => tok === longer[i]);
  });
}

export function useCollaborators() {
  const { effectiveClientId, isAdmin } = useTenant();
  return useQuery({
    queryKey: ['collaborators', effectiveClientId],
    queryFn: async () => {
      let tq = supabase.from('responsibility_terms').select('*').order('created_at', { ascending: false });
      let eq = supabase.from('equipment').select('*');
      if (isAdmin && effectiveClientId) {
        tq = tq.eq('client_id', effectiveClientId);
        eq = eq.eq('client_id', effectiveClientId);
      }
      const [termsRes, equipRes] = await Promise.all([tq, eq]);
      return aggregate(termsRes.data || [], equipRes.data || []);
    },
  });
}
