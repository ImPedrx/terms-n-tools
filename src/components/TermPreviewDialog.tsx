import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import { t, type Language } from '@/lib/i18n';

interface Props {
  termId: string;
  onClose: () => void;
}

function buildDocumentHtml(term: any, logoUrl: string, lang: Language) {
  return `<html><head><title>${t(lang, 'term_title')}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 48px 56px; max-width: 210mm; margin: 0 auto; color: #1a1a1a; line-height: 1.5; }
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
      @media print { body { padding: 24px 32px; } }
    </style></head><body>
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

      <div class="footer">Documento gerado eletronicamente — Chamado: ${term.ticket_number}</div>
    </body></html>`;
}

export function TermPreviewDialog({ termId, onClose }: Props) {
  const { data: settings } = useSettings();
  const lang = (settings?.language || 'pt') as Language;
  const logoUrl = settings?.company_logo_url || '';

  const { data: term } = useQuery({
    queryKey: ['term', termId],
    queryFn: async () => {
      const { data } = await supabase.from('responsibility_terms').select('*').eq('id', termId).single();
      return data;
    },
  });

  if (!term) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(buildDocumentHtml(term, logoUrl, lang));
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 300);
    };
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(lang, 'term_title')} — {term.ticket_number}</DialogTitle>
        </DialogHeader>
        
        <div className="bg-white text-gray-900 rounded-lg shadow-sm p-8 space-y-6 border" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-blue-700 pb-4">
            <div>{logoUrl && <img src={logoUrl} alt="Logo" className="h-12 max-w-[160px] object-contain" />}</div>
            <div className="text-right">
              <h2 className="text-base font-bold text-blue-700 tracking-wide">{t(lang, 'term_title')}</h2>
              <p className="text-xs text-gray-500 mt-1">{t(lang, 'term_date')}: {format(new Date(term.created_at), 'dd/MM/yyyy')}</p>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-gray-200 pb-1 mb-3">{t(lang, 'term_equipment')}</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <p><span className="font-semibold text-gray-700">{t(lang, 'term_equipment')}:</span> <span className="text-gray-600">{term.equipment_description}</span></p>
              <p><span className="font-semibold text-gray-700">{t(lang, 'term_serial')}:</span> <span className="text-gray-600">{term.serial_number}</span></p>
              {term.patrimony && <p><span className="font-semibold text-gray-700">{t(lang, 'term_patrimony')}:</span> <span className="text-gray-600">{term.patrimony}</span></p>}
            </div>
          </div>

          {/* People */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-gray-200 pb-1 mb-3">{t(lang, 'term_collaborator')}</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <p><span className="font-semibold text-gray-700">{t(lang, 'term_collaborator')}:</span> <span className="text-gray-600">{term.collaborator_name}</span></p>
              <p><span className="font-semibold text-gray-700">{t(lang, 'term_analyst')}:</span> <span className="text-gray-600">{term.analyst_name}</span></p>
              <p><span className="font-semibold text-gray-700">{t(lang, 'term_ticket')}:</span> <span className="text-gray-600">{term.ticket_number}</span></p>
            </div>
          </div>

          {/* Term Text */}
          <div className="text-sm text-justify leading-relaxed text-gray-700 bg-gray-50 border-l-[3px] border-blue-700 py-4 px-5 rounded-r whitespace-pre-line">
            {term.term_text}
          </div>

          {/* Signature spaces */}
          <div className="grid grid-cols-2 gap-8 pt-10">
            <div className="text-center">
              <div className="min-h-[60px]" />
              <div className="border-t border-gray-400 mx-4 pt-2">
                <p className="text-xs font-semibold text-gray-600">{t(lang, 'term_collaborator_sig')}</p>
                <p className="text-[10px] text-gray-400">{term.collaborator_name}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="min-h-[60px]" />
              <div className="border-t border-gray-400 mx-4 pt-2">
                <p className="text-xs font-semibold text-gray-600">{t(lang, 'term_analyst_sig')}</p>
                <p className="text-[10px] text-gray-400">{term.analyst_name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
