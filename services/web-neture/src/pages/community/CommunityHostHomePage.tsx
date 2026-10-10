import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts';
import type { CommunityWorkspace } from './CommunityWorkspacePage';

export default function CommunityHostHomePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CommunityWorkspace[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(''); setRows([]); setLoading(true);
    api.get('/communities').then((r: { data: { data: { communities: CommunityWorkspace[] } } }) => { if (active) setRows(r.data.data.communities); })
      .catch(() => { if (active) setError('커뮤니티 목록을 불러오지 못했습니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, retry]);
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <h1 className="text-2xl font-semibold">커뮤니티 · 단체활동</h1>
    {loading && <output aria-live="polite" className="mt-6">커뮤니티 목록을 확인하고 있습니다…</output>}
    {error && <div className="mt-6"><p role="alert">{error}</p><button type="button" onClick={() => setRetry(n => n + 1)} className="mt-3 text-blue-700">다시 시도</button></div>}
    <ul className="mt-6 divide-y border-y">
      {rows.filter(c => c.kind === 'independent').map(c => <li key={c.communityKey}>
        <Link to={`/communities/${encodeURIComponent(c.communityKey)}/forum`} className="flex justify-between gap-4 py-4">
          <span><strong className="block">{c.name}</strong><span className="text-sm text-slate-600">{c.allowed ? '참여 가능' : c.membershipStatus === 'pending' ? '승인 대기' : '이용 자격 확인'}</span></span><span aria-hidden>→</span>
        </Link>
      </li>)}
    </ul>
    {!loading && !error && !rows.some(c => c.kind === 'independent') && <p className="mt-4">등록된 커뮤니티가 없습니다.</p>}
    <Link to="/mypage/communities" className="mt-6 inline-block text-sm text-blue-700">커뮤니티 개설 신청 · 운영</Link>
  </div>;
}
