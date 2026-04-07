import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Language } from '@/lib/i18n';

export interface SystemSettings {
  term_text: string;
  language: Language;
  company_logo_url: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const { data } = await supabase.from('system_settings').select('key, value');
      const map: Record<string, string> = {};
      data?.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
      return {
        term_text: map.term_text || '',
        language: (map.language as Language) || 'pt',
        company_logo_url: map.company_logo_url || '',
      };
    },
  });
}
