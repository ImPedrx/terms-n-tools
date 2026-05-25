import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export function NoticesCarousel() {
  const { data: settings } = useSettings();
  const notices = settings?.notices?.filter(n => n.active) ?? [];
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  const go = useCallback((index: number) => {
    setFading(true);
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 220);
  }, []);

  const next = useCallback(() => go((current + 1) % notices.length), [go, current, notices.length]);
  const prev = useCallback(() => go((current - 1 + notices.length) % notices.length), [go, current, notices.length]);

  useEffect(() => {
    if (notices.length <= 1) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next, notices.length]);

  useEffect(() => {
    setCurrent(0);
  }, [notices.length]);

  if (notices.length === 0) return null;

  const notice = notices[current];

  return (
    <Card className="border-l-[3px] border-l-primary shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-stretch min-h-[52px]">
          <div className="flex items-center justify-center bg-primary/10 px-4 flex-shrink-0">
            <Bell className="h-4 w-4 text-primary" />
          </div>

          <div
            className="flex-1 px-4 py-3 transition-opacity duration-[220ms]"
            style={{ opacity: fading ? 0 : 1 }}
          >
            {notice.title && (
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">
                {notice.title}
              </p>
            )}
            <p className="text-sm text-foreground leading-snug">{notice.text}</p>
          </div>

          {notices.length > 1 && (
            <div className="flex flex-col items-center justify-center gap-1.5 px-3 flex-shrink-0">
              <div className="flex gap-0.5">
                <button
                  onClick={prev}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                  aria-label="Aviso anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={next}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                  aria-label="Próximo aviso"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-1 items-center">
                {notices.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === current
                        ? 'w-3.5 h-1.5 bg-primary'
                        : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Ir para aviso ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
