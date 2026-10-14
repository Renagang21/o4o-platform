import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useLoginModal } from '../../contexts';
import { api } from '../../lib/apiClient';
import type { CommunityWorkspace } from '../community/CommunityWorkspacePage';

/** A branded entry to an existing community, not a new membership or permission system. */
export default function CarePharmHomePage() {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [workspace, setWorkspace] = useState<CommunityWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setWorkspace(null);
    api.get('/communities').then((r: { data: { data: { communities: CommunityWorkspace[] } } }) => {
      if (active) setWorkspace(r.data.data.communities.find(c => c.communityKey === 'carepharm' && c.kind === 'independent') ?? null);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, retry]);

  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
    <section className="rounded-3xl bg-teal-950 px-6 py-12 text-white sm:px-12 sm:py-16">
      <p className="text-sm font-semibold tracking-widest text-teal-200">CarePharm</p>
      <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-5xl">만성질환 관리,<br />약국이 함께합니다</h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-teal-100">만성질환 관리에 함께하는 약국들이 현장의 경험과 자료를 나누고 협업하는 공간입니다.</p>
      {!isAuthenticated && <button type="button" onClick={() => openLoginModal('/')}
        className="mt-8 min-h-11 rounded-xl bg-white px-6 py-3 font-semibold text-teal-950">로그인하기</button>}
    </section>

    <section aria-labelledby="carepharm-activities" className="mt-12">
      <h2 id="carepharm-activities" className="text-2xl font-semibold text-slate-900">함께 나누는 활동</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ['현장 경험', '약국에서 만나는 만성질환 관리 경험과 고민을 나눕니다.'],
          ['자료 공유', '복약 상담과 지속적인 건강 관리에 도움이 되는 자료를 함께 살펴봅니다.'],
          ['약국 협업', '참여 약국 간 교류를 이어가며 모임의 활동을 함께 만들어갑니다.'],
        ].map(([title, description]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-teal-900">{title}</h3>
          <p className="mt-3 leading-7 text-slate-600">{description}</p>
        </article>)}
      </div>
    </section>

    <section aria-labelledby="carepharm-entry" className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 id="carepharm-entry" className="text-2xl font-semibold text-slate-900">모임 참여</h2>
      {loading ? <p role="status" className="mt-4 text-slate-600">모임 참여 안내를 확인하고 있습니다…</p>
        : error ? <div className="mt-4"><p role="alert">모임 참여 안내를 불러오지 못했습니다.</p>
          <button type="button" onClick={() => setRetry(n => n + 1)} className="mt-3 min-h-11 text-teal-800 underline">다시 시도</button></div>
        : workspace ? <>
          <p className="mt-4 text-slate-600">{workspace.allowed ? '참여 중인 모임에서 소식과 자료를 확인하세요.' : workspace.membershipStatus === 'pending' ? '참여 신청을 확인하고 있습니다. 승인 후 회원 활동을 이용할 수 있습니다.' : '모임 공간에서 참여 자격과 신청 절차를 확인하세요.'}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/communities/carepharm/forum" className="min-h-11 rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white">{workspace.allowed ? '모임 공간으로' : '참여 안내 보기'}</Link>
            <Link to="/communities/carepharm/public" className="min-h-11 rounded-xl border border-teal-800 px-5 py-3 font-semibold text-teal-800">공개 소식 보기</Link>
          </div>
        </> : <p className="mt-4 text-slate-600">모임 참여 안내를 준비하고 있습니다. 안내가 열리면 이곳에서 확인하실 수 있습니다.</p>}
    </section>
  </div>;
}
