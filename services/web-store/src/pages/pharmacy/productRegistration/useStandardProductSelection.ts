import { useEffect, useRef, useState } from 'react';
import { toast } from '@o4o/error-handling';
import { searchO4oStandardProducts, registerStandardProductToStore, type O4oStandardProduct } from '../../../api/o4oStandardProducts';
import { useStoreProductSession } from '../../../components/store/StoreProductSession';
import { useLatestStoreRequest } from '../hooks/useLatestStoreRequest';

export function useStandardProductSelection(organizationId: string, onRegistered: () => void) {
  const current = useStoreProductSession(organizationId);
  const latest = useLatestStoreRequest();
  const [searchInput, setSearchInput] = useState('');
  const [classification, setClassification] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [items, setItems] = useState<O4oStandardProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const lock = useRef(false);
  const invalidate = () => { latest.cancel(); setItems([]); setTotal(0); setLoading(true); setError(null); };
  const changeSearch = (value: string) => { if (!lock.current && value !== searchInput) { invalidate(); setSearchInput(value); setPage(1); } };
  const changeClassification = (value: string) => { if (!lock.current && value !== classification) { invalidate(); setClassification(value); setPage(1); } };
  const changePage = (value: number) => { if (!lock.current && value !== page) { invalidate(); setPage(value); } };
  useEffect(() => {
    const active = latest.begin();
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true); setError(null);
        try {
          const result = await searchO4oStandardProducts({ q: searchInput.trim() || undefined,
            classification: classification || undefined, page, limit: 20 });
          if (!Array.isArray(result?.items) || !Number.isSafeInteger(result.meta?.total) || result.meta.total < 0 ||
            result.items.some(p => !p || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' ||
              (p.classification != null && typeof p.classification.label !== 'string'))) throw new Error('Invalid product results');
          if (!active() || !current()) return;
          const last = Math.max(1, Math.ceil(result.meta.total / 20));
          if (page > last) { latest.cancel(); setPage(last); return; }
          setItems(result.items); setTotal(result.meta.total);
        } catch { if (active() && current()) setError('O4O 표준 상품을 불러오지 못했습니다. 다시 시도해 주세요.'); }
        finally { if (active() && current()) setLoading(false); }
      })();
    }, 300);
    return () => { clearTimeout(timer); latest.cancel(); };
  }, [searchInput, classification, page, retry, current, latest]);
  const handleRegister = async (product: O4oStandardProduct) => {
    if (lock.current || !current() || loading || error || registeredIds.has(product.id) || !items.some(p => p.id === product.id)) return;
    lock.current = true; setRegisteringId(product.id); setActionError(null);
    try {
      const result = await registerStandardProductToStore(product.id);
      if (result?.success !== true) throw new Error('Unconfirmed registration');
      if (!current()) return;
      setRegisteredIds(ids => new Set(ids).add(product.id));
      if (result.message === 'ALREADY_LISTED') toast.info('이미 매장에 등록된 상품입니다.');
      else toast.success('매장 경영활용 제품으로 추가했습니다.');
      onRegistered();
    } catch { if (current()) setActionError('추가 결과를 확인하지 못했습니다. 매장 목록을 확인한 뒤 다시 시도해 주세요.'); }
    finally { lock.current = false; if (current()) setRegisteringId(null); }
  };
  return { searchInput, setSearchInput: changeSearch, classification, setClassification: changeClassification,
    page, setPage: changePage, items, total, loading, error, actionError, registeringId, registeredIds, handleRegister,
    retry: () => { invalidate(); setRetry(value => value + 1); }, totalPages: Math.max(1, Math.ceil(total / 20)) };
}
