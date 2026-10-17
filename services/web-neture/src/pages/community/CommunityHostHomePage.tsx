import { ServiceHomeHero, ServiceHomePromotion } from '@o4o/shared-space-ui';
import { Link } from 'react-router-dom';
import CommunityWorkspacePage from './CommunityWorkspacePage';

/** One service home, not a directory of former service communities. */
export default function CommunityHostHomePage() {
  return <>
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <p className="text-2xl font-semibold">커뮤니티</p>
      <p className="mt-3 text-slate-600">정보와 경험을 나누는 커뮤니티 서비스입니다.</p>
      <div className="mt-6"><ServiceHomeHero surface="community" client={api} heading="h2" /></div>
      <Link to="/communities/community/public" className="mt-4 inline-block min-h-11 text-blue-700">공개 게시글 보기 →</Link>
    </section>
    <CommunityWorkspacePage />
    <div className="mx-auto max-w-6xl px-4"><ServiceHomePromotion surface="community" client={api} /></div>
  </>;
}
import { api } from '../../lib/apiClient';
