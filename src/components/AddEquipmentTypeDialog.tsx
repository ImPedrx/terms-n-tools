import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useCreateEquipmentType } from '@/hooks/useEquipmentTypes';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (name: string) => void;
}

export function AddEquipmentTypeDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('');
  const create = useCreateEquipmentType();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await create.mutateAsync(name);
      toast({ title: 'Tipo adicionado', description: created.name });
      onCreated?.(created.name);
      setName('');
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar tipo', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Novo tipo de equipamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do tipo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Headset, Câmera, Roteador..." autoFocus required className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={create.isPending} className="rounded-xl">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
