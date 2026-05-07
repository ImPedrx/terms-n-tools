import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface EquipmentType {
  id: string;
  name: string;
  min_stock_alert: number;
}

export function useEquipmentTypes() {
  const { effectiveClientId, isAdmin } = useTenant();
  return useQuery({
    queryKey: ['equipment-types', effectiveClientId],
    queryFn: async (): Promise<EquipmentType[]> => {
      let q = supabase.from('equipment_types').select('id, name, min_stock_alert').order('name');
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EquipmentType[];
    },
  });
}

export function useCreateEquipmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Nome obrigatório');
      const { data, error } = await supabase
        .from('equipment_types')
        .insert({ name: trimmed })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-types'] }),
  });
}

export function useUpdateEquipmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, min_stock_alert }: { id: string; min_stock_alert: number }) => {
      const { error } = await supabase.from('equipment_types').update({ min_stock_alert }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-types'] }),
  });
}

export function useDeleteEquipmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipment_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-types'] }),
  });
}
