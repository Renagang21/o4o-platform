import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ForumPostContent } from '@o4o/shared-space-ui';
import { api } from '../../lib/apiClient';

interface PublicPost { id: string; slug: string; title: string; excerpt?: string; content?: unknown; createdAt: string; boardName: string }
interface Result { name: string; items?: PublicPost[]; post?: PublicPost; hasNext?: boolean }

export default function CommunityPublicPostsPage() {
  const { communityKey = '', slug } = useParams();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const scope = `${communityKey}:${slug ?? ''}:${page}:${retry}`;
  const [loadedScope, setLoadedScope] = useState('');
  const base = `/communities/${encodeURIComponent(communityKey)}/public`;
  useEffect(() => {
    let alive = true;
    setResult(null); setError(''); setLoadedScope('');
    api.get(`${base}/posts${slug ? `/${encodeURIComponent(slug)}` : ''}`, { params: slug ? undefined : { page } })
      .then((r: { data: { data: Result } }) => { if (alive) { setResult(r.data.data); setLoadedScope(scope); } })
      .catch((e: { response?: { status?: number } }) => { if (alive) { setError(e.response?.status === 404 ? '공개된 커뮤니티 또는 게시글을 찾을 수 없습니다.' : '공개 게시글을 불러오지 못했습니다.'); setLoadedScope(scope); } });
    return () => { alive = false; };
  }, [scope, base, slug, page]);
  const current = loadedScope === scope ? result : null;
  const currentError = loadedScope === scope ? error : '';
  return <main className="mx-auto max-w-4xl px-4 py-8 [overflow-wrap:anywhere]">
    <Link to="/" className="text-sm text-blue-700">커뮤니티 홈</Link>
    <h1 className="mt-4 text-2xl font-semibold">{current?.post?.title ?? `${current?.name ?? '커뮤니티'} · 공개 게시글`}</h1>
    <p className="mt-3 text-sm text-slate-600">운영자가 공개 지정한 글만 볼 수 있습니다. 회원 활동과 댓글은 가입 승인 후 회원 게시판에서 이용해 주세요.</p>
    <Link to={`/communities/${encodeURIComponent(communityKey)}/forum`} className="mt-3 inline-block text-sm text-blue-700">회원 게시판 · 이용 자격 확인 →</Link>
    {loadedScope !== scope && <output className="mt-6 block" aria-live="polite">공개 게시글을 불러오고 있습니다…</output>}
    {currentError && <div className="mt-6" role="alert"><p>{currentError}</p><button type="button" className="mt-3 min-h-11 text-blue-700" onClick={() => setRetry(n => n + 1)}>다시 시도</button></div>}
    {current?.post ? <article className="mt-6 rounded-xl border bg-white p-5">
      <p className="mb-4 text-sm text-slate-500">{current.post.boardName} · {new Date(current.post.createdAt).toLocaleDateString('ko-KR')}</p>
      <ForumPostContent content={current.post.content} />
      <Link className="mt-6 inline-block text-sm text-blue-700" to={base}>공개 글 목록</Link>
    </article> : current && <>
      <ul className="mt-6 divide-y rounded-xl border bg-white px-5">{current.items?.map(post => <li key={post.id} className="py-4">
        <Link to={`${base}/post/${encodeURIComponent(post.slug)}`} className="font-medium text-slate-900 hover:text-blue-700">{post.title}</Link>
        <p className="mt-2 text-sm text-slate-500">{post.boardName} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}</p>
        {post.excerpt && <p className="mt-2 text-sm text-slate-600">{post.excerpt}</p>}
      </li>)}</ul>
      {!current.items?.length && <p className="mt-5">현재 공개된 게시글이 없습니다.</p>}
      <nav aria-label="공개 글 페이지" className="mt-5 flex flex-wrap gap-4">
        <button type="button" className="min-h-11 text-blue-700 disabled:text-slate-400" disabled={page === 1} onClick={() => setPage(n => n - 1)}>이전</button>
        <span className="self-center">{page}페이지</span>
        <button type="button" className="min-h-11 text-blue-700 disabled:text-slate-400" disabled={!current.hasNext} onClick={() => setPage(n => n + 1)}>다음</button>
      </nav>
    </>}
  </main>;
}
