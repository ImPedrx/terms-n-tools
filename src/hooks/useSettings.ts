import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Language } from '@/lib/i18n';

export interface SerialLengths { [key: string]: number; }

export interface SystemSettings {
  term_text: string;
  language: Language;
  company_logo_url: string;
  serial_lengths: SerialLengths;
}

const DEFAULT_SERIAL_LENGTHS: SerialLengths = {
  notebook: 7, mouse: 10, teclado: 10, projetor: 10,
  workstation: 10, monitor: 10, tablet: 10, celular: 15, outros: 10,
};

export function useSettings() {
  const { effectiveClientId } = useAuth();
  return useQuery({
    queryKey: ['system-settings', effectiveClientId],
    enabled: !!effectiveClientId,
    queryFn: async (): Promise<SystemSettings> => {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('client_id', effectiveClientId!);
      const map: Record<string, string> = {};
      data?.forEach((r) => { map[r.key] = r.value; });

      let serial_lengths = DEFAULT_SERIAL_LENGTHS;
      try {
        if (map.serial_lengths) serial_lengths = { ...DEFAULT_SERIAL_LENGTHS, ...JSON.parse(map.serial_lengths) };
      } catch { /* ignore */ }

      return {
        term_text: map.term_text || '',
        language: (map.language as Language) || 'pt',
        company_logo_url: map.company_logo_url || '',
        serial_lengths,
      };
    },
  });
}
