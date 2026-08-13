import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ForumListTemplate, type ForumListItem } from '@o4o/shared-space-ui';
import { fetchPharmacyHubForumPosts } from '../../services/forumApi';

const PAGE_SIZE = 20;

export default function ForumListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const forumId = searchParams.get('forum') || undefined;
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const search = searchParams.get('q') || '';
  const sortBy = (searchParams.get('sort') || 'latest') as 'latest' | 'oldest' | 'popular';

  const [posts, setPosts] = useState<ForumListItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => setSearchInput(search), [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPharmacyHubForumPosts({
        forumId,
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        sortBy,
      });
      setPosts(result.posts);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      setPosts([]);
      setTotalPages(0);
      setTotal(0);
      setError(err instanceof Error ? err.message : '게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [forumId, page, search, sortBy]);

  useEffect(() => { void load(); }, [load]);

  const pinnedPosts = useMemo(
    () => (page === 1 && !search ? posts.filter((post) => post.isPinned) : []),
    [page, posts, search],
  );
  const listPosts = useMemo(
    () => (pinnedPosts.length ? posts.filter((post) => !post.isPinned) : posts),
    [pinnedPosts, posts],
  );

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value); else next.delete(key);
    });
    setSearchParams(next);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
<div>
  <button className="mb-2 text-sm text-blue-600" onClick={() => navigate('/forum')}>
    ← 커뮤니티 홈
  </button>
  <h1 className="m-0 text-2xl font-bold text-slate-900">게시글 목록</h1>
  <p className="mt-1 text-sm text-slate-500">PharmacyHub 커뮤니티 · 총 {total}개</p>
</div>
<div className="flex items-center gap-2">
<button
  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
  onClick={() => navigate(forumId ? `/forum/write?forum=${encodeURIComponent(forumId)}` : '/forum/write')}
  type="button"
>
  글쓰기
</button>
<select
  value={sortBy}
  onChange={(event) => updateParams({ sort: event.target.value, page: undefined })}
  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
>
  <option value="latest">최신순</option>
  <option value="popular">인기순</option>
  <option value="oldest">오래된순</option>
</select>
</div>
        </div>

        <form
className="mb-4 flex gap-2"
onSubmit={(event) => {
  event.preventDefault();
  updateParams({ q: searchInput.trim() || undefined, page: undefined });
}}
        >
<input
  value={searchInput}
  onChange={(event) => setSearchInput(event.target.value)}
  placeholder="제목·내용 검색"
  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
/>
<button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white" type="submit">
  검색
</button>
        </form>

        {!forumId && (
<div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
  전체 PharmacyHub 게시글을 표시합니다. 특정 게시판만 보려면 커뮤니티 홈에서 게시판을 선택하세요.
</div>
        )}

        <ForumListTemplate
posts={listPosts}
pinnedPosts={pinnedPosts}
currentPage={page}
totalPages={totalPages}
onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
onPostClick={(post) => navigate(`/forum/posts/${post.id}`)}
loading={loading}
error={error}
onRetry={() => { void load(); }}
showPostType
showLikeCount
showCommentCount
accentColor="#2563EB"
renderEmpty={() => (
  <p className="m-0 text-sm text-slate-500">
    {search ? '검색 결과가 없습니다.' : '아직 등록된 글이 없습니다.'}
  </p>
)}
        />

        <p className="mt-3 text-center text-xs text-slate-400">
댓글·좋아요는 다음 커뮤니티 공통화 단계에서 연결됩니다.
        </p>
      </div>
    </main>
  );
}
