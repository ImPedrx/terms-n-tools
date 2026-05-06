import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EquipmentType {
  id: string;
  name: string;
}

export function useEquipmentTypes() {
  return useQuery({
    queryKey: ['equipment-types'],
    queryFn: async (): Promise<EquipmentType[]> => {
      const { data, error } = await supabase
        .from('equipment_types')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
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
