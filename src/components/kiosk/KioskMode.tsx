import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEquipmentTypes } from '@/hooks/useEquipmentTypes';
import { useKioskNotices, type KioskNotice } from '@/hooks/useKioskNotices';
import { useSettings } from '@/hooks/useSettings';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KioskNoticesDialog } from './KioskNoticesDialog';
import { EQUIPMENT_STATUS } from '@/lib/constants';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Monitor,
  Package,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  FileText,
  Clock,
  Send,
  XCircle,
  Info,
  BarChart3,
  TrendingUp,
  Settings2,
  Bell,
} from 'lucide-react';
import type { Notice } from '@/hooks/useSettings';

interface Props {
  open: boolean;
  onClose: () => void;
}

type SlideKind = 'metrics' | 'stock' | 'terms' | 'byType' | 'byStatus' | 'notice';

interface Slide {
  kind: SlideKind;
  title: string;
  notice?: KioskNotice;
}

export function KioskMode({ open, onClose }: Props) {
  const { config } = useKioskNotices();
  const { data: settings } = useSettings();
  const { data: equipmentTypes = [] } = useEquipmentTypes();
  const { effectiveClientId, isAdmin } = useTenant();

  const { data: equipment } = useQuery({
    queryKey: ['kiosk-equipment', effectiveClientId],
    queryFn: async () => {
      let q = supabase.from('equipment').select('*');
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data } = await q;
      return data || [];
    },
    enabled: open,
    refetchInterval: open ? 60_000 : false,
  });

  const { data: terms } = useQuery({
    queryKey: ['kiosk-terms', effectiveClientId],
    queryFn: async () => {
      let q = supabase.from('responsibility_terms').select('*');
      if (isAdmin && effectiveClientId) q = q.eq('client_id', effectiveClientId);
      const { data } = await q;
      return data || [];
    },
    enabled: open,
    refetchInterval: open ? 60_000 : false,
  });

  const allEquipment = equipment || [];
  const allTerms = terms || [];

  const stockAlerts = useMemo(
    () =>
      equipmentTypes
        .filter((t) => (t.min_stock_alert || 0) > 0)
        .map((t) => ({
          name: t.name,
          available: allEquipment.filter((e) => e.type === t.name && e.status === 'disponivel').length,
          min: t.min_stock_alert,
        }))
        .filter((a) => a.available <= a.min),
    [equipmentTypes, allEquipment],
  );

  const slides = useMemo<Slide[]>(() => {
    const base: Slide[] = [
      { kind: 'metrics', title: 'Equipamentos' },
      { kind: 'terms', title: 'Termos de Responsabilidade' },
    ];
    if (stockAlerts.length > 0) base.push({ kind: 'stock', title: 'Alertas de Estoque' });
    base.push({ kind: 'byType', title: 'Distribuição por Tipo' });
    base.push({ kind: 'byStatus', title: 'Distribuição por Status' });
    config.notices.forEach((n) =>
      base.push({ kind: 'notice', title: n.title || 'Aviso', notice: n }),
    );
    return base;
  }, [stockAlerts, config.notices]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // reset on open
  useEffect(() => {
    if (open) {
      setIndex(0);
      setPaused(false);
      setProgress(0);
    }
  }, [open]);

  // clamp index if slide count changes
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  // auto-advance with progress
  useEffect(() => {
    if (!open || paused || slides.length === 0) return;
    const tickMs = 100;
    const total = config.intervalSeconds * 1000;
    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((p) => {
        const next = p + (tickMs / total) * 100;
        if (next >= 100) {
          setIndex((i) => (i + 1) % slides.length);
          return 0;
        }
        return next;
      });
    }, tickMs);
    return () => window.clearInterval(id);
  }, [open, paused, index, slides.length, config.intervalSeconds]);

  // keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') {
        setIndex((i) => (i + 1) % Math.max(slides.length, 1));
        setProgress(0);
      } else if (e.key === 'ArrowLeft') {
        setIndex((i) => (i - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1));
        setProgress(0);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, slides.length, onClose]);

  if (!open) return null;

  const current = slides[index];

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Modo Apresentação
            </p>
            <p className="text-sm font-bold truncate">{current?.title ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <KioskNoticesDialog
            trigger={
              <Button variant="ghost" size="icon" title="Configurar avisos" className="h-9 w-9">
                <Settings2 className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaused((p) => !p)}
            title={paused ? 'Retomar' : 'Pausar'}
            className="h-9 w-9"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIndex((i) => (i - 1 + slides.length) % Math.max(slides.length, 1));
              setProgress(0);
            }}
            className="h-9 w-9"
            title="Slide anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIndex((i) => (i + 1) % Math.max(slides.length, 1));
              setProgress(0);
            }}
            className="h-9 w-9"
            title="Próximo slide"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            title="Sair (Esc)"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-auto px-8 py-10">
        <div className="max-w-[1600px] mx-auto h-full" key={index}>
          <div className="animate-fade-in">
            {current?.kind === 'metrics' && <MetricsSlide equipment={allEquipment} />}
            {current?.kind === 'terms' && <TermsSlide terms={allTerms} />}
            {current?.kind === 'stock' && <StockAlertsSlide alerts={stockAlerts} />}
            {current?.kind === 'byType' && (
              <ByTypeSlide equipment={allEquipment} types={equipmentTypes.map((t) => t.name)} />
            )}
            {current?.kind === 'byStatus' && <ByStatusSlide equipment={allEquipment} />}
            {current?.kind === 'notice' && current.notice && <NoticeSlide notice={current.notice} />}
            {slides.length === 0 && (
              <div className="text-center py-20">
                <Info className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">Nenhum slide disponível.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notices banner */}
      <NoticesBanner notices={(settings?.notices ?? []).filter((n) => n.active)} />

      {/* Slide indicators */}
      <div className="flex items-center justify-center gap-1.5 py-4 border-t border-border bg-card/60">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              setIndex(i);
              setProgress(0);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
            }`}
            aria-label={`Ir para slide ${i + 1}: ${s.title}`}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}

/* ----------------------------- SLIDES ----------------------------- */

function BigStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Monitor;
  tone: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const toneClass = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-l-primary' },
    success: { bg: 'bg-success/10', text: 'text-success', border: 'border-l-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-l-warning' },
    destructive: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-l-destructive' },
  }[tone];
  return (
    <Card className={`border-l-[4px] ${toneClass.border} shadow-md`}>
      <CardContent className="p-6">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${toneClass.bg} mb-4`}>
          <Icon className={`h-7 w-7 ${toneClass.text}`} />
        </div>
        <div className="text-5xl font-extrabold tracking-tight">{value}</div>
        <p className="text-sm text-muted-foreground font-semibold mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function MetricsSlide({ equipment }: { equipment: any[] }) {
  const stats = {
    total: equipment.length,
    disponivel: equipment.filter((e) => e.status === 'disponivel').length,
    entregue: equipment.filter((e) => e.status === 'entregue').length,
    manutencao: equipment.filter((e) => e.status === 'em_manutencao').length,
    baixado: equipment.filter((e) => e.status === 'baixado').length,
  };
  return (
    <div>
      <h2 className="text-3xl font-extrabold mb-8 tracking-tight">Visão Geral de Equipamentos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <BigStat label="Total" value={stats.total} icon={Monitor} tone="primary" />
        <BigStat label="Disponíveis" value={stats.disponivel} icon={Package} tone="success" />
        <BigStat label="Entregues" value={stats.entregue} icon={CheckCircle2} tone="primary" />
        <BigStat label="Em manutenção" value={stats.manutencao} icon={Wrench} tone="warning" />
        <BigStat label="Baixados" value={stats.baixado} icon={AlertTriangle} tone="destructive" />
      </div>
    </div>
  );
}

