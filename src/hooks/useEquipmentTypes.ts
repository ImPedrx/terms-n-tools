import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EquipmentTypeRow {
  id: string;
  client_id: string;
  name: string;
}

/** Tipos de equipamento dinâmicos do cliente em uso. */
export function useEquipmentTypes() {
  const { effectiveClientId } = useAuth();
  return useQuery({
    queryKey: ['equipment-types', effectiveClientId],
    enabled: !!effectiveClientId,
    queryFn: async (): Promise<EquipmentTypeRow[]> => {
      const { data, error } = await supabase
        .from('equipment_types')
        .select('*')
        .eq('client_id', effectiveClientId!)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

/** Capitaliza primeira letra para exibição. */
export const formatTypeName = (n: string) => n.charAt(0).toUpperCase() + n.slice(1);
