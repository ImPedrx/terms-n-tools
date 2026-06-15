import { useEffect, useMemo, useState } from 'react';

/**
 * Paginação client-side genérica. Recebe a lista completa já filtrada
 * e devolve apenas a página atual + os controles de navegação.
 *
 * Reseta para a primeira página sempre que o total de itens muda
 * (ex: ao aplicar um filtro de busca), evitando ficar numa página vazia.
 */
export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Mantém a página dentro dos limites quando a lista encolhe.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const from = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, items.length);

  return {
    page,
    setPage,
    totalPages,
    pageSize,
    paged,
    total: items.length,
    from,
    to,
    canPrev: page > 1,
    canNext: page < totalPages,
    next: () => setPage(p => Math.min(p + 1, totalPages)),
    prev: () => setPage(p => Math.max(p - 1, 1)),
    reset: () => setPage(1),
  };
}
