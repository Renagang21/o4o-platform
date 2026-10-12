import { useCallback, useEffect, useRef, useState } from 'react';

/** Keep transport failures distinct from an empty store resource; ignore superseded responses. */
export function useStoreResource<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true); setError(null);
    try {
      const value = await load();
      if (current === revision.current) setData(value);
    } catch {
      if (current === revision.current) setError('목록을 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [load]);
  const cancel = useCallback(() => { revision.current++; }, []);
  useEffect(() => { void reload(); return cancel; }, [reload, cancel]);
  return { data, setData, loading, error, reload };
}
