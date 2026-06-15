import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, RotateCcw, ScanBarcode, Monitor, Package, Archive } from 'lucide-react';
import { ReturnEquipmentDialog } from '@/components/ReturnEquipmentDialog';
import { BulkEquipmentDialog } from '@/components/BulkEquipmentDialog';
import { AddEquipmentTypeDialog } from '@/components/AddEquipmentTypeDialog';
import { useEquipmentTypes } from '@/hooks/useEquipmentTypes';
import { useTenant } from '@/contexts/TenantContext';
import { EQUIPMENT_STATUS } from '@/lib/constants';
import type { Database } from '@/integrations/supabase/types';
import { logAudit } from '@/lib/audit';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/TablePagination';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type EquipmentStatus = Database['public']['Enums']['equipment_status'];

interface EquipmentForm {
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  patrimony: string;
  sector: string;
  status: EquipmentStatus;
  observations: string;
  is_legacy: boolean;
  legacy_user_name: string;
  legacy_user_email: string;
}

const emptyForm: EquipmentForm = {
  type: '', brand: '', model: '', serial_number: '', patrimony: '', sector: '',
  status: 'disponivel', observations: '',
  is_legacy: false, legacy_user_name: '', legacy_user_email: '',
};

const ADD_TYPE_VALUE = '__add_new__';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLegacy, setFilterLegacy] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentForm>(emptyForm);
  const [returnEquipment, setReturnEquipment] = useState<any>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: types = [] } = useEquipmentTypes();
  const { effectiveClientId, isAdmin } = useTenant();

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', effectiveClientId],
    queryFn: async () => {
      let q = supabase.from('equipment').select('*').order('created_at', { ascending: false });
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: EquipmentForm) => {
      const payload = {
        type: data.type,
        brand: data.brand,
        model: data.model,
        serial_number: data.serial_number,
        patrimony: data.patrimony || null,
        sector: data.sector || null,
        status: data.is_legacy ? ('entregue' as const) : data.status,
        observations: data.observations || null,
        is_legacy: data.is_legacy,
        legacy_user_name: data.is_legacy ? data.legacy_user_name || null : null,
        legacy_user_email: data.is_legacy ? data.legacy_user_email || null : null,
        legacy_delivered_at: null,
        assigned_to: data.is_legacy ? data.legacy_user_name || null : null,
      };
      if (editingId) {
        const { data: conflict } = await supabase
          .from('equipment')
          .select('id')
          .eq('serial_number', data.serial_number)
          .neq('id', editingId)
          .maybeSingle();
        if (conflict) throw new Error(`O serial "${data.serial_number}" já está cadastrado em outro equipamento.`);
        const { error } = await supabase.from('equipment').update(payload).eq('id', editingId);
        if (error) throw error;
        await logAudit({ action: 'update', entity_type: 'equipment', entity_id: editingId, description: `Equipamento ${payload.brand} ${payload.model} (SN ${payload.serial_number}) atualizado` });
      } else {
        const { data: existing } = await supabase
          .from('equipment')
          .select('id')
          .eq('serial_number', data.serial_number)
          .maybeSingle();
        if (existing) throw new Error(`O serial "${data.serial_number}" já está cadastrado no inventário.`);
        const { data: ins, error } = await supabase.from('equipment').insert(payload).select().single();
        if (error) throw error;
        await logAudit({ action: 'create', entity_type: 'equipment', entity_id: ins?.id, description: `Equipamento ${payload.brand} ${payload.model} (SN ${payload.serial_number}) cadastrado` });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? 'Equipamento atualizado' : 'Equipamento cadastrado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
      await logAudit({ action: 'delete', entity_type: 'equipment', entity_id: id, description: 'Equipamento excluído' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      toast({ title: 'Equipamento excluído' });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: 'Erro ao excluir', description: e?.message, variant: 'destructive' }),
  });

  const filtered = equipment?.filter(e => {
    const matchSearch = search === '' ||
      e.brand.toLowerCase().includes(search.toLowerCase()) ||
      e.model.toLowerCase().includes(search.toLowerCase()) ||
      e.serial_number.toLowerCase().includes(search.toLowerCase()) ||
      (e.patrimony || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    const matchType = filterType === 'all' || e.type === filterType;
    const matchLegacy = filterLegacy === 'all' || (filterLegacy === 'legacy' ? e.is_legacy : !e.is_legacy);
    return matchSearch && matchStatus && matchType && matchLegacy;
  }) || [];

  const pagination = usePagination(filtered, 20);

  const openEdit = (eq: NonNullable<typeof equipment>[0]) => {
    setEditingId(eq.id);
    setForm({
      type: eq.type, brand: eq.brand, model: eq.model, serial_number: eq.serial_number,
      patrimony: eq.patrimony || '', sector: (eq as any).sector || '',
      status: eq.status, observations: eq.observations || '',
      is_legacy: !!eq.is_legacy,
      legacy_user_name: eq.legacy_user_name || '',
      legacy_user_email: eq.legacy_user_email || '',
    });
    setDialogOpen(true);
  };

  const statusLabel = (s: string) => EQUIPMENT_STATUS.find(x => x.value === s);

  const handleTypeChange = (v: string) => {
    if (v === ADD_TYPE_VALUE) { setAddTypeOpen(true); return; }
    setForm({ ...form, type: v });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title">Inventário</h1>
            <p className="page-description">Gerencie todos os equipamentos de TI</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="h-10 rounded-xl gap-2 font-semibold">
            <ScanBarcode className="h-4 w-4" />Lançamento em Massa
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button className="h-10 rounded-xl gap-2 font-semibold shadow-md shadow-primary/20">
                <Plus className="h-4 w-4" />Novo Equipamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">{editingId ? 'Editar' : 'Novo'} Equipamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                    <Select value={form.type} onValueChange={handleTypeChange}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {types.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                        <SelectItem value={ADD_TYPE_VALUE} className="text-primary font-semibold">+ Adicionar novo tipo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EquipmentStatus })} disabled={form.is_legacy}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marca</Label><Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} required className="rounded-xl" /></div>
                  <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modelo</Label><Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required className="rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nº de Série</Label><Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} required className="rounded-xl" /></div>
                  <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patrimônio</Label><Input value={form.patrimony} onChange={e => setForm({ ...form, patrimony: e.target.value })} className="rounded-xl" /></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor</Label>
                  <Input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} placeholder="Ex: Financeiro, TI, Operações..." className="rounded-xl" />
                </div>

                {/* Toggle legado */}
                <div className="flex items-center justify-between rounded-xl border border-dashed border-warning/40 bg-warning/5 p-3">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-warning" />
                    <div>
                      <Label className="text-sm font-semibold cursor-pointer">Equipamento já entregue (legado)</Label>
                      <p className="text-[11px] text-muted-foreground">Sem termo formal — registre quem está com ele.</p>
                    </div>
                  </div>
                  <Switch checked={form.is_legacy} onCheckedChange={(v) => setForm({ ...form, is_legacy: v, status: v ? 'entregue' : form.status })} />
                </div>

                {form.is_legacy && (
                  <div className="space-y-3 rounded-xl bg-muted/40 p-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuário atual</Label>
                      <Input value={form.legacy_user_name} onChange={e => setForm({ ...form, legacy_user_name: e.target.value })} placeholder="Nome do colaborador" required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</Label>
                      <Input type="email" value={form.legacy_user_email} onChange={e => setForm({ ...form, legacy_user_email: e.target.value })} placeholder="email@empresa.com" className="rounded-xl" />
                    </div>
                  </div>
                )}

                <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</Label><Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="rounded-xl" /></div>
                <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={saveMutation.isPending || !form.type}>Salvar Equipamento</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input placeholder="Pesquisar por marca, modelo, serial..." className="pl-10 h-10 rounded-xl bg-card" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl bg-card"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {types.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {EQUIPMENT_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLegacy} onValueChange={setFilterLegacy}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="legacy">Apenas legados</SelectItem>
            <SelectItem value="non_legacy">Apenas com termo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pro-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marca / Modelo</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nº Série</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patrimônio</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              </TableCell></TableRow>
            ) : pagination.total === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Monitor className="h-10 w-10 text-muted-foreground/20" />
                  <span className="text-sm font-medium">Nenhum equipamento encontrado</span>
                  <span className="text-xs">Tente ajustar os filtros ou cadastre um novo</span>
                </div>
              </TableCell></TableRow>
            ) : pagination.paged.map((eq, i) => {
              const st = statusLabel(eq.status);
              return (
                <TableRow key={eq.id} className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{eq.type}</span>
                      {eq.is_legacy && <Badge variant="outline" className="text-[10px] border-warning/50 text-warning bg-warning/5 font-semibold">Legado</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-sm">{eq.brand}</span>
                      <span className="text-muted-foreground text-sm"> {eq.model}</span>
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">{eq.serial_number}</code></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{eq.patrimony || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(eq as any).sector || '—'}</TableCell>
                  <TableCell><Badge variant="secondary" className={`${st?.color} text-primary-foreground text-[11px] font-semibold`}>{st?.label}</Badge></TableCell>
                  <TableCell className="text-sm">{eq.assigned_to || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(eq)} className="h-8 w-8 rounded-lg hover:bg-primary/10"><Pencil className="h-3.5 w-3.5" /></Button>
                      {eq.status === 'entregue' && !eq.is_legacy && (
                        <Button variant="ghost" size="icon" onClick={() => setReturnEquipment(eq)} title="Devolver" className="h-8 w-8 rounded-lg hover:bg-warning/10"><RotateCcw className="h-3.5 w-3.5 text-warning" /></Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(eq.id)} title="Excluir" className="h-8 w-8 rounded-lg hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={pagination.page} totalPages={pagination.totalPages}
        from={pagination.from} to={pagination.to} total={pagination.total}
        canPrev={pagination.canPrev} canNext={pagination.canNext}
        onPrev={pagination.prev} onNext={pagination.next}
        label="equipamentos"
      />

      {returnEquipment && <ReturnEquipmentDialog equipment={returnEquipment} onClose={() => setReturnEquipment(null)} />}
      <BulkEquipmentDialog open={bulkOpen} onOpenChange={setBulkOpen} />
      <AddEquipmentTypeDialog open={addTypeOpen} onOpenChange={setAddTypeOpen} onCreated={(name) => setForm(f => ({ ...f, type: name }))} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Excluir Equipamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
