import { useState } from 'react';
import { O4OHomeButton, requestServiceHandoff } from '@o4o/auth-react';
import { useBusiness } from './BusinessWorkspace';
import { useAuth, authClient } from '../../contexts/AuthContext';

export default function BusinessToolsPage() {
  const { access } = useBusiness();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const enterStore = async () => {
    setBusy(true); setError('');
    try { window.location.assign(await requestServiceHandoff(authClient.api, { workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: '/store' })); }
    catch { setError('내 매장으로 이동하지 못했습니다. 매장 소속과 승인 상태를 확인해 주세요.'); setBusy(false); }
  };
  const { isAuthenticated, isLoading } = useAuth();
  if (!access?.allowed) return <p>사업 참여 승인 후 업무 도구를 이용할 수 있습니다.</p>;
  return <section><h2 className="text-lg font-semibold">업무 도구</h2>
    {error && <p role="alert" className="mt-4">{error}</p>}
    <ul className="mt-4 space-y-4">
      <li><button disabled={busy} className="text-blue-700" onClick={enterStore}>내 매장 업무 · 자료함 · 태블릿 · 사이니지</button></li>
      <li><O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} label="O4O AI 업무 시작" className="o4o-home-link" /></li>
      {access.canManage && <li><a className="text-blue-700" href="/operator/semi-franchises">사업 운영 · 참여 약국 관리</a></li>}
    </ul>
  </section>;
}
