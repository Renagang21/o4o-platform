import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { errorMessage } from '../../api/lecture';
import { useToast } from '../../components/Toast';

/** Lecture lists share request lifetimes, while their business actions remain distinct. */
export function useOperatorQueue<T>(scope: string, fetch: () => Promise<{ data: T[] }>, failure: string) {
  const toast = useToast();
  const state = useRef({ mounted: false, scope, generation: 0, sequence: 0, submitting: false, reading: true, ready: false });
  const [snapshot, setSnapshot] = useState<{ scope: string; items: T[]; loading: boolean; error: string | null }>({ scope, items: [], loading: true, error: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  useLayoutEffect(() => {
    const lifecycle = state.current;
    lifecycle.mounted = true; lifecycle.scope = scope; lifecycle.generation++;
    lifecycle.submitting = false; lifecycle.reading = true; lifecycle.ready = false;
    setBusy(null); setActionError(null); setRefreshNotice(null);
    return () => { lifecycle.mounted = false; lifecycle.sequence++; };
  }, [scope]);
  const load = useCallback(async () => {
    const lifecycle = state.current;
    if (!lifecycle.mounted || lifecycle.scope !== scope) return false;
    const sequence = ++lifecycle.sequence;
    const current = () => lifecycle.mounted && lifecycle.scope === scope && lifecycle.sequence === sequence;
    lifecycle.reading = true; lifecycle.ready = false;
    setSnapshot({ scope, items: [], loading: true, error: null });
    try {
      const result = await fetch();
      if (!current()) return false;
      lifecycle.ready = true;
      setSnapshot({ scope, items: result.data ?? [], loading: false, error: null });
      setRefreshNotice(null);
      return true;
    } catch (err) {
      if (current()) setSnapshot({ scope, items: [], loading: false, error: errorMessage(err, failure) });
      return false;
    } finally { if (current()) lifecycle.reading = false; }
  }, [scope, fetch, failure]);
  useEffect(() => { void load(); }, [load]);

  async function run(id: string, work: () => Promise<unknown>, success: string, failureMessage: string) {
    const lifecycle = state.current;
    if (!lifecycle.mounted || lifecycle.scope !== scope || lifecycle.submitting || lifecycle.reading || !lifecycle.ready) return false;
    lifecycle.submitting = true;
    const generation = lifecycle.generation;
    const current = () => lifecycle.mounted && lifecycle.scope === scope && lifecycle.generation === generation;
    setBusy(id); setActionError(null);
    try {
      await work();
    } catch (err) {
      if (current()) { const text = errorMessage(err, failureMessage); setActionError(text); toast.error(text); lifecycle.submitting = false; setBusy(null); }
      return false;
    }
    if (!current()) return false;
    toast.success(success);
    const refreshed = await load();
    if (!current()) return false;
    if (!refreshed) setRefreshNotice(`${success} 목록 갱신에 실패했습니다. 다시 처리하지 말고 다시 조회해 주세요.`);
    lifecycle.submitting = false; setBusy(null);
    return true;
  }
  const visible = snapshot.scope === scope ? snapshot : { items: [], loading: true, error: null };
  return { ...visible, busy, actionError, refreshNotice, load, run, clearActionError: () => setActionError(null) };
}
