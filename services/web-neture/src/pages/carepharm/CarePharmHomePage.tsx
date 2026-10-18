import { useEffect } from 'react';
import './carepharm-home.css';
import { Link, useLocation } from 'react-router-dom';
import { COOPERATION_MODELS, CooperationMemberSpace, ServiceHomeHero, ServiceHomePromotion, type CooperationView } from '@o4o/shared-space-ui';
import { requestServiceHandoff } from '@o4o/auth-react';
import { useAuth, useLoginModal } from '../../contexts';
import { api } from '../../lib/apiClient';

/** Public introduction stays available independently of the protected member workspace. */
export default function CarePharmHomePage({ view = 'home' }: { view?: CooperationView }) {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const location = useLocation();
  useEffect(() => {
    if (view === 'home' && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView?.();
  }, [view, location.hash, location.key]);
  const memberSpace = <CooperationMemberSpace model={COOPERATION_MODELS.carepharm} client={api}
    accountId={isAuthenticated ? user?.id : undefined} view={view}
    onLogin={() => openLoginModal(location.pathname + location.search)}
    onEnterStore={() => requestServiceHandoff(api, {
      workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: `/select-store?returnTo=${encodeURIComponent(COOPERATION_MODELS.carepharm.storePath)}`,
    })} />;
  if (view !== 'home') return memberSpace;
  return <div className="carepharm-home">
    <ServiceHomeHero surface="carepharm" client={api} eyebrow="CarePharm" title={['약국이 함께하는 만성질환 협업']} description={['현장의 경험과 자료를 나누고, 우리 약국의 경영에 활용합니다.']} />
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-8">
      <section id="about" aria-labelledby="carepharm-about" className="scroll-mt-24">
        <p className="text-sm font-semibold text-teal-700">CarePharm 소개</p>
        <h2 id="carepharm-about" className="mt-2 text-2xl font-semibold text-slate-900">함께 나누고, 내 약국에서 활용합니다</h2>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">만성질환관리 사업자와 가입 약국이 소식과 사업 자료를 함께 나누는 공동공간입니다. 협업체 참여는 이곳에서 신청하고, 승인된 약국의 업무는 내 매장에서 이용합니다.</p>
        <Link to="/my/participation" className="mt-5 inline-flex rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white">참여 안내 보기</Link>
      </section>
      <section id="news" aria-labelledby="carepharm-news" className="scroll-mt-24 border-t border-slate-200 pt-8">
        <h2 id="carepharm-news" className="text-xl font-semibold text-slate-900">공지·안내</h2>
        <p className="mb-5 mt-2 text-sm leading-6 text-slate-600">협업체 운영자가 게시한 소식과 참여 안내를 확인하세요.</p>
        <ServiceHomePromotion surface="carepharm" client={api} publishedOnly />
      </section>
      <section aria-label="회원 서비스" className="rounded-2xl border border-slate-200 bg-white">{memberSpace}</section>
    </div>
  </div>;
}
