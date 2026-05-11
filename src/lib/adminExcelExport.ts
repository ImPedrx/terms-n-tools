import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

const HEADER_BG = 'FF1565C0';
const HEADER_BG_DARK = 'FF0D47A1';
const SUBHEADER_BG = 'FF42A5F5';
const ZEBRA = 'FFF5F9FF';
const ALERT_BG = 'FFFFF3E0';
const ALERT_TEXT = 'FFE65100';

export async function exportAdminClientsExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Auksys IT Tools';
  wb.created = new Date();

  const [clientsRes, eqRes, termsRes, anRes, typesRes, auditRes] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('equipment').select('*'),
    supabase.from('responsibility_terms').select('*'),
    supabase.from('analysts').select('*'),
    supabase.from('equipment_types').select('*'),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
  ]);
  const clients = clientsRes.data || [];
  const equipment = eqRes.data || [];
  const terms = termsRes.data || [];
  const analysts = anRes.data || [];
  const types = typesRes.data || [];
  const auditLogs = auditRes.data || [];

  buildCover(wb, { clients, equipment, terms, analysts });
  buildSummary(wb, clients, equipment, terms, analysts);
  buildStockAlerts(wb, clients, equipment, types);
  buildAllEquipment(wb, clients, equipment);
  buildAllTerms(wb, clients, terms);
  buildAllAnalysts(wb, clients, analysts);
  buildAuditLog(wb, clients, auditLogs);

  for (const c of clients) {
    buildClientSheet(wb, c, equipment, terms, analysts, types);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auksys_relatorio_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Sheets ----------

function buildCover(wb: ExcelJS.Workbook, data: any) {
  const ws = wb.addWorksheet('Capa', { properties: { tabColor: { argb: HEADER_BG } } });
  ws.columns = [{ width: 4 }, { width: 36 }, { width: 24 }, { width: 24 }, { width: 24 }];
  ws.mergeCells('B2:E2');
  const title = ws.getCell('B2');
  title.value = 'Auksys IT Tools — Relatório Consolidado';
  title.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  title.alignment = { horizontal: 'left', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  ws.getRow(2).height = 34;

  ws.mergeCells('B3:E3');
  const sub = ws.getCell('B3');
  sub.value = `Gerado em ${new Date().toLocaleString('pt-BR')}`;
  sub.font = { italic: true, color: { argb: 'FFFFFFFF' } };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG_DARK } };
  sub.alignment = { horizontal: 'left' };
  ws.getRow(3).height = 20;

  ws.addRow([]);
  const kpis: [string, number][] = [
    ['Clientes', data.clients.length],
    ['Clientes ativos', data.clients.filter((c: any) => c.is_active).length],
    ['Equipamentos totais', data.equipment.length],
    ['Equipamentos legados', data.equipment.filter((e: any) => e.is_legacy).length],
    ['Equipamentos disponíveis', data.equipment.filter((e: any) => e.status === 'disponivel').length],
    ['Equipamentos entregues', data.equipment.filter((e: any) => e.status === 'entregue').length],
    ['Termos totais', data.terms.length],
    ['Termos pendentes', data.terms.filter((t: any) => t.status !== 'assinado').length],
    ['Analistas cadastrados', data.analysts.length],
  ];
  for (const [label, value] of kpis) {
    const r = ws.addRow(['', label, value]);
    r.getCell(2).font = { bold: true };
    r.getCell(3).font = { bold: true, size: 14, color: { argb: HEADER_BG } };
    r.getCell(3).alignment = { horizontal: 'right' };
    r.height = 22;
  }

  ws.addRow([]);
  const note = ws.addRow(['', 'Este relatório inclui visão geral, alertas de estoque, inventário completo, termos, analistas, log de auditoria recente e detalhamento por cliente.']);
  ws.mergeCells(`B${note.number}:E${note.number}`);
  note.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  note.getCell(2).font = { italic: true, color: { argb: 'FF555555' } };
  note.height = 36;
}

