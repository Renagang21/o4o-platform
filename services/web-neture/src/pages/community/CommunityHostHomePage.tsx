import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { O4OPublicHero } from '@o4o/auth-react';
import { COMMUNITY_HERO } from '../../config/publicHero';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts';
import type { CommunityWorkspace } from './CommunityWorkspacePage';

export default function CommunityHostHomePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CommunityWorkspace[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    api.get('/communities').then((r: { data: { data: { communities: CommunityWorkspace[] } } }) => { if (active) setRows(r.data.data.communities); })
      .catch(() => { if (active) setError('커뮤니티 목록을 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, [user?.id]);
  return <O4OPublicHero {...COMMUNITY_HERO}
    actions={<Link to="/communities/pharmacy/forum" className="o4o-cta" data-testid="community-hero-primary">약사 커뮤니티 들어가기</Link>}>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {(['independent', 'semi-franchise'] as const).map(kind => <section key={kind} className="mt-6">
      <h2 className="text-base font-semibold">{kind === 'independent' ? '독립 가입 커뮤니티' : '가입한 사업의 회원 커뮤니티'}</h2>
      <ul className="mt-3 divide-y border-y">
        {rows.filter(c => c.kind === kind).map(c => <li key={c.communityKey}>
          <Link to={`/communities/${encodeURIComponent(c.communityKey)}/forum`} className="flex justify-between gap-4 py-4">
            <span><strong className="block">{c.name}</strong><span className="text-sm text-slate-600">{c.allowed ? '참여 가능' : c.membershipStatus === 'pending' ? '승인 대기' : '가입 승인 후 이용'}</span></span><span aria-hidden>→</span>
          </Link>
        </li>)}
      </ul>
      {kind === 'semi-franchise' && !rows.some(c => c.kind === kind) && <p className="mt-3 text-sm text-slate-600">가입 승인된 사업의 커뮤니티가 여기에 표시됩니다.</p>}
    </section>)}
    <Link to="/mypage/communities" className="mt-6 inline-block text-sm text-blue-700">커뮤니티 개설 신청 · 운영</Link>
  </O4OPublicHero>;
}
