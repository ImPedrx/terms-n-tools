import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

export async function exportAdminClientsExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Auksys IT Tools';
  wb.created = new Date();

  const [{ data: clients }, { data: equipment }, { data: terms }, { data: analysts }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('equipment').select('*'),
    supabase.from('responsibility_terms').select('*'),
    supabase.from('analysts').select('*'),
  ]);

  // Summary sheet
  const summary = wb.addWorksheet('Resumo Geral', { properties: { tabColor: { argb: 'FF1565C0' } } });
  summary.columns = [
    { header: 'Cliente', key: 'name', width: 32 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Equipamentos', key: 'eq', width: 16 },
    { header: 'Legados', key: 'legacy', width: 12 },
    { header: 'Termos', key: 'terms', width: 12 },
    { header: 'Analistas', key: 'analysts', width: 12 },
  ];
  styleHeader(summary);

  for (const c of clients || []) {
    const cEq = (equipment || []).filter((e: any) => e.client_id === c.id);
    const cTerms = (terms || []).filter((t: any) => t.client_id === c.id);
    const cAn = (analysts || []).filter((a: any) => a.client_id === c.id);
    summary.addRow({
      name: c.name,
      status: c.is_active ? 'Ativo' : 'Inativo',
      eq: cEq.length,
      legacy: cEq.filter((e: any) => e.is_legacy).length,
      terms: cTerms.length,
      analysts: cAn.length,
    });

    // Per-client sheet
    const tab = sanitizeSheetName(c.name);
    const ws = wb.addWorksheet(tab, { properties: { tabColor: { argb: 'FF0288D1' } } });

    ws.mergeCells('A1:D1');
    const title = ws.getCell('A1');
    title.value = c.name;
    title.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    ws.getRow(1).height = 28;

    ws.addRow([]);

    addMetricsBlock(ws, 'Equipamentos por Status', countBy(cEq, 'status'));
    ws.addRow([]);
    addMetricsBlock(ws, 'Termos por Status', countBy(cTerms, 'status'));
    ws.addRow([]);
    addMetricsBlock(ws, 'Resumo', {
      'Total Equipamentos': cEq.length,
      'Equipamentos Legados': cEq.filter((e: any) => e.is_legacy).length,
      'Total Termos': cTerms.length,
      'Total Analistas': cAn.length,
    });

    ws.columns.forEach(col => { col.width = Math.max(col.width || 18, 22); });
  }

  // Total row
  const totalRow = summary.addRow({
    name: 'TOTAL',
    status: '',
    eq: (equipment || []).length,
    legacy: (equipment || []).filter((e: any) => e.is_legacy).length,
    terms: (terms || []).length,
    analysts: (analysts || []).length,
  });
  totalRow.font = { bold: true };
  totalRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    cell.border = { top: { style: 'medium' } };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auksys_clientes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.height = 24;
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF0D47A1' } } };
  });
}

function countBy(arr: any[], key: string): Record<string, number> {
  return arr.reduce((acc, x) => { const k = x[key] || 'desconhecido'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
}

function addMetricsBlock(ws: ExcelJS.Worksheet, title: string, data: Record<string, number>) {
  const r = ws.addRow([title]);
  ws.mergeCells(`A${r.number}:B${r.number}`);
  r.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42A5F5' } };
  r.getCell(1).alignment = { horizontal: 'left' };
  r.height = 22;
  Object.entries(data).forEach(([k, v]) => {
    const row = ws.addRow([k, v]);
    row.getCell(1).font = { bold: true };
    row.eachCell(c => { c.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } }; });
  });
}

function sanitizeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, '').slice(0, 31);
}
