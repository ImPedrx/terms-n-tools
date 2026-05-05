import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEquipmentTypes, formatTypeName } from '@/hooks/useEquipmentTypes';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Inclui opção "Todos os tipos" no topo (filtros). */
  includeAll?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const NEW_OPTION = '__new__';

export function EquipmentTypeSelect({ value, onChange, includeAll, className, placeholder = 'Selecione', disabled }: Props) {
  const { data: types, isLoading } = useEquipmentTypes();
  const { effectiveClientId, isAuksysAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!effectiveClientId) throw new Error('Selecione um cliente');
      const { data, error } = await supabase
        .from('equipment_types')
        .insert({ client_id: effectiveClientId, name: name.trim().toLowerCase() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['equipment-types'] });
      onChange(created.name);
      setDialogOpen(false);
      setNewName('');
      toast({ title: 'Tipo adicionado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao adicionar tipo', description: e.message, variant: 'destructive' }),
  });

  return (
    <>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === NEW_OPTION) setDialogOpen(true);
          else onChange(v);
        }}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={className ?? 'rounded-xl'}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeAll && <SelectItem value="all">Todos os tipos</SelectItem>}
          {types?.map(t => (
            <SelectItem key={t.id} value={t.name}>{formatTypeName(t.name)}</SelectItem>
          ))}
          {(types?.length === 0) && (
            <div className="px-2 py-2 text-xs text-muted-foreground">Nenhum tipo cadastrado</div>
          )}
          {!isAuksysAdmin || effectiveClientId ? (
            <SelectItem value={NEW_OPTION}>
              <span className="flex items-center gap-2 text-primary font-semibold">
                <Plus className="h-3.5 w-3.5" /> Adicionar novo tipo
              </span>
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo tipo de equipamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do novo tipo</Label>
            <Input
              autoFocus value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ex: scanner"
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addMutation.mutate(newName); }}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={() => addMutation.mutate(newName)}
              disabled={!newName.trim() || addMutation.isPending}
              className="rounded-xl"
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
