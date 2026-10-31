import { useCallback, useEffect, useMemo, useState } from 'react';

/** Only changes an in-memory cursor. Never fetches or silently replaces a saved list. */
export function useMediaSequence(ids: string[], resetKey: string, loop = true) {
  const idsKey = JSON.stringify(ids);
  const list = useMemo(() => JSON.parse(idsKey) as string[], [idsKey]);
  const key = JSON.stringify([resetKey, idsKey]);
  const fresh = useCallback(() => ({ key, index: 0, generation: 0, failed: [] as string[], error: '' }), [key]);
  const [saved, setSaved] = useState(fresh);
  const state = saved.key === key ? saved : fresh();
  const token = `${key}:${state.index}:${state.generation}`;
  const allFailed = list.length > 0 && list.every(id => state.failed.includes(id));
  const next = useCallback((expected?: string) => {
    setSaved(previous => {
      const current = previous.key === key ? previous : fresh();
      if (expected && expected !== `${key}:${current.index}:${current.generation}`) return previous;
      for (let step = 1; step <= list.length; step++) {
        const index = current.index + step;
        if (!loop && index >= list.length) return previous;
        const target = index % list.length;
        if (!current.failed.includes(list[target])) return { ...current, index: target, generation: current.generation + 1 };
      }
      return current;
    });
  }, [key, loop, list, fresh]);
  const fail = useCallback((message: string, expected: string) => {
    setSaved(previous => {
      const current = previous.key === key ? previous : fresh();
      if (expected !== `${key}:${current.index}:${current.generation}` || current.failed.includes(list[current.index])) return previous;
      return { ...current, failed: [...current.failed, list[current.index]], error: message };
    });
  }, [key, list, fresh]);
  const failedCurrent = state.failed.includes(list[state.index]);
  useEffect(() => {
    if (!failedCurrent || allFailed) return;
    const timer = setTimeout(() => next(token), 2000);
    return () => clearTimeout(timer);
  }, [failedCurrent, allFailed, token, next]);
  return {
    index: state.index, generation: state.generation, token, next, fail, allFailed, failedCurrent,
    error: state.error, failedCount: state.failed.length,
    retry: () => setSaved(previous => ({ ...fresh(), generation: previous.generation + 1 })),
    select: (index: number) => { if (index >= 0 && index < list.length) setSaved(previous => ({ ...fresh(), index, generation: previous.generation + 1 })); },
  };
}
