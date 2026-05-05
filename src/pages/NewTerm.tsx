import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Info } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { EquipmentTypeSelect } from '@/components/EquipmentTypeSelect';
import { formatTypeName } from '@/hooks/useEquipmentTypes';

export default function NewTerm() {
  const [equipmentId, setEquipmentId] = useState('');
  const [collaboratorName, setCollaboratorName] = useState('');
  const [analystId, setAnalystId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const { effectiveClientId } = useAuth();

  const { data: equipment } = useQuery({
    queryKey: ['equipment-available', effectiveClientId],
    enabled: !!effectiveClientId,
    queryFn: async () => {
      const { data } = await supabase.from('equipment')
        .select('*').eq('status', 'disponivel').eq('is_legacy', false).order('brand');
      return data || [];
    },
  });

  const { data: analysts } = useQuery({
    queryKey: ['analysts', effectiveClientId],
    enabled: !!effectiveClientId,
    queryFn: async () => {
      const { data } = await supabase.from('analysts').select('*');
      return data || [];
    },
  });

  const filteredEquipment = equipment?.filter((eq: any) => typeFilter === 'all' || eq.type === typeFilter) || [];
  const selectedEquipment = equipment?.find((e: any) => e.id === equipmentId);
  const selectedAnalyst = analysts?.find((a: any) => a.id === analystId);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment || !selectedAnalyst || !effectiveClientId) throw new Error('Dados incompletos');
      const { data: term, error } = await supabase.from('responsibility_terms').insert({
        client_id: effectiveClientId,
        equipment_id: selectedEquipment.id,
        equipment_description: `${selectedEquipment.brand} ${selectedEquipment.model} (${formatTypeName(selectedEquipment.type)})`,
        serial_number: selectedEquipment.serial_number,
        patrimony: selectedEquipment.patrimony,
        collaborator_name: collaboratorName,
        analyst_id: selectedAnalyst.id,
        analyst_name: selectedAnalyst.name,
        ticket_number: ticketNumber,
        status: 'pendente' as const,
        term_text: settings?.term_text || 'Termo de responsabilidade.',
      }).select().single();
      if (error) throw error;
      return term;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-available'] });
      toast({ title: 'Termo criado com sucesso!' });
      navigate('/termos');
    },
    onError: (e: any) => toast({ title: 'Erro ao criar termo', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="page-title">Novo Termo</h1>
          <p className="page-description">Preencha os dados para gerar o termo de responsabilidade</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4"><CardTitle className="text-base font-bold">Dados do Termo</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipamento</Label>
              <div className="flex gap-2">
                <div className="w-[160px]">
                  <EquipmentTypeSelect value={typeFilter} onChange={(v) => { setTypeFilter(v); setEquipmentId(''); }} includeAll placeholder="Tipo" />
                </div>
                <Select value={equipmentId} onValueChange={setEquipmentId}>
                  <SelectTrigger className="flex-1 rounded-xl">
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEquipment.map((eq: any) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.brand} {eq.model} — SN: {eq.serial_number}
                      </SelectItem>
                    ))}
                    {filteredEquipment.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhum equipamento disponível</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">Equipamentos legados não podem ser incluídos em novos termos.</p>
            </div>

            {selectedEquipment && (
              <div className="rounded-xl bg-accent/50 border border-accent p-4 text-sm space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Detalhes do equipamento</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-semibold text-muted-foreground">Tipo:</span> {formatTypeName(selectedEquipment.type)}</p>
                  <p><span className="font-semibold text-muted-foreground">Marca:</span> {selectedEquipment.brand} {selectedEquipment.model}</p>
                  <p><span className="font-semibold text-muted-foreground">Série:</span> {selectedEquipment.serial_number}</p>
                  <p><span className="font-semibold text-muted-foreground">Patrimônio:</span> {selectedEquipment.patrimony || '—'}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Colaborador</Label>
              <Input value={collaboratorName} onChange={e => setCollaboratorName(e.target.value)} placeholder="Nome completo do colaborador" required className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analista Responsável</Label>
              <Select value={analystId} onValueChange={setAnalystId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o analista" /></SelectTrigger>
                <SelectContent>
                  {analysts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número do Chamado</Label>
              <Input value={ticketNumber} onChange={e => setTicketNumber(e.target.value)} placeholder="Ex: INC-12345" required className="rounded-xl" />
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <Label className="text-[10px] text-muted-foreground mb-2 block font-bold uppercase tracking-wider">Texto do Termo</Label>
              <p className="text-sm whitespace-pre-line text-muted-foreground leading-relaxed">{settings?.term_text || 'Carregando...'}</p>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-md shadow-primary/20 text-sm" disabled={createMutation.isPending || !equipmentId || !analystId || !collaboratorName || !ticketNumber}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Gerar Termo de Responsabilidade
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
