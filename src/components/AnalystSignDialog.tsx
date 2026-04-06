import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  termId: string;
  onClose: () => void;
}

export function AnalystSignDialog({ termId, onClose }: Props) {
  const [name, setName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: term } = useQuery({
    queryKey: ['term', termId],
    queryFn: async () => {
      const { data } = await supabase.from('responsibility_terms').select('*').eq('id', termId).single();
      return data;
    },
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('responsibility_terms')
        .update({
          analyst_signature_name: name,
          analyst_signature_date: now,
          status: 'totalmente_assinado' as const,
        })
        .eq('id', termId);
      if (error) throw error;

      // Update equipment status to entregue
      if (term?.equipment_id) {
        await supabase
          .from('equipment')
          .update({
            status: 'entregue' as const,
            assigned_to: term.collaborator_name,
            assigned_term_id: termId,
          })
          .eq('id', term.equipment_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      queryClient.invalidateQueries({ queryKey: ['terms-pending'] });
      queryClient.invalidateQueries({ queryKey: ['terms-signed'] });
      queryClient.invalidateQueries({ queryKey: ['terms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      toast({ title: 'Termo assinado pelo analista!' });
      onClose();
    },
    onError: () => toast({ title: 'Erro ao assinar', variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assinatura do Analista</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Analista designado: <strong>{term?.analyst_name}</strong>
          </p>
          <div className="space-y-2">
            <Label>Digite seu nome para assinar</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={term?.analyst_name || 'Seu nome'} />
          </div>
          {name && (
            <div className="border rounded-lg p-4 bg-muted text-center">
              <p className="text-xs text-muted-foreground mb-2">Pré-visualização da assinatura</p>
              <p className="font-signature text-3xl">{name}</p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => signMutation.mutate()} disabled={!name || signMutation.isPending}>
              {signMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Assinatura
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
