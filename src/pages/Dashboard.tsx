import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, CheckCircle2, Clock, Wrench, Package, FileText, Send, XCircle, Download, BarChart3 } from 'lucide-react';
import { EQUIPMENT_TYPES, EQUIPMENT_STATUS } from '@/lib/constants';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

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

  const { data: equipment } = useQuery({
    queryKey: ['equipment-full'],
    queryFn: async () => {
      const { data } = await supabase.from('equipment').select('*');
      return data || [];
    },
  });

  const { data: terms } = useQuery({
    queryKey: ['terms-full'],
    queryFn: async () => {
      const { data } = await supabase.from('responsibility_terms').select('*');
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

  const eqByType = EQUIPMENT_TYPES.map(t => ({
    label: t.label,
    count: allEquipment.filter(e => e.type === t.value).length,
  })).filter(t => t.count > 0);

  const statsCards = [
    { label: 'Total Equipamentos', value: eqStats.total, icon: Monitor, color: 'text-primary' },
    { label: 'Disponíveis', value: eqStats.disponivel, icon: Package, color: 'text-success' },
    { label: 'Entregues', value: eqStats.entregue, icon: CheckCircle2, color: 'text-primary' },
    { label: 'Em Manutenção', value: eqStats.manutencao, icon: Wrench, color: 'text-warning' },
    { label: 'Total Termos', value: termStats.total, icon: FileText, color: 'text-primary' },
    { label: 'Pendentes', value: termStats.pendente, icon: Clock, color: 'text-warning' },
    { label: 'Enviados p/ Assinatura', value: termStats.enviado, icon: Send, color: 'text-primary' },
    { label: 'Fechados', value: termStats.fechado, icon: CheckCircle2, color: 'text-success' },
    { label: 'Cancelados', value: termStats.cancelado, icon: XCircle, color: 'text-destructive' },
  ];

  const statusLabel = (s: string) => EQUIPMENT_STATUS.find(x => x.value === s)?.label || s;
  const typeLabel = (t: string) => EQUIPMENT_TYPES.find(x => x.value === t)?.label || t;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1 - Equipment
    const eqRows = filteredEquipment.map(e => ({
      'Tipo': typeLabel(e.type),
      'Marca': e.brand,
      'Modelo': e.model,
      'Nº Série': e.serial_number,
      'Patrimônio': e.patrimony || 'N/A',
      'Status': statusLabel(e.status),
      'Responsável': e.assigned_to || '—',
      'Observações': e.observations || '',
      'Cadastrado em': format(new Date(e.created_at), 'dd/MM/yyyy HH:mm'),
    }));
    const wsEq = XLSX.utils.json_to_sheet(eqRows);
    wsEq['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 30 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsEq, 'Equipamentos');

    // Sheet 2 - Terms
    const termRows = filteredTerms.map(t => ({
      'Chamado': t.ticket_number,
      'Colaborador': t.collaborator_name,
      'Equipamento': t.equipment_description,
      'Nº Série': t.serial_number,
      'Patrimônio': t.patrimony || 'N/A',
      'Analista': t.analyst_name,
      'Status': t.status === 'pendente' ? 'Pendente' :
                t.status === 'enviado_para_assinatura' ? 'Enviado p/ Assinatura' :
                t.status === 'fechado' ? 'Fechado' : 'Cancelado',
      'Criado em': format(new Date(t.created_at), 'dd/MM/yyyy HH:mm'),
      'PDF Assinado': (t as any).signed_pdf_path ? 'Sim' : 'Não',
    }));
    const wsTerms = XLSX.utils.json_to_sheet(termRows);
    wsTerms['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTerms, 'Termos');

    // Sheet 3 - Summary
    const summaryRows = [
      { 'Métrica': 'Total Equipamentos', 'Valor': eqStats.total },
      { 'Métrica': 'Disponíveis', 'Valor': eqStats.disponivel },
      { 'Métrica': 'Entregues', 'Valor': eqStats.entregue },
      { 'Métrica': 'Em Manutenção', 'Valor': eqStats.manutencao },
      { 'Métrica': 'Reservados', 'Valor': eqStats.reservado },
      { 'Métrica': 'Baixados', 'Valor': eqStats.baixado },
      { 'Métrica': '', 'Valor': '' },
      { 'Métrica': 'Total Termos', 'Valor': termStats.total },
      { 'Métrica': 'Pendentes', 'Valor': termStats.pendente },
      { 'Métrica': 'Enviados p/ Assinatura', 'Valor': termStats.enviado },
      { 'Métrica': 'Fechados', 'Valor': termStats.fechado },
      { 'Métrica': 'Cancelados', 'Valor': termStats.cancelado },
      { 'Métrica': '', 'Valor': '' },
      ...eqByType.map(t => ({ 'Métrica': `Equipamentos: ${t.label}`, 'Valor': t.count })),
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    const periodLabel = PERIOD_OPTIONS.find(p => p.value === periodFilter)?.label || '';
    const fileName = `Relatorio_TI_${periodLabel.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Visão geral do sistema de TI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {statsCards.map((stat) => (
          <Card key={stat.label} className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Equipment by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Equipamentos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eqByType.length === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento</p>}
              {eqByType.map(t => {
                const pct = allEquipment.length ? Math.round((t.count / allEquipment.length) * 100) : 0;
                return (
                  <div key={t.label} className="flex items-center gap-3">
                    <span className="text-sm w-24 truncate">{t.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Equipment by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Equipamentos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {EQUIPMENT_STATUS.map(s => {
                const count = allEquipment.filter(e => e.status === s.value).length;
                if (count === 0) return null;
                const pct = allEquipment.length ? Math.round((count / allEquipment.length) * 100) : 0;
                return (
                  <div key={s.value} className="flex items-center gap-3">
                    <span className="text-sm w-24 truncate">{s.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-2.5">
                      <div className={`${s.color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
