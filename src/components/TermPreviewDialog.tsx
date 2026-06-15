import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import { t, type Language } from '@/lib/i18n';
import { buildTermsDocumentHtml, openPrintWindow } from '@/lib/termDocument';

interface Props {
  termId: string;
  onClose: () => void;
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
    openPrintWindow(buildTermsDocumentHtml([term], logoUrl, lang));
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
