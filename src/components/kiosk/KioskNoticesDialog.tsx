import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Settings2, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { useKioskNotices, type KioskNoticeColor } from '@/hooks/useKioskNotices';

const COLOR_OPTIONS: { value: KioskNoticeColor; label: string; icon: typeof Info }[] = [
  { value: 'info', label: 'Informação (azul)', icon: Info },
  { value: 'warning', label: 'Aviso (amarelo)', icon: AlertTriangle },
  { value: 'success', label: 'Sucesso (verde)', icon: CheckCircle2 },
  { value: 'destructive', label: 'Crítico (vermelho)', icon: XCircle },
];

interface Props {
  trigger?: React.ReactNode;
}

export function KioskNoticesDialog({ trigger }: Props) {
  const { config, addNotice, removeNotice, setInterval } = useKioskNotices();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [color, setColor] = useState<KioskNoticeColor>('info');

  const handleAdd = () => {
    if (!title.trim() && !message.trim()) return;
    addNotice({ title: title.trim(), message: message.trim(), color });
    setTitle('');
    setMessage('');
    setColor('info');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" /> Configurar avisos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Modo Apresentação</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">Tempo por slide (segundos)</Label>
            <Input
              id="interval"
              type="number"
              min={3}
              max={60}
              value={config.intervalSeconds}
              onChange={(e) => setInterval(Number(e.target.value) || 8)}
              className="w-28"
            />
          </div>

          {/* New notice */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-bold">Adicionar novo aviso</h3>
            <div className="grid gap-3">
              <div>
                <Label htmlFor="n-title">Título</Label>
                <Input
                  id="n-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Manutenção programada"
                />
              </div>
              <div>
                <Label htmlFor="n-msg">Mensagem</Label>
                <Textarea
                  id="n-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva o aviso..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Cor / categoria</Label>
                <Select value={color} onValueChange={(v) => setColor(v as KioskNoticeColor)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="gap-2 w-fit">
                <Plus className="h-4 w-4" /> Adicionar aviso
              </Button>
            </div>
          </div>

          {/* Existing notices */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold">Avisos cadastrados ({config.notices.length})</h3>
            {config.notices.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum aviso cadastrado.</p>
            )}
            <div className="space-y-2">
              {config.notices.map((n) => {
                const opt = COLOR_OPTIONS.find((o) => o.value === n.color)!;
                const Icon = opt.icon;
                const colorClass = {
                  info: 'border-l-primary bg-primary/5',
                  warning: 'border-l-warning bg-warning/5',
                  success: 'border-l-success bg-success/5',
                  destructive: 'border-l-destructive bg-destructive/5',
                }[n.color];
                const iconColor = {
                  info: 'text-primary',
                  warning: 'text-warning',
                  success: 'text-success',
                  destructive: 'text-destructive',
                }[n.color];
                return (
                  <Card key={n.id} className={`border-l-[3px] ${colorClass}`}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        {n.title && <p className="text-sm font-bold">{n.title}</p>}
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.message}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNotice(n.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
