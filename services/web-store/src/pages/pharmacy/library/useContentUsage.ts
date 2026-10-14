import { useEffect, useState } from 'react';
import { storeLibraryApi, type StoreContentUsage } from '../../../api/assetSnapshot';
import { useLibraryScope } from './useLibraryScope';

/** Pending markers must not cancel the very request they represent. */
export function useContentUsage(ids: string[]) {
  const key = JSON.stringify([...new Set(ids)].sort((a, b) => a.localeCompare(b)));
  const { isCurrent } = useLibraryScope();
  const [result, setResult] = useState<{ key: string; values: Record<string, StoreContentUsage | null> }>({ key: '', values: {} });
  useEffect(() => {
    let cancelled = false;
    const targets: string[] = JSON.parse(key);
    if (isCurrent() && targets.length) void Promise.all(targets.map(async id => {
      try {
        const response = await storeLibraryApi.getContentUsage(id);
        return [id, response.success ? response.data : null] as const;
      } catch { return [id, null] as const; }
    })).then(entries => {
      if (!cancelled && isCurrent()) setResult({ key, values: Object.fromEntries(entries) });
    });
    return () => { cancelled = true; };
  }, [key, isCurrent]);
  return result.key === key ? result.values : {};
}
