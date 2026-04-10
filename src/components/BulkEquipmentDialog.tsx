import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { X, ScanBarcode, Loader2 } from 'lucide-react';
import { EQUIPMENT_TYPES, EQUIPMENT_STATUS } from '@/lib/constants';
import type { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];
type EquipmentStatus = Database['public']['Enums']['equipment_status'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkEquipmentDialog({ open, onOpenChange }: Props) {
  const [type, setType] = useState<EquipmentType>('notebook');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('disponivel');
  const [observations, setObservations] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  const [currentSerial, setCurrentSerial] = useState('');
  const serialInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addSerial = useCallback(() => {
    const trimmed = currentSerial.trim();
    if (!trimmed) return;
    if (serials.includes(trimmed)) {
      toast({ title: 'Serial já adicionado', variant: 'destructive' });
      return;
    }
    setSerials(prev => [...prev, trimmed]);
    setCurrentSerial('');
    setTimeout(() => serialInputRef.current?.focus(), 50);
  }, [currentSerial, serials, toast]);

  const removeSerial = (s: string) => setSerials(prev => prev.filter(x => x !== s));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!brand || !model || serials.length === 0) throw new Error('Preencha todos os campos');
      const rows = serials.map(sn => ({
        type, brand, model, serial_number: sn, patrimony: 'N/A', status, observations: observations || null,
      }));
      const { error } = await supabase.from('equipment').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      toast({ title: `${serials.length} equipamentos cadastrados com sucesso!` });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setType('notebook'); setBrand(''); setModel(''); setStatus('disponivel');
    setObservations(''); setSerials([]); setCurrentSerial('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Lançamento em Massa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
          <div className="rounded-lg border border-dashed border-primary/30 bg-accent/30 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Defina os dados comuns a todos os equipamentos. Apenas o <strong>Nº de Série</strong> será diferente para cada um. O patrimônio será definido como <strong>N/A</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={type} onValueChange={v => setType(v as EquipmentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as EquipmentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Marca</Label>
                <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: Dell" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modelo</Label>
                <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: Latitude 5520" required />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações (opcional)</Label>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ScanBarcode className="h-4 w-4" />
              Números de Série
            </Label>
            <p className="text-xs text-muted-foreground">
              Use o leitor de código de barras ou digite manualmente. Pressione <kbd className="px-1 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> para adicionar.
            </p>
            <div className="flex gap-2">
              <Input
                ref={serialInputRef}
                value={currentSerial}
                onChange={e => setCurrentSerial(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSerial(); } }}
                placeholder="Leia ou digite o serial..."
                autoFocus
              />
              <Button type="button" variant="secondary" onClick={addSerial}>Adicionar</Button>
            </div>

            {serials.length > 0 && (
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {serials.map((sn, i) => (
                    <Badge key={sn} variant="secondary" className="font-mono text-xs gap-1 pr-1">
                      <span className="text-muted-foreground mr-1">{i + 1}.</span>
                      {sn}
                      <button type="button" onClick={() => removeSerial(sn)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-right">{serials.length} serial(is) adicionado(s)</p>
          </div>

          <Button type="submit" className="w-full" disabled={saveMutation.isPending || serials.length === 0 || !brand || !model}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Cadastrar {serials.length} Equipamento{serials.length !== 1 ? 's' : ''}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
