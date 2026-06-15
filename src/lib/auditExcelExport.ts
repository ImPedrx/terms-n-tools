import ExcelJS from 'exceljs';

const HEADER_BG = 'FF1565C0';
const HEADER_BG_DARK = 'FF0D47A1';
const ZEBRA = 'FFF5F9FF';

export interface AuditLogRow {
  created_at: string;
  action: string;
  entity_type: string;
  user_email: string | null;
  description: string | null;
}

/**
 * Exporta os registros de auditoria (já filtrados na tela) para Excel.
 * As funções de tradução vêm da própria página para manter consistência
 * com os rótulos exibidos.
 */
export async function exportAuditLogsExcel(
  logs: AuditLogRow[],
  actionLabel: (a: string) => string,
  entityLabel: (e: string) => string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Auksys IT Tools';
  wb.created = new Date();

  const ws = wb.addWorksheet('Histórico', { properties: { tabColor: { argb: HEADER_BG } } });
  ws.columns = [
    { header: 'Data', key: 'date', width: 22 },
    { header: 'Ação', key: 'action', width: 14 },
    { header: 'Entidade', key: 'entity', width: 18 },
    { header: 'Usuário', key: 'user', width: 30 },
    { header: 'Descrição', key: 'desc', width: 70 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.height = 26;
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.border = { bottom: { style: 'medium', color: { argb: HEADER_BG_DARK } } };
  });

  for (const l of logs) {
    ws.addRow({
      date: new Date(l.created_at).toLocaleString('pt-BR'),
      action: actionLabel(l.action),
      entity: entityLabel(l.entity_type),
      user: l.user_email || '—',
      desc: l.description || '',
    });
  }

  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    if (n % 2 === 0) row.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    });
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'E1' };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historico_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
