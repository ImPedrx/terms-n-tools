import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Monitor, Lock, Loader2, CheckCircle2 } from 'lucide-react';

export default function CollaboratorSign() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: term, isLoading } = useQuery({
    queryKey: ['term-public', token],
    queryFn: async () => {
      const { data } = await supabase
        .from('responsibility_terms')
        .select('*')
        .eq('access_token', token || '')
        .single();
      return data;
    },
    enabled: !!token,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!term) throw new Error('Termo não encontrado');
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('responsibility_terms')
        .update({
          collaborator_signature_name: signatureName,
          collaborator_signature_date: now,
          status: 'aguardando_analista' as const,
        })
        .eq('id', term.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['term-public', token] });
      toast({ title: 'Documento assinado com sucesso!' });
    },
    onError: () => toast({ title: 'Erro ao assinar', variant: 'destructive' }),
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term) return;
    if (password === term.access_password) {
      setAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Senha incorreta. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!term) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Documento não encontrado ou link inválido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (term.status === 'totalmente_assinado' || term.status === 'aguardando_analista') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <h2 className="text-xl font-bold">Documento já assinado</h2>
            <p className="text-muted-foreground">
              {term.status === 'totalmente_assinado' ? 'Este termo já foi totalmente assinado.' : 'Sua assinatura foi registrada. Aguardando assinatura do analista.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Lock className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle>Documento Protegido</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Informe a senha de acesso</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" required />
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              </div>
              <Button type="submit" className="w-full">Acessar Documento</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <Monitor className="h-8 w-8 mx-auto text-primary mb-2" />
          <h1 className="text-xl font-bold">Termo de Responsabilidade</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4 text-sm">
            <p className="text-center text-muted-foreground text-xs">Data: {format(new Date(term.created_at), 'dd/MM/yyyy')}</p>
            
            <div className="space-y-2">
              <p><strong>Equipamento:</strong> {term.equipment_description}</p>
              <p><strong>Nº Série:</strong> {term.serial_number}</p>
              {term.patrimony && <p><strong>Patrimônio:</strong> {term.patrimony}</p>}
              <p><strong>Colaborador:</strong> {term.collaborator_name}</p>
              <p><strong>Analista:</strong> {term.analyst_name}</p>
              <p><strong>Chamado:</strong> {term.ticket_number}</p>
            </div>

            <div className="text-justify leading-relaxed whitespace-pre-line">{term.term_text}</div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-bold">Assinatura Digital</h3>
              <div className="space-y-2">
                <Label>Digite seu nome completo</Label>
                <Input value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder={term.collaborator_name} />
              </div>
              {signatureName && (
                <div className="border rounded-lg p-4 bg-muted text-center">
                  <p className="text-xs text-muted-foreground mb-2">Pré-visualização da assinatura</p>
                  <p className="font-signature text-xl">{signatureName}</p>
                </div>
              )}

              <div className="flex items-start space-x-3 rounded-lg border border-border bg-muted/50 p-4">
                <Checkbox
                  id="consent"
                  checked={consentChecked}
                  onCheckedChange={(v) => setConsentChecked(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer select-none">
                  Declaro que li e estou de acordo com os termos descritos neste documento e que esta assinatura digital é válida exclusivamente para este termo de responsabilidade.
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSignatureName(''); setConsentChecked(false); }} disabled={!signatureName}>Limpar</Button>
                <Button onClick={() => signMutation.mutate()} disabled={!signatureName || !consentChecked || signMutation.isPending} className="flex-1">
                  {signMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirmar Assinatura
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
