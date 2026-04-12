import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Trash2, CheckCircle2, Send, XCircle, Plus, Search, Upload, FileCheck, FolderOpen, FileText } from 'lucide-react';
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
  const base = "text-[11px] font-semibold";
  switch (status) {
    case 'pendente': return <Badge variant="secondary" className={`${base} bg-warning text-warning-foreground`}>Pendente</Badge>;
    case 'enviado_para_assinatura': return <Badge variant="secondary" className={`${base} bg-primary text-primary-foreground`}>Enviado</Badge>;
    case 'fechado': return <Badge variant="secondary" className={`${base} bg-success text-primary-foreground`}>Fechado</Badge>;
    case 'cancelado': return <Badge variant="destructive" className={base}>Cancelado</Badge>;
    default: return <Badge className={base}>{status}</Badge>;
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
  const [uploadingTermId, setUploadingTermId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: terms, isLoading } = useQuery({
    queryKey: ['terms-all'],
    queryFn: async () => {
      const { data } = await supabase.from('responsibility_terms').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ termId, newStatus }: { termId: string; newStatus: string }) => {
      const { error } = await supabase.from('responsibility_terms').update({ status: newStatus as any }).eq('id', termId);
      if (error) throw error;
      if (newStatus === 'fechado') {
        const term = terms?.find(t => t.id === termId);
        if (term?.equipment_id) {
          await supabase.from('equipment').update({ status: 'entregue' as const, assigned_to: term.collaborator_name, assigned_term_id: termId }).eq('id', term.equipment_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: () => toast({ title: 'Erro ao atualizar status', variant: 'destructive' }),
  });

  const uploadPdfMutation = useMutation({
    mutationFn: async ({ termId, file }: { termId: string; file: File }) => {
      const filePath = `${termId}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from('signed-terms').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from('responsibility_terms').update({ signed_pdf_path: filePath } as any).eq('id', termId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      toast({ title: 'PDF assinado enviado com sucesso!' });
      setUploadingTermId(null);
    },
    onError: (err: any) => toast({ title: 'Erro ao enviar PDF', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (termId: string) => {
      const term = terms?.find(t => t.id === termId);
      const { error } = await supabase.from('responsibility_terms').delete().eq('id', termId);
      if (error) throw error;
      if (term?.equipment_id) {
        await supabase.from('equipment').update({ status: 'disponivel' as const, assigned_to: null, assigned_term_id: null }).eq('id', term.equipment_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast({ title: 'Termo excluído com sucesso!' });
      setDeleteTermId(null);
    },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingTermId) uploadPdfMutation.mutate({ termId: uploadingTermId, file });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadClick = (termId: string) => { setUploadingTermId(termId); fileInputRef.current?.click(); };

  const handleDownloadSignedPdf = async (path: string) => {
    const { data, error } = await supabase.storage.from('signed-terms').download(path);
    if (error || !data) { toast({ title: 'Erro ao baixar PDF', variant: 'destructive' }); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = path.split('/').pop() || 'termo-assinado.pdf'; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = terms?.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.collaborator_name.toLowerCase().includes(q) || t.ticket_number.toLowerCase().includes(q) ||
        t.equipment_description.toLowerCase().includes(q) || t.analyst_name.toLowerCase().includes(q) || t.serial_number.toLowerCase().includes(q);
    }
    return true;
  }) || [];

  return (
    <div className="animate-fade-in space-y-6">
      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <FolderOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title">Controle de Termos</h1>
            <p className="page-description">Gerencie todos os termos de responsabilidade</p>
          </div>
        </div>
        <Button onClick={() => navigate('/termos/novo')} className="h-10 rounded-xl gap-2 font-semibold shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" /> Novo Termo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input placeholder="Buscar por chamado, colaborador..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-10 rounded-xl bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Counter */}
      <p className="text-xs text-muted-foreground font-medium">
        {filtered.length} termo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="pro-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chamado</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colaborador</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipamento</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nº Série</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analista</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PDF</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-muted-foreground/20" />
                  <span className="text-sm font-medium">Nenhum termo encontrado</span>
                  <span className="text-xs">Tente ajustar os filtros ou crie um novo termo</span>
                </div>
              </TableCell></TableRow>
            ) : filtered.map((term, i) => {
              const signedPath = (term as any).signed_pdf_path;
              return (
                <TableRow key={term.id} className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded-md font-mono font-semibold">{term.ticket_number}</code></TableCell>
                  <TableCell className="font-medium text-sm">{term.collaborator_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{term.equipment_description}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">{term.serial_number}</code></TableCell>
                  <TableCell className="text-sm">{term.analyst_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(term.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{statusBadge(term.status)}</TableCell>
                  <TableCell>
                    {signedPath ? (
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadSignedPdf(signedPath)} title="Baixar PDF assinado" className="h-8 w-8 rounded-lg hover:bg-success/10">
                        <FileCheck className="h-4 w-4 text-success" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleUploadClick(term.id)} title="Enviar PDF assinado" disabled={uploadPdfMutation.isPending} className="h-8 w-8 rounded-lg hover:bg-muted">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5 flex-wrap">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewTermId(term.id)} title="Visualizar" className="h-8 w-8 rounded-lg hover:bg-primary/10"><Eye className="h-3.5 w-3.5" /></Button>
                      {term.status === 'pendente' && (
                        <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ termId: term.id, newStatus: 'enviado_para_assinatura' })} title="Marcar como enviado" className="h-8 w-8 rounded-lg hover:bg-primary/10"><Send className="h-3.5 w-3.5 text-primary" /></Button>
                      )}
                      {(term.status === 'pendente' || term.status === 'enviado_para_assinatura') && (
                        <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ termId: term.id, newStatus: 'fechado' })} title="Fechar" className="h-8 w-8 rounded-lg hover:bg-success/10"><CheckCircle2 className="h-3.5 w-3.5 text-success" /></Button>
                      )}
                      {term.status !== 'cancelado' && term.status !== 'fechado' && (
                        <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ termId: term.id, newStatus: 'cancelado' })} title="Cancelar" className="h-8 w-8 rounded-lg hover:bg-warning/10"><XCircle className="h-3.5 w-3.5 text-warning" /></Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTermId(term.id)} title="Excluir" className="h-8 w-8 rounded-lg hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {previewTermId && <TermPreviewDialog termId={previewTermId} onClose={() => setPreviewTermId(null)} />}

      <AlertDialog open={!!deleteTermId} onOpenChange={() => setDeleteTermId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Excluir Termo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este termo? Esta ação não pode ser desfeita. O equipamento vinculado voltará ao status "Disponível".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTermId && deleteMutation.mutate(deleteTermId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
