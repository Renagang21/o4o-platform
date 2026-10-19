import './pharmacy-member-home.css';
import { BUSINESS_SITE } from '../../config/businessSite';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, BookOpen, MessageSquare, Megaphone } from 'lucide-react';
import type { ForumPostResponse } from '@o4o/types/forum';
import { useAuth, authClient } from '../../contexts/AuthContext';
import { useBusiness } from './BusinessWorkspace';
import BusinessHomeFeature from './BusinessHomeFeature';
import { BusinessHomeShowcase } from '@o4o/shared-space-ui';
import { useBusinessMaterialStore } from './useBusinessMaterialStore';
import { businessError, businessPath, communityApiBase } from './api';

interface LoadedSection<T> { scope: string; data: T[]; error: string; loading: boolean }
const pending = <T,>(scope: string): LoadedSection<T> => ({ scope, data: [], error: '', loading: true });
const isNotice = (post: ForumPostResponse) => post.isPinned || post.type === 'announcement';
const isRecentNotice = (post: ForumPostResponse) => !post.isPinned && post.type === 'announcement';

export default function PharmacyMemberHomePage() {
  const { business, access } = useBusiness();
  const { user } = useAuth();
  const { hash, key: locationKey } = useLocation();
  useEffect(() => {
    if (!['#business-news', '#business-products'].includes(hash)) return;
    // Let the header's navigation effect close the mobile drawer before measuring.
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(hash.slice(1));
        if (!target) return;
        const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
        target.style.scrollMarginTop = `${Math.max(112, Math.ceil(headerHeight) + 16)}px`;
        target.scrollIntoView?.({ block: 'start' });
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, locationKey, access?.allowed, business.key]);
  const materialStore = useBusinessMaterialStore(!!access?.allowed && !access.canManage, business.key, '상품·자료를 이용할 약국');
  const scope = `${user?.id}:${materialStore.organizationId}:${business.key}:${business.communityKey}:${access?.allowed}:${access?.canManage}`;
  const [posts, setPosts] = useState<LoadedSection<ForumPostResponse>>(() => pending(scope));
  const [noticesState, setNoticesState] = useState<LoadedSection<ForumPostResponse>>(() => pending(scope));
  const [retryPosts, setRetryPosts] = useState(0);
  useEffect(() => {
    let alive = true;
    setPosts(pending(scope));
    setNoticesState(pending(scope));
    if (!access?.allowed || !business.communityKey) return;
    void authClient.api.get(`${communityApiBase(business.communityKey)}/forum/posts`, { params: { page: 1, limit: 20, sortBy: 'latest' } })
      .then((response: { data: { data: ForumPostResponse[] } }) => { if (alive) setPosts({ scope, data: response.data.data, error: '', loading: false }); })
      .catch((error: unknown) => { if (alive) setPosts({ scope, data: [], error: businessError(error), loading: false }); });
    void Promise.all([
      authClient.api.get(`${communityApiBase(business.communityKey)}/forum/posts`, { params: { page: 1, limit: 3, sortBy: 'latest', isPinned: 'true' } }),
      authClient.api.get(`${communityApiBase(business.communityKey)}/forum/posts`, { params: { page: 1, limit: 5, sortBy: 'latest', isPinned: 'false', type: 'announcement' } }),
    ]).then(([pinned, recent]) => {
      if (alive) setNoticesState({ scope, data: [...pinned.data.data, ...recent.data.data], error: '', loading: false });
    }).catch(error => { if (alive) setNoticesState({ scope, data: [], error: businessError(error), loading: false }); });
    return () => { alive = false; };
  }, [scope, access?.allowed, business.communityKey, retryPosts]);
  const currentPosts = posts.scope === scope ? posts : pending<ForumPostResponse>(scope);
  const currentNotices = noticesState.scope === scope ? noticesState : pending<ForumPostResponse>(scope);
  const forumPath = businessPath(business.key, 'forum');
  const materialsPath = businessPath(business.key, 'materials');
  const membershipPath = businessPath(business.key, 'participation');
  const pinnedNotices = currentNotices.data.filter(post => post.isPinned).slice(0, 3);
  const recentNotices = currentNotices.data.filter(isRecentNotice).slice(0, 5);
  const conversations = currentPosts.data.filter(post => !isNotice(post)).slice(0, 5);
  const canManageHere = !!access?.canManage && business.key === BUSINESS_SITE.key;
  const businessName = business.name === 'pharmacy' ? 'O4O 약국 경영지원' : business.name;
  const selectedMaterialsPath = materialsPath + (materialStore.organizationId ? `?store=${encodeURIComponent(materialStore.organizationId)}` : '');
  const showConversations = !!business.communityKey && (currentPosts.loading || !!currentPosts.error || conversations.length > 0);
  return <div className="pharmacy-member-home space-y-8">
    <header className="member-home-heading border-b border-slate-200 pb-5">
      <p className="text-xs font-semibold tracking-wide text-blue-700">{businessName} · 협력약국 공간</p>
      <h1 id="member-home-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">약국에 필요한 소식과 자료</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">본부가 전하는 소식부터 제품 정보, 회원 약국의 이야기까지 확인하세요.</p>
    </header>
    {!access?.allowed ? <section className="rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">참여 신청 · 이용 안내</h2>
      <p className="my-3 text-sm leading-6 text-slate-600">사업 소식과 운영 자료는 참여 승인 후 이용할 수 있습니다. 신청 조건과 현재 상태를 확인해 주세요.</p>
      <Link className="font-medium text-blue-700" to={membershipPath}>참여 신청 · 상태 확인 →</Link>
    </section> : <>
      <section id="business-news" aria-labelledby="notices-title" className="scroll-mt-28 space-y-4">
        <SectionHeading id="notices-title" icon={<Megaphone size={20} aria-hidden="true" />} title="사업 소식" to={forumPath} linkLabel="게시판에서 보기" />
        {business.communityKey && <NoticeContent state={currentNotices} pinned={pinnedNotices} recent={recentNotices} forumPath={forumPath} retry={() => setRetryPosts(n => n + 1)} />}
        <BusinessHomeFeature key={scope} businessKey={business.key} />
      </section>
      <section aria-labelledby="materials-title" className="space-y-4">
        <SectionHeading id="materials-title" icon={<BookOpen size={20} aria-hidden="true" />} title="약국 운영 자료" to={selectedMaterialsPath} linkLabel="전체 자료" />
        <p className="text-sm leading-6 text-slate-600">본부가 제공하는 콘텐츠를 살펴보고, 사용할 자료는 내 매장에서 사본으로 가져오세요.</p>
        {materialStore.selection}
        {access.canManage && <p className="text-sm text-slate-600">자료의 작성·검토·게시는 {canManageHere ? <Link to={`/operator/semi-franchises?key=${encodeURIComponent(business.key)}&tab=contents`} className="text-blue-700">사업 자료 관리 →</Link> : '해당 사업의 담당 운영 화면'}에서 진행합니다.</p>}
      </section>
      <div id="business-products" className="scroll-mt-28">
        <BusinessHomeShowcase key={scope} client={authClient.api} externalSelection businessKey={business.key} organizationId={materialStore.organizationId} accountId={user?.id} operator={!!access.canManage} />
      </div>
      {showConversations && <section aria-labelledby="conversations-title" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <SectionHeading id="conversations-title" icon={<MessageSquare size={20} aria-hidden="true" />} title="회원 약국들의 이야기" to={forumPath} linkLabel="전체 게시글" />
        <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
          <DataState state={currentPosts} retry={() => setRetryPosts(n => n + 1)} empty={false} emptyText="">
            <PostRows posts={conversations} base={forumPath} />
          </DataState>
          <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm leading-6 text-slate-600">궁금한 점을 묻고, 다른 약국에 도움이 될 경험을 나눠 주세요.</p>
            <Link to={`${forumPath}/write`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">이야기 나누기 <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>}
      {!showConversations && business.communityKey && <Link to={`${forumPath}/write`} className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700">회원 게시판에서 이야기를 나눠 주세요 →</Link>}
    </>}
    <nav aria-label="회원 지원" className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200 pt-5 text-sm text-slate-600">
      <Link to="/service-guide">이용 안내</Link>
      <Link to={membershipPath}>내 참여 상태</Link>
      <Link to={businessPath(business.key, 'tools')}>업무 바로가기</Link>
      <Link to="/contact">본부 문의</Link>
      {access?.allowed && <Link to={`${forumPath}/owned`}>내 게시판 · 개설 신청</Link>}
      {canManageHere && <Link to={`/operator/semi-franchises?key=${encodeURIComponent(business.key)}`}>사업 운영 · 회원 관리</Link>}
    </nav>
  </div>;
}

function NoticeContent({ state, pinned, recent, forumPath, retry }: Readonly<{
  state: LoadedSection<ForumPostResponse>; pinned: ForumPostResponse[]; recent: ForumPostResponse[]; forumPath: string; retry: () => void;
}>) {
  if (!state.loading && !state.error && !pinned.length && !recent.length) return null;
  return <DataState state={state} retry={retry} empty={false} emptyText="">
    <div className="grid gap-4 md:grid-cols-2">
      {!!pinned.length && <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5"><h3 className="text-sm font-semibold text-blue-900">중요 공지</h3><PostRows posts={pinned} base={forumPath} notice /></div>}
      {!!recent.length && <div className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-semibold text-slate-900">최근 공지</h3><PostRows posts={recent} base={forumPath} notice /></div>}
    </div>
  </DataState>;
}

function SectionHeading({ id, icon, title, to, linkLabel }: Readonly<{ id: string; icon: ReactNode; title: string; to: string; linkLabel: string }>) {
  return <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
    <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-slate-900">{icon}{title}</h2>
    <Link to={to} className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-blue-700">{linkLabel}<span aria-hidden="true">→</span></Link>
  </div>;
}
function DataState<T>({ state, retry, empty, emptyText, children }: Readonly<{ state: LoadedSection<T>; retry: () => void; empty: boolean; emptyText: string; children: ReactNode }>) {
  if (state.loading) return <output className="block py-4 text-sm text-slate-500" aria-live="polite">불러오고 있습니다…</output>;
  if (state.error) return <div className="py-3 text-sm"><p role="alert" className="text-red-700">{state.error}</p><button type="button" onClick={retry} className="mt-2 min-h-10 text-blue-700">다시 시도</button></div>;
  if (empty) return <p className="py-4 text-sm text-slate-500">{emptyText}</p>;
  return <>{children}</>;
}
function PostRows({ posts, base, notice = false }: Readonly<{ posts: ForumPostResponse[]; base: string; notice?: boolean }>) {
  return <ul className="divide-y divide-slate-200/80">{posts.map(post => <li key={post.id} className="py-3">
    <Link to={`${base}/post/${encodeURIComponent(post.slug)}`} className="block rounded-md text-sm font-medium leading-6 text-slate-900 hover:text-blue-700">
      {notice && <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">공지</span>}{post.title}
    </Link>
    <p className="mt-1 flex flex-wrap gap-x-3 text-xs leading-6 text-slate-500">
      <span>{post.author?.nickname || post.author?.name || '참여자'}</span>
      <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</time>
      {!notice && <span>댓글 {post.commentCount}</span>}
    </p>
  </li>)}</ul>;
}
