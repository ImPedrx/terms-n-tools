import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EQUIPMENT_STATUS } from '@/lib/constants';

// ============= Color palette =============
const C = {
  // Header / brand
  navy: 'FF1E3A5F',
  blueMid: 'FF2563EB',
  blueLight: 'FF3B82F6',
  blueLighter: 'FFEFF6FF',
  bluePale: 'FFDBEAFE',
  blueDeepText: 'FF1E40AF',
  bluePetrol: 'FF0F4C75',
  blueAlt: 'FFF8FAFC',
  bluePastelBg: 'FF1E40AF',
  // Greens
  greenDark: 'FF064E3B',
  greenMid: 'FF10B981',
  greenAlt: 'FFF0FDF4',
  greenLightBg: 'FFDCFCE7',
  greenText: 'FF166534',
  greenHeader2: 'FF065F46',
  greenBorder: 'FFD1FAE5',
  // Purples
  purpleDark: 'FF4C1D95',
  purpleMid: 'FF7C3AED',
  purpleAlt: 'FFFAF5FF',
  purpleHeader: 'FF6D28D9',
  // Yellow / orange
  yellowLight: 'FFFEF9C3',
  yellowText: 'FF854D0E',
  orangeLight: 'FFFFEDD5',
  orangeText: 'FF9A3412',
  orangeText2: 'FF92400E',
  // Reds
  redLight: 'FFFEE2E2',
  redText: 'FF991B1B',
  // Greys
  greyBg: 'FFF1F5F9',
  greyBorder: 'FFE2E8F0',
  greyMuted: 'FF6B7280',
  greyMutedSoft: 'FF9CA3AF',
  greyFooter: 'FF94A3B8',
  greyChip: 'FFF3F4F6',
  white: 'FFFFFFFF',
};

const FONT = 'Arial';

// ============= Helpers =============
const fillSolid = (color: string) => ({
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: color },
});

const thinBorder = (color = C.greyBorder) => ({
  top: { style: 'thin' as const, color: { argb: color } },
  left: { style: 'thin' as const, color: { argb: color } },
  bottom: { style: 'thin' as const, color: { argb: color } },
  right: { style: 'thin' as const, color: { argb: color } },
});

const center = { vertical: 'middle' as const, horizontal: 'center' as const };
const left = { vertical: 'middle' as const, horizontal: 'left' as const, indent: 1 };

const TYPE_ICONS: Record<string, string> = {
  notebook: '💻 Notebook',
  mouse: '🖱️ Mouse',
  teclado: '⌨️ Teclado',
  projetor: '📽️ Projetor',
  workstation: '🖥️ Workstation',
  monitor: '🖥️ Monitor',
  tablet: '📱 Tablet',
  celular: '📞 Celular',
  outros: '📦 Outros',
};

const progressBar = (pct: number) => {
  const total = 10;
  const filled = Math.round((pct / 100) * total);
  return '█'.repeat(filled) + '░'.repeat(total - filled) + ` ${pct}%`;
};

// ============= Types =============
export interface ExportData {
  periodLabel: string;
  eqStats: {
    total: number; disponivel: number; entregue: number;
    manutencao: number; reservado: number; baixado: number;
  };
  termStats: {
    total: number; pendente: number; enviado: number;
    fechado: number; cancelado: number;
  };
  eqByType: { value: string; label: string; count: number }[];
  allEquipment: any[];
  filteredEquipment: any[];
  filteredTerms: any[];
}