function buildSummary(wb: ExcelJS.Workbook, clients: any[], equipment: any[], terms: any[], analysts: any[]) {
  const ws = wb.addWorksheet('Resumo por Cliente', { properties: { tabColor: { argb: HEADER_BG } } });
  ws.columns = [
    { header: 'Cliente', key: 'name', width: 32 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Equip. Total', key: 'eq', width: 14 },
    { header: 'Disponíveis', key: 'disp', width: 14 },
    { header: 'Entregues', key: 'ent', width: 14 },
    { header: 'Manutenção', key: 'man', width: 14 },
    { header: 'Legados', key: 'leg', width: 12 },
    { header: 'Termos', key: 'terms', width: 12 },
    { header: 'Term. Pendentes', key: 'tp', width: 16 },
    { header: 'Analistas', key: 'an', width: 12 },
  ];
  styleHeader(ws);

  for (const c of clients) {
    const cEq = equipment.filter((e: any) => e.client_id === c.id);
    const cTerms = terms.filter((t: any) => t.client_id === c.id);
    const cAn = analysts.filter((a: any) => a.client_id === c.id);
    ws.addRow({
      name: c.name,
      status: c.is_active ? 'Ativo' : 'Inativo',
      eq: cEq.length,
      disp: cEq.filter(e => e.status === 'disponivel').length,
      ent: cEq.filter(e => e.status === 'entregue').length,
      man: cEq.filter(e => e.status === 'manutencao').length,
      leg: cEq.filter(e => e.is_legacy).length,
      terms: cTerms.length,
      tp: cTerms.filter(t => t.status !== 'assinado').length,
      an: cAn.length,
    });
  }
  applyZebra(ws);
  const totalRow = ws.addRow({
    name: 'TOTAL',
    status: '',
    eq: equipment.length,
    disp: equipment.filter(e => e.status === 'disponivel').length,
    ent: equipment.filter(e => e.status === 'entregue').length,
    man: equipment.filter(e => e.status === 'manutencao').length,
    leg: equipment.filter(e => e.is_legacy).length,
    terms: terms.length,
    tp: terms.filter(t => t.status !== 'assinado').length,
    an: analysts.length,
  });
  totalRow.font = { bold: true };
  totalRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    c.border = { top: { style: 'medium' } };
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'J1' };
}

function buildStockAlerts(wb: ExcelJS.Workbook, clients: any[], equipment: any[], types: any[]) {
  const ws = wb.addWorksheet('Alertas Estoque', { properties: { tabColor: { argb: 'FFFB8C00' } } });
  ws.columns = [
    { header: 'Cliente', key: 'client', width: 28 },
    { header: 'Tipo', key: 'type', width: 22 },
    { header: 'Disponíveis', key: 'avail', width: 14 },
    { header: 'Limite mínimo', key: 'min', width: 14 },
    { header: 'Situação', key: 'status', width: 18 },
  ];
  styleHeader(ws);

  let count = 0;
  for (const t of types) {
    if (!t.min_stock_alert || t.min_stock_alert <= 0) continue;
    const avail = equipment.filter(e => e.client_id === t.client_id && e.type === t.name && e.status === 'disponivel' && !e.is_legacy).length;
    if (avail >= t.min_stock_alert) continue;
    const client = clients.find(c => c.id === t.client_id);
    const r = ws.addRow({
      client: client?.name || '—',
      type: t.name,
      avail,
      min: t.min_stock_alert,
      status: avail === 0 ? 'CRÍTICO — sem estoque' : 'Abaixo do mínimo',
    });
    r.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALERT_BG } };
      c.font = { color: { argb: ALERT_TEXT }, bold: true };
    });
    count++;
  }
  if (count === 0) {
    ws.addRow(['Nenhum alerta de estoque ativo.']);
    ws.mergeCells('A2:E2');
    ws.getCell('A2').alignment = { horizontal: 'center' };
    ws.getCell('A2').font = { italic: true, color: { argb: 'FF888888' } };
  }
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function buildAllEquipment(wb: ExcelJS.Workbook, clients: any[], equipment: any[]) {
  const ws = wb.addWorksheet('Inventário Completo', { properties: { tabColor: { argb: HEADER_BG } } });
  ws.columns = [
    { header: 'Cliente', key: 'client', width: 26 },
    { header: 'Tipo', key: 'type', width: 16 },
    { header: 'Marca', key: 'brand', width: 16 },
    { header: 'Modelo', key: 'model', width: 22 },
    { header: 'Serial', key: 'serial', width: 22 },
    { header: 'Patrimônio', key: 'patrimony', width: 16 },
    { header: 'Setor', key: 'sector', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Atribuído a', key: 'assigned', width: 24 },
    { header: 'Legado', key: 'legacy', width: 10 },
    { header: 'Criado em', key: 'created', width: 18 },
  ];
  styleHeader(ws);
  const byClient = new Map(clients.map(c => [c.id, c.name]));
  for (const e of equipment) {
    ws.addRow({
      client: byClient.get(e.client_id) || '—',
      type: e.type, brand: e.brand, model: e.model,
      serial: e.serial_number, patrimony: e.patrimony || '',
      sector: e.sector || '', status: e.status,
      assigned: e.assigned_to || e.legacy_user_name || '',
      legacy: e.is_legacy ? 'Sim' : '',
      created: e.created_at ? new Date(e.created_at).toLocaleDateString('pt-BR') : '',
    });
  }
  applyZebra(ws);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'K1' };
}

