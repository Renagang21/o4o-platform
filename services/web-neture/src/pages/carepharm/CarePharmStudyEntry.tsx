import { useEffect, useRef, useState } from 'react';
import { requestServiceHandoff } from '@o4o/auth-react';
import { useAuth } from '../../contexts';
import { api } from '../../lib/apiClient';
import { MAIN_ORIGIN } from '../../lib/hostIdentity';

/** Study owns course publishing, enrollment and access; this entry only preserves the account session. */
export default function CarePharmStudyEntry() {
  const { user, isAuthenticated } = useAuth();
  return <StudyEntry key={user?.id ?? 'guest'} authenticated={isAuthenticated} />;
}
function StudyEntry({ authenticated }: { authenticated: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  const moving = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const enter = async () => {
    if (!authenticated) {
      // Service entry owns login and resumes the Study handoff on its own host.
      window.location.assign(`${MAIN_ORIGIN}/service-entry/lecture?returnPath=%2F`);
      return;
    }
    if (moving.current) return;
    moving.current = true; setBusy(true); setError('');
    try {
      const href = await requestServiceHandoff(api, { serviceKey: 'lecture', origin: 'https://study.neture.co.kr', returnPath: '/' });
      if (active.current) window.location.assign(href);
    } catch { if (active.current) setError('Study로 이동하지 못했습니다. 다시 시도해 주세요.'); }
    finally { if (active.current) { moving.current = false; setBusy(false); } }
  };
  return <section aria-label="Study 교육 연결" className="my-4 rounded-lg border border-teal-100 bg-teal-50 p-4 text-sm">
    <p>교육은 Study에서 이용합니다. 강의별 수강 안내를 확인해 주세요.</p>
    <button type="button" disabled={busy} onClick={() => void enter()} className="mt-3 rounded border border-teal-700 px-4 py-2 text-teal-900 disabled:opacity-50">{busy ? 'Study로 이동 중…' : 'Study 교육으로 이동'}</button>
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </section>;
}