// ============= Sheet 1: Dashboard =============
function buildDashboardSheet(wb: ExcelJS.Workbook, d: ExportData) {
  const ws = wb.addWorksheet('Dashboard', {
    pageSetup: { orientation: 'portrait', fitToPage: true },
    views: [{ state: 'frozen', ySplit: 0, zoomScale: 90 }],
  });

  ws.columns = [{ width: 30 }, { width: 15 }, { width: 18 }];
  let r = 1;

  // ----- Brand header -----
  ws.mergeCells(r, 1, r, 3);
  const c1 = ws.getCell(r, 1);
  c1.value = 'RELATÓRIO DE GESTÃO DE TI';
  c1.font = { name: FONT, size: 18, bold: true, color: { argb: C.white } };
  c1.fill = fillSolid(C.navy);
  c1.alignment = center;
  ws.getRow(r).height = 32;
  r++;

  ws.mergeCells(r, 1, r, 3);
  const c2 = ws.getCell(r, 1);
  c2.value = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}  |  Período: ${d.periodLabel}`;
  c2.font = { name: FONT, size: 10, italic: true, color: { argb: C.white } };
  c2.fill = fillSolid(C.blueMid);
  c2.alignment = center;
  ws.getRow(r).height = 20;
  r++;

  // separator
  ws.mergeCells(r, 1, r, 3);
  ws.getCell(r, 1).fill = fillSolid(C.greyBg);
  ws.getRow(r).height = 8;
  r += 2;

  // ----- Equipment summary block -----
  ws.mergeCells(r, 1, r, 3);
  const eqTitle = ws.getCell(r, 1);
  eqTitle.value = 'RESUMO DE EQUIPAMENTOS';
  eqTitle.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
  eqTitle.fill = fillSolid(C.bluePetrol);
  eqTitle.alignment = center;
  ws.getRow(r).height = 26;
  r++;

  ['Métrica', 'Quantidade', '%'].forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    c.fill = fillSolid(C.blueLight);
    c.alignment = center;
    c.border = thinBorder();
  });
  ws.getRow(r).height = 22;
  r++;

  const eqRows = [
    { label: 'Total de Equipamentos', value: d.eqStats.total, isTotal: true },
    { label: 'Disponíveis', value: d.eqStats.disponivel },
    { label: 'Entregues', value: d.eqStats.entregue },
    { label: 'Em Manutenção', value: d.eqStats.manutencao },
    { label: 'Reservados', value: d.eqStats.reservado },
    { label: 'Baixados', value: d.eqStats.baixado },
  ];

  eqRows.forEach((row, idx) => {
    const pct = row.isTotal ? 100 : (d.eqStats.total ? Math.round((row.value / d.eqStats.total) * 100) : 0);
    const bg = row.isTotal ? C.blueLighter : (idx % 2 === 0 ? C.white : C.blueAlt);

    const cA = ws.getCell(r, 1);
    cA.value = row.label;
    cA.font = { name: FONT, size: 10, bold: row.isTotal };
    cA.fill = fillSolid(bg);
    cA.alignment = left;
    cA.border = thinBorder();

    const cB = ws.getCell(r, 2);
    cB.value = row.value;
    cB.font = { name: FONT, size: 10, bold: row.isTotal };
    cB.fill = fillSolid(bg);
    cB.alignment = center;
    cB.border = thinBorder();

    const cC = ws.getCell(r, 3);
    cC.value = `${pct}%`;
    let pctColor = C.greyMutedSoft;
    if (pct >= 80) pctColor = C.greenText;
    else if (pct > 0) pctColor = C.orangeText2;
    cC.font = { name: FONT, size: 10, bold: pct >= 80 || row.isTotal, color: { argb: pctColor } };
    cC.fill = fillSolid(bg);
    cC.alignment = center;
    cC.border = thinBorder();

    r++;
  });

  // separator
  ws.mergeCells(r, 1, r, 3);
  ws.getCell(r, 1).fill = fillSolid(C.greyBg);
  ws.getRow(r).height = 12;
  r += 2;

  // ----- Terms summary block -----
  ws.mergeCells(r, 1, r, 3);
  const tTitle = ws.getCell(r, 1);
  tTitle.value = 'RESUMO DE TERMOS';
  tTitle.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
  tTitle.fill = fillSolid(C.greenDark);
  tTitle.alignment = center;
  ws.getRow(r).height = 26;
  r++;

  ['Métrica', 'Quantidade', '%'].forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    c.fill = fillSolid(C.greenMid);
    c.alignment = center;
    c.border = thinBorder();
  });
  ws.getRow(r).height = 22;
  r++;

  const termRows = [
    { label: 'Total de Termos', value: d.termStats.total, isTotal: true, statusColor: null as string | null },
    { label: 'Pendentes', value: d.termStats.pendente, statusColor: C.orangeText2 },
    { label: 'Enviados p/ Assinatura', value: d.termStats.enviado, statusColor: null },
    { label: 'Fechados', value: d.termStats.fechado, statusColor: C.greenText },
    { label: 'Cancelados', value: d.termStats.cancelado, statusColor: C.redText },
  ];

  termRows.forEach((row, idx) => {
    const pct = row.isTotal ? 100 : (d.termStats.total ? Math.round((row.value / d.termStats.total) * 100) : 0);
    const bg = row.isTotal ? C.greenLightBg : (idx % 2 === 0 ? C.white : C.greenAlt);

    const cA = ws.getCell(r, 1);
    cA.value = row.label;
    cA.font = {
      name: FONT, size: 10, bold: row.isTotal,
      color: row.statusColor ? { argb: row.statusColor } : undefined,
    };
    cA.fill = fillSolid(bg);
    cA.alignment = left;
    cA.border = thinBorder();

    const cB = ws.getCell(r, 2);
    cB.value = row.value;
    cB.font = { name: FONT, size: 10, bold: row.isTotal };
    cB.fill = fillSolid(bg);
    cB.alignment = center;
    cB.border = thinBorder();

    const cC = ws.getCell(r, 3);
    cC.value = `${pct}%`;
    let pctColor = C.greyMutedSoft;
    if (pct >= 80) pctColor = C.greenText;
    else if (pct > 0) pctColor = C.orangeText2;
    cC.font = { name: FONT, size: 10, bold: pct >= 80 || row.isTotal, color: { argb: pctColor } };
    cC.fill = fillSolid(bg);
    cC.alignment = center;
    cC.border = thinBorder();

    r++;
  });

  // separator
  ws.mergeCells(r, 1, r, 3);
  ws.getCell(r, 1).fill = fillSolid(C.greyBg);
  ws.getRow(r).height = 12;
  r += 2;

  // ----- Distribution by type -----
  ws.mergeCells(r, 1, r, 3);
  const dTitle = ws.getCell(r, 1);
  dTitle.value = 'DISTRIBUIÇÃO POR TIPO';
  dTitle.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
  dTitle.fill = fillSolid(C.purpleDark);
  dTitle.alignment = center;
  ws.getRow(r).height = 26;
  r++;

  ['Tipo', 'Quantidade', '% (Barra)'].forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    c.fill = fillSolid(C.purpleMid);
    c.alignment = center;
    c.border = thinBorder();
  });
  ws.getRow(r).height = 22;
  r++;

  d.eqByType.forEach((t, idx) => {
    const bg = idx % 2 === 0 ? C.white : C.purpleAlt;
    const pct = d.allEquipment.length ? Math.round((t.count / d.allEquipment.length) * 100) : 0;

    const cA = ws.getCell(r, 1);
    cA.value = TYPE_ICONS[t.value] || `📦 ${t.label}`;
    cA.font = { name: FONT, size: 10 };
    cA.fill = fillSolid(bg);
    cA.alignment = left;
    cA.border = thinBorder();

    const cB = ws.getCell(r, 2);
    cB.value = t.count;
    cB.font = { name: FONT, size: 10, bold: true };
    cB.fill = fillSolid(bg);
    cB.alignment = center;
    cB.border = thinBorder();

    const cC = ws.getCell(r, 3);
    cC.value = progressBar(pct);
    cC.font = { name: 'Courier New', size: 10, color: { argb: C.purpleDark } };
    cC.fill = fillSolid(bg);
    cC.alignment = left;
    cC.border = thinBorder();

    r++;
  });

  // ----- Footer -----
  r += 2;
  ws.mergeCells(r, 1, r, 3);
  const footer = ws.getCell(r, 1);
  footer.value = 'Documento confidencial — Gerado automaticamente pelo Sistema de Gestão de TI';
  footer.font = { name: FONT, size: 8, italic: true, color: { argb: C.greyFooter } };
  footer.alignment = { horizontal: 'right', vertical: 'middle' };
}

// ============= Sheet 2: Charts data =============
function buildChartsSheet(wb: ExcelJS.Workbook, d: ExportData) {
  const ws = wb.addWorksheet('Gráficos', {
    pageSetup: { orientation: 'portrait', fitToPage: true },
    views: [{ state: 'frozen', ySplit: 0, zoomScale: 90 }],
  });

  ws.columns = [{ width: 26 }, { width: 14 }, { width: 14 }];
  let r = 1;

  // brand header
  ws.mergeCells(r, 1, r, 3);
  const c1 = ws.getCell(r, 1);
  c1.value = 'DADOS DOS GRÁFICOS';
  c1.font = { name: FONT, size: 18, bold: true, color: { argb: C.white } };
  c1.fill = fillSolid(C.navy);
  c1.alignment = center;
  ws.getRow(r).height = 32;
  r++;

  ws.mergeCells(r, 1, r, 3);
  const c2 = ws.getCell(r, 1);
  c2.value = `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}  |  Período: ${d.periodLabel}`;
  c2.font = { name: FONT, size: 10, italic: true, color: { argb: C.white } };
  c2.fill = fillSolid(C.blueMid);
  c2.alignment = center;
  ws.getRow(r).height = 20;
  r += 2;

  const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    disponivel: { bg: C.greenLightBg, fg: C.greenText },
    entregue: { bg: C.bluePale, fg: C.blueDeepText },
    em_manutencao: { bg: C.redLight, fg: C.redText },
    reservado: { bg: C.yellowLight, fg: C.yellowText },
    baixado: { bg: C.greyChip, fg: C.greyMuted },
  };

  // ----- Section: Equipment by Status -----
  ws.mergeCells(r, 1, r, 3);
  const s1 = ws.getCell(r, 1);
  s1.value = 'EQUIPAMENTOS POR STATUS';
  s1.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
  s1.fill = fillSolid(C.bluePastelBg);
  s1.alignment = center;
  ws.getRow(r).height = 24;
  r++;

  ['Status', 'Quantidade', '% do Total'].forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    c.fill = fillSolid(C.blueLight);
    c.alignment = center;
    c.border = thinBorder();
  });
  r++;

  const totalEq = d.allEquipment.length || 0;
  EQUIPMENT_STATUS.forEach(s => {
    const count = d.allEquipment.filter(e => e.status === s.value).length;
    if (count === 0) return;
    const colors = STATUS_COLORS[s.value] || { bg: C.white, fg: C.greyMuted };

    const cA = ws.getCell(r, 1);
    cA.value = s.label;
    cA.font = { name: FONT, size: 10, bold: true, color: { argb: colors.fg } };
    cA.fill = fillSolid(colors.bg);
    cA.alignment = left;
    cA.border = thinBorder();

    const cB = ws.getCell(r, 2);
    cB.value = count;
    cB.font = { name: FONT, size: 10, color: { argb: colors.fg } };
    cB.fill = fillSolid(colors.bg);
    cB.alignment = center;
    cB.border = thinBorder();

    const cC = ws.getCell(r, 3);
    cC.value = totalEq ? { formula: `B${r}/${totalEq}`, result: count / totalEq } : 0;
    cC.numFmt = '0.0%';
    cC.font = { name: FONT, size: 10, color: { argb: colors.fg } };
    cC.fill = fillSolid(colors.bg);
    cC.alignment = center;
    cC.border = thinBorder();

    r++;
  });
  r += 2;

  // ----- Section: Equipment by Type -----
  ws.mergeCells(r, 1, r, 3);
  const s2 = ws.getCell(r, 1);
  s2.value = 'EQUIPAMENTOS POR TIPO';
  s2.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
  s2.fill = fillSolid(C.purpleHeader);
  s2.alignment = center;
  ws.getRow(r).height = 24;
  r++;

  ['Tipo', 'Quantidade', '% do Total'].forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    c.fill = fillSolid(C.purpleMid);
    c.alignment = center;
    c.border = thinBorder();
  });
  r++;

  const TYPE_BG = [C.purpleAlt, C.blueAlt, C.greenAlt, C.yellowLight, C.orangeLight, C.bluePale];
  d.eqByType.forEach((t, i) => {
    const bg = TYPE_BG[i % TYPE_BG.length];
    const cA = ws.getCell(r, 1);
    cA.value = TYPE_ICONS[t.value] || t.label;
    cA.font = { name: FONT, size: 10 };
    cA.fill = fillSolid(bg);
    cA.alignment = left;
    cA.border = thinBorder();

    const cB = ws.getCell(r, 2);
    cB.value = t.count;
    cB.font = { name: FONT, size: 10, bold: true };
    cB.fill = fillSolid(bg);
    cB.alignment = center;
    cB.border = thinBorder();

    const cC = ws.getCell(r, 3);
    cC.value = totalEq ? { formula: `B${r}/${totalEq}`, result: t.count / totalEq } : 0;
    cC.numFmt = '0.0%';
    cC.font = { name: FONT, size: 10 };
    cC.fill = fillSolid(bg);
    cC.alignment = center;
    cC.border = thinBorder();
    r++;
  });
  r += 2;

  // ----- Section: Terms by Status -----
  ws.mergeCells(r, 1, r, 3);
  const s3 = ws.getCell(r, 1);
  s3.value = 'TERMOS POR STATUS';
  s3.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
  s3.fill = fillSolid(C.greenHeader2);
  s3.alignment = center;
  ws.getRow(r).height = 24;
  r++;

  ['Status', 'Quantidade', '% do Total'].forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    c.fill = fillSolid(C.greenMid);
    c.alignment = center;
    c.border = thinBorder();
  });
  r++;

  const termTotal = d.termStats.total || 0;
  const termRows = [
    { label: 'Pendentes', count: d.termStats.pendente, bg: C.orangeLight, fg: C.orangeText },
    { label: 'Enviados', count: d.termStats.enviado, bg: C.bluePale, fg: C.blueDeepText },
    { label: 'Fechados', count: d.termStats.fechado, bg: C.greenLightBg, fg: C.greenText },
    { label: 'Cancelados', count: d.termStats.cancelado, bg: C.redLight, fg: C.redText },
  ];

  termRows.forEach(row => {
    if (row.count === 0) return;
    const cA = ws.getCell(r, 1);
    cA.value = row.label;
    cA.font = { name: FONT, size: 10, bold: true, color: { argb: row.fg } };
    cA.fill = fillSolid(row.bg);
    cA.alignment = left;
    cA.border = thinBorder();

    const cB = ws.getCell(r, 2);
    cB.value = row.count;
    cB.font = { name: FONT, size: 10, color: { argb: row.fg } };
    cB.fill = fillSolid(row.bg);
    cB.alignment = center;
    cB.border = thinBorder();

    const cC = ws.getCell(r, 3);
    cC.value = termTotal ? { formula: `B${r}/${termTotal}`, result: row.count / termTotal } : 0;
    cC.numFmt = '0.0%';
    cC.font = { name: FONT, size: 10, color: { argb: row.fg } };
    cC.fill = fillSolid(row.bg);
    cC.alignment = center;
    cC.border = thinBorder();
    r++;
  });
}

// ============= Sheet 3: Equipment list =============
function buildEquipmentSheet(wb: ExcelJS.Workbook, d: ExportData) {
  const ws = wb.addWorksheet('Equipamentos', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', ySplit: 3, zoomScale: 90 }],
  });

  ws.columns = [
    { width: 14 }, { width: 14 }, { width: 12 }, { width: 20 },
    { width: 14 }, { width: 16 }, { width: 25 }, { width: 35 }, { width: 18 },
  ];

  // Title row
  ws.mergeCells(1, 1, 1, 9);
  const t1 = ws.getCell(1, 1);
  t1.value = 'INVENTÁRIO DE EQUIPAMENTOS';
  t1.font = { name: FONT, size: 16, bold: true, color: { argb: C.white } };
  t1.fill = fillSolid(C.navy);
  t1.alignment = center;
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, 9);
  const t2 = ws.getCell(2, 1);
  t2.value = `Total: ${d.filteredEquipment.length} equipamentos  |  Período: ${d.periodLabel}  |  Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
  t2.font = { name: FONT, size: 10, color: { argb: C.white } };
  t2.fill = fillSolid(C.blueMid);
  t2.alignment = center;
  ws.getRow(2).height = 20;

  // Headers
  const headers = ['Tipo', 'Marca', 'Modelo', 'Nº Série', 'Patrimônio', 'Status', 'Responsável', 'Observações', 'Cadastrado em'];
  headers.forEach((h, i) => {
    const c = ws.getCell(3, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 11, bold: true, color: { argb: C.white } };
    c.fill = fillSolid(C.navy);
    c.alignment = center;
    c.border = {
      top: { style: 'medium', color: { argb: C.navy } },
      bottom: { style: 'medium', color: { argb: C.navy } },
      left: { style: 'thin', color: { argb: C.greyBorder } },
      right: { style: 'thin', color: { argb: C.greyBorder } },
    };
  });
  ws.getRow(3).height = 25;

  const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
    disponivel: { bg: C.greenLightBg, fg: C.greenText, label: 'Disponível' },
    entregue: { bg: C.bluePale, fg: C.blueDeepText, label: 'Entregue' },
    em_manutencao: { bg: C.redLight, fg: C.redText, label: 'Em Manutenção' },
    reservado: { bg: C.yellowLight, fg: C.yellowText, label: 'Reservado' },
    baixado: { bg: C.greyChip, fg: C.greyMuted, label: 'Baixado' },
  };

  const typeLabel = (t: string) => t;

  d.filteredEquipment.forEach((e, idx) => {
    const r = idx + 4;
    const rowBg = idx % 2 === 0 ? C.white : C.blueAlt;
    const respLabel = e.assigned_to || '—';
    const sStyle = STATUS_STYLES[e.status] || { bg: rowBg, fg: C.greyMuted, label: e.status };

    const cells = [
      { v: typeLabel(e.type), align: left },
      { v: e.brand, align: left },
      { v: e.model, align: left },
      { v: e.serial_number, align: left, font: { name: 'Courier New', size: 10 } },
      { v: e.patrimony || 'N/A', align: center },
      { v: sStyle.label, align: center, isStatus: true },
      { v: respLabel, align: left, isResp: true },
      { v: e.observations || '', align: left },
      { v: format(new Date(e.created_at), 'dd/MM/yyyy HH:mm'), align: center },
    ];

    cells.forEach((cd, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = cd.v;
      const isEmptyResp = cd.isResp && respLabel === '—';
      c.font = cd.isStatus
        ? { name: FONT, size: 10, bold: true, color: { argb: sStyle.fg } }
        : isEmptyResp
          ? { name: FONT, size: 10, italic: true, color: { argb: C.greyMutedSoft } }
          : (cd.font as any) || { name: FONT, size: 10 };
      c.fill = cd.isStatus ? fillSolid(sStyle.bg) : fillSolid(rowBg);
      c.alignment = { ...(cd.align as any), wrapText: i === 7 };
      c.border = thinBorder();
    });
    ws.getRow(r).height = 20;
  });

  // AutoFilter
  if (d.filteredEquipment.length > 0) {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + d.filteredEquipment.length, column: 9 } };
  } else {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 9 } };
  }
}

