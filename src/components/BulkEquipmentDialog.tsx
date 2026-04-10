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
import { ScanBarcode, CheckCircle2, Loader2 } from 'lucide-react';
import { EQUIPMENT_TYPES, EQUIPMENT_STATUS } from '@/lib/constants';
import type { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];
type EquipmentStatus = Database['public']['Enums']['equipment_status'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RegisteredItem {
  serial: string;
  time: string;
}

export function BulkEquipmentDialog({ open, onOpenChange }: Props) {
  const [type, setType] = useState<EquipmentType>('notebook');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('disponivel');
  const [observations, setObservations] = useState('');
  const [currentSerial, setCurrentSerial] = useState('');
  const [registered, setRegistered] = useState<RegisteredItem[]>([]);
  const [saving, setSaving] = useState(false);
  const serialInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const registerSerial = useCallback(async (serial: string) => {
    const trimmed = serial.trim();
    if (!trimmed || !brand || !model) return;

    if (registered.some(r => r.serial === trimmed)) {
      toast({ title: 'Serial já cadastrado nesta sessão', variant: 'destructive' });
      setCurrentSerial('');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('equipment').insert({
        type, brand, model, serial_number: trimmed, patrimony: 'N/A', status, observations: observations || null,
      });
      if (error) throw error;

      setRegistered(prev => [{ serial: trimmed, time: new Date().toLocaleTimeString('pt-BR') }, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
      setCurrentSerial('');
      setTimeout(() => serialInputRef.current?.focus(), 50);
    }
  }, [brand, model, type, status, observations, registered, toast, queryClient]);

  const resetForm = () => {
    setType('notebook'); setBrand(''); setModel(''); setStatus('disponivel');
    setObservations(''); setCurrentSerial(''); setRegistered([]);
  };

  const configReady = brand.trim() !== '' && model.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Lançamento em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-primary/30 bg-accent/30 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Defina os dados comuns. Depois é só <strong>bipar o serial</strong> — cada leitura cadastra automaticamente.
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
                <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: Dell" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modelo</Label>
                <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: Latitude 5520" />
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
              Bipar Serial
            </Label>
            {!configReady && (
              <p className="text-xs text-warning">Preencha Marca e Modelo antes de bipar.</p>
            )}
            <div className="flex gap-2 items-center">
              <Input
                ref={serialInputRef}
                value={currentSerial}
                onChange={e => setCurrentSerial(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    registerSerial(currentSerial);
                  }
                }}
                placeholder={configReady ? 'Bipe ou digite o serial...' : 'Preencha marca e modelo primeiro'}
                disabled={!configReady || saving}
                autoFocus
              />
              {saving && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
          </div>

          {registered.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{registered.length} equipamento{registered.length !== 1 ? 's' : ''} cadastrado{registered.length !== 1 ? 's' : ''}</Label>
              </div>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {registered.map((r, i) => (
                    <div key={r.serial} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      <span className="font-mono text-xs">{r.serial}</span>
                      <span className="text-muted-foreground text-xs ml-auto">{r.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
