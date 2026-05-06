import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';

export function ImpersonationBanner() {
  const { isAdmin, impersonatedClient, setImpersonatedClient } = useTenant();
  if (!isAdmin || !impersonatedClient) return null;

  return (
    <div className="bg-warning/15 border-b border-warning/30 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-4 w-4 text-warning flex-shrink-0" />
        <span className="text-foreground/80 truncate">
          Visualizando como cliente: <strong className="text-foreground">{impersonatedClient.name}</strong>
        </span>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setImpersonatedClient(null)} className="h-7 gap-1 text-xs">
        <X className="h-3 w-3" /> Sair
      </Button>
    </div>
  );
}
