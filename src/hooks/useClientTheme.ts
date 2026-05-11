import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

// Converts hex (#RRGGBB) to "H S% L%" string for CSS variables
function hexToHsl(hex: string): string | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function clampL(hsl: string, l: number): string {
  const parts = hsl.split(' ');
  return `${parts[0]} ${parts[1]} ${l}%`;
}

export function useClientTheme() {
  const { effectiveClientId } = useTenant();

  const { data: client } = useQuery({
    queryKey: ['effective-client-theme', effectiveClientId],
    queryFn: async () => {
      if (!effectiveClientId) return null;
      const { data } = await supabase.from('clients').select('primary_color').eq('id', effectiveClientId).maybeSingle();
      return data;
    },
    enabled: !!effectiveClientId,
  });

  useEffect(() => {
    const root = document.documentElement;
    if (!client?.primary_color) {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      return;
    }
    const hsl = hexToHsl(client.primary_color);
    if (!hsl) return;
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-ring', hsl);
    // Soft accent derived from primary
    const isDark = root.classList.contains('dark');
    root.style.setProperty('--accent', clampL(hsl, isDark ? 18 : 95));
    root.style.setProperty('--accent-foreground', clampL(hsl, isDark ? 80 : 30));
  }, [client?.primary_color]);
}
