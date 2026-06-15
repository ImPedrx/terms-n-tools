import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** rótulo do que está sendo paginado, ex: "termos", "equipamentos" */
  label?: string;
}

/**
 * Controles de paginação reutilizáveis. Só renderiza a navegação
 * quando há mais de uma página, mas sempre mostra a contagem.
 */
export function TablePagination({
  page, totalPages, from, to, total, canPrev, canNext, onPrev, onNext, label = 'itens',
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
      <p className="text-xs text-muted-foreground font-medium">
        {total === 0
          ? `Nenhum ${label.replace(/s$/, '')} encontrado`
          : <>Mostrando <span className="text-foreground font-semibold">{from}–{to}</span> de <span className="text-foreground font-semibold">{total}</span> {label}</>}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline" size="sm"
            onClick={onPrev} disabled={!canPrev}
            className="h-8 rounded-lg gap-1 px-2.5"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground font-medium tabular-nums px-1">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            onClick={onNext} disabled={!canNext}
            className="h-8 rounded-lg gap-1 px-2.5"
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