function buildAllTerms(wb: ExcelJS.Workbook, clients: any[], terms: any[]) {
  const ws = wb.addWorksheet('Termos', { properties: { tabColor: { argb: HEADER_BG } } });
  ws.columns = [
    { header: 'Cliente', key: 'client', width: 26 },
    { header: 'Ticket', key: 'ticket', width: 14 },
    { header: 'Colaborador', key: 'col', width: 26 },
    { header: 'Analista', key: 'an', width: 26 },
    { header: 'Equipamento', key: 'eq', width: 30 },
    { header: 'Serial', key: 'serial', width: 22 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Criado em', key: 'created', width: 18 },
    { header: 'Devolvido em', key: 'returned', width: 18 },
  ];
  styleHeader(ws);
  const byClient = new Map(clients.map(c => [c.id, c.name]));
  for (const t of terms) {
    ws.addRow({
      client: byClient.get(t.client_id) || '—',
      ticket: t.ticket_number, col: t.collaborator_name, an: t.analyst_name,
      eq: t.equipment_description, serial: t.serial_number, status: t.status,
      created: t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '',
      returned: t.returned_at ? new Date(t.returned_at).toLocaleDateString('pt-BR') : '',
    });
  }
  applyZebra(ws);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'I1' };
}

function buildAllAnalysts(wb: ExcelJS.Workbook, clients: any[], analysts: any[]) {
  const ws = wb.addWorksheet('Analistas', { properties: { tabColor: { argb: HEADER_BG } } });
  ws.columns = [
    { header: 'Cliente', key: 'client', width: 28 },
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'E-mail', key: 'email', width: 32 },
    { header: 'Criado em', key: 'created', width: 18 },
  ];
  styleHeader(ws);
  const byClient = new Map(clients.map(c => [c.id, c.name]));
  for (const a of analysts) {
    ws.addRow({
      client: byClient.get(a.client_id) || '—',
      name: a.name, email: a.email || '',
      created: a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '',
    });
  }
  applyZebra(ws);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function buildAuditLog(wb: ExcelJS.Workbook, clients: any[], logs: any[]) {
  const ws = wb.addWorksheet('Histórico (500)', { properties: { tabColor: { argb: 'FF607D8B' } } });
  ws.columns = [
    { header: 'Data', key: 'date', width: 20 },
    { header: 'Cliente', key: 'client', width: 24 },
    { header: 'Ação', key: 'action', width: 12 },
    { header: 'Entidade', key: 'entity', width: 16 },
    { header: 'Descrição', key: 'desc', width: 60 },
    { header: 'Usuário', key: 'user', width: 28 },
  ];
  styleHeader(ws);
  const byClient = new Map(clients.map(c => [c.id, c.name]));
  for (const l of logs) {
    ws.addRow({
      date: new Date(l.created_at).toLocaleString('pt-BR'),
      client: byClient.get(l.client_id) || '—',
      action: l.action, entity: l.entity_type,
      desc: l.description || '', user: l.user_email || '',
    });
  }
  applyZebra(ws);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function buildClientSheet(wb: ExcelJS.Workbook, c: any, equipment: any[], terms: any[], analysts: any[], types: any[]) {
  const tab = sanitizeSheetName(c.name);
  const tabColor = (c.primary_color || '#1565C0').replace('#', 'FF');
  const ws = wb.addWorksheet(tab, { properties: { tabColor: { argb: tabColor } } });

  ws.columns = [{ width: 32 }, { width: 18 }, { width: 18 }, { width: 18 }];

  ws.mergeCells('A1:D1');
  const title = ws.getCell('A1');
  title.value = c.name;
  title.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tabColor } };
  ws.getRow(1).height = 30;
  ws.addRow([c.is_active ? 'Status: Ativo' : 'Status: Inativo']).getCell(1).font = { italic: true };

  const cEq = equipment.filter(e => e.client_id === c.id);
  const cTerms = terms.filter(t => t.client_id === c.id);
  const cAn = analysts.filter(a => a.client_id === c.id);
  const cTypes = types.filter(t => t.client_id === c.id);

  ws.addRow([]);
  addMetricsBlock(ws, 'Resumo', {
    'Total Equipamentos': cEq.length,
    'Disponíveis': cEq.filter(e => e.status === 'disponivel').length,
    'Entregues': cEq.filter(e => e.status === 'entregue').length,
    'Manutenção': cEq.filter(e => e.status === 'manutencao').length,
    'Legados': cEq.filter(e => e.is_legacy).length,
    'Termos totais': cTerms.length,
    'Termos pendentes': cTerms.filter(t => t.status !== 'assinado').length,
    'Analistas': cAn.length,
    'Tipos cadastrados': cTypes.length,
  });

  ws.addRow([]);
  addMetricsBlock(ws, 'Equipamentos por Tipo', countBy(cEq, 'type'));
  ws.addRow([]);
  addMetricsBlock(ws, 'Equipamentos por Setor', countBy(cEq.filter(e => e.sector), 'sector'));
  ws.addRow([]);
  addMetricsBlock(ws, 'Termos por Status', countBy(cTerms, 'status'));

  // Inventory list of this client
  ws.addRow([]);
  const headerRow = ws.addRow(['Inventário', 'Serial', 'Setor', 'Status']);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });
  for (const e of cEq) {
    ws.addRow([`${e.type} ${e.brand} ${e.model}`, e.serial_number, e.sector || '', e.status]);
  }
}

