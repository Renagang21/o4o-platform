import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { businessApi } from './api';

type Store = { organizationId: string; organizationName: string; memberRole: string };

/** Select an accessible management unit before reading or changing its business enrollment. */
export function BusinessParticipationStore({ children }: Readonly<{
  children: (organizationId: string, onBusyChange: (busy: boolean) => void) => ReactNode;
}>) {
  const [params] = useSearchParams();
  const location = useLocation(), navigate = useNavigate();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pendingStore, setPendingStore] = useState<string | null>(null);
  const requested = params.get('store');
  const selected = requested ? stores?.find(store => store.organizationId === requested)?.organizationId : stores?.length === 1 ? stores[0].organizationId : undefined;
  // History navigation unmounts the old form; its pending marker must not lock a later visit.
  useLayoutEffect(() => { setPendingStore(null); }, [selected]);
  useEffect(() => {
    let alive = true;
    setStores(null); setError(false);
    void businessApi.get<{ stores: Store[] }>('/work-scope/accessible-stores')
      .then(data => {
        if (!Array.isArray(data?.stores) || !data.stores.every(store => typeof store.organizationId === 'string' && typeof store.organizationName === 'string' && typeof store.memberRole === 'string')) throw new Error('Invalid store list');
        if (alive) setStores(data.stores.filter(store => ['owner', 'admin', 'manager'].includes(store.memberRole)));
      })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [retry]);
  if (error) return <section className="rounded-xl border bg-white p-6"><p role="alert">약국 목록을 확인하지 못했습니다. 가입 상태는 아직 확인되지 않았습니다.</p><button type="button" className="min-h-11 text-blue-700" onClick={() => setRetry(value => value + 1)}>약국 목록 다시 확인</button></section>;
  if (!stores) return <p role="status">가입 상태를 확인할 약국을 불러오고 있습니다…</p>;
  if (!stores.length) return <section className="rounded-xl border bg-white p-6"><p>가입 신청·탈퇴는 해당 약국의 경영 권한이 필요합니다.</p><a className="inline-flex min-h-11 items-center text-blue-700" href="https://store.neture.co.kr/start-pharmacy">내 매장 신청 · 소속 확인</a></section>;
  return <>
    <label className="mb-4 block">가입 상태를 확인할 약국
      <select aria-label="가입 상태를 확인할 약국" disabled={pendingStore === selected} className="mt-2 block w-full rounded-lg border bg-white p-3" value={selected ?? ''} onChange={event => {
        const value = event.target.value;
        const next = new URLSearchParams(params);
        if (value) next.set('store', value); else next.delete('store');
        void navigate({ pathname: location.pathname, search: next.toString(), hash: location.hash });
      }}><option value="">약국을 선택해 주세요</option>{stores.map(store => <option key={store.organizationId} value={store.organizationId}>{store.organizationName}</option>)}</select>
    </label>
    {selected ? children(selected, busy => setPendingStore(busy ? selected : null)) : <p role="status">가입 상태를 확인할 약국을 선택해 주세요.</p>}
  </>;
}
