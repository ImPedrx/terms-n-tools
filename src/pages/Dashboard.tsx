import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, CheckCircle2, Clock, Wrench, Package, FileText, Send, XCircle, Download, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
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
    value: t.value,
    count: allEquipment.filter(e => e.type === t.value).length,
  })).filter(t => t.count > 0);

  const statusLabel = (s: string) => EQUIPMENT_STATUS.find(x => x.value === s)?.label || s;
  const typeLabel = (t: string) => EQUIPMENT_TYPES.find(x => x.value === t)?.label || t;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // ===== Sheet 1: Resumo Dashboard =====
    const wsResume = XLSX.utils.aoa_to_sheet([]);
    // Title
    XLSX.utils.sheet_add_aoa(wsResume, [['RELATÓRIO DE GESTÃO DE TI']], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(wsResume, [[`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]], { origin: 'A2' });
    XLSX.utils.sheet_add_aoa(wsResume, [[`Período: ${PERIOD_OPTIONS.find(p => p.value === periodFilter)?.label || 'Todo o período'}`]], { origin: 'A3' });

    // Equipment summary
    XLSX.utils.sheet_add_aoa(wsResume, [['', '', '', '', '', '']], { origin: 'A4' });
    XLSX.utils.sheet_add_aoa(wsResume, [['RESUMO DE EQUIPAMENTOS']], { origin: 'A5' });
    XLSX.utils.sheet_add_aoa(wsResume, [['Métrica', 'Quantidade', '%']], { origin: 'A6' });
    const eqSummaryData = [
      ['Total de Equipamentos', eqStats.total, '100%'],
      ['Disponíveis', eqStats.disponivel, eqStats.total ? `${Math.round((eqStats.disponivel / eqStats.total) * 100)}%` : '0%'],
      ['Entregues', eqStats.entregue, eqStats.total ? `${Math.round((eqStats.entregue / eqStats.total) * 100)}%` : '0%'],
      ['Em Manutenção', eqStats.manutencao, eqStats.total ? `${Math.round((eqStats.manutencao / eqStats.total) * 100)}%` : '0%'],
      ['Reservados', eqStats.reservado, eqStats.total ? `${Math.round((eqStats.reservado / eqStats.total) * 100)}%` : '0%'],
      ['Baixados', eqStats.baixado, eqStats.total ? `${Math.round((eqStats.baixado / eqStats.total) * 100)}%` : '0%'],
    ];
    XLSX.utils.sheet_add_aoa(wsResume, eqSummaryData, { origin: 'A7' });

    // Terms summary
    XLSX.utils.sheet_add_aoa(wsResume, [['', '', '']], { origin: 'A14' });
    XLSX.utils.sheet_add_aoa(wsResume, [['RESUMO DE TERMOS']], { origin: 'A15' });
    XLSX.utils.sheet_add_aoa(wsResume, [['Métrica', 'Quantidade', '%']], { origin: 'A16' });
    const termSummaryData = [
      ['Total de Termos', termStats.total, '100%'],
      ['Pendentes', termStats.pendente, termStats.total ? `${Math.round((termStats.pendente / termStats.total) * 100)}%` : '0%'],
      ['Enviados p/ Assinatura', termStats.enviado, termStats.total ? `${Math.round((termStats.enviado / termStats.total) * 100)}%` : '0%'],
      ['Fechados', termStats.fechado, termStats.total ? `${Math.round((termStats.fechado / termStats.total) * 100)}%` : '0%'],
      ['Cancelados', termStats.cancelado, termStats.total ? `${Math.round((termStats.cancelado / termStats.total) * 100)}%` : '0%'],
    ];
    XLSX.utils.sheet_add_aoa(wsResume, termSummaryData, { origin: 'A17' });

    // Equipment by type
    XLSX.utils.sheet_add_aoa(wsResume, [['', '', '']], { origin: 'A23' });
    XLSX.utils.sheet_add_aoa(wsResume, [['DISTRIBUIÇÃO POR TIPO']], { origin: 'A24' });
    XLSX.utils.sheet_add_aoa(wsResume, [['Tipo', 'Quantidade', '%']], { origin: 'A25' });
    const typeData = eqByType.map(t => [
      t.label,
      t.count,
      allEquipment.length ? `${Math.round((t.count / allEquipment.length) * 100)}%` : '0%',
    ]);
    XLSX.utils.sheet_add_aoa(wsResume, typeData, { origin: 'A26' });

    // Column widths
    wsResume['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }];

    // Merge title
    wsResume['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
      { s: { r: 14, c: 0 }, e: { r: 14, c: 2 } },
      { s: { r: 23, c: 0 }, e: { r: 23, c: 2 } },
    ];

    XLSX.utils.book_append_sheet(wb, wsResume, 'Dashboard');

    // ===== Sheet 2: Gráficos (data for charts) =====
    const wsCharts = XLSX.utils.aoa_to_sheet([]);
    // Status chart data
    XLSX.utils.sheet_add_aoa(wsCharts, [['GRÁFICO: EQUIPAMENTOS POR STATUS']], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(wsCharts, [['Status', 'Quantidade']], { origin: 'A2' });
    const statusChartData = EQUIPMENT_STATUS.map(s => {
      const count = allEquipment.filter(e => e.status === s.value).length;
      return [s.label, count];
    }).filter(row => (row[1] as number) > 0);
    XLSX.utils.sheet_add_aoa(wsCharts, statusChartData, { origin: 'A3' });

    // Type chart data
    const typeChartStart = statusChartData.length + 5;
    XLSX.utils.sheet_add_aoa(wsCharts, [['GRÁFICO: EQUIPAMENTOS POR TIPO']], { origin: `A${typeChartStart}` });
    XLSX.utils.sheet_add_aoa(wsCharts, [['Tipo', 'Quantidade']], { origin: `A${typeChartStart + 1}` });
    XLSX.utils.sheet_add_aoa(wsCharts, eqByType.map(t => [t.label, t.count]), { origin: `A${typeChartStart + 2}` });

    // Terms chart data
    const termsChartStart = typeChartStart + eqByType.length + 4;
    XLSX.utils.sheet_add_aoa(wsCharts, [['GRÁFICO: TERMOS POR STATUS']], { origin: `A${termsChartStart}` });
    XLSX.utils.sheet_add_aoa(wsCharts, [['Status', 'Quantidade']], { origin: `A${termsChartStart + 1}` });
    const termsChartData = [
      ['Pendentes', termStats.pendente],
      ['Enviados', termStats.enviado],
      ['Fechados', termStats.fechado],
      ['Cancelados', termStats.cancelado],
    ].filter(row => (row[1] as number) > 0);
    XLSX.utils.sheet_add_aoa(wsCharts, termsChartData, { origin: `A${termsChartStart + 2}` });

    wsCharts['!cols'] = [{ wch: 24 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsCharts, 'Gráficos');

    // ===== Sheet 3: Equipamentos =====
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
    wsEq['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 24 }, { wch: 14 },
      { wch: 16 }, { wch: 22 }, { wch: 32 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsEq, 'Equipamentos');

    // ===== Sheet 4: Termos =====
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
    wsTerms['!cols'] = [
      { wch: 14 }, { wch: 24 }, { wch: 32 }, { wch: 24 }, { wch: 14 },
      { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTerms, 'Termos');

    const periodLabel = PERIOD_OPTIONS.find(p => p.value === periodFilter)?.label || '';
    const fileName = `Relatorio_TI_${periodLabel.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const statsCards = [
    { label: 'Total Equipamentos', value: eqStats.total, icon: Monitor, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Disponíveis', value: eqStats.disponivel, icon: Package, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Entregues', value: eqStats.entregue, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Em Manutenção', value: eqStats.manutencao, icon: Wrench, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Baixados', value: eqStats.baixado, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  const termCards = [
    { label: 'Total Termos', value: termStats.total, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Pendentes', value: termStats.pendente, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Enviados p/ Assinatura', value: termStats.enviado, icon: Send, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Fechados', value: termStats.fechado, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Cancelados', value: termStats.cancelado, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  const maxTypeCount = Math.max(...eqByType.map(t => t.count), 1);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Dashboard
          </h1>
          <p className="page-description">Visão geral do sistema de TI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-9">
            <Download className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* Equipment Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Monitor className="h-4 w-4" /> Equipamentos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statsCards.map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Term Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" /> Termos de Responsabilidade
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {termCards.map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Equipment by type */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eqByType.length === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado</p>}
              {eqByType.map(t => {
                const pct = allEquipment.length ? Math.round((t.count / allEquipment.length) * 100) : 0;
                const barWidth = Math.round((t.count / maxTypeCount) * 100);
                return (
                  <div key={t.label} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="text-xs text-muted-foreground">{t.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Equipment by status */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {EQUIPMENT_STATUS.map(s => {
                const count = allEquipment.filter(e => e.status === s.value).length;
                if (count === 0) return null;
                const pct = allEquipment.length ? Math.round((count / allEquipment.length) * 100) : 0;
                const barWidth = Math.round((count / Math.max(...EQUIPMENT_STATUS.map(st => allEquipment.filter(e => e.status === st.value).length), 1)) * 100);
                return (
                  <div key={s.value}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={`${s.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${barWidth}%` }} />
                    </div>
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
