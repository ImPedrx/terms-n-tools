import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Term = Database['public']['Tables']['responsibility_terms']['Row'];

export function EditTermDialog({ term, onClose }: { term: Term; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ticketNumber, setTicketNumber] = useState(term.ticket_number);
  const [collaboratorName, setCollaboratorName] = useState(term.collaborator_name);

  const save = useMutation({
    mutationFn: async () => {
      const ticket = ticketNumber.trim();
      const name = collaboratorName.trim();
      const { error } = await supabase
        .from('responsibility_terms')
        .update({ ticket_number: ticket, collaborator_name: name })
        .eq('id', term.id);
      if (error) throw error;

      // Mantém o nome do responsável no equipamento em sincronia quando o termo já foi entregue.
      if (term.status === 'fechado' && term.equipment_id && name !== term.collaborator_name) {
        await supabase.from('equipment').update({ assigned_to: name }).eq('id', term.equipment_id);
      }

      const { logAudit } = await import('@/lib/audit');
      await logAudit({
        action: 'update',
        entity_type: 'term',
        entity_id: term.id,
        description: `Termo editado (chamado/colaborador) — ${name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      toast({ title: 'Termo atualizado!' });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });

  const invalid = ticketNumber.trim().length === 0 || collaboratorName.trim().length === 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Editar Termo</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número do Chamado</Label>
            <Input value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} autoFocus className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Colaborador</Label>
            <Input value={collaboratorName} onChange={(e) => setCollaboratorName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={invalid || save.isPending} className="rounded-xl font-semibold">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
