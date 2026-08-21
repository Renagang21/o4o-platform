/**
 * ForumDetailPage — PharmacyHub 커뮤니티 게시글 상세
 *
 * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1 (상세 공통 부품)
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §10
 *   — 댓글·좋아요 adoption gap 해소. 공통 부품(ForumCommentList / ForumCommentForm /
 *     ForumLikeButton)과 공통 backend(createServiceForumRouter) 를 그대로 소비한다.
 *
 * 서비스 격리는 서버가 담당한다 — 다른 서비스 게시글은 404 로 내려오므로 여기서 serviceCode 를 비교하지 않는다.
 * 쓰기 권한(활성 멤버십)도 서버가 판정한다. 클라이언트는 401/403 을 안내로만 바꾼다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClosedForumJoinPanel,
  ForumCommentForm,
  ForumCommentList,
  ForumDetailErrorState,
  ForumDetailLoadingState,
  ForumDetailNotFoundState,
  ForumLikeButton,
  ForumPostContent,
  ForumPostHeader,
  formatForumDate,
} from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import {
  closedForumIdFromError,
  createPharmacyHubForumComment,
  deletePharmacyHubForumComment,
  deletePharmacyHubForumPost,
  fetchPharmacyHubForumComments,
  fetchPharmacyHubForumPost,
  forumMembershipApi,
  togglePharmacyHubForumPostLike,
  updatePharmacyHubForumComment,
  type PharmacyHubForumComment,
  type PharmacyHubForumPostDetail,
} from '../../services/forumApi';

function toMessage(err: unknown, fallback: string): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401) return '로그인이 필요합니다.';
  if (status === 403) return '이 커뮤니티에 참여한 회원만 사용할 수 있습니다.';
  return err instanceof Error ? err.message : fallback;
}

export default function ForumDetailPage() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { user, isAuthenticated } = useAuth();

  const [post, setPost] = useState<PharmacyHubForumPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  /** WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §6 — 회원제 포럼 차단 시 가입 신청 패널 */
  const [closedForumId, setClosedForumId] = useState<string | null>(null);

  const [comments, setComments] = useState<PharmacyHubForumComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likePending, setLikePending] = useState(false);

  const goList = useCallback(() => navigate('/forum/posts'), [navigate]);

  const loadComments = useCallback(async (id: string) => {
    try {
      setComments(await fetchPharmacyHubForumComments(id));
    } catch {
      // 댓글 조회 실패는 게시글 표시를 막지 않는다. 목록만 비운다.
      setComments([]);
    }
  }, []);

  const load = useCallback(async () => {
    if (!postId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    setClosedForumId(null);
    try {
      const detail = await fetchPharmacyHubForumPost(postId);
      setPost(detail);
      setLiked(detail.isLiked);
      setLikeCount(detail.likeCount);
      await loadComments(detail.id);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setPost(null);
      const closedId = closedForumIdFromError(err);
      if (closedId) setClosedForumId(closedId);
      else if (status === 404) setNotFound(true);
      else setError(err instanceof Error ? err.message : '게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [postId, loadComments]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmitComment = useCallback(async () => {
    if (!post || !commentInput.trim()) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      await createPharmacyHubForumComment(post.id, commentInput.trim());
      setCommentInput('');
      await loadComments(post.id);
    } catch (err) {
      setCommentError(toMessage(err, '댓글을 등록하지 못했습니다.'));
    } finally {
      setCommentSubmitting(false);
    }
  }, [post, commentInput, loadComments]);

  const handleEditComment = useCallback(async (id: string, content: string) => {
    if (!post || !content.trim()) return;
    setCommentError(null);
    try {
      await updatePharmacyHubForumComment(id, content.trim());
      await loadComments(post.id);
    } catch (err) {
      setCommentError(toMessage(err, '댓글을 수정하지 못했습니다.'));
    }
  }, [post, loadComments]);

  const handleDeleteComment = useCallback(async (id: string) => {
    if (!post) return;
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    setCommentError(null);
    try {
      await deletePharmacyHubForumComment(id);
      await loadComments(post.id);
    } catch (err) {
      setCommentError(toMessage(err, '댓글을 삭제하지 못했습니다.'));
    }
  }, [post, loadComments]);

  // WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §10:
  //   본인 게시글 수정·삭제 adoption gap 해소. 최종 권한 판정은 backend 가 한다.
  const handleDeletePost = useCallback(async () => {
    if (!post) return;
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      await deletePharmacyHubForumPost(post.id);
      navigate('/forum/posts');
    } catch (err) {
      setCommentError(toMessage(err, '게시글을 삭제하지 못했습니다.'));
    }
  }, [post, navigate]);

  const handleToggleLike = useCallback(async () => {
    if (!post) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setLikePending(true);
    try {
      const result = await togglePharmacyHubForumPostLike(post.id);
      setLiked(result.isLiked);
      setLikeCount(result.likeCount);
    } catch (err) {
      setCommentError(toMessage(err, '좋아요 처리에 실패했습니다.'));
    } finally {
      setLikePending(false);
    }
  }, [post, isAuthenticated, navigate]);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <button className="mb-4 text-sm text-blue-600" onClick={goList}>
          ← 게시글 목록
        </button>

        {loading && <ForumDetailLoadingState message="게시글을 불러오는 중입니다." />}

        {!loading && closedForumId && (
          <ClosedForumJoinPanel
            forumId={closedForumId}
            isAuthenticated={isAuthenticated}
            userKey={user?.id ?? null}
            api={forumMembershipApi}
            variant="page"
            onBack={goList}
            palette={{ primary: '#2563EB' }}
          />
        )}

        {!loading && !closedForumId && notFound && (
          <ForumDetailNotFoundState
            message="게시글을 찾을 수 없습니다. 삭제되었거나 접근 권한이 없습니다."
            backLabel="게시글 목록으로"
            onBack={goList}
          />
        )}

        {!loading && !closedForumId && !notFound && error && (
          <ForumDetailErrorState
            message={error}
            backLabel="게시글 목록으로"
            retryLabel="다시 시도"
            onBack={goList}
            onRetry={() => { void load(); }}
          />
        )}

        {!loading && !closedForumId && !notFound && !error && post && (
          <>
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
                    조회 {post.viewCount} · 좋아요 {likeCount} · 댓글 {comments.length}
                    {post.updatedAt ? ` · 수정 ${formatForumDate(post.updatedAt)}` : ''}
                  </span>
                )}
              />
              {Boolean(user?.id && post.authorId && post.authorId === user.id) && (
                <div className="mb-4 flex justify-end gap-2">
                  <button
                    className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600"
                    onClick={() => navigate(`/forum/edit/${post.id}`)}
                  >
                    수정
                  </button>
                  <button
                    className="rounded border border-red-200 px-3 py-1 text-xs text-red-600"
                    onClick={() => { void handleDeletePost(); }}
                  >
                    삭제
                  </button>
                </div>
              )}
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

              <div className="mt-6 flex justify-center border-t border-slate-100 pt-6">
                <ForumLikeButton
                  liked={liked}
                  count={likeCount}
                  disabled={likePending}
                  compact
                  onClick={() => { void handleToggleLike(); }}
                />
              </div>
            </article>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                댓글 {comments.length > 0 ? `(${comments.length})` : ''}
              </h2>

              <ForumCommentForm
                value={commentInput}
                onChange={setCommentInput}
                onSubmit={() => { void handleSubmitComment(); }}
                submitting={commentSubmitting}
                authenticated={isAuthenticated}
                error={commentError}
                compact
                loginPrompt={(
                  <div className="mb-6 rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                    <button className="text-blue-600 underline" onClick={() => navigate('/login')}>
                      로그인
                    </button>
                    {' '}후 댓글을 작성할 수 있습니다.
                  </div>
                )}
              />

              <ForumCommentList
                comments={comments.map((comment) => ({
                  id: comment.id,
                  authorName: comment.authorName,
                  content: comment.content,
                  createdAt: formatForumDate(comment.createdAt),
                  isAuthor: Boolean(user?.id && comment.authorId === user.id),
                }))}
                emptyMessage="아직 댓글이 없습니다."
                compact
                onEditComment={(id, content) => { void handleEditComment(id, content); }}
                onDeleteComment={(id) => { void handleDeleteComment(id); }}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
