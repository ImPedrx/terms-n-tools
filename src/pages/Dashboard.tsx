import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, CheckCircle2, Clock, Wrench, Package, FileText, Send, XCircle, Download, BarChart3, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { EQUIPMENT_STATUS } from '@/lib/constants';
import { useEquipmentTypes } from '@/hooks/useEquipmentTypes';
import { subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { exportToExcel } from '@/lib/excelExport';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { NoticesCarousel } from '@/components/NoticesCarousel';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo o período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
];

export default function Dashboard() {
  const [periodFilter, setPeriodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { data: equipmentTypes = [] } = useEquipmentTypes();
  const { effectiveClientId, isAdmin } = useTenant();

  const { data: equipment } = useQuery({
    queryKey: ['equipment-full', effectiveClientId],
    queryFn: async () => {
      let q = supabase.from('equipment').select('*');
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: terms } = useQuery({
    queryKey: ['terms-full', effectiveClientId],
    queryFn: async () => {
      let q = supabase.from('responsibility_terms').select('*');
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data } = await q;
      return data || [];
    },
  });

  const getDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      case 'this_month': return startOfMonth(now);
      case 'last_month': return startOfMonth(subMonths(now, 1));
      default: return null;
    }
  };

  const getEndDate = () => {
    if (periodFilter === 'last_month') return endOfMonth(subMonths(new Date(), 1));
    return new Date();
  };

  const filteredEquipment = equipment?.filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    const start = getDateRange();
    if (start) {
      const d = new Date(e.created_at);
      if (d < start || d > getEndDate()) return false;
    }
    return true;
  }) || [];

  const filteredTerms = terms?.filter(t => {
    const start = getDateRange();
    if (start) {
      const d = new Date(t.created_at);
      if (d < start || d > getEndDate()) return false;
    }
    return true;
  }) || [];

  const allEquipment = equipment || [];

  const eqStats = {
    total: filteredEquipment.length,
    disponivel: filteredEquipment.filter(e => e.status === 'disponivel').length,
    entregue: filteredEquipment.filter(e => e.status === 'entregue').length,
    manutencao: filteredEquipment.filter(e => e.status === 'em_manutencao').length,
    reservado: filteredEquipment.filter(e => e.status === 'reservado').length,
    baixado: filteredEquipment.filter(e => e.status === 'baixado').length,
  };

  const termStats = {
    total: filteredTerms.length,
    pendente: filteredTerms.filter(t => t.status === 'pendente').length,
    enviado: filteredTerms.filter(t => t.status === 'enviado_para_assinatura').length,
    fechado: filteredTerms.filter(t => t.status === 'fechado').length,
    cancelado: filteredTerms.filter(t => t.status === 'cancelado').length,
  };

  const eqByType = equipmentTypes.map(t => ({
    label: t.name,
    value: t.name,
    count: allEquipment.filter(e => e.type === t.name).length,
  })).filter(t => t.count > 0);

  const { toast } = useToast();

  const exportExcel = async () => {
    try {
      await exportToExcel({
        periodLabel: PERIOD_OPTIONS.find(p => p.value === periodFilter)?.label || 'Todo o período',
        eqStats, termStats, eqByType, allEquipment, filteredEquipment, filteredTerms,
      });
      toast({ title: 'Relatório exportado com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao exportar', description: err?.message, variant: 'destructive' });
    }
  };

  const statsCards = [
    { label: 'Total', value: eqStats.total, icon: Monitor, color: 'text-primary', bg: 'bg-primary/10', hero: true },
    { label: 'Disponíveis', value: eqStats.disponivel, icon: Package, color: 'text-success', bg: 'bg-success/10', hero: false },
    { label: 'Entregues', value: eqStats.entregue, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', hero: false },
    { label: 'Manutenção', value: eqStats.manutencao, icon: Wrench, color: 'text-warning', bg: 'bg-warning/10', hero: false },
    { label: 'Baixados', value: eqStats.baixado, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', hero: false },
  ];

  const termCards = [
    { label: 'Total', value: termStats.total, icon: FileText, color: 'text-primary', bg: 'bg-primary/10', hero: true },
    { label: 'Pendentes', value: termStats.pendente, icon: Clock, color: 'text-warning', bg: 'bg-warning/10', hero: false },
    { label: 'Enviados', value: termStats.enviado, icon: Send, color: 'text-primary', bg: 'bg-primary/10', hero: false },
    { label: 'Fechados', value: termStats.fechado, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', hero: false },
    { label: 'Cancelados', value: termStats.cancelado, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', hero: false },
  ];

  const maxTypeCount = Math.max(...eqByType.map(t => t.count), 1);

  // Alertas de estoque: tipos com disponíveis abaixo do limiar definido
  const stockAlerts = equipmentTypes
    .filter(t => (t.min_stock_alert || 0) > 0)
    .map(t => ({
      name: t.name,
      available: allEquipment.filter(e => e.type === t.name && e.status === 'disponivel').length,
      min: t.min_stock_alert,
    }))
    .filter(a => a.available <= a.min);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do sistema de TI</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm rounded-xl bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm rounded-xl bg-card border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {equipmentTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportExcel} className="h-9 rounded-xl gap-2 text-sm font-medium border-border">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </div>
      </div>

      {/* Avisos */}
      <NoticesCarousel />

      {/* Alertas de Estoque */}
      {stockAlerts.length > 0 && (
        <div>
          <p className="section-label">
            <AlertTriangle className="h-3 w-3 text-warning" /> Alertas de Estoque
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockAlerts.map(a => (
              <div key={a.name} className="bento-card p-4 flex items-center gap-3 border-l-[3px] border-l-warning">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-bold text-warning">{a.available}</span> disponíve{a.available === 1 ? 'l' : 'is'} · mínimo {a.min}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment Stats — bento grid */}
      <div>
        <p className="section-label">
          <Monitor className="h-3 w-3" /> Equipamentos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Hero card: Total */}
          <div className="stat-card-hero col-span-2 sm:col-span-1 lg:col-span-1 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Monitor className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Total</span>
            </div>
            <div>
              <div className="text-4xl font-bold tracking-tight">{eqStats.total}</div>
              <p className="text-xs text-white/70 mt-1">equipamentos</p>
            </div>
          </div>
          {/* Other cards */}
          {statsCards.slice(1).map((stat) => (
            <div key={stat.label} className="stat-card flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                {eqStats.total > 0 && (
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {Math.round((stat.value / eqStats.total) * 100)}%
                  </span>
                )}
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Term Stats — bento grid */}
      <div>
        <p className="section-label">
          <FileText className="h-3 w-3" /> Termos de Responsabilidade
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Hero card: Total */}
          <div className="stat-card-hero col-span-2 sm:col-span-1 lg:col-span-1 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Total</span>
            </div>
            <div>
              <div className="text-4xl font-bold tracking-tight">{termStats.total}</div>
              <p className="text-xs text-white/70 mt-1">termos</p>
            </div>
          </div>
          {/* Other cards */}
          {termCards.slice(1).map((stat) => (
            <div key={stat.label} className="stat-card flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                {termStats.total > 0 && (
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {Math.round((stat.value / termStats.total) * 100)}%
                  </span>
                )}
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts — bento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bento-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">Distribuição por Tipo</span>
          </div>
          <div className="space-y-4">
            {eqByType.length === 0 && (
              <div className="text-center py-10">
                <Monitor className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado</p>
              </div>
            )}
            {eqByType.map(t => {
              const pct = allEquipment.length ? Math.round((t.count / allEquipment.length) * 100) : 0;
              const barWidth = Math.round((t.count / maxTypeCount) * 100);
              return (
                <div key={t.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums">{t.count}</span>
                      <span className="text-[11px] text-muted-foreground font-medium w-8 text-right tabular-nums">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-700 ease-out" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bento-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">Distribuição por Status</span>
          </div>
          <div className="space-y-4">
            {EQUIPMENT_STATUS.map(s => {
              const count = allEquipment.filter(e => e.status === s.value).length;
              if (count === 0) return null;
              const pct = allEquipment.length ? Math.round((count / allEquipment.length) * 100) : 0;
              const maxSt = Math.max(...EQUIPMENT_STATUS.map(st => allEquipment.filter(e => e.status === st.value).length), 1);
              const barWidth = Math.round((count / maxSt) * 100);
              return (
                <div key={s.value}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums">{count}</span>
                      <span className="text-[11px] text-muted-foreground font-medium w-8 text-right tabular-nums">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className={`${s.color} h-1.5 rounded-full transition-all duration-700 ease-out`} style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
            {allEquipment.length === 0 && (
              <div className="text-center py-10">
                <BarChart3 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
