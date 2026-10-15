import { useEffect, useState } from 'react';
import { storeLibraryApi, type LibraryContentItem } from '../../api/assetSnapshot';
import { useLatestStoreRequest } from '../../pages/pharmacy/hooks/useLatestStoreRequest';
import { useStoreProductSession } from './StoreProductSession';

export function useContentImport(organizationId: string) {
  const current = useStoreProductSession(organizationId);
  const latest = useLatestStoreRequest();
  const [search, setSearchValue] = useState('');
  const [page, setPageValue] = useState(1);
  const [retry, setRetry] = useState(0);
  const [items, setItems] = useState<LibraryContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const invalidate = () => { latest.cancel(); setSelectedId(null); setItems([]); setTotal(0); setError(null); setLoading(true); };
  useEffect(() => {
    const active = latest.begin();
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true); setError(null);
        try {
          const result = await storeLibraryApi.listContents({ page, limit: 12, search: search.trim() || undefined, source: 'mine' });
          if (!result.success || !Array.isArray(result.data?.items) || !Number.isSafeInteger(result.data.total) || result.data.total < 0 ||
            result.data.items.some(item => !item || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string')) throw new Error('Invalid content list');
          if (!active() || !current()) return;
          const last = Math.max(1, Math.ceil(result.data.total / 12));
          if (page > last) { latest.cancel(); setPageValue(last); return; }
          setItems(result.data.items); setTotal(result.data.total);
        } catch { if (active() && current()) setError('콘텐츠 목록을 불러오지 못했습니다. 다시 시도해 주세요.'); }
        finally { if (active() && current()) setLoading(false); }
      })();
    }, 300);
    return () => { clearTimeout(timer); latest.cancel(); };
  }, [page, search, retry, latest, current]);
  return { items, total, loading, error, setError, selectedId, setSelectedId, current, search, page,
    selected: !loading && !error ? items.find(item => item.id === selectedId) ?? null : null,
    totalPages: Math.max(1, Math.ceil(total / 12)),
    setSearch: (value: string) => { if (value !== search) { invalidate(); setSearchValue(value); setPageValue(1); } },
    setPage: (value: number) => { if (value !== page) { invalidate(); setPageValue(value); } },
    reload: () => { invalidate(); setRetry(value => value + 1); } };
}
