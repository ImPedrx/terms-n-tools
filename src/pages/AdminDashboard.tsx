import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Monitor, FileText, Users, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportAdminClientsExcel } from '@/lib/adminExcelExport';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    try { setExporting(true); await exportAdminClientsExcel(); toast({ title: 'Exportação concluída' }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
    finally { setExporting(false); }
  };
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-global-clients'],
    queryFn: async () => (await supabase.from('clients').select('*')).data || [],
  });
  const { data: equipment = [] } = useQuery({
    queryKey: ['admin-global-eq'],
    queryFn: async () => (await supabase.from('equipment').select('id, client_id, status')).data || [],
  });
  const { data: terms = [] } = useQuery({
    queryKey: ['admin-global-terms'],
    queryFn: async () => (await supabase.from('responsibility_terms').select('id, client_id, status')).data || [],
  });
  const { data: analysts = [] } = useQuery({
    queryKey: ['admin-global-analysts'],
    queryFn: async () => (await supabase.from('analysts').select('id, client_id')).data || [],
  });

  const cards = [
    { label: 'Clientes ativos', value: clients.filter((c: any) => c.is_active).length, icon: Building2 },
    { label: 'Equipamentos (todos)', value: equipment.length, icon: Monitor },
    { label: 'Termos (todos)', value: terms.length, icon: FileText },
    { label: 'Analistas', value: analysts.length, icon: Users },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Dashboard Global</h1>
          <p className="page-description">Visão consolidada de todos os clientes</p>
        </div>
        <Button onClick={handleExport} disabled={exporting} className="gap-2 h-10 rounded-xl">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          Exportar Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold">{c.value}</div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Cliente</th>
                <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Equipamentos</th>
                <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Termos</th>
                <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Analistas</th>
                <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-right">{equipment.filter((e: any) => e.client_id === c.id).length}</td>
                  <td className="p-3 text-right">{terms.filter((t: any) => t.client_id === c.id).length}</td>
                  <td className="p-3 text-right">{analysts.filter((a: any) => a.client_id === c.id).length}</td>
                  <td className="p-3 text-right">
                    <span className={c.is_active ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                      {c.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
