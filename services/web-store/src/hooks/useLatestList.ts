import { useCallback, useEffect, useState } from 'react';
import { useLatestRequest } from './useLatestRequest';

/** A new query clears old items; only its own completion may update the list. */
export function useLatestList<T>(
  fetchList: () => Promise<{ items: T[]; total: number }>,
  errorMessage: (error: unknown) => string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { begin, invalidate } = useLatestRequest();
  const load = useCallback(async () => {
    const isCurrent = begin();
    setItems([]);
    setTotal(0);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchList();
      if (!isCurrent()) return;
      setItems(result.items);
      setTotal(result.total);
    } catch (failure) {
      if (isCurrent()) setError(errorMessage(failure));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [begin, fetchList, errorMessage]);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);
  return { items, total, loading, error, setError, load };
}