function TermsSlide({ terms }: { terms: any[] }) {
  const stats = {
    total: terms.length,
    pendente: terms.filter((t) => t.status === 'pendente').length,
    enviado: terms.filter((t) => t.status === 'enviado_para_assinatura').length,
    fechado: terms.filter((t) => t.status === 'fechado').length,
    cancelado: terms.filter((t) => t.status === 'cancelado').length,
  };
  return (
    <div>
      <h2 className="text-3xl font-extrabold mb-8 tracking-tight">Termos de Responsabilidade</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <BigStat label="Total" value={stats.total} icon={FileText} tone="primary" />
        <BigStat label="Pendentes" value={stats.pendente} icon={Clock} tone="warning" />
        <BigStat label="Enviados" value={stats.enviado} icon={Send} tone="primary" />
        <BigStat label="Fechados" value={stats.fechado} icon={CheckCircle2} tone="success" />
        <BigStat label="Cancelados" value={stats.cancelado} icon={XCircle} tone="destructive" />
      </div>
    </div>
  );
}

function StockAlertsSlide({
  alerts,
}: {
  alerts: { name: string; available: number; min: number }[];
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15">
          <AlertTriangle className="h-6 w-6 text-warning" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight">Alertas de Estoque</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((a) => (
          <Card key={a.name} className="border-l-[4px] border-l-warning bg-warning/5 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15 flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold truncate">{a.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="text-3xl font-extrabold text-warning">{a.available}</span>{' '}
                    <span className="font-semibold">
                      disponíve{a.available === 1 ? 'l' : 'is'}
                    </span>
                    <span className="block text-xs mt-0.5">Mínimo recomendado: {a.min}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ByTypeSlide({ equipment, types }: { equipment: any[]; types: string[] }) {
  const data = types
    .map((name) => ({ name, count: equipment.filter((e) => e.type === name).length }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight">Distribuição por Tipo</h2>
      </div>
      {data.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Nenhum equipamento cadastrado.</p>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {data.map((d) => {
            const pct = equipment.length ? Math.round((d.count / equipment.length) * 100) : 0;
            const barWidth = Math.round((d.count / max) * 100);
            return (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold">{d.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-extrabold">{d.count}</span>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded font-semibold">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-primary/60 h-4 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ByStatusSlide({ equipment }: { equipment: any[] }) {
  const data = EQUIPMENT_STATUS.map((s) => ({
    ...s,
    count: equipment.filter((e) => e.status === s.value).length,
  })).filter((d) => d.count > 0);
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight">Distribuição por Status</h2>
      </div>
      {data.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Nenhum dado disponível.</p>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {data.map((d) => {
            const pct = equipment.length ? Math.round((d.count / equipment.length) * 100) : 0;
            const barWidth = Math.round((d.count / max) * 100);
            return (
              <div key={d.value}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold">{d.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-extrabold">{d.count}</span>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded font-semibold">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className={`${d.color} h-4 rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoticesBanner({ notices }: { notices: Notice[] }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (notices.length <= 1) return;
    const id = window.setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % notices.length);
        setFading(false);
      }, 300);
    }, 5000);
    return () => window.clearInterval(id);
  }, [notices.length]);

  useEffect(() => { setIdx(0); }, [notices.length]);

  if (notices.length === 0) return null;

  const notice = notices[idx];

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur px-8 py-5 flex items-center gap-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 flex-shrink-0">
        <Bell className="h-6 w-6 text-primary" />
      </div>
      <div
        className="flex-1 min-w-0 transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {notice.title && (
          <p className="text-sm font-bold text-primary uppercase tracking-wider mb-0.5">
            {notice.title}
          </p>
        )}
        <p className="text-lg font-medium text-foreground leading-snug">{notice.text}</p>
      </div>
      {notices.length > 1 && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex gap-1.5 items-center">
            {notices.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === idx ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground font-semibold">{idx + 1}/{notices.length}</span>
        </div>
      )}
    </div>
  );
}

function NoticeSlide({ notice }: { notice: KioskNotice }) {
  const tone = {
    info: { bg: 'bg-primary/5', border: 'border-primary', text: 'text-primary', icon: Info },
    warning: {
      bg: 'bg-warning/5',
      border: 'border-warning',
      text: 'text-warning',
      icon: AlertTriangle,
    },
    success: {
      bg: 'bg-success/5',
      border: 'border-success',
      text: 'text-success',
      icon: CheckCircle2,
    },
    destructive: {
      bg: 'bg-destructive/5',
      border: 'border-destructive',
      text: 'text-destructive',
      icon: XCircle,
    },
  }[notice.color];
  const Icon = tone.icon;
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className={`max-w-3xl w-full border-2 ${tone.border} ${tone.bg} shadow-2xl`}>
        <CardContent className="p-12 text-center">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl ${tone.bg} mb-6 ring-2 ${tone.border}`}
          >
            <Icon className={`h-10 w-10 ${tone.text}`} />
          </div>
          {notice.title && (
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">{notice.title}</h2>
          )}
          {notice.message && (
            <p className="text-xl text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {notice.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
