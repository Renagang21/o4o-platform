import { useEffect, useRef } from 'react';
import './carepharm-home.css';
import { Link, useLocation } from 'react-router-dom';
import { COOPERATION_EXTENSIONS, CooperationMemberSpace, ServiceHomeHero, type CooperationView } from '@o4o/shared-space-ui';
import { CarePharmNotices } from './CarePharmNotices';
import { CarePharmWorkspaces } from './CarePharmWorkspaces';
import { requestServiceHandoff } from '@o4o/auth-react';
import { useAuth, useLoginModal } from '../../contexts';
import { api } from '../../lib/apiClient';

const extension = COOPERATION_EXTENSIONS.carepharm;

/** The member gate may remount this public slot after loading; restore its anchor then. */
function MemberHomeNews() {
  const { hash } = useLocation();
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hash === '#news') section.current?.scrollIntoView?.({ block: 'start' });
  }, [hash]);
  return <section ref={section} id="news" aria-labelledby="carepharm-member-news" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5">
    <h2 id="carepharm-member-news" className="mb-4 text-xl font-semibold">공지·안내</h2>
    <CarePharmNotices />
  </section>;
}

/** Public introduction stays available independently of the protected member workspace. */
export default function CarePharmHomePage({ view = 'home' }: { view?: CooperationView }) {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const location = useLocation();
  useEffect(() => {
    if (view === 'home' && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView?.();
  }, [view, location.hash, location.key]);
  const memberNews = <MemberHomeNews />;
  const memberSpace = <CooperationMemberSpace model={extension.model} materialsGuide={extension.materials} client={api}
    accountId={isAuthenticated ? user?.id : undefined} view={view} homeNews={isAuthenticated ? memberNews : undefined}
    onLogin={() => openLoginModal(location.pathname + location.search)}
    onEnterStore={() => requestServiceHandoff(api, {
      workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: `/select-store?returnTo=${encodeURIComponent(extension.model.storePath)}`,
    })} />;
  if (view !== 'home') return view === 'tools' ? <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">{memberSpace}<CarePharmWorkspaces /></div> : memberSpace;
  if (isAuthenticated) return <div className="carepharm-home mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
    <header id="about" className="scroll-mt-24 border-b border-slate-200 pb-5">
      <p className="text-sm font-semibold text-teal-700">CarePharm · 협력약국 공간</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">함께 나누고, 내 약국에서 활용합니다</h1>
      <p className="mt-3 text-sm text-slate-600">협업체 참여는 이곳에서 확인하고, 승인된 약국의 업무는 내 매장에서 이용합니다.</p>
    </header>
    {memberSpace}
    <CarePharmWorkspaces />
  </div>;
  return <div className="carepharm-home">
    <ServiceHomeHero surface="carepharm" client={api} eyebrow="CarePharm" title={['관리 자료와 현장 경험을,', '약국의 협업으로']} description={['사업자와 참여 약국이 만성질환 관리 자료와 현장 경험을 나누고, 내 약국에서 활용합니다.']} />
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
        <CarePharmNotices />
      </section>
      <CarePharmWorkspaces />
      <section aria-label="회원 서비스" className="rounded-2xl border border-slate-200 bg-white">{memberSpace}</section>
    </div>
  </div>;
}
