import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Printer, Download } from 'lucide-react';
import { useState } from 'react';
import { TermPreviewDialog } from '@/components/TermPreviewDialog';
import { format } from 'date-fns';

export default function SignedTerms() {
  const [previewTermId, setPreviewTermId] = useState<string | null>(null);

  const { data: terms, isLoading } = useQuery({
    queryKey: ['terms-signed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('responsibility_terms')
        .select('*')
        .eq('status', 'totalmente_assinado')
        .order('analyst_signature_date', { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Documentos Assinados</h1>
        <p className="page-description">Termos totalmente assinados e arquivados</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Nº Série</TableHead>
              <TableHead>Chamado</TableHead>
              <TableHead>Analista</TableHead>
              <TableHead>Assinatura Colab.</TableHead>
              <TableHead>Assinatura Analista</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : terms?.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum documento assinado</TableCell></TableRow>
            ) : terms?.map(term => (
              <TableRow key={term.id}>
                <TableCell className="font-medium">{term.collaborator_name}</TableCell>
                <TableCell>{term.equipment_description}</TableCell>
                <TableCell className="font-mono text-xs">{term.serial_number}</TableCell>
                <TableCell className="font-mono text-xs">{term.ticket_number}</TableCell>
                <TableCell>{term.analyst_name}</TableCell>
                <TableCell className="text-xs">{term.collaborator_signature_date ? format(new Date(term.collaborator_signature_date), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                <TableCell className="text-xs">{term.analyst_signature_date ? format(new Date(term.analyst_signature_date), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                <TableCell><Badge className="bg-success text-primary-foreground">Assinado</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setPreviewTermId(term.id)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {previewTermId && <TermPreviewDialog termId={previewTermId} onClose={() => setPreviewTermId(null)} />}
    </div>
  );
}
