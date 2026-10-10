import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ForumListTemplate, ForumWriteForm, type ForumListItem, type ForumWriteFormPayload } from '@o4o/shared-space-ui';
import { CommentSection, ForumBlockRenderer } from '@o4o/forum-core/public-ui';
import { htmlToBlocks, blocksToHtml } from '@o4o/forum-core/utils';
import type { ForumPostResponse, ForumCommentResponse, ForumCategoryResponse } from '@o4o/types/forum';
import { useAuth, authClient } from '../../contexts/AuthContext';
import { useBusiness } from './BusinessWorkspace';
import { loadBusinessForumData, type ForumView } from './forumData';
import { businessApi, businessPath, businessError, communityApiBase } from './api';

export function BusinessForumBoundary() {
  const context = useBusiness();
  const { business, access } = context;
  if (!business.communityKey) return <p>참여자 게시판이 아직 개설되지 않았습니다.</p>;
  if (!access?.allowed) return <section><p>사업 참여 승인 후 게시판을 이용할 수 있습니다.</p><Link className="text-blue-700" to={businessPath(business.key, 'participation')}>참여 신청 · 상태 확인</Link></section>;
  const base = businessPath(business.key, 'forum');
  return <section>
    <nav aria-label="참여자 게시판" className="mb-5 flex flex-wrap gap-4 text-sm text-blue-700">
      <Link to={base}>게시글</Link><Link to={`${base}/write`}>글쓰기</Link><Link to={`${base}/my-posts`}>내 글</Link>
      <details className="ml-auto"><summary className="cursor-pointer">게시판 관리</summary>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link to={`${base}/owned`}>내 게시판 · 신청</Link>
          <Link to={`${base}/request`}>게시판 개설 신청</Link>
          {access.canManage && <Link to={`${base}/manage`}>게시판 운영</Link>}
        </div>
      </details>
    </nav>
    <Outlet context={context} />
  </section>;
}

