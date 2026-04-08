import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import { t } from '@/lib/i18n';

interface Props {
  termId: string;
  onClose: () => void;
}

export function TermPreviewDialog({ termId, onClose }: Props) {
  const { data: settings } = useSettings();
  const lang = settings?.language || 'pt';
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
    printWindow.document.write(`
      <html><head><title>${t(lang, 'term_title')}</title>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600&display=swap" rel="stylesheet">
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
        .field-full { grid-column: 1 / -1; }
        .term-text { font-size: 13px; text-align: justify; line-height: 1.8; color: #333; background: #f8f9fa; border-left: 3px solid #1565C0; padding: 16px 20px; border-radius: 0 4px 4px 0; white-space: pre-line; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 40px; }
        .sig-block { text-align: center; padding-top: 16px; }
        .sig-line { border-top: 1px solid #333; margin: 0 16px; }
        .sig-name { font-family: 'Dancing Script', cursive; font-size: 20px; color: #1a1a1a; min-height: 36px; padding: 6px 0; }
        .sig-role { font-size: 11px; color: #666; margin-top: 4px; }
        .sig-date { font-size: 10px; color: #999; }
        .sig-empty { color: #ccc; font-style: italic; font-size: 12px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .return-section { margin-top: 32px; padding: 12px 16px; border: 1px dashed #999; border-radius: 4px; }
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
            ${term.collaborator_signature_name
              ? `<div class="sig-name">${term.collaborator_signature_name}</div><div class="sig-line"></div>`
              : '<div class="sig-empty">Pendente</div><div class="sig-line"></div>'}
            <div class="sig-role">${t(lang, 'term_collaborator_sig')}</div>
            ${term.collaborator_signature_date ? `<div class="sig-date">${format(new Date(term.collaborator_signature_date), 'dd/MM/yyyy HH:mm')}</div>` : ''}
          </div>
          <div class="sig-block">
            ${term.analyst_signature_name
              ? `<div class="sig-name">${term.analyst_signature_name}</div><div class="sig-line"></div>`
              : '<div class="sig-empty">Pendente</div><div class="sig-line"></div>'}
            <div class="sig-role">${t(lang, 'term_analyst_sig')}</div>
            ${term.analyst_signature_date ? `<div class="sig-date">${format(new Date(term.analyst_signature_date), 'dd/MM/yyyy HH:mm')}</div>` : ''}
          </div>
        </div>

        ${(term as any).returned_at ? `
          <div class="return-section">
            <div class="section-title">${t(lang, 'term_return')}</div>
            <div class="fields">
              <div class="field"><span class="field-label">${t(lang, 'term_returned_at')}:</span> <span class="field-value">${format(new Date((term as any).returned_at), 'dd/MM/yyyy HH:mm')}</span></div>
              ${(term as any).returned_by ? `<div class="field"><span class="field-label">${t(lang, 'term_returned_by')}:</span> <span class="field-value">${(term as any).returned_by}</span></div>` : ''}
            </div>
          </div>
        ` : ''}

        <div class="footer">Documento gerado eletronicamente — Aerrnova IT Tools</div>
      </body></html>
    `);
    printWindow.document.close();
    // Wait for Dancing Script font to load before printing
    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 600);
    };
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(lang, 'term_title')}</DialogTitle>
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

          {/* Equipment Section */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-gray-200 pb-1 mb-3">{t(lang, 'term_equipment')}</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <p><span className="font-semibold text-gray-700">{t(lang, 'term_equipment')}:</span> <span className="text-gray-600">{term.equipment_description}</span></p>
              <p><span className="font-semibold text-gray-700">{t(lang, 'term_serial')}:</span> <span className="text-gray-600">{term.serial_number}</span></p>
              {term.patrimony && <p><span className="font-semibold text-gray-700">{t(lang, 'term_patrimony')}:</span> <span className="text-gray-600">{term.patrimony}</span></p>}
            </div>
          </div>

          {/* People Section */}
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

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6">
            <div className="text-center">
              {term.collaborator_signature_name ? (
                <p className="font-signature text-xl min-h-[40px]">{term.collaborator_signature_name}</p>
              ) : (
                <p className="text-gray-300 italic text-sm min-h-[48px] flex items-center justify-center">Pendente</p>
              )}
              <div className="border-t border-gray-400 mx-4" />
              <p className="text-xs text-gray-500 mt-1">{t(lang, 'term_collaborator_sig')}</p>
              {term.collaborator_signature_date && <p className="text-[10px] text-gray-400">{format(new Date(term.collaborator_signature_date), 'dd/MM/yyyy HH:mm')}</p>}
            </div>
            <div className="text-center">
              {term.analyst_signature_name ? (
                <p className="font-signature text-xl min-h-[40px]">{term.analyst_signature_name}</p>
              ) : (
                <p className="text-gray-300 italic text-sm min-h-[48px] flex items-center justify-center">Pendente</p>
              )}
              <div className="border-t border-gray-400 mx-4" />
              <p className="text-xs text-gray-500 mt-1">{t(lang, 'term_analyst_sig')}</p>
              {term.analyst_signature_date && <p className="text-[10px] text-gray-400">{format(new Date(term.analyst_signature_date), 'dd/MM/yyyy HH:mm')}</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />{t(lang, 'print')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
