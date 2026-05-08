import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { format } from 'date-fns';

interface PlaybookSectionProps {
  clientId?: string | null; // when admin viewing specific client
  embedded?: boolean; // hides page header
}

export default function PlaybookSection({ clientId, embedded }: PlaybookSectionProps) {
  const { user } = useAuth();
  const { effectiveClientId } = useTenant();
  const targetClientId = clientId ?? effectiveClientId;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', category: 'Geral', content: '' });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [view, setView] = useState<any | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['playbook', targetClientId],
    queryFn: async () => {
      let q = (supabase.from('playbook_procedures' as any) as any).select('*').order('created_at', { ascending: false });
      if (targetClientId) q = q.eq('client_id', targetClientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!targetClientId,
  });

  const categories = useMemo(() => Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))), [items]);

  const filtered = useMemo(() => items.filter((i: any) => {
    if (filterCat !== 'all' && i.category !== filterCat) return false;
    if (search && !(`${i.title} ${i.content} ${i.category}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [items, search, filterCat]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        author_id: user?.id ?? null,
        author_name: user?.email ?? null,
      };
      if (clientId) payload.client_id = clientId;
      if (editing) {
        const { error } = await (supabase.from('playbook_procedures' as any) as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        await logAudit({ action: 'update', entity_type: 'playbook', entity_id: editing.id, description: `Procedimento "${form.title}" atualizado`, client_id: targetClientId });
      } else {
        const { data, error } = await (supabase.from('playbook_procedures' as any) as any).insert(payload).select().single();
        if (error) throw error;
        await logAudit({ action: 'create', entity_type: 'playbook', entity_id: (data as any)?.id, description: `Procedimento "${form.title}" criado`, client_id: targetClientId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playbook', targetClientId] });
      setDialogOpen(false); setEditing(null); setForm({ title: '', category: 'Geral', content: '' });
      toast({ title: editing ? 'Procedimento atualizado' : 'Procedimento criado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await (supabase.from('playbook_procedures' as any) as any).delete().eq('id', item.id);
      if (error) throw error;
      await logAudit({ action: 'delete', entity_type: 'playbook', entity_id: item.id, description: `Procedimento "${item.title}" removido`, client_id: targetClientId });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playbook', targetClientId] }); toast({ title: 'Removido' }); },
  });

  const openCreate = () => { setEditing(null); setForm({ title: '', category: 'Geral', content: '' }); setDialogOpen(true); };
  const openEdit = (i: any) => { setEditing(i); setForm({ title: i.title, category: i.category, content: i.content }); setDialogOpen(true); };

  return (
    <div className="animate-fade-in space-y-6">
      {!embedded && (
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="page-title">Playbook</h1>
              <p className="page-description">Procedimentos e boas práticas da empresa</p>
            </div>
          </div>
          <Button onClick={openCreate} className="h-10 rounded-xl gap-2 font-semibold shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" /> Novo Procedimento
          </Button>
        </div>
      )}

      {embedded && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Playbook</h2>
          <Button onClick={openCreate} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por título, conteúdo, categoria..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? <div className="text-muted-foreground">Carregando...</div> :
          filtered.length === 0 ? <div className="text-muted-foreground col-span-full p-8 text-center">Nenhum procedimento</div> :
          filtered.map((i: any) => (
            <Card key={i.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setView(i)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{i.title}</h3>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{i.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{i.content}</p>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-[10px] text-muted-foreground">{format(new Date(i.created_at), 'dd/MM/yyyy')} · {i.author_name || '—'}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Remover?')) remove.mutate(i); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={o => !o && setView(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{view?.title}</DialogTitle>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline">{view?.category}</Badge>
              <span className="text-xs text-muted-foreground">{view && format(new Date(view.created_at), 'dd/MM/yyyy HH:mm')} · {view?.author_name}</span>
            </div>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{view?.content}</div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar procedimento' : 'Novo procedimento'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Onboarding, Manutenção..." /></div>
            <div className="space-y-1.5">
              <Label>Conteúdo</Label>
              <div className="flex gap-1 flex-wrap">
                {[
                  { l: 'B', wrap: '**' }, { l: 'I', wrap: '_' }, { l: '• Lista', prefix: '\n- ' }, { l: '1. Lista', prefix: '\n1. ' }, { l: '## Título', prefix: '\n## ' },
                ].map((b: any) => (
                  <Button key={b.l} type="button" size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => {
                      if (b.wrap) setForm(f => ({ ...f, content: f.content + `${b.wrap}texto${b.wrap}` }));
                      else setForm(f => ({ ...f, content: f.content + b.prefix }));
                    }}>{b.l}</Button>
                ))}
              </div>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={12} className="font-mono text-xs" placeholder="Use **negrito**, _itálico_, listas com - ou 1." required />
              <p className="text-[10px] text-muted-foreground">Suporta formatação Markdown simples (negrito, itálico, listas, títulos)</p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