// ============= Sheet 4: Terms list =============
function buildTermsSheet(wb: ExcelJS.Workbook, d: ExportData) {
  const ws = wb.addWorksheet('Termos', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', ySplit: 3, zoomScale: 90 }],
  });

  ws.columns = [
    { width: 12 }, { width: 35 }, { width: 28 }, { width: 20 },
    { width: 14 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 14 },
  ];

  // Title rows
  ws.mergeCells(1, 1, 1, 9);
  const t1 = ws.getCell(1, 1);
  t1.value = 'TERMOS DE RESPONSABILIDADE';
  t1.font = { name: FONT, size: 16, bold: true, color: { argb: C.white } };
  t1.fill = fillSolid(C.greenDark);
  t1.alignment = center;
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, 9);
  const t2 = ws.getCell(2, 1);
  t2.value = `Total: ${d.filteredTerms.length} termos  |  Fechados: ${d.termStats.fechado}  |  Pendentes: ${d.termStats.pendente}  |  Período: ${d.periodLabel}`;
  t2.font = { name: FONT, size: 10, color: { argb: C.white } };
  t2.fill = fillSolid(C.greenHeader2);
  t2.alignment = center;
  ws.getRow(2).height = 20;

  // Headers
  const headers = ['Chamado', 'Colaborador', 'Equipamento', 'Nº Série', 'Patrimônio', 'Analista', 'Status', 'Criado em', 'PDF Assinado'];
  headers.forEach((h, i) => {
    const c = ws.getCell(3, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 11, bold: true, color: { argb: C.white } };
    c.fill = fillSolid(C.greenDark);
    c.alignment = center;
    c.border = {
      top: { style: 'medium', color: { argb: C.greenDark } },
      bottom: { style: 'medium', color: { argb: C.greenDark } },
      left: { style: 'thin', color: { argb: C.greenBorder } },
      right: { style: 'thin', color: { argb: C.greenBorder } },
    };
  });
  ws.getRow(3).height = 25;

  const TERM_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
    fechado: { bg: C.greenLightBg, fg: C.greenText, label: 'Fechado' },
    pendente: { bg: C.orangeLight, fg: C.orangeText, label: 'Pendente' },
    enviado_para_assinatura: { bg: C.bluePale, fg: C.blueDeepText, label: 'Enviado p/ Assinatura' },
    cancelado: { bg: C.redLight, fg: C.redText, label: 'Cancelado' },
  };

  d.filteredTerms.forEach((term, idx) => {
    const r = idx + 4;
    const rowBg = idx % 2 === 0 ? C.white : C.greenAlt;
    const sStyle = TERM_STYLES[term.status] || { bg: rowBg, fg: C.greyMuted, label: term.status };
    const hasPdf = !!(term as any).signed_pdf_path;

    // Chamado (mono + light bg)
    const cChamado = ws.getCell(r, 1);
    cChamado.value = term.ticket_number;
    cChamado.font = { name: 'Courier New', size: 10, bold: true };
    cChamado.fill = fillSolid(C.blueAlt);
    cChamado.alignment = center;
    cChamado.border = thinBorder(C.greenBorder);

    // Colaborador
    const cColab = ws.getCell(r, 2);
    cColab.value = (term.collaborator_name || '').toUpperCase();
    cColab.font = { name: FONT, size: 10 };
    cColab.fill = fillSolid(rowBg);
    cColab.alignment = left;
    cColab.border = thinBorder(C.greenBorder);

    // Other plain cells
    const plainCells = [
      { col: 3, v: term.equipment_description, align: left },
      { col: 4, v: term.serial_number, align: left, font: { name: 'Courier New', size: 10 } },
      { col: 5, v: term.patrimony || 'N/A', align: center },
    ];
    plainCells.forEach(p => {
      const c = ws.getCell(r, p.col);
      c.value = p.v;
      c.font = (p.font as any) || { name: FONT, size: 10 };
      c.fill = fillSolid(rowBg);
      c.alignment = p.align as any;
      c.border = thinBorder(C.greenBorder);
    });

    // Analista
    const cAn = ws.getCell(r, 6);
    cAn.value = term.analyst_name;
    cAn.font = { name: FONT, size: 10 };
    cAn.fill = fillSolid(rowBg);
    cAn.alignment = left;
    cAn.border = thinBorder(C.greenBorder);

    // Status badge
    const cSt = ws.getCell(r, 7);
    cSt.value = sStyle.label;
    cSt.font = { name: FONT, size: 10, bold: true, color: { argb: sStyle.fg } };
    cSt.fill = fillSolid(sStyle.bg);
    cSt.alignment = center;
    cSt.border = thinBorder(C.greenBorder);

    // Created at
    const cDt = ws.getCell(r, 8);
    cDt.value = format(new Date(term.created_at), 'dd/MM/yyyy HH:mm');
    cDt.font = { name: FONT, size: 10 };
    cDt.fill = fillSolid(rowBg);
    cDt.alignment = center;
    cDt.border = thinBorder(C.greenBorder);

    // PDF
    const cPdf = ws.getCell(r, 9);
    cPdf.value = hasPdf ? '✅ Sim' : '❌ Não';
    cPdf.font = {
      name: FONT, size: 10, bold: true,
      color: { argb: hasPdf ? C.greenText : C.redText },
    };
    cPdf.fill = fillSolid(rowBg);
    cPdf.alignment = center;
    cPdf.border = thinBorder(C.greenBorder);

    ws.getRow(r).height = 20;
  });

  if (d.filteredTerms.length > 0) {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + d.filteredTerms.length, column: 9 } };
  } else {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 9 } };
  }
}

// ============= Public API =============
export async function exportToExcel(data: ExportData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Auksys IT Tools';
  wb.created = new Date();

  buildDashboardSheet(wb, data);
  buildChartsSheet(wb, data);
  buildEquipmentSheet(wb, data);
  buildTermsSheet(wb, data);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Relatorio_TI_${data.periodLabel.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
