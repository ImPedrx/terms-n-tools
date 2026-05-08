import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { History as HistoryIcon } from 'lucide-react';
import { format } from 'date-fns';

const ACTIONS = ['create', 'update', 'delete'];
const ENTITIES = ['equipment', 'term', 'client', 'analyst', 'playbook', 'equipment_type'];

const actionColor: Record<string, string> = {
  create: 'bg-success/15 text-success border-success/30',
  update: 'bg-primary/15 text-primary border-primary/30',
  delete: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function History() {
  const { effectiveClientId, isAdmin, impersonatedClient } = useTenant();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterUser, setFilterUser] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', effectiveClientId, isAdmin && !impersonatedClient ? 'global' : 'tenant'],
    queryFn: async () => {
      let q = (supabase.from('audit_logs' as any) as any).select('*').order('created_at', { ascending: false }).limit(500);
      if (effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filtered = useMemo(() => {
    return logs.filter((l: any) => {
      if (filterAction !== 'all' && l.action !== filterAction) return false;
      if (filterEntity !== 'all' && l.entity_type !== filterEntity) return false;
      if (filterUser && !((l.user_email || '').toLowerCase().includes(filterUser.toLowerCase()))) return false;
      if (from && new Date(l.created_at) < new Date(from)) return false;
      if (to && new Date(l.created_at) > new Date(to + 'T23:59:59')) return false;
      return true;
    });
  }, [logs, filterAction, filterEntity, filterUser, from, to]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
          <HistoryIcon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="page-title">Histórico</h1>
          <p className="page-description">Auditoria de ações realizadas no sistema</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5"><Label className="text-xs">Ação</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Entidade</Label>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {ENTITIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Usuário (e-mail)</Label>
            <Input value={filterUser} onChange={e => setFilterUser(e.target.value)} placeholder="email@..." />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">De</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Data</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Ação</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Entidade</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Usuário</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Nenhum registro encontrado</td></tr>
              ) : filtered.map((l: any) => (
                <tr key={l.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss')}</td>
                  <td className="p-3"><Badge variant="outline" className={actionColor[l.action] || ''}>{l.action}</Badge></td>
                  <td className="p-3 font-medium">{l.entity_type}</td>
                  <td className="p-3 text-muted-foreground">{l.user_email || '—'}</td>
                  <td className="p-3">{l.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
