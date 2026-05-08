import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant, type ClientRow } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Eye, Pencil, UserPlus, Loader2, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PlaybookSection from './Playbook';
import { logAudit } from '@/lib/audit';

export default function AdminClients() {
  const { setImpersonatedClient } = useTenant();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [form, setForm] = useState({ name: '', primary_color: '#1565C0', is_active: true });
  const [analystOpen, setAnalystOpen] = useState<ClientRow | null>(null);
  const [analystForm, setAnalystForm] = useState({ email: '', password: '', full_name: '' });
  const [playbookFor, setPlaybookFor] = useState<ClientRow | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('name');
      if (error) throw error;
      return data as ClientRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from('clients').update(form).eq('id', editing.id);
        if (error) throw error;
        await logAudit({ action: 'update', entity_type: 'client', entity_id: editing.id, description: `Cliente "${form.name}" atualizado`, client_id: editing.id });
      } else {
        const { data, error } = await supabase.from('clients').insert(form).select().single();
        if (error) throw error;
        await logAudit({ action: 'create', entity_type: 'client', entity_id: data?.id, description: `Cliente "${form.name}" criado`, client_id: data?.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-clients'] });
      setDialogOpen(false); setEditing(null); setForm({ name: '', primary_color: '#1565C0', is_active: true });
      toast({ title: editing ? 'Cliente atualizado' : 'Cliente criado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: ClientRow) => {
      const { error } = await supabase.from('clients').update({ is_active: !c.is_active }).eq('id', c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clients'] }),
  });

  const createAnalyst = useMutation({
    mutationFn: async () => {
      if (!analystOpen) return;
      const { data, error } = await supabase.functions.invoke('admin-create-analyst', {
        body: { ...analystForm, client_id: analystOpen.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await logAudit({ action: 'create', entity_type: 'analyst', description: `Analista "${analystForm.full_name}" (${analystForm.email}) criado para ${analystOpen.name}`, client_id: analystOpen.id });
    },
    onSuccess: () => {
      toast({ title: 'Analista criado!', description: 'O usuário pode fazer login com a senha definida.' });
      setAnalystOpen(null);
      setAnalystForm({ email: '', password: '', full_name: '' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar analista', description: e.message, variant: 'destructive' }),
  });

  const openEdit = (c: ClientRow) => {
    setEditing(c);
    setForm({ name: c.name, primary_color: c.primary_color, is_active: c.is_active });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', primary_color: '#1565C0', is_active: true });
    setDialogOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title">Clientes</h1>
            <p className="page-description">Gerencie todos os clientes da plataforma</p>
          </div>
        </div>
        <Button onClick={openCreate} className="h-10 rounded-xl gap-2 font-semibold shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : clients.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded border" style={{ background: c.primary_color }} />
                      <code className="text-xs">{c.primary_color}</code>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.is_active
                      ? <Badge className="bg-success text-primary-foreground">Ativo</Badge>
                      : <Badge variant="destructive">Inativo</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" title="Acessar ambiente" onClick={() => setImpersonatedClient(c)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Playbook" onClick={() => setPlaybookFor(c)} className="h-8 w-8"><BookOpen className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Criar analista" onClick={() => setAnalystOpen(c)} className="h-8 w-8"><UserPlus className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(c)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                      <div className="flex items-center px-2">
                        <Switch checked={c.is_active} onCheckedChange={() => toggleActive.mutate(c)} />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Cor primária</Label>
              <Input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="h-10 w-24" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create analyst dialog */}
      <Dialog open={!!analystOpen} onOpenChange={(o) => !o && setAnalystOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Criar analista — {analystOpen?.name}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createAnalyst.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Nome completo</Label><Input value={analystForm.full_name} onChange={e => setAnalystForm({ ...analystForm, full_name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={analystForm.email} onChange={e => setAnalystForm({ ...analystForm, email: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Senha temporária</Label><Input type="text" minLength={6} value={analystForm.password} onChange={e => setAnalystForm({ ...analystForm, password: e.target.value })} required /></div>
            <DialogFooter>
              <Button type="submit" disabled={createAnalyst.isPending}>
                {createAnalyst.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar analista
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Playbook dialog (admin per-client) */}
      <Dialog open={!!playbookFor} onOpenChange={(o) => !o && setPlaybookFor(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Playbook — {playbookFor?.name}</DialogTitle></DialogHeader>
          {playbookFor && <PlaybookSection clientId={playbookFor.id} embedded />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
