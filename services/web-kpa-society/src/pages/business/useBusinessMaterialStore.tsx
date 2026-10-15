import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { businessApi } from './api';
type Store = { organizationId: string; organizationName: string; memberRole: string };
/** URL selection is only a hint; validate it against the current account's server-owned list. */
export function useBusinessMaterialStore(enabled: boolean, businessKey: string, label = '자료를 이용할 약국') {
  const { user } = useAuth();
  const accountId = user?.id ?? '';
  const [params, setParams] = useSearchParams();
  const requested = params.get('store');
  const [result, setResult] = useState<{ accountId: string; businessKey: string; stores: Store[]; error: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setResult(null);
    if (!enabled || !accountId) return;
    void businessApi.get<{ stores: Store[] }>('/work-scope/accessible-stores')
      .then(async data => {
        if (!Array.isArray(data.stores) || !data.stores.every(s => typeof s.organizationId === 'string' && typeof s.organizationName === 'string' && typeof s.memberRole === 'string')) throw new Error('Invalid stores');
        const candidates = data.stores.filter(s => ['owner', 'admin', 'manager'].includes(s.memberRole));
        const eligible = await Promise.all(candidates.map(async store => {
          try {
            const memberships = await businessApi.get<{ key: string; membershipStatus: string | null }[]>('/neture/pharmacy/semi-franchises', undefined, store.organizationId);
            if (!Array.isArray(memberships)) throw new Error('Invalid business memberships');
            return memberships.some(row => row.key === businessKey && row.membershipStatus === 'active') ? store : null;
          } catch (error) {
            const status = (error as { response?: { status?: number } }).response?.status;
            if (status === 403 || status === 404 || status === 409) return null;
            throw error;
          }
        }));
        if (alive) setResult({ accountId, businessKey, stores: eligible.filter((store): store is Store => store !== null), error: false });
      })
      .catch(() => { if (alive) setResult({ accountId, businessKey, stores: [], error: true }); });
    return () => { alive = false; };
  }, [enabled, accountId, businessKey, retry]);
  const current = result?.accountId === accountId && result.businessKey === businessKey ? result : null;
  const stores = current?.stores ?? [];
  // Never silently replace an invalid explicit selection with a different pharmacy.
  const organizationId = requested ? stores.find(s => s.organizationId === requested)?.organizationId : stores.length === 1 ? stores[0].organizationId : undefined;
  const selection = !enabled ? null : !current ? <p role="status" className="my-3 text-sm text-slate-500">{label}을 확인하고 있습니다…</p>
    : current.error ? <div className="my-3"><p role="alert">약국 목록을 확인하지 못했습니다.</p><button type="button" className="min-h-11 text-blue-700" onClick={() => setRetry(n => n + 1)}>약국 목록 다시 확인</button></div>
    : !stores.length ? <p className="my-3 text-sm text-slate-500">현재 협력사업에 활성 가입한 약국이 없습니다.</p>
    : <label className="my-3 block text-sm">{label}
      <select aria-label={label} className="mt-2 block w-full rounded-lg border bg-white p-3" value={organizationId ?? ''} onChange={e => {
        const value = e.target.value;
        setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set('store', value); else next.delete('store'); return next; });
      }}><option value="">약국을 선택해 주세요</option>{stores.map(s => <option key={s.organizationId} value={s.organizationId}>{s.organizationName}</option>)}</select>
    </label>;
  return { organizationId, selection };
}
