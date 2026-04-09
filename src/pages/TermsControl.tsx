import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Download, Trash2, CheckCircle2, Send, XCircle, Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TermPreviewDialog } from '@/components/TermPreviewDialog';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviado_para_assinatura', label: 'Enviado para Assinatura' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const statusBadge = (status: string) => {
  switch (status) {
    case 'pendente': return <Badge variant="secondary" className="bg-warning text-warning-foreground">Pendente</Badge>;
    case 'enviado_para_assinatura': return <Badge variant="secondary" className="bg-primary text-primary-foreground">Enviado p/ Assinatura</Badge>;
    case 'fechado': return <Badge variant="secondary" className="bg-success text-primary-foreground">Fechado</Badge>;
    case 'cancelado': return <Badge variant="destructive">Cancelado</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

export default function TermsControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [previewTermId, setPreviewTermId] = useState<string | null>(null);
  const [deleteTermId, setDeleteTermId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: terms, isLoading } = useQuery({
    queryKey: ['terms-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('responsibility_terms')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ termId, newStatus }: { termId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('responsibility_terms')
        .update({ status: newStatus as any })
        .eq('id', termId);
      if (error) throw error;

      // If closing, update equipment status to entregue
      if (newStatus === 'fechado') {
        const term = terms?.find(t => t.id === termId);
        if (term?.equipment_id) {
          await supabase.from('equipment').update({
            status: 'entregue' as const,
            assigned_to: term.collaborator_name,
            assigned_term_id: termId,
          }).eq('id', term.equipment_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['terms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar status', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (termId: string) => {
      const term = terms?.find(t => t.id === termId);
      const { error } = await supabase.from('responsibility_terms').delete().eq('id', termId);
      if (error) throw error;
      if (term?.equipment_id) {
        await supabase.from('equipment').update({
          status: 'disponivel' as const,
          assigned_to: null,
          assigned_term_id: null,
        }).eq('id', term.equipment_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['terms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-available'] });
      toast({ title: 'Termo excluído com sucesso!' });
      setDeleteTermId(null);
    },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  });

  const filtered = terms?.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.collaborator_name.toLowerCase().includes(q) ||
        t.ticket_number.toLowerCase().includes(q) ||
        t.equipment_description.toLowerCase().includes(q) ||
        t.analyst_name.toLowerCase().includes(q) ||
        t.serial_number.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Controle de Termos</h1>
          <p className="page-description">Gerencie todos os termos de responsabilidade</p>
        </div>
        <Button onClick={() => navigate('/termos/novo')}>
          <Plus className="h-4 w-4 mr-2" /> Novo Termo
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por chamado, colaborador, equipamento..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chamado</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Nº Série</TableHead>
              <TableHead>Analista</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum termo encontrado</TableCell></TableRow>
            ) : filtered.map(term => (
              <TableRow key={term.id}>
                <TableCell className="font-mono text-sm font-medium">{term.ticket_number}</TableCell>
                <TableCell>{term.collaborator_name}</TableCell>
                <TableCell className="text-sm">{term.equipment_description}</TableCell>
                <TableCell className="font-mono text-xs">{term.serial_number}</TableCell>
                <TableCell>{term.analyst_name}</TableCell>
                <TableCell className="text-xs">{format(new Date(term.created_at), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{statusBadge(term.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button variant="ghost" size="icon" onClick={() => setPreviewTermId(term.id)} title="Visualizar / PDF">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {term.status === 'pendente' && (
                      <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ termId: term.id, newStatus: 'enviado_para_assinatura' })} title="Marcar como enviado">
                        <Send className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {(term.status === 'pendente' || term.status === 'enviado_para_assinatura') && (
                      <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ termId: term.id, newStatus: 'fechado' })} title="Fechar chamado">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    {term.status !== 'cancelado' && term.status !== 'fechado' && (
                      <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ termId: term.id, newStatus: 'cancelado' })} title="Cancelar">
                        <XCircle className="h-4 w-4 text-warning" />
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
