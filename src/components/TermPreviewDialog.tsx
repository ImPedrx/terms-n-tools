import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  termId: string;
  onClose: () => void;
}

export function TermPreviewDialog({ termId, onClose }: Props) {
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
      <html><head><title>Termo de Responsabilidade</title>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600&display=swap" rel="stylesheet">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 210mm; margin: 0 auto; }
        h1 { text-align: center; font-size: 18px; }
        .field { margin: 8px 0; }
        .label { font-weight: bold; }
        .term-text { margin: 24px 0; line-height: 1.6; text-align: justify; }
        .signature { margin-top: 40px; border-top: 1px solid #333; padding-top: 8px; }
        .sig-name { font-family: 'Dancing Script', cursive; font-size: 24px; }
      </style></head><body>
        <h1>TERMO DE RESPONSABILIDADE</h1>
        <p style="text-align:center; color:#666;">Data: ${format(new Date(term.created_at), 'dd/MM/yyyy')}</p>
        <div class="field"><span class="label">Equipamento:</span> ${term.equipment_description}</div>
        <div class="field"><span class="label">Nº Série:</span> ${term.serial_number}</div>
        ${term.patrimony ? `<div class="field"><span class="label">Patrimônio:</span> ${term.patrimony}</div>` : ''}
        <div class="field"><span class="label">Colaborador:</span> ${term.collaborator_name}</div>
        <div class="field"><span class="label">Analista:</span> ${term.analyst_name}</div>
        <div class="field"><span class="label">Chamado:</span> ${term.ticket_number}</div>
        <div class="term-text">${term.term_text}</div>
        ${term.collaborator_signature_name ? `
          <div class="signature">
            <div class="sig-name">${term.collaborator_signature_name}</div>
            <div>Colaborador — ${term.collaborator_signature_date ? format(new Date(term.collaborator_signature_date), 'dd/MM/yyyy HH:mm') : ''}</div>
          </div>
        ` : ''}
        ${term.analyst_signature_name ? `
          <div class="signature">
            <div class="sig-name">${term.analyst_signature_name}</div>
            <div>Analista — ${term.analyst_signature_date ? format(new Date(term.analyst_signature_date), 'dd/MM/yyyy HH:mm') : ''}</div>
          </div>
        ` : ''}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Termo de Responsabilidade</DialogTitle>
        </DialogHeader>
        <div className="document-preview text-sm space-y-4">
          <h2 className="text-center text-lg font-bold">TERMO DE RESPONSABILIDADE</h2>
          <p className="text-center text-muted-foreground text-xs">Data: {format(new Date(term.created_at), 'dd/MM/yyyy')}</p>
          
          <div className="space-y-2 text-sm">
            <p><strong>Equipamento:</strong> {term.equipment_description}</p>
            <p><strong>Nº Série:</strong> {term.serial_number}</p>
            {term.patrimony && <p><strong>Patrimônio:</strong> {term.patrimony}</p>}
            <p><strong>Colaborador:</strong> {term.collaborator_name}</p>
            <p><strong>Analista:</strong> {term.analyst_name}</p>
            <p><strong>Chamado:</strong> {term.ticket_number}</p>
          </div>

          <p className="text-justify leading-relaxed">{term.term_text}</p>

          {term.collaborator_signature_name && (
            <div className="border-t pt-4">
              <p className="font-signature text-2xl">{term.collaborator_signature_name}</p>
              <p className="text-xs text-muted-foreground">
                Colaborador — {term.collaborator_signature_date ? format(new Date(term.collaborator_signature_date), 'dd/MM/yyyy HH:mm') : ''}
              </p>
            </div>
          )}

          {term.analyst_signature_name && (
            <div className="border-t pt-4">
              <p className="font-signature text-2xl">{term.analyst_signature_name}</p>
              <p className="text-xs text-muted-foreground">
                Analista — {term.analyst_signature_date ? format(new Date(term.analyst_signature_date), 'dd/MM/yyyy HH:mm') : ''}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Imprimir / PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
