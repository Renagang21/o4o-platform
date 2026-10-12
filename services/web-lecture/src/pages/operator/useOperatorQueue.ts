import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { errorMessage } from '../../api/lecture';
import { useToast } from '../../components/Toast';

/** Request handling for lecture review lists; their business actions remain distinct. */
export function useOperatorQueue<T>(scope: string, fetch: () => Promise<{ data: T[] }>, failure: string) {
  const toast = useToast();
  const state = useRef({ mounted: false, scope, sequence: 0, submitting: false });
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useLayoutEffect(() => {
    state.current.mounted = true;
    state.current.scope = scope;
    return () => { state.current.mounted = false; state.current.sequence++; };
  }, [scope]);
  const load = useCallback(async () => {
    const sequence = ++state.current.sequence;
    const current = () => state.current.mounted && state.current.scope === scope && state.current.sequence === sequence;
    setLoading(true); setError(null); setItems([]);
    try {
      const result = await fetch();
      if (current()) setItems(result.data ?? []);
    } catch (err) {
      if (current()) setError(errorMessage(err, failure));
    } finally {
      if (current()) setLoading(false);
    }
  }, [scope, fetch, failure]);
  useEffect(() => { void load(); }, [load]);

  async function run(id: string, work: () => Promise<unknown>, success: string, failureMessage: string) {
    if (state.current.submitting || loading || error) return;
    state.current.submitting = true;
    const current = () => state.current.mounted && state.current.scope === scope;
    setBusy(id);
    try {
      await work();
      if (!current()) return;
      toast.success(success);
      await load();
    } catch (err) {
      if (current()) toast.error(errorMessage(err, failureMessage));
    } finally {
      state.current.submitting = false;
      if (state.current.mounted) setBusy(null);
    }
  }
  return { items, loading, error, busy, load, run };
}
