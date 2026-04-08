import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Copy, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { TermPreviewDialog } from '@/components/TermPreviewDialog';
import { AnalystSignDialog } from '@/components/AnalystSignDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PendingTerms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewTermId, setPreviewTermId] = useState<string | null>(null);
  const [signTermId, setSignTermId] = useState<string | null>(null);
  const [deleteTermId, setDeleteTermId] = useState<string | null>(null);

  const { data: terms, isLoading } = useQuery({
    queryKey: ['terms-pending'],
    queryFn: async () => {
      const { data } = await supabase
        .from('responsibility_terms')
        .select('*')
        .in('status', ['pendente_colaborador', 'aguardando_analista'])
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (termId: string) => {
      const term = terms?.find(t => t.id === termId);
      const { error } = await supabase.from('responsibility_terms').delete().eq('id', termId);
      if (error) throw error;
      // If equipment was linked, set it back to available
      if (term?.equipment_id) {
        await supabase.from('equipment').update({ status: 'disponivel' as const, assigned_to: null, assigned_term_id: null }).eq('id', term.equipment_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-pending'] });
      queryClient.invalidateQueries({ queryKey: ['terms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-available'] });
      toast({ title: 'Termo excluído com sucesso!' });
      setDeleteTermId(null);
    },
    onError: () => toast({ title: 'Erro ao excluir termo', variant: 'destructive' }),
  });

  const copyLink = (token: string, password: string) => {
    const publishedUrl = 'https://terms-n-tools.lovable.app';
    const link = `${publishedUrl}/assinar/${token}`;
    navigator.clipboard.writeText(`Link: ${link}\nSenha: ${password}`);
    toast({ title: 'Link e senha copiados!' });
  };

  const statusBadge = (status: string) => {
    if (status === 'pendente_colaborador') return <Badge variant="secondary" className="bg-warning text-primary-foreground">Pendente Colaborador</Badge>;
    if (status === 'aguardando_analista') return <Badge variant="secondary" className="bg-primary text-primary-foreground">Aguardando Analista</Badge>;
    return <Badge>{status}</Badge>;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Termos Pendentes</h1>
        <p className="page-description">Termos aguardando assinatura</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Chamado</TableHead>
              <TableHead>Analista</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : terms?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum termo pendente</TableCell></TableRow>
            ) : terms?.map(term => (
              <TableRow key={term.id}>
                <TableCell className="font-medium">{term.collaborator_name}</TableCell>
                <TableCell>{term.equipment_description}</TableCell>
                <TableCell className="font-mono text-xs">{term.ticket_number}</TableCell>
                <TableCell>{term.analyst_name}</TableCell>
                <TableCell>{statusBadge(term.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setPreviewTermId(term.id)} title="Visualizar">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {term.status === 'pendente_colaborador' && (
                      <Button variant="ghost" size="icon" onClick={() => copyLink(term.access_token, term.access_password)} title="Copiar link">
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    {term.status === 'aguardando_analista' && (
                      <Button variant="outline" size="sm" onClick={() => setSignTermId(term.id)}>
                        Assinar
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTermId(term.id)} title="Excluir" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {previewTermId && <TermPreviewDialog termId={previewTermId} onClose={() => setPreviewTermId(null)} />}
      {signTermId && <AnalystSignDialog termId={signTermId} onClose={() => setSignTermId(null)} />}

      <AlertDialog open={!!deleteTermId} onOpenChange={() => setDeleteTermId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Termo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este termo? Esta ação não pode ser desfeita. O equipamento vinculado voltará ao status "Disponível".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTermId && deleteMutation.mutate(deleteTermId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
