import { useEffect, useRef, useState } from 'react';
import { requestServiceHandoff } from '@o4o/auth-react';
import { api } from '../../lib/apiClient';

/** Membership is read for the selected store; destination APIs recheck the current store. */
export function MyHomeBusinessEntry({ businessKey, organizationId, hasCommunity }: { businessKey: string; organizationId: string; hasCommunity: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    const reset = () => { generation.current++; pending.current = false; setBusy(false); };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) reset(); };
    window.addEventListener('pageshow', restore);
    const invalidate = () => { generation.current++; };
    return () => { invalidate(); window.removeEventListener('pageshow', restore); };
  }, []);
  const open = async (destination: 'community' | 'supply' | 'contents') => {
    if (pending.current) return;
    pending.current = true;
    const request = ++generation.current;
    setBusy(true); setError(false);
    const key = encodeURIComponent(businessKey);
    const target = destination === 'community'
      ? { serviceKey: 'kpa-society', origin: 'https://pharmacy.neture.co.kr', returnPath: `${businessKey === 'pharmacy' ? '/' : `/businesses/${key}`}?store=${encodeURIComponent(organizationId)}` }
      : { workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: destination === 'supply' ? `/store/pharmacy/supply?source=${encodeURIComponent(`sf:${businessKey}`)}` : `/store/pharmacy/contents?business=${key}` };
    try {
      const href = await requestServiceHandoff(api, target);
      if (request === generation.current) window.location.assign(href);
    } catch {
      if (request !== generation.current) return;
      pending.current = false; setBusy(false); setError(true);
    }
  };
  return <div className="mt-2">
    <div className="flex flex-wrap gap-2">
      {([
        ...(hasCommunity ? [['community', '가입자 공간']] : []),
        ['supply', '공급 상품'], ['contents', '자료 가져오기'],
      ] as ['community' | 'supply' | 'contents', string][]).map(([destination, label]) =>
        <button key={destination} type="button" disabled={busy} onClick={() => void open(destination)} className="min-h-11 rounded-lg border px-3 py-2 text-sm text-blue-700 disabled:opacity-50">{label}</button>)}
    </div>
    {busy && <p role="status" className="mt-2 text-xs text-slate-500">이동 중…</p>}
    {error && <p role="alert" className="mt-2 text-sm text-amber-900">이동하지 못했습니다. 이용 상태를 확인하고 다시 시도해 주세요.</p>}
  </div>;
}
