/**
 * MyPostsPage — KPA-Society 내가 쓴 글 (/forum/my-posts)
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §10·§11
 *
 * - 화면은 공통 `MyForumPostsTemplate`. wrapper 는 fetch / route / config 만 담당한다.
 * - 서비스 경계와 author 필터는 서버(서비스 scope forum posts + author=me)가 전담한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MyForumPostsTemplate, type ForumListItem } from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import { forumApi } from '../../api/forum';
import type { ForumPost } from '../../types';

const PAGE_SIZE = 20;
const ACCENT = '#2563eb';

function statusLabel(status?: string | null): string | undefined {
  if (!status || status === 'publish' || status === 'published') return undefined;
  if (status === 'draft') return '임시저장';
  if (status === 'pending') return '승인대기';
  if (status === 'private') return '비공개';
  return undefined;
}

function toListItem(post: ForumPost): ForumListItem {
  return {
    id: post.id,
    title: post.title,
    authorName: post.authorName || '나',
    createdAt: post.createdAt,
    commentCount: post.commentCount ?? 0,
    likeCount: post.likeCount ?? 0,
    isPinned: Boolean(post.isPinned),
    viewCount: post.viewCount ?? 0,
    tags: post.tags ?? undefined,
    statusLabel: statusLabel(post.status),
    routeTo: `/forum/post/${post.id}`,
  };
}

export function MyPostsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  const [posts, setPosts] = useState<ForumListItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await forumApi.getPosts({ page, limit: PAGE_SIZE, author: 'me' })) as any;
      const rows: ForumPost[] = res.data ?? [];
      setPosts(rows.map(toListItem));
      setTotalPages(res.totalPages ?? res.pagination?.totalPages ?? 0);
      setTotal(res.total ?? res.totalCount ?? rows.length);
    } catch (err: any) {
      setPosts([]);
      setTotalPages(0);
      setTotal(0);
      setError(err?.message ?? '내가 쓴 글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <button className="mb-2 text-sm text-blue-600" onClick={() => navigate('/forum')} type="button">
          ← 커뮤니티 홈
        </button>
        <MyForumPostsTemplate
          description="약사회 커뮤니티에 내가 작성한 글입니다."
          posts={posts}
          totalCount={total}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(next) => {
            const params = new URLSearchParams(searchParams);
            if (next > 1) params.set('page', String(next)); else params.delete('page');
            setSearchParams(params);
          }}
          onPostClick={(post) => navigate(post.routeTo)}
          loading={loading}
          error={error}
          onRetry={() => void load()}
          isAuthenticated={isAuthenticated}
          accentColor={ACCENT}
          renderUnauthenticated={() => (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <p className="m-0 text-sm text-slate-600">로그인 후 내가 쓴 글을 확인할 수 있습니다.</p>
              <button
                className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                onClick={() => navigate('/login')}
                type="button"
              >
                로그인
              </button>
            </div>
          )}
          renderEmpty={() => (
            <div className="py-12 text-center text-sm text-slate-500">
              작성한 글이 없습니다.
              <div className="mt-3">
                <button
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                  onClick={() => navigate('/forum/write')}
                  type="button"
                >
                  글쓰기
                </button>
              </div>
            </div>
          )}
        />
      </div>
    </main>
  );
}

export default MyPostsPage;
