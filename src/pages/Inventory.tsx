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
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, RotateCcw, ScanBarcode, Monitor, Package } from 'lucide-react';
import { ReturnEquipmentDialog } from '@/components/ReturnEquipmentDialog';
import { BulkEquipmentDialog } from '@/components/BulkEquipmentDialog';
import { EQUIPMENT_TYPES, EQUIPMENT_STATUS } from '@/lib/constants';
import type { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];
type EquipmentStatus = Database['public']['Enums']['equipment_status'];

interface EquipmentForm {
  type: EquipmentType;
  brand: string;
  model: string;
  serial_number: string;
  patrimony: string;
  status: EquipmentStatus;
  observations: string;
}

const emptyForm: EquipmentForm = {
  type: 'notebook', brand: '', model: '', serial_number: '', patrimony: '', status: 'disponivel', observations: '',
};

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentForm>(emptyForm);
  const [returnEquipment, setReturnEquipment] = useState<any>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipment').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: EquipmentForm) => {
      if (editingId) {
        const { error } = await supabase.from('equipment').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('equipment').insert(data);
        if (error) throw error;
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
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      toast({ title: 'Equipamento excluído' });
    },
  });

  const filtered = equipment?.filter(e => {
    const matchSearch = search === '' ||
      e.brand.toLowerCase().includes(search.toLowerCase()) ||
      e.model.toLowerCase().includes(search.toLowerCase()) ||
      e.serial_number.toLowerCase().includes(search.toLowerCase()) ||
      (e.patrimony || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    const matchType = filterType === 'all' || e.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const openEdit = (eq: NonNullable<typeof equipment>[0]) => {
    setEditingId(eq.id);
    setForm({ type: eq.type, brand: eq.brand, model: eq.model, serial_number: eq.serial_number, patrimony: eq.patrimony || '', status: eq.status, observations: eq.observations || '' });
    setDialogOpen(true);
  };

  const statusLabel = (s: string) => EQUIPMENT_STATUS.find(x => x.value === s);
  const typeLabel = (t: string) => EQUIPMENT_TYPES.find(x => x.value === t)?.label || t;

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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">{editingId ? 'Editar' : 'Novo'} Equipamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EquipmentType })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EquipmentStatus })}>
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
                <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</Label><Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="rounded-xl" /></div>
                <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={saveMutation.isPending}>Salvar Equipamento</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input placeholder="Pesquisar por marca, modelo, serial..." className="pl-10 h-10 rounded-xl bg-card" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl bg-card"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {EQUIPMENT_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">
          {filtered?.length || 0} equipamento{(filtered?.length || 0) !== 1 ? 's' : ''} encontrado{(filtered?.length || 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="pro-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marca / Modelo</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nº Série</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patrimônio</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              </TableCell></TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Monitor className="h-10 w-10 text-muted-foreground/20" />
                  <span className="text-sm font-medium">Nenhum equipamento encontrado</span>
                  <span className="text-xs">Tente ajustar os filtros ou cadastre um novo</span>
                </div>
              </TableCell></TableRow>
            ) : filtered?.map((eq, i) => {
              const st = statusLabel(eq.status);
              return (
                <TableRow key={eq.id} className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
                  <TableCell className="font-medium text-sm">{typeLabel(eq.type)}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-sm">{eq.brand}</span>
                      <span className="text-muted-foreground text-sm"> {eq.model}</span>
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">{eq.serial_number}</code></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{eq.patrimony || '—'}</TableCell>
                  <TableCell><Badge variant="secondary" className={`${st?.color} text-primary-foreground text-[11px] font-semibold`}>{st?.label}</Badge></TableCell>
                  <TableCell className="text-sm">{eq.assigned_to || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(eq)} className="h-8 w-8 rounded-lg hover:bg-primary/10"><Pencil className="h-3.5 w-3.5" /></Button>
                      {eq.status === 'entregue' && (
                        <Button variant="ghost" size="icon" onClick={() => setReturnEquipment(eq)} title="Devolver" className="h-8 w-8 rounded-lg hover:bg-warning/10"><RotateCcw className="h-3.5 w-3.5 text-warning" /></Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(eq.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {returnEquipment && <ReturnEquipmentDialog equipment={returnEquipment} onClose={() => setReturnEquipment(null)} />}
      <BulkEquipmentDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}
