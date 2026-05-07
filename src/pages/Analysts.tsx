import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Analyst { id: string; name: string; email: string | null; }

export default function Analysts() {
  const { effectiveClientId, isAdmin } = useTenant();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Analyst | null>(null);
  const [form, setForm] = useState({ name: '', email: '' });

  const { data: analysts = [], isLoading } = useQuery({
    queryKey: ['analysts-manage', effectiveClientId],
    queryFn: async () => {
      let q = supabase.from('analysts').select('id, name, email').order('name');
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Analyst[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nome obrigatório');
      const payload = { name: form.name.trim(), email: form.email.trim() || null };
      if (editing) {
        const { error } = await supabase.from('analysts').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('analysts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analysts-manage'] });
      qc.invalidateQueries({ queryKey: ['analysts'] });
      setOpen(false); setEditing(null); setForm({ name: '', email: '' });
      toast({ title: editing ? 'Analista atualizado' : 'Analista criado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('analysts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analysts-manage'] });
      qc.invalidateQueries({ queryKey: ['analysts'] });
      toast({ title: 'Analista removido' });
    },
    onError: (e: any) => toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '' }); setOpen(true); };
  const openEdit = (a: Analyst) => { setEditing(a); setForm({ name: a.name, email: a.email || '' }); setOpen(true); };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title">Analistas</h1>
            <p className="page-description">Gerencie os analistas que assinam termos</p>
          </div>
        </div>
        <Button onClick={openCreate} className="h-10 rounded-xl gap-2 font-semibold shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" /> Novo Analista
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : analysts.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum analista cadastrado</TableCell></TableRow>
              ) : analysts.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{a.email || '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Excluir analista "${a.name}"?`)) remove.mutate(a.id); }} className="h-8 w-8 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Analista' : 'Novo Analista'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