export default function BusinessForumPage({ view = 'posts' }: Readonly<{ view?: ForumView }>) {
  const { business, access } = useBusiness();
  const { user } = useAuth();
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const base = businessPath(business.key, 'forum');
  const apiBase = `${communityApiBase(business.communityKey!)}/forum`;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const category = params.get('category') || '';
  const editId = params.get('edit');
  const boardSlug = params.get('board') || '';
  const [posts, setPosts] = useState<ForumListItem[]>([]);
  const [categories, setCategories] = useState<ForumCategoryResponse[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [post, setPost] = useState<ForumPostResponse | null>(null);
  const [commentLimit, setCommentLimit] = useState(20);
  const [commentTotal, setCommentTotal] = useState(0);
  const [comments, setComments] = useState<ForumCommentResponse[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const selectedBoard = categories.find(board => board.id === category || (!!boardSlug && board.slug === boardSlug));
  useEffect(() => {
    let alive = true;
    setError(''); setLoading(true); setPost(null); setPosts([]); setComments([]); setCategories([]);
    void loadBusinessForumData({ apiBase, base, view, slug, editId, page, category, boardSlug, commentLimit },
      boards => { if (alive) setCategories(boards); })
      .then(data => {
        if (!alive) return;
        setPost(data.post ?? null); setComments(data.comments ?? []); setCommentTotal(data.commentTotal ?? 0);
        setPosts(data.posts ?? []); setTotalPages(data.totalPages ?? 1);
      }).catch(e => { if (alive) setError(businessError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [apiBase, base, view, slug, editId, page, category, boardSlug, user?.id, version, commentLimit]);

  const submit = async ({ title, editorHtml }: ForumWriteFormPayload) => {
    setError('');
    try {
      if (editId && post) {
        await authClient.api.put(`${apiBase}/posts/${post.id}`, { title, content: editorHtml });
        navigate(`${base}/post/${encodeURIComponent(post.slug)}`);
      } else {
        const forumId = category || categories[0]?.id;
        if (!forumId) { setError('게시판이 없습니다. 게시판 개설을 신청해 주세요.'); return; }
        const created = await businessApi.post<ForumPostResponse>(`${apiBase}/posts`, { title, content: editorHtml, forumId, type: 'discussion' });
        navigate(created.status === 'pending' ? `${base}/my-posts` : `${base}/post/${encodeURIComponent(created.slug)}`);
      }
    } catch (e) { setError(businessError(e)); }
  };
  const mutate = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); setVersion(n => n + 1); }
    catch (e) { setError(businessError(e)); }
    finally { setBusy(false); }
  };

  if (loading) return <output aria-live="polite">게시판을 불러오고 있습니다…</output>;
  if (error && !post && (view === 'post' || editId)) return <div><p role="alert">{error}</p><button type="button" onClick={() => setVersion(n => n + 1)}>다시 시도</button></div>;
  if (view === 'write') return <div>
    {error && <p role="alert">{error}</p>}
    {!editId && <label className="mb-4 block">게시판 <select className="ml-3 rounded border p-2" value={category || categories[0]?.id || ''} onChange={e => setParams({ category: e.target.value })}>
      {categories.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
    </select></label>}
    {(!editId || post) && <ForumWriteForm key={post?.id ?? category} initialTitle={post?.title} initialContentHtml={postContentHtml(post?.content)}
      onSubmit={submit} onCancel={() => navigate(base)} onInvalid={() => setError('제목과 내용을 입력해 주세요.')} />}
  </div>;
  if (view === 'post' && post) return <BusinessPostArticle post={post} comments={comments} commentTotal={commentTotal}
    userId={user?.id} canManage={access?.canManage === true} apiBase={apiBase} base={base} busy={busy} error={error}
    mutate={mutate} loadMore={() => setCommentLimit(n => n + 20)} />;
  return <div>
    <h2 className="mb-4 text-lg font-semibold">{view === 'mine' ? '내가 쓴 글' : '참여자 게시글'}</h2>
    <label className="mb-4 block">게시판 <select className="ml-3 rounded border p-2" value={category} onChange={e => setParams({ category: e.target.value })}>
      <option value="">전체</option>{categories.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
    </select></label>
    {selectedBoard?.forumType === 'closed' && <div className="mb-4 rounded-lg border p-4"><p>이 게시판은 별도 가입 승인이 필요합니다.</p><button type="button" disabled={busy} onClick={() => void mutate(async () => { await businessApi.post(`${apiBase}/categories/${encodeURIComponent(selectedBoard.id)}/join-requests`, {}); setNotice('게시판 가입 신청을 접수했습니다.'); })} className="mt-2 text-blue-700">게시판 가입 신청</button></div>}
    {notice && <output aria-live="polite" className="mb-4">{notice}</output>}
    <ForumListTemplate posts={posts} currentPage={page} totalPages={totalPages} onPageChange={n => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(n)); return next; })}
      onPostClick={item => navigate(item.routeTo)} error={error} onRetry={() => setVersion(n => n + 1)} />
  </div>;
}


function postContentHtml(content: ForumPostResponse['content'] | undefined): string {
  if (!content) return '';
  return typeof content === 'string' ? content : blocksToHtml(content);
}

interface PostArticleProps {
  post: ForumPostResponse; comments: ForumCommentResponse[]; commentTotal: number; userId?: string; canManage: boolean;
  apiBase: string; base: string; busy: boolean; error: string;
  mutate: (action: () => Promise<unknown>) => Promise<void>; loadMore: () => void;
}
function BusinessPostArticle({ post, comments, commentTotal, userId, canManage, apiBase, base, busy, error, mutate, loadMore }: Readonly<PostArticleProps>) {
  const navigate = useNavigate();
  return <article className="rounded-xl border bg-white p-6">
    {error && <p role="alert">{error}</p>}
    <h2 className="text-xl font-semibold">{post.title}</h2><p className="my-3 text-sm text-slate-500">{post.author?.nickname || post.author?.name || '참여자'} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}</p>
    <ForumBlockRenderer content={typeof post.content === 'string' ? htmlToBlocks(post.content) : post.content} />
    <div className="my-5 flex gap-4 text-sm text-blue-700">
      <button type="button" disabled={busy} onClick={() => void mutate(() => businessApi.post(`${apiBase}/posts/${post.id}/like`, {}))}>좋아요 {post.likeCount}</button>
      {post.authorId === userId && <Link to={`${base}/write?edit=${encodeURIComponent(post.id)}`}>수정</Link>}
      {(post.authorId === userId || canManage) && <button type="button" disabled={busy} onClick={() => { if (window.confirm('이 게시글을 삭제하시겠습니까?')) void mutate(async () => { await authClient.api.delete(`${apiBase}/posts/${post.id}`); navigate(base); }); }}>삭제</button>}
      <Link to={base}>목록</Link>
    </div>
    <fieldset disabled={busy}><CommentSection comments={comments.map(comment => ({ id: comment.id, content: htmlToBlocks(comment.content), authorId: comment.authorId,
      authorName: comment.author?.nickname || comment.author?.name || '참여자', createdAt: comment.createdAt, likeCount: comment.likeCount,
      parentId: comment.parentId ?? undefined, canEdit: comment.authorId === userId, canDelete: comment.authorId === userId || canManage }))}
      totalCount={commentTotal} hasMore={comments.length < commentTotal} onLoadMore={loadMore} currentUserId={userId} isLoggedIn isLocked={post.isLocked} allowComments={post.allowComments}
      onSubmit={(content, parentId) => void mutate(() => businessApi.post(`${apiBase}/comments`, { postId: post.id, content, parentId }))}
      onEdit={(id, content) => void mutate(() => authClient.api.put(`${apiBase}/comments/${id}`, { content }))}
      onDelete={id => { if (window.confirm('이 댓글을 삭제하시겠습니까?')) void mutate(() => authClient.api.delete(`${apiBase}/comments/${id}`)); }} /></fieldset>
  </article>;
}
