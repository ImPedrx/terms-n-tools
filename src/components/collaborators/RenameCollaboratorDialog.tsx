import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { AlertTriangle, Loader2, Users } from 'lucide-react';
import { type Collaborator, normalizeName, findSimilar } from '@/hooks/useCollaborators';

interface Props {
  collaborator: Collaborator;
  all: Collaborator[];
  onClose: () => void;
}

export function RenameCollaboratorDialog({ collaborator, all, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { effectiveClientId, isAdmin } = useTenant();
  const [newName, setNewName] = useState(collaborator.displayName);

  const target = newName.trim();
  const targetKey = normalizeName(target);
  const mergeWith = all.find((c) => c.key === targetKey && c.key !== collaborator.key) || null;
  const suggestions = findSimilar(all, collaborator);

  const namesToUpdate = [...new Set([...collaborator.rawNames, ...(mergeWith?.rawNames || [])])].filter((n) => n !== target);
  const isNoop = target.length === 0 || namesToUpdate.length === 0;

  const rename = useMutation({
    mutationFn: async () => {
      const clientId = isAdmin && effectiveClientId ? effectiveClientId : null;

      let termsQ = supabase.from('responsibility_terms').update({ collaborator_name: target }).in('collaborator_name', namesToUpdate);
      if (clientId) termsQ = termsQ.eq('client_id', clientId);
      const termsRes = await termsQ;
      if (termsRes.error) throw termsRes.error;

      let assignedQ = supabase.from('equipment').update({ assigned_to: target }).in('assigned_to', namesToUpdate);
      if (clientId) assignedQ = assignedQ.eq('client_id', clientId);
      const assignedRes = await assignedQ;
      if (assignedRes.error) throw assignedRes.error;

      let legacyQ = supabase.from('equipment').update({ legacy_user_name: target }).in('legacy_user_name', namesToUpdate);
      if (clientId) legacyQ = legacyQ.eq('client_id', clientId);
      const legacyRes = await legacyQ;
      if (legacyRes.error) throw legacyRes.error;

      const { logAudit } = await import('@/lib/audit');
      await logAudit({
        action: 'update',
        entity_type: 'term',
        description: mergeWith
          ? `Colaboradores consolidados: "${collaborator.displayName}" + "${mergeWith.displayName}" → "${target}"`
          : `Colaborador renomeado: "${collaborator.displayName}" → "${target}"`,
        metadata: { from: collaborator.rawNames, mergedFrom: mergeWith?.rawNames ?? null, to: target },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-available'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      toast({ title: mergeWith ? 'Colaboradores consolidados!' : 'Nome atualizado!' });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });

  const totalTerms = collaborator.termCount + (mergeWith?.termCount || 0);
  const totalEquip = collaborator.equipmentCount + (mergeWith?.equipmentCount || 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Editar / Consolidar colaborador</DialogTitle>
          <DialogDescription>
            Atualiza o nome em todos os termos e equipamentos vinculados a esta pessoa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); rename.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus className="rounded-xl" />
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nomes parecidos (clique para mesclar)</Label>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setNewName(s.displayName)}
                    className="text-xs rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {s.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mergeWith && (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 flex items-start gap-2 text-xs text-foreground/80">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <p>
                Isso vai <strong>unir</strong> "{collaborator.displayName}" com "{mergeWith.displayName}". Ao todo,{' '}
                <strong>{totalTerms} termo(s)</strong> e <strong>{totalEquip} equipamento(s)</strong> passarão a usar "{target}".
              </p>
            </div>
          )}

          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            <span>{collaborator.termCount} termo(s) e {collaborator.equipmentCount} equipamento(s) vinculados a esta pessoa.</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={isNoop || rename.isPending} className="rounded-xl font-semibold">
              {rename.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {mergeWith ? 'Consolidar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
