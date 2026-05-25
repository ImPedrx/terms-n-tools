import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Language } from '@/lib/i18n';

export interface SerialLengths {
  [key: string]: number;
}

export interface Notice {
  id: string;
  title: string;
  text: string;
  active: boolean;
  created_at: string;
}

export interface SystemSettings {
  term_text: string;
  language: Language;
  company_logo_url: string;
  serial_lengths: SerialLengths;
  notices: Notice[];
}

const DEFAULT_SERIAL_LENGTHS: SerialLengths = {
  notebook: 7, mouse: 10, teclado: 10, projetor: 10,
  workstation: 10, monitor: 10, tablet: 10, celular: 15, outros: 10,
};

export function useSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const { data } = await supabase.from('system_settings').select('key, value');
      const map: Record<string, string> = {};
      data?.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });

      let serial_lengths = DEFAULT_SERIAL_LENGTHS;
      try {
        if (map.serial_lengths) serial_lengths = { ...DEFAULT_SERIAL_LENGTHS, ...JSON.parse(map.serial_lengths) };
      } catch {}

      let notices: Notice[] = [];
      try {
        if (map.notices) notices = JSON.parse(map.notices);
      } catch {}

      return {
        term_text: map.term_text || '',
        language: (map.language as Language) || 'pt',
        company_logo_url: map.company_logo_url || '',
        serial_lengths,
        notices,
      };
    },
  });
}