// ---------- helpers ----------

function styleHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.height = 26;
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.border = { bottom: { style: 'medium', color: { argb: HEADER_BG_DARK } } };
  });
}

function applyZebra(ws: ExcelJS.Worksheet) {
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    if (n % 2 === 0) {
      row.eachCell(c => {
        if (!c.fill || (c.fill as any).type !== 'pattern' || !(c.fill as any).fgColor) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
        }
      });
    }
  });
}

function countBy(arr: any[], key: string): Record<string, number> {
  return arr.reduce((acc, x) => { const k = x[key] || 'desconhecido'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
}

function addMetricsBlock(ws: ExcelJS.Worksheet, title: string, data: Record<string, number>) {
  const r = ws.addRow([title]);
  ws.mergeCells(`A${r.number}:B${r.number}`);
  r.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEADER_BG } };
  r.getCell(1).alignment = { horizontal: 'left' };
  r.height = 22;
  const entries = Object.entries(data);
  if (entries.length === 0) {
    const row = ws.addRow(['(sem dados)', '']);
    row.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    return;
  }
  entries.forEach(([k, v]) => {
    const row = ws.addRow([k, v]);
    row.getCell(1).font = { bold: true };
    row.eachCell(c => { c.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } }; });
  });
}

function sanitizeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, '').slice(0, 31);
}
