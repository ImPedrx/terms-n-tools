import { format } from 'date-fns';
import { t, type Language } from '@/lib/i18n';
import type { Database } from '@/integrations/supabase/types';

type TermRow = Database['public']['Tables']['responsibility_terms']['Row'];

// Escapa valores vindos do banco antes de interpolar no HTML de impressão (proteção XSS).
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.5; }
  .term-page { padding: 48px 56px; max-width: 210mm; margin: 0 auto; page-break-after: always; }
  .term-page:last-child { page-break-after: auto; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1565C0; padding-bottom: 16px; margin-bottom: 32px; }
  .header-logo img { max-height: 60px; max-width: 180px; }
  .header-title { text-align: right; }
  .header-title h1 { font-size: 18px; font-weight: 700; color: #1565C0; letter-spacing: 1px; }
  .header-title .date { font-size: 11px; color: #666; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1565C0; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 12px; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field { display: flex; gap: 6px; font-size: 13px; }
  .field-label { font-weight: 600; color: #333; white-space: nowrap; }
  .field-value { color: #555; }
  .term-text { font-size: 13px; text-align: justify; line-height: 1.8; color: #333; background: #f8f9fa; border-left: 3px solid #1565C0; padding: 16px 20px; border-radius: 0 4px 4px 0; white-space: pre-line; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 60px; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #333; margin: 0 16px; padding-top: 8px; }
  .sig-role { font-size: 12px; color: #333; font-weight: 600; }
  .sig-note { font-size: 10px; color: #999; margin-top: 2px; }
  .footer { margin-top: 48px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 8px; }
  @media print { .term-page { padding: 24px 32px; } }
`;

export function buildTermBody(rawTerm: TermRow, rawLogoUrl: string, lang: Language): string {
  const term = {
    equipment_description: esc(rawTerm.equipment_description),
    serial_number: esc(rawTerm.serial_number),
    patrimony: rawTerm.patrimony ? esc(rawTerm.patrimony) : '',
    collaborator_name: esc(rawTerm.collaborator_name),
    analyst_name: esc(rawTerm.analyst_name),
    ticket_number: esc(rawTerm.ticket_number),
    term_text: esc(rawTerm.term_text),
    created_at: rawTerm.created_at,
  };
  const logoUrl = esc(rawLogoUrl);
  return `<div class="term-page">
    <div class="header">
      <div class="header-logo">${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}</div>
      <div class="header-title">
        <h1>${t(lang, 'term_title')}</h1>
        <div class="date">${t(lang, 'term_date')}: ${format(new Date(term.created_at), 'dd/MM/yyyy')}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">${t(lang, 'term_equipment')}</div>
      <div class="fields">
        <div class="field"><span class="field-label">${t(lang, 'term_equipment')}:</span> <span class="field-value">${term.equipment_description}</span></div>
        <div class="field"><span class="field-label">${t(lang, 'term_serial')}:</span> <span class="field-value">${term.serial_number}</span></div>
        ${term.patrimony ? `<div class="field"><span class="field-label">${t(lang, 'term_patrimony')}:</span> <span class="field-value">${term.patrimony}</span></div>` : ''}
      </div>
    </div>
    <div class="section">
      <div class="section-title">${t(lang, 'term_collaborator')}</div>
      <div class="fields">
        <div class="field"><span class="field-label">${t(lang, 'term_collaborator')}:</span> <span class="field-value">${term.collaborator_name}</span></div>
        <div class="field"><span class="field-label">${t(lang, 'term_analyst')}:</span> <span class="field-value">${term.analyst_name}</span></div>
        <div class="field"><span class="field-label">${t(lang, 'term_ticket')}:</span> <span class="field-value">${term.ticket_number}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="term-text">${term.term_text}</div>
    </div>
    <div class="signatures">
      <div class="sig-block">
        <div style="min-height: 60px;"></div>
        <div class="sig-line">
          <div class="sig-role">${t(lang, 'term_collaborator_sig')}</div>
          <div class="sig-note">${term.collaborator_name}</div>
        </div>
      </div>
      <div class="sig-block">
        <div style="min-height: 60px;"></div>
        <div class="sig-line">
          <div class="sig-role">${t(lang, 'term_analyst_sig')}</div>
          <div class="sig-note">${term.analyst_name}</div>
        </div>
      </div>
    </div>
    <div class="footer">Documento gerado eletronicamente — ${t(lang, 'term_ticket')}: ${term.ticket_number}</div>
  </div>`;
}

export function buildTermsDocumentHtml(terms: TermRow[], logoUrl: string, lang: Language): string {
  const bodies = terms.map(term => buildTermBody(term, logoUrl, lang)).join('\n');
  return `<html><head><title>${t(lang, 'term_title')}</title>
    <style>${STYLES}</style></head><body>${bodies}</body></html>`;
}

export function openPrintWindow(html: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300);
  };
}
