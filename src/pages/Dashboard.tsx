import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, CheckCircle2, Clock, Wrench, Package, FileText, Send, XCircle } from 'lucide-react';

export default function Dashboard() {
  const { data: equipment } = useQuery({
    queryKey: ['equipment-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('equipment').select('status');
      return data || [];
    },
  });

  const { data: terms } = useQuery({
    queryKey: ['terms-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('responsibility_terms').select('status');
      return data || [];
    },
  });

  const eqStats = {
    total: equipment?.length || 0,
    disponivel: equipment?.filter(e => e.status === 'disponivel').length || 0,
    entregue: equipment?.filter(e => e.status === 'entregue').length || 0,
    manutencao: equipment?.filter(e => e.status === 'em_manutencao').length || 0,
  };

  const termStats = {
    pendente: terms?.filter(t => t.status === 'pendente').length || 0,
    enviado: terms?.filter(t => t.status === 'enviado_para_assinatura').length || 0,
    fechado: terms?.filter(t => t.status === 'fechado').length || 0,
    cancelado: terms?.filter(t => t.status === 'cancelado').length || 0,
  };

  const stats = [
    { label: 'Total Equipamentos', value: eqStats.total, icon: Monitor, color: 'text-primary' },
    { label: 'Disponíveis', value: eqStats.disponivel, icon: Package, color: 'text-success' },
    { label: 'Entregues', value: eqStats.entregue, icon: CheckCircle2, color: 'text-primary' },
    { label: 'Em Manutenção', value: eqStats.manutencao, icon: Wrench, color: 'text-warning' },
    { label: 'Termos Pendentes', value: termStats.pendente, icon: Clock, color: 'text-warning' },
    { label: 'Enviados p/ Assinatura', value: termStats.enviado, icon: Send, color: 'text-primary' },
    { label: 'Termos Fechados', value: termStats.fechado, icon: CheckCircle2, color: 'text-success' },
    { label: 'Termos Cancelados', value: termStats.cancelado, icon: XCircle, color: 'text-destructive' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Visão geral do sistema de TI</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
