import { useEffect, useRef, useState } from 'react';
import { requestServiceHandoff } from '@o4o/auth-react';
import { authClient } from '../../contexts/AuthContext';

/** Existing Store handoff verifies organization access and carries the current login. */
export default function BusinessStoreShortcut({ businessKey, contentId }: { businessKey?: string; contentId?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const pending = useRef(false);
  const materialPath = businessKey
    ? `/store/pharmacy/contents?${new URLSearchParams({ business: businessKey, ...(contentId ? { content: contentId } : {}) })}`
    : '/store';
  const returnPath = businessKey ? `/select-store?returnTo=${encodeURIComponent(materialPath)}` : materialPath;
  useEffect(() => {
    const reset = () => { generation.current++; pending.current = false; setBusy(false); setError(''); };
    reset();
    const restore = (event: PageTransitionEvent) => { if (event.persisted) reset(); };
    window.addEventListener('pageshow', restore);
    const invalidate = () => { generation.current++; };
    return () => { invalidate(); window.removeEventListener('pageshow', restore); };
  }, [returnPath]);
  const enterStore = async () => {
    if (pending.current) return;
    pending.current = true;
    const request = ++generation.current;
    setBusy(true); setError('');
    try {
      const href = await requestServiceHandoff(authClient.api, {
        workspace: 'store', origin: 'https://store.neture.co.kr', returnPath,
      });
      if (request === generation.current) window.location.assign(href);
    } catch {
      if (request !== generation.current) return;
      setError('내 매장으로 이동하지 못했습니다. 매장 소속과 승인 상태를 확인해 주세요.');
      pending.current = false; setBusy(false);
    }
  };
  return <div>
    <button type="button" disabled={busy} onClick={() => void enterStore()}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
      {busy ? '내 매장으로 이동 중…' : businessKey ? '내 매장으로 자료 가져오기' : '내 매장으로'} <span aria-hidden="true">↗</span>
    </button>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}
