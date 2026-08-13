/**
 * ForumDetailPage — PharmacyHub 커뮤니티 게시글 상세
 *
 * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
 *
 * 공통 부품(ForumPostHeader / ForumPostContent / ForumDetail*State / formatForumDate)만 사용한다.
 * 서비스 격리는 서버가 담당한다 — 다른 서비스 게시글은 404 로 내려오므로 여기서 serviceCode 를 비교하지 않는다.
 * 댓글·좋아요는 본 WO 범위 밖(Interaction WO).
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ForumDetailErrorState,
  ForumDetailLoadingState,
  ForumDetailNotFoundState,
  ForumPostContent,
  ForumPostHeader,
  formatForumDate,
} from '@o4o/shared-space-ui';
import {
  fetchPharmacyHubForumPost,
  type PharmacyHubForumPostDetail,
} from '../../services/forumApi';

export default function ForumDetailPage() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();

  const [post, setPost] = useState<PharmacyHubForumPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const goList = useCallback(() => navigate('/forum/posts'), [navigate]);

  const load = useCallback(async () => {
    if (!postId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      setPost(await fetchPharmacyHubForumPost(postId));
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setPost(null);
      if (status === 404) setNotFound(true);
      else setError(err instanceof Error ? err.message : '게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <button className="mb-4 text-sm text-blue-600" onClick={goList}>
          ← 게시글 목록
        </button>

        {loading && <ForumDetailLoadingState message="게시글을 불러오는 중입니다." />}

        {!loading && notFound && (
          <ForumDetailNotFoundState
            message="게시글을 찾을 수 없습니다. 삭제되었거나 접근 권한이 없습니다."
            backLabel="게시글 목록으로"
            onBack={goList}
          />
        )}

        {!loading && !notFound && error && (
          <ForumDetailErrorState
            message={error}
            backLabel="게시글 목록으로"
            retryLabel="다시 시도"
            onBack={goList}
            onRetry={() => { void load(); }}
          />
        )}

        {!loading && !notFound && !error && post && (
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <ForumPostHeader
              title={post.title}
              authorName={post.authorName}
              createdAt={post.createdAt}
              updatedAt={post.updatedAt ?? undefined}
              badgeSlot={post.isPinned ? (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  고정
                </span>
              ) : undefined}
              metaSlot={(
                <span className="text-xs text-slate-500">
                  조회 {post.viewCount} · 좋아요 {post.likeCount} · 댓글 {post.commentCount}
                  {post.updatedAt ? ` · 수정 ${formatForumDate(post.updatedAt)}` : ''}
                </span>
              )}
            />
            <ForumPostContent content={post.content} />
            {post.tags?.length ? (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        )}
      </div>
    </main>
  );
}
