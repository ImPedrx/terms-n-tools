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
import { Plus, Search, Pencil, Trash2, RotateCcw, ScanBarcode } from 'lucide-react';
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
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Inventário de Equipamentos</h1>
          <p className="page-description">Gerencie todos os equipamentos de TI</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Equipamento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Novo'} Equipamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EquipmentType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EquipmentStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Marca</Label><Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Modelo</Label><Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nº de Série</Label><Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Patrimônio</Label><Input value={form.patrimony} onChange={e => setForm({ ...form, patrimony: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {EQUIPMENT_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Marca/Modelo</TableHead>
              <TableHead>Nº Série</TableHead>
              <TableHead>Patrimônio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum equipamento encontrado</TableCell></TableRow>
            ) : filtered?.map(eq => {
              const st = statusLabel(eq.status);
              return (
                <TableRow key={eq.id}>
                  <TableCell>{typeLabel(eq.type)}</TableCell>
                  <TableCell>{eq.brand} {eq.model}</TableCell>
                  <TableCell className="font-mono text-xs">{eq.serial_number}</TableCell>
                  <TableCell>{eq.patrimony || '—'}</TableCell>
                  <TableCell><Badge variant="secondary" className={`${st?.color} text-primary-foreground`}>{st?.label}</Badge></TableCell>
                  <TableCell>{eq.assigned_to || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(eq)}><Pencil className="h-4 w-4" /></Button>
                      {eq.status === 'entregue' && (
                        <Button variant="ghost" size="icon" onClick={() => setReturnEquipment(eq)} title="Devolver"><RotateCcw className="h-4 w-4 text-warning" /></Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(eq.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {returnEquipment && <ReturnEquipmentDialog equipment={returnEquipment} onClose={() => setReturnEquipment(null)} />}
    </div>
  );
}
