import { useCallback, useEffect, useRef, useState } from 'react';

/** Keep transport failures distinct from an empty store resource; ignore superseded responses. */
export function useStoreResource<T>(load: () => Promise<T>, initial: T, enabled = true) {
  const empty = useRef(initial);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const reload = useCallback(async () => {
    if (!enabled) return;
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
  }, [load, enabled]);
  const cancel = useCallback(() => { revision.current++; }, []);
  useEffect(() => {
    if (enabled) void reload();
    else { cancel(); setData(empty.current); setLoading(false); setError(null); }
    return cancel;
  }, [enabled, reload, cancel]);
  return { data: enabled ? data : empty.current, setData, loading: enabled && loading, error: enabled ? error : null, reload };
}
