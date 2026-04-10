import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSettings, type SerialLengths } from '@/hooks/useSettings';
import { Settings, Upload, Loader2, Image, Trash2, ScanBarcode } from 'lucide-react';
import { EQUIPMENT_TYPES } from '@/lib/constants';
import type { Language } from '@/lib/i18n';

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const [termText, setTermText] = useState('');
  const [language, setLanguage] = useState<Language>('pt');
  const [logoUrl, setLogoUrl] = useState('');
  const [serialLengths, setSerialLengths] = useState<SerialLengths>({});
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (settings) {
      setTermText(settings.term_text);
      setLanguage(settings.language);
      setLogoUrl(settings.company_logo_url);
      setSerialLengths(settings.serial_lengths);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (entries: { key: string; value: string }[]) => {
      for (const entry of entries) {
        const { data: existing } = await supabase
          .from('system_settings')
          .select('id')
          .eq('key', entry.key)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('system_settings')
            .update({ value: entry.value })
            .eq('key', entry.key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('system_settings')
            .insert({ key: entry.key, value: entry.value });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ title: 'Configurações salvas!' });
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const handleSave = () => {
    saveMutation.mutate([
      { key: 'term_text', value: termText },
      { key: 'language', value: language },
      { key: 'company_logo_url', value: logoUrl },
      { key: 'serial_lengths', value: JSON.stringify(serialLengths) },
    ]);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logo.${ext}`;
      await supabase.storage.from('company-assets').remove([path]);
      const { error } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
    } catch {
      toast({ title: 'Erro ao enviar logo', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => setLogoUrl('');

  const updateSerialLength = (equipType: string, length: number) => {
    setSerialLengths(prev => ({ ...prev, [equipType]: Math.max(1, length) }));
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-description">Personalize o sistema e os documentos</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" /> Logo da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoUrl && (
              <div className="flex items-center gap-4">
                <img src={logoUrl} alt="Logo da empresa" className="h-16 max-w-[200px] object-contain border rounded p-2" />
                <Button variant="ghost" size="icon" onClick={handleRemoveLogo}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            )}
            <div className="space-y-2">
              <Label>Enviar nova logo</Label>
              <div className="flex gap-2">
                <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                {uploading && <Loader2 className="h-5 w-5 animate-spin mt-2" />}
              </div>
              <p className="text-xs text-muted-foreground">Recomendado: PNG com fundo transparente, máximo 400x120px</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ScanBarcode className="h-5 w-5" /> Limite de Caracteres do Serial (Bipagem)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Defina quantos caracteres o serial tem para cada tipo de equipamento. No lançamento em massa, ao atingir esse número o equipamento é cadastrado automaticamente, sem precisar dar Enter.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EQUIPMENT_TYPES.map(t => (
                <div key={t.value} className="space-y-1">
                  <Label className="text-xs">{t.label}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={serialLengths[t.value] || ''}
                    onChange={e => updateSerialLength(t.value, parseInt(e.target.value) || 1)}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Idioma do Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Texto do Termo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={termText}
              onChange={(e) => setTermText(e.target.value)}
              rows={8}
              placeholder="Texto do termo de responsabilidade..."
            />
            <p className="text-xs text-muted-foreground">Este texto será usado em todos os novos termos gerados.</p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
