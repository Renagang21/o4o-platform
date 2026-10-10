import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, MessageSquare, Megaphone } from 'lucide-react';
import type { ForumPostResponse } from '@o4o/types/forum';
import { useAuth, authClient } from '../../contexts/AuthContext';
import { useBusiness } from './BusinessWorkspace';
import BusinessStoreShortcut from './BusinessStoreShortcut';
import { businessApi, businessError, businessPath, communityApiBase, pharmacyApiBase, type BusinessContent } from './api';

interface LoadedSection<T> { scope: string; data: T[]; error: string; loading: boolean }
const pending = <T,>(scope: string): LoadedSection<T> => ({ scope, data: [], error: '', loading: true });
const isNotice = (post: ForumPostResponse) => post.isPinned || post.type === 'announcement';

export default function PharmacyMemberHomePage() {
  const { business, access } = useBusiness();
  const { user } = useAuth();
  const scope = `${user?.id}:${business.key}:${business.communityKey}:${access?.allowed}:${access?.canManage}`;
  const [posts, setPosts] = useState<LoadedSection<ForumPostResponse>>(() => pending(scope));
  const [materials, setMaterials] = useState<LoadedSection<BusinessContent>>(() => pending(scope));
  const [retryPosts, setRetryPosts] = useState(0);
  const [retryMaterials, setRetryMaterials] = useState(0);
  useEffect(() => {
    let alive = true;
    setPosts(pending(scope));
    if (!access?.allowed || !business.communityKey) return;
    void authClient.api.get(`${communityApiBase(business.communityKey)}/forum/posts`, { params: { page: 1, limit: 20, sortBy: 'latest' } })
      .then((response: { data: { data: ForumPostResponse[] } }) => { if (alive) setPosts({ scope, data: response.data.data, error: '', loading: false }); })
      .catch((error: unknown) => { if (alive) setPosts({ scope, data: [], error: businessError(error), loading: false }); });
    return () => { alive = false; };
  }, [scope, retryPosts]);
  useEffect(() => {
    let alive = true;
    setMaterials(pending(scope));
    if (!access?.allowed || access.canManage) return;
    void businessApi.get<{ items: BusinessContent[] }>(`${pharmacyApiBase}/store/contents`, { sf: business.key, page: 1, limit: 3 })
      .then(data => { if (alive) setMaterials({ scope, data: data.items.filter(item => item.semiFranchiseKey === business.key), error: '', loading: false }); })
      .catch(error => { if (alive) setMaterials({ scope, data: [], error: businessError(error), loading: false }); });
    return () => { alive = false; };
  }, [scope, retryMaterials]);
  const currentPosts = posts.scope === scope ? posts : pending<ForumPostResponse>(scope);
  const currentMaterials = materials.scope === scope ? materials : pending<BusinessContent>(scope);
  const forumPath = businessPath(business.key, 'forum');
  const materialsPath = businessPath(business.key, 'materials');
  const membershipPath = businessPath(business.key, 'participation');
  const notices = currentPosts.data.filter(isNotice).slice(0, 3);
  const conversations = currentPosts.data.filter(post => !isNotice(post)).slice(0, 5);
  return <div className="space-y-6">
    <section aria-labelledby="member-home-title" className="overflow-hidden rounded-2xl bg-slate-900 text-white">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.7fr_1fr] lg:gap-12">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide text-blue-200">O4O 약국 경영지원 · 회원 커뮤니티</p>
          <h1 id="member-home-title" className="text-2xl font-bold leading-snug sm:text-3xl">함께 나누는 경험,<br />더 나은 약국 경영</h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-200">약국 운영의 소식과 경험을 함께 나눕니다.<br className="hidden sm:block" /> 공지와 회원들의 이야기를 확인하고, 필요한 사업 자료를 찾아보세요.</p>
        </div>
        <aside aria-label="나의 업무 바로가기" className="rounded-xl border border-white/20 bg-white/10 p-5">
          <h2 className="font-semibold">{access?.canManage ? '사업 운영' : '나의 약국 업무'}</h2>
          <p className="mb-4 mt-2 text-sm leading-6 text-slate-200">{access?.canManage ? '참여 약국의 신청과 사업 자료는 운영 화면에서 관리합니다.' : '주문·상품·자료함·사이니지 등 실제 매장 업무는 내 매장에서 이어갑니다.'}</p>
          {access?.canManage ? <Link to="/operator/semi-franchises" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900">사업 운영 · 회원 관리 <ArrowUpRight size={16} aria-hidden="true" /></Link> : <BusinessStoreShortcut />}
        </aside>
      </div>
    </section>
    {!access?.allowed ? <section className="rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">참여 신청 · 이용 안내</h2>
      <p className="my-3 text-sm leading-6 text-slate-600">회원 커뮤니티와 사업 자료는 사업 참여 승인 후 이용할 수 있습니다. 신청 조건과 현재 상태를 확인해 주세요.</p>
      <Link className="font-medium text-blue-700" to={membershipPath}>참여 신청 · 상태 확인 →</Link>
    </section> : <>
      <section aria-labelledby="notices-title" className="rounded-xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6">
        <SectionHeading id="notices-title" icon={<Megaphone size={20} aria-hidden="true" />} title="최근 공지" to={forumPath} linkLabel="게시판 보기" />
        <p className="mb-3 text-xs text-slate-500">최근 게시글 중 상단 고정된 글과 공지를 먼저 확인하세요.</p>
        {!business.communityKey ? <p className="py-3 text-sm text-slate-500">게시판이 아직 개설되지 않았습니다.</p> :
          <DataState state={currentPosts} retry={() => setRetryPosts(n => n + 1)} empty={!notices.length} emptyText="최근 목록에 등록된 공지가 없습니다.">
            <PostRows posts={notices} base={forumPath} notice />
          </DataState>}
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="conversations-title" className="rounded-xl border bg-white p-5 sm:p-6">
          <SectionHeading id="conversations-title" icon={<MessageSquare size={20} aria-hidden="true" />} title="회원들의 이야기" to={forumPath} linkLabel="전체 게시글" />
          {!business.communityKey ? <p className="py-3 text-sm text-slate-500">게시판이 아직 개설되지 않았습니다.</p> :
            <DataState state={currentPosts} retry={() => setRetryPosts(n => n + 1)} empty={!conversations.length} emptyText="최근 목록에 회원 게시글이 없습니다.">
              <PostRows posts={conversations} base={forumPath} />
            </DataState>}
          <Link to={`${forumPath}/write`} className="mt-4 inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-medium text-blue-700">이야기 나누기</Link>
        </section>
        <section aria-labelledby="materials-title" className="rounded-xl border bg-white p-5 sm:p-6">
          <SectionHeading id="materials-title" icon={<BookOpen size={20} aria-hidden="true" />} title="사업 자료" to={materialsPath} linkLabel="전체 자료" />
          {access.canManage ? <div className="py-3 text-sm leading-6 text-slate-600"><p>자료 등록과 게시 상태는 사업 운영 화면에서 확인합니다.</p><Link to="/operator/semi-franchises" className="mt-3 inline-block text-blue-700">사업 자료 관리 →</Link></div> :
            <DataState state={currentMaterials} retry={() => setRetryMaterials(n => n + 1)} empty={!currentMaterials.data.length} emptyText="등록된 사업 자료가 없습니다.">
              <ul className="divide-y">{currentMaterials.data.map(item => <li key={item.id} className="py-4">
                <Link className="font-medium text-slate-900 hover:text-blue-700" to={`${materialsPath}?content=${encodeURIComponent(item.id)}`}>{item.title}</Link>
                {item.summary && <p className="mt-2 text-sm leading-6 text-slate-500">{item.summary}</p>}
              </li>)}</ul>
            </DataState>}
        </section>
      </div>
    </>}
    <nav aria-label="회원 지원" className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-5 text-sm text-slate-600">
      <Link to={membershipPath}>내 참여 상태</Link>
      <Link to={businessPath(business.key, 'tools')}>업무 바로가기</Link>
      <Link to="/contact">Contact Us · 문의하기</Link>
      {access?.allowed && <Link to={`${forumPath}/owned`}>내 게시판 · 개설 신청</Link>}
      {access?.canManage && <Link to={`${forumPath}/manage`}>게시판 운영</Link>}
    </nav>
  </div>;
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
      {!notice && <span>{post.author?.nickname || post.author?.name || '참여자'}</span>}
      <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</time>
      {!notice && <span>댓글 {post.commentCount}</span>}
    </p>
  </li>)}</ul>;
}
