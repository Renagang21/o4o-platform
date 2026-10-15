import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { businessApi } from './api';
type Store = { organizationId: string; organizationName: string; memberRole: string };
/** URL selection is only a hint; validate it against the current account's server-owned list. */
export function useBusinessMaterialStore(enabled: boolean) {
  const { user } = useAuth();
  const accountId = user?.id ?? '';
  const [params, setParams] = useSearchParams();
  const requested = params.get('store');
  const [result, setResult] = useState<{ accountId: string; stores: Store[]; error: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setResult(null);
    if (!enabled || !accountId) return;
    void businessApi.get<{ stores: Store[] }>('/work-scope/accessible-stores')
      .then(data => {
        if (!Array.isArray(data.stores) || !data.stores.every(s => typeof s.organizationId === 'string' && typeof s.organizationName === 'string' && typeof s.memberRole === 'string')) throw new Error('Invalid stores');
        if (alive) setResult({ accountId, stores: data.stores.filter(s => ['owner', 'admin', 'manager'].includes(s.memberRole)), error: false });
      })
      .catch(() => { if (alive) setResult({ accountId, stores: [], error: true }); });
    return () => { alive = false; };
  }, [enabled, accountId, retry]);
  const current = result?.accountId === accountId ? result : null;
  const stores = current?.stores ?? [];
  // Never silently replace an invalid explicit selection with a different pharmacy.
  const organizationId = requested ? stores.find(s => s.organizationId === requested)?.organizationId : stores.length === 1 ? stores[0].organizationId : undefined;
  const selection = !enabled ? null : !current ? <p role="status" className="my-3 text-sm text-slate-500">자료를 이용할 약국을 확인하고 있습니다…</p>
    : current.error ? <div className="my-3"><p role="alert">약국 목록을 확인하지 못했습니다.</p><button type="button" className="min-h-11 text-blue-700" onClick={() => setRetry(n => n + 1)}>약국 목록 다시 확인</button></div>
    : !stores.length ? <p className="my-3 text-sm text-slate-500">자료를 이용할 약국 경영자 소속을 확인해 주세요.</p>
    : <label className="my-3 block text-sm">자료를 이용할 약국
      <select aria-label="자료를 이용할 약국" className="mt-2 block w-full rounded-lg border bg-white p-3" value={organizationId ?? ''} onChange={e => {
        const value = e.target.value;
        setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set('store', value); else next.delete('store'); return next; });
      }}><option value="">약국을 선택해 주세요</option>{stores.map(s => <option key={s.organizationId} value={s.organizationId}>{s.organizationName}</option>)}</select>
    </label>;
  return { organizationId, selection };
}
