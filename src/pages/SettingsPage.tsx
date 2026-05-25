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
import { Settings, Loader2, Image, Trash2, ScanBarcode, Globe, FileText, Cog, Bell, Plus, Pencil, Check, X } from 'lucide-react';
import { useEquipmentTypes, useDeleteEquipmentType, useUpdateEquipmentType } from '@/hooks/useEquipmentTypes';
import { AddEquipmentTypeDialog } from '@/components/AddEquipmentTypeDialog';
import type { Language } from '@/lib/i18n';
import type { Notice } from '@/hooks/useSettings';

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const [termText, setTermText] = useState('');
  const [language, setLanguage] = useState<Language>('pt');
  const [logoUrl, setLogoUrl] = useState('');
  const [serialLengths, setSerialLengths] = useState<SerialLengths>({});
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeText, setNewNoticeText] = useState('');
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: types = [] } = useEquipmentTypes();
  const deleteType = useDeleteEquipmentType();
  const updateType = useUpdateEquipmentType();
  const [addTypeOpen, setAddTypeOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setTermText(settings.term_text);
      setLanguage(settings.language);
      setLogoUrl(settings.company_logo_url);
      setSerialLengths(settings.serial_lengths);
      setNotices(settings.notices ?? []);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (entries: { key: string; value: string }[]) => {
      for (const entry of entries) {
        const { data: existing } = await supabase.from('system_settings').select('id').eq('key', entry.key).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('system_settings').update({ value: entry.value }).eq('key', entry.key);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('system_settings').insert({ key: entry.key, value: entry.value });
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
      { key: 'notices', value: JSON.stringify(notices) },
    ]);
  };

  const addNotice = () => {
    const text = newNoticeText.trim();
    if (!text) return;
    const notice: Notice = {
      id: crypto.randomUUID(),
      title: newNoticeTitle.trim(),
      text,
      active: true,
      created_at: new Date().toISOString(),
    };
    setNotices(prev => [...prev, notice]);
    setNewNoticeTitle('');
    setNewNoticeText('');
  };

  const deleteNotice = (id: string) => setNotices(prev => prev.filter(n => n.id !== id));

  const toggleNotice = (id: string) =>
    setNotices(prev => prev.map(n => n.id === id ? { ...n, active: !n.active } : n));

  const startEdit = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setEditTitle(notice.title);
    setEditText(notice.text);
  };

  const saveEdit = () => {
    if (!editingNoticeId) return;
    setNotices(prev => prev.map(n =>
      n.id === editingNoticeId ? { ...n, title: editTitle.trim(), text: editText.trim() } : n
    ));
    setEditingNoticeId(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logo.${ext}`;
      await supabase.storage.from('company-assets').remove([path]);
      const { error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path);
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

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground font-medium">Carregando configurações...</span>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
          <Cog className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-description">Personalize o sistema e os documentos</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Logo */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><Image className="h-3.5 w-3.5 text-primary" /></div>
              Logo da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoUrl && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 border">
                <img src={logoUrl} alt="Logo da empresa" className="h-14 max-w-[180px] object-contain" />
                <Button variant="ghost" size="icon" onClick={handleRemoveLogo} className="h-8 w-8 rounded-lg hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enviar nova logo</Label>
              <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="rounded-xl" />
              {uploading && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-xs text-muted-foreground">Enviando...</span></div>}
              <p className="text-[11px] text-muted-foreground">PNG com fundo transparente, máximo 400x120px</p>
            </div>
          </CardContent>
        </Card>

        {/* Serial lengths */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><ScanBarcode className="h-3.5 w-3.5 text-primary" /></div>
              Limite de Caracteres — Bipagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Defina quantos caracteres o serial tem para cada tipo de equipamento. No lançamento em massa, ao atingir esse número o equipamento é cadastrado automaticamente.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {types.map(t => (
                <div key={t.id} className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t.name}</span>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Remover tipo "${t.name}"?`)) deleteType.mutate(t.id); }}
                      className="text-destructive/60 hover:text-destructive text-xs"
                      title="Remover tipo"
                    >✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Caracteres</Label>
                      <Input type="number" min={1} max={100} value={serialLengths[t.name] || ''} onChange={e => updateSerialLength(t.name, parseInt(e.target.value) || 1)} className="h-9 rounded-lg text-center font-mono font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Alerta estoque ≤</Label>
                      <Input
                        type="number"
                        min={0}
                        defaultValue={t.min_stock_alert || 0}
                        onBlur={(e) => {
                          const v = Math.max(0, parseInt(e.target.value) || 0);
                          if (v !== (t.min_stock_alert || 0)) updateType.mutate({ id: t.id, min_stock_alert: v });
                        }}
                        className="h-9 rounded-lg text-center font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {types.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground italic">Nenhum tipo cadastrado. Adicione um para começar.</p>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => setAddTypeOpen(true)} className="w-full rounded-xl mt-2">
              + Adicionar tipo de equipamento
            </Button>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><Globe className="h-3.5 w-3.5 text-primary" /></div>
              Idioma do Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-[200px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Term text */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="h-3.5 w-3.5 text-primary" /></div>
              Texto do Termo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={termText} onChange={(e) => setTermText(e.target.value)} rows={8} placeholder="Texto do termo de responsabilidade..." className="rounded-xl" />
            <p className="text-[11px] text-muted-foreground">Este texto será usado em todos os novos termos gerados.</p>
          </CardContent>
        </Card>

        {/* Avisos */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><Bell className="h-3.5 w-3.5 text-primary" /></div>
              Avisos do Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Os avisos ativos são exibidos em rotação no topo do Dashboard.
            </p>

            {/* Lista de avisos */}
            <div className="space-y-2">
              {notices.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhum aviso cadastrado.</p>
              )}
              {notices.map(n => (
                <div key={n.id} className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  {editingNoticeId === n.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Título (opcional)"
                        className="h-8 rounded-lg text-xs"
                      />
                      <Textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        placeholder="Texto do aviso"
                        rows={2}
                        className="rounded-lg text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 rounded-lg gap-1 text-xs" onClick={saveEdit} disabled={!editText.trim()}>
                          <Check className="h-3 w-3" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 rounded-lg gap-1 text-xs" onClick={() => setEditingNoticeId(null)}>
                          <X className="h-3 w-3" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {n.title && <p className="text-xs font-bold text-primary mb-0.5">{n.title}</p>}
                        <p className="text-xs text-foreground leading-snug">{n.text}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleNotice(n.id)}
                          title={n.active ? 'Desativar' : 'Ativar'}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                            n.active
                              ? 'border-success/40 text-success bg-success/10'
                              : 'border-muted-foreground/30 text-muted-foreground bg-muted'
                          }`}
                        >
                          {n.active ? 'Ativo' : 'Inativo'}
                        </button>
                        <button type="button" onClick={() => startEdit(n)} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors" title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => deleteNotice(n.id)} className="text-destructive/60 hover:text-destructive p-1 rounded transition-colors" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Novo aviso */}
            <div className="rounded-xl border border-dashed border-primary/30 bg-accent/20 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Novo aviso</p>
              <Input
                value={newNoticeTitle}
                onChange={e => setNewNoticeTitle(e.target.value)}
                placeholder="Título (opcional)"
                className="h-8 rounded-lg text-xs"
              />
              <Textarea
                value={newNoticeText}
                onChange={e => setNewNoticeText(e.target.value)}
                placeholder="Texto do aviso..."
                rows={2}
                className="rounded-lg text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-8 rounded-lg gap-1.5 text-xs font-semibold"
                onClick={addNotice}
                disabled={!newNoticeText.trim()}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar aviso
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full h-12 rounded-xl font-bold shadow-md shadow-primary/20">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar Configurações
        </Button>
      </div>

      <AddEquipmentTypeDialog open={addTypeOpen} onOpenChange={setAddTypeOpen} />
    </div>
  );
}
