import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  equipment: {
    id: string;
    brand: string;
    model: string;
    serial_number: string;
    assigned_to: string | null;
    assigned_term_id: string | null;
  };
  onClose: () => void;
}

export function ReturnEquipmentDialog({ equipment, onClose }: Props) {
  const [returnedBy, setReturnedBy] = useState(equipment.assigned_to || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const returnMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();

      // Update equipment status
      const { error: eqError } = await supabase
        .from('equipment')
        .update({
          status: 'disponivel' as const,
          assigned_to: null,
          assigned_term_id: null,
        })
        .eq('id', equipment.id);
      if (eqError) throw eqError;

      // Update term with return info if linked
      if (equipment.assigned_term_id) {
        const { error: termError } = await supabase
          .from('responsibility_terms')
          .update({
            returned_at: now,
            returned_by: returnedBy,
          } as any)
          .eq('id', equipment.assigned_term_id);
        if (termError) throw termError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      toast({ title: 'Equipamento devolvido com sucesso!' });
      onClose();
    },
    onError: () => toast({ title: 'Erro ao registrar devolução', variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver Equipamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
            <p><strong>Equipamento:</strong> {equipment.brand} {equipment.model}</p>
            <p><strong>Nº Série:</strong> {equipment.serial_number}</p>
            <p><strong>Responsável:</strong> {equipment.assigned_to || '—'}</p>
          </div>
          <div className="space-y-2">
            <Label>Devolvido por</Label>
            <Input value={returnedBy} onChange={e => setReturnedBy(e.target.value)} placeholder="Nome de quem devolveu" required />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending || !returnedBy}>
              {returnMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar Devolução
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
