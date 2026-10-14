import { useState } from 'react';
import { requestServiceHandoff } from '@o4o/auth-react';
import { authClient } from '../../contexts/AuthContext';

/** Existing Store handoff verifies organization access and carries the current login. */
export default function BusinessStoreShortcut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enterStore = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      window.location.assign(await requestServiceHandoff(authClient.api, {
        workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: '/store',
      }));
    } catch {
      setError('내 매장으로 이동하지 못했습니다. 매장 소속과 승인 상태를 확인해 주세요.');
      setBusy(false);
    }
  };
  return <div>
    <button type="button" disabled={busy} onClick={() => void enterStore()}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
      {busy ? '내 매장으로 이동 중…' : '내 매장으로'} <span aria-hidden="true">↗</span>
    </button>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}
