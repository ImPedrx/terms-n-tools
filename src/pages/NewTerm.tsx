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
import { Loader2 } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

function generateToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

function generatePassword() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function NewTerm() {
  const [equipmentId, setEquipmentId] = useState('');
  const [collaboratorName, setCollaboratorName] = useState('');
  const [analystId, setAnalystId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();

  const { data: equipment } = useQuery({
    queryKey: ['equipment-available'],
    queryFn: async () => {
      const { data } = await supabase.from('equipment').select('*').eq('status', 'disponivel').order('brand');
      return data || [];
    },
  });

  const { data: analysts } = useQuery({
    queryKey: ['analysts'],
    queryFn: async () => {
      const { data } = await supabase.from('analysts').select('*');
      return data || [];
    },
  });

  const selectedEquipment = equipment?.find(e => e.id === equipmentId);
  const selectedAnalyst = analysts?.find(a => a.id === analystId);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment || !selectedAnalyst) throw new Error('Dados incompletos');
      
      const token = generateToken();
      const password = generatePassword();

      const { data: term, error } = await supabase.from('responsibility_terms').insert({
        equipment_id: selectedEquipment.id,
        equipment_description: `${selectedEquipment.brand} ${selectedEquipment.model} (${selectedEquipment.type})`,
        serial_number: selectedEquipment.serial_number,
        patrimony: selectedEquipment.patrimony,
        collaborator_name: collaboratorName,
        analyst_id: selectedAnalyst.id,
        analyst_name: selectedAnalyst.name,
        ticket_number: ticketNumber,
        status: 'pendente_colaborador',
        access_token: token,
        access_password: password,
        term_text: settings?.term_text || 'Termo de responsabilidade.',
      }).select().single();

      if (error) throw error;
      return term;
    },
    onSuccess: (term) => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      queryClient.invalidateQueries({ queryKey: ['terms-stats'] });
      const publishedUrl = 'https://terms-n-tools.lovable.app';
      const link = `${publishedUrl}/assinar/${term.access_token}`;
      toast({
        title: 'Termo criado com sucesso!',
        description: `Link: ${link} | Senha: ${term.access_password}`,
        duration: 30000,
      });
      navigate('/pendentes');
    },
    onError: () => toast({ title: 'Erro ao criar termo', variant: 'destructive' }),
  });

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Novo Termo de Responsabilidade</h1>
        <p className="page-description">Preencha os dados para gerar o termo</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados do Termo</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Select value={equipmentId} onValueChange={setEquipmentId}>
                <SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                <SelectContent>
                  {equipment?.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.brand} {eq.model} — SN: {eq.serial_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEquipment && (
              <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
                <p><strong>Tipo:</strong> {selectedEquipment.type}</p>
                <p><strong>Marca/Modelo:</strong> {selectedEquipment.brand} {selectedEquipment.model}</p>
                <p><strong>Nº Série:</strong> {selectedEquipment.serial_number}</p>
                <p><strong>Patrimônio:</strong> {selectedEquipment.patrimony || '—'}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome do Colaborador</Label>
              <Input value={collaboratorName} onChange={e => setCollaboratorName(e.target.value)} placeholder="Nome completo do colaborador" required />
            </div>

            <div className="space-y-2">
              <Label>Analista Responsável</Label>
              <Select value={analystId} onValueChange={setAnalystId}>
                <SelectTrigger><SelectValue placeholder="Selecione o analista" /></SelectTrigger>
                <SelectContent>
                  {analysts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número do Chamado</Label>
              <Input value={ticketNumber} onChange={e => setTicketNumber(e.target.value)} placeholder="Ex: INC-12345" required />
            </div>

            <div className="rounded-lg border p-4">
              <Label className="text-xs text-muted-foreground mb-2 block">Texto do Termo</Label>
              <p className="text-sm">{settings?.term_text || 'Carregando...'}</p>
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending || !equipmentId || !analystId || !collaboratorName || !ticketNumber}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Gerar Termo de Responsabilidade
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
