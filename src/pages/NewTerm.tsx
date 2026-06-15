import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Info, ScanBarcode, ChevronsUpDown, Check, Monitor, Building2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { useEquipmentTypes } from '@/hooks/useEquipmentTypes';
import { useTenant } from '@/contexts/TenantContext';
import { useCollaborators, normalizeName } from '@/hooks/useCollaborators';

export default function NewTerm() {
  const [equipmentId, setEquipmentId] = useState('');
  const [collaboratorName, setCollaboratorName] = useState('');
  const [sectorName, setSectorName] = useState('');
  const [analystId, setAnalystId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [serialSearch, setSerialSearch] = useState('');
  const [collabOpen, setCollabOpen] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const { data: types = [] } = useEquipmentTypes();
  const { effectiveClientId, isAdmin } = useTenant();
  const { data: collaborators = [] } = useCollaborators();

  const { data: equipment } = useQuery({
    queryKey: ['equipment-available', effectiveClientId],
    queryFn: async () => {
      let q = supabase.from('equipment').select('*').eq('status', 'disponivel').eq('is_legacy', false).order('brand');
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: analysts } = useQuery({
    queryKey: ['analysts', effectiveClientId],
    queryFn: async () => {
      let q = supabase.from('analysts').select('*');
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data } = await q;
      return data || [];
    },
  });

  const missingFields = [
    !equipmentId && 'Equipamento',
    !collaboratorName.trim() && 'Nome do colaborador',
    !sectorName.trim() && 'Setor do colaborador',
    !analystId && 'Analista responsável',
    !ticketNumber.trim() && 'Número do chamado',
  ].filter(Boolean) as string[];

  const filteredEquipment = equipment?.filter(eq => typeFilter === 'all' || eq.type === typeFilter) || [];
  const selectedEquipment = equipment?.find(e => e.id === equipmentId);
  const selectedAnalyst = analysts?.find(a => a.id === analystId);

  const collabKey = normalizeName(collaboratorName);
  const matchedCollaborator = collabKey ? collaborators.find(c => c.key === collabKey) : undefined;
  const collabSuggestions = collabKey
    ? collaborators.filter(c => c.key !== collabKey && c.key.includes(collabKey)).slice(0, 6)
    : collaborators.slice(0, 6);

  const allSectors = useMemo(
    () => [...new Set(collaborators.map(c => c.sector?.trim()).filter((s): s is string => !!s))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [collaborators]
  );
  const sectorKey = normalizeName(sectorName);
  const sectorSuggestions = sectorKey
    ? allSectors.filter(s => normalizeName(s).includes(sectorKey)).slice(0, 6)
    : allSectors.slice(0, 6);

  // Pré-preenche o setor com o setor conhecido do colaborador toda vez que a pessoa
  // selecionada muda; deixa o analista sobrescrever sem o efeito reverter.
  useEffect(() => {
    if (matchedCollaborator?.sector) setSectorName(matchedCollaborator.sector);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCollaborator?.key]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment || !selectedAnalyst) throw new Error('Dados incompletos');
      const sector = sectorName.trim();
      const { data: term, error } = await supabase.from('responsibility_terms').insert({
        equipment_id: selectedEquipment.id,
        equipment_description: `${selectedEquipment.brand} ${selectedEquipment.model} (${selectedEquipment.type})`,
        serial_number: selectedEquipment.serial_number,
        patrimony: selectedEquipment.patrimony,
        collaborator_name: collaboratorName,
        collaborator_sector: sector || null,
        analyst_id: selectedAnalyst.id,
        analyst_name: selectedAnalyst.name,
        ticket_number: ticketNumber,
        status: 'pendente' as const,
        term_text: settings?.term_text || 'Termo de responsabilidade.',
      }).select().single();
      if (error) throw error;

      // Mantém o setor do equipamento em sincronia com o setor do usuário no termo.
      if (sector) {
        await supabase.from('equipment').update({ sector }).eq('id', selectedEquipment.id);
      }

      const { logAudit } = await import('@/lib/audit');
      await logAudit({ action: 'create', entity_type: 'term', entity_id: term?.id, description: `Termo criado para ${collaboratorName} (${selectedEquipment.brand} ${selectedEquipment.model})` });
      return term;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms-all'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-available'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      toast({ title: 'Termo criado com sucesso!' });
      navigate('/termos');
    },
    onError: () => toast({ title: 'Erro ao criar termo', variant: 'destructive' }),
  });

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      {/* Header */}
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
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold">Dados do Termo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipamento</Label>
              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  value={serialSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSerialSearch(v);
                    const trimmed = v.trim().toLowerCase();
                    if (trimmed) {
                      const match = equipment?.find(eq => eq.serial_number.toLowerCase() === trimmed);
                      if (match) {
                        setEquipmentId(match.id);
                        toast({ title: 'Equipamento localizado', description: `${match.brand} ${match.model}` });
                      }
                    }
                  }}
                  placeholder="Pesquisar / bipar serial do equipamento..."
                  className="pl-9 rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setEquipmentId(''); }}>
                  <SelectTrigger className="w-[160px] rounded-xl">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {types.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={equipmentId} onValueChange={setEquipmentId}>
                  <SelectTrigger className="flex-1 rounded-xl">
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEquipment.map(eq => (
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
            </div>

            {selectedEquipment && (
              <div className="rounded-xl bg-accent/50 border border-accent p-4 text-sm space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Detalhes do equipamento</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-semibold text-muted-foreground">Tipo:</span> {selectedEquipment.type}</p>
                  <p><span className="font-semibold text-muted-foreground">Marca:</span> {selectedEquipment.brand} {selectedEquipment.model}</p>
                  <p><span className="font-semibold text-muted-foreground">Série:</span> {selectedEquipment.serial_number}</p>
                  <p><span className="font-semibold text-muted-foreground">Patrimônio:</span> {selectedEquipment.patrimony || '—'}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Colaborador</Label>
              <Popover open={collabOpen} onOpenChange={setCollabOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between rounded-xl font-normal">
                    {collaboratorName ? <span className="truncate">{collaboratorName}</span> : <span className="text-muted-foreground">Nome completo do colaborador</span>}
                    <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput value={collaboratorName} onValueChange={setCollaboratorName} placeholder="Digite o nome do colaborador..." />
                    <CommandList>
                      <CommandEmpty>Digite para cadastrar um novo colaborador.</CommandEmpty>
                      {collabSuggestions.length > 0 && (
                        <CommandGroup heading="Colaboradores existentes">
                          {collabSuggestions.map(c => (
                            <CommandItem key={c.key} value={c.displayName} onSelect={() => { setCollaboratorName(c.displayName); setCollabOpen(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', matchedCollaborator?.key === c.key ? 'opacity-100' : 'opacity-0')} />
                              <span className="flex-1 truncate">{c.displayName}</span>
                              <span className="text-xs text-muted-foreground ml-2">{c.equipmentCount} equip.</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {matchedCollaborator && matchedCollaborator.equipmentCount > 0 && (
                <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground/90">
                    <Monitor className="h-3.5 w-3.5 text-warning" />
                    Este colaborador já possui {matchedCollaborator.equipmentCount} equipamento(s):
                  </div>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    {matchedCollaborator.heldEquipment.map(e => (
                      <li key={e.id}>{e.brand} {e.model} — SN: {e.serial_number}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor do Colaborador</Label>
              <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between rounded-xl font-normal">
                    {sectorName ? <span className="truncate">{sectorName}</span> : <span className="text-muted-foreground">Ex: Financeiro, TI, Operações...</span>}
                    <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput value={sectorName} onValueChange={setSectorName} placeholder="Digite o setor..." />
                    <CommandList>
                      <CommandEmpty>Digite para cadastrar um novo setor.</CommandEmpty>
                      {sectorSuggestions.length > 0 && (
                        <CommandGroup heading="Setores existentes">
                          {sectorSuggestions.map(s => (
                            <CommandItem key={s} value={s} onSelect={() => { setSectorName(s); setSectorOpen(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', normalizeName(sectorName) === normalizeName(s) ? 'opacity-100' : 'opacity-0')} />
                              <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate">{s}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analista Responsável</Label>
              <Select value={analystId} onValueChange={setAnalystId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o analista" /></SelectTrigger>
                <SelectContent>
                  {analysts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
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

            {missingFields.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Preencha para continuar: <span className="font-semibold text-foreground/80">{missingFields.join(', ')}</span>
              </p>
            )}
            <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-md shadow-primary/20 text-sm" disabled={createMutation.isPending || missingFields.length > 0}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Gerar Termo de Responsabilidade
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
