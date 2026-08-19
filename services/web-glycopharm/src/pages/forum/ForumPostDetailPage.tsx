/**
 * ForumPostDetailPage — 포럼 게시글 상세
 *
 * WO-O4O-GLYCOPHARM-KPA-STYLE-UX-REFINE-P3-V1
 *
 * Route: /forum/posts/:id
 * API: GET /api/v1/glycopharm/forum/posts/:id
 *      GET /api/v1/glycopharm/forum/posts/:postId/comments
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Eye, Heart } from 'lucide-react';
import { fetchForumPost, fetchPostComments, createForumComment, updateForumComment, deleteForumComment, deleteForumPost, toggleForumPostLike, extractTextContent, type ForumPostDetail, type ForumComment } from '@/services/forumApi';
import { toast } from '@o4o/error-handling';
import { useAuth } from '@/contexts/AuthContext';
import {
  AppreciationPanel,
  ForumPostContent,
  ForumPostHeader,
  ForumDetailLoadingState,
  ForumDetailErrorState,
  ForumDetailNotFoundState,
  ForumCommentList,
  ForumCommentForm,
  ForumLikeButton,
} from '@o4o/shared-space-ui';
import { appreciationPanelApi } from '@/api/appreciation';

// ─── Local aliases ───────────────────────────────────────────
type PostDetail = ForumPostDetail & { body?: string | null };
type Comment = ForumComment & { body?: string | null };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ForumPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  // WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C:
  //   좋아요 adoption gap 해소 — 공통 ForumLikeButton + 공통 backend `POST /posts/:id/like`.
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likePending, setLikePending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C:
  //   댓글 쓰기 adoption gap 해소 — 공통 ForumCommentForm + 공통 backend 소비.
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchForumPost(id),
      fetchPostComments(id).catch(() => ({ success: true, data: [] as Comment[] })),
    ])
      .then(([postRes, commentRes]) => {
        if (postRes.success && postRes.data) {
          setPost(postRes.data as PostDetail);
          setIsLiked(Boolean((postRes.data as any)?.isLiked));
          setLikeCount((postRes.data as any)?.likeCount ?? 0);
        } else {
          setError('게시글을 찾을 수 없습니다.');
        }
        setComments(commentRes.data as Comment[]);
      })
      .catch(() => setError('게시글을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const reloadComments = async (postId: string) => {
    try {
      const res = await fetchPostComments(postId);
      setComments(res.data as Comment[]);
    } catch {
      // 댓글 재조회 실패는 본문 표시를 막지 않는다.
    }
  };

  const commentErrorMessage = (err: unknown, fallback: string): string => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) return '로그인이 필요합니다.';
    if (status === 403) return '이 커뮤니티에 참여한 회원만 사용할 수 있습니다.';
    return fallback;
  };

  // WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C:
  //   본인 게시글 수정·삭제 adoption gap 해소. 최종 권한 판정은 backend 가 한다.
  const handleDeletePost = async () => {
    if (!id) return;
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteForumPost(id);
      navigate('/forum/posts');
    } catch (err) {
      toast.error(commentErrorMessage(err, '게시글을 삭제하지 못했습니다.'));
    }
  };

  const handleToggleLike = async () => {
    if (!id) return;
    if (!user?.id) {
      navigate('/login');
      return;
    }
    setLikePending(true);
    try {
      const result = await toggleForumPostLike(id);
      setIsLiked(result.isLiked);
      setLikeCount(result.likeCount);
    } catch (err) {
      toast.error(commentErrorMessage(err, '좋아요 처리에 실패했습니다.'));
    } finally {
      setLikePending(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!id || !commentInput.trim()) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      await createForumComment(id, commentInput.trim());
      setCommentInput('');
      await reloadComments(id);
    } catch (err) {
      setCommentError(commentErrorMessage(err, '댓글을 등록하지 못했습니다.'));
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (!id || !content.trim()) return;
    setCommentError(null);
    try {
      await updateForumComment(commentId, content.trim());
      await reloadComments(id);
    } catch (err) {
      setCommentError(commentErrorMessage(err, '댓글을 수정하지 못했습니다.'));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    setCommentError(null);
    try {
      await deleteForumComment(commentId);
      await reloadComments(id);
    } catch (err) {
      setCommentError(commentErrorMessage(err, '댓글을 삭제하지 못했습니다.'));
    }
  };

  // WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: AppreciationPanel onError 핸들러
  const handleAppreciationError = (err: any) => {
    const msg = String(err?.response?.data?.error || err?.message || '');
    if (msg.includes('INSUFFICIENT_BALANCE') || msg.includes('부족')) toast.error('포인트가 부족합니다');
    else if (msg.includes('SELF')) toast.error('자신의 게시글에는 감사 포인트를 보낼 수 없습니다');
    else toast.error('감사 포인트 전송에 실패했습니다');
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ForumDetailLoadingState />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        {error ? (
          <ForumDetailErrorState message={error} backLabel="돌아가기" onBack={() => navigate(-1)} />
        ) : (
          <ForumDetailNotFoundState backLabel="돌아가기" onBack={() => navigate(-1)} />
        )}
      </div>
    );
  }

  const authorName = (post as any).authorName || post.author?.nickname || post.author?.name || '익명';
  const bodyText = extractTextContent(post.content) || post.body || '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <div className="mb-6">
        <Link
          to="/forum/posts"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          포럼 목록
        </Link>
      </div>

      {/* 게시글 카드 */}
      <article className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-slate-100">
          <ForumPostHeader
            title={post.title}
            authorName={authorName}
            createdAt={formatDate(post.createdAt)}
            badgeSlot={post.category?.name ? (
              <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-primary-50 text-primary-600 rounded">
                {post.category.name}
              </span>
            ) : null}
            metaSlot={
              <>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  {post.viewCount}
                </span>
                {likeCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Heart className="w-3.5 h-3.5" />
                    {likeCount}
                  </span>
                )}
              </>
            }
          />
        </div>

        {Boolean(user?.id && post.author?.id === user.id) && (
          <div className="flex justify-end gap-2 px-6 pt-4">
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

        {/* 본문 */}
        <div className="px-6 py-6 min-h-[120px]">
          {bodyText ? (
            <ForumPostContent
              html={bodyText}
              className="text-sm text-slate-700 leading-relaxed"
            />
          ) : (
            <p className="text-sm text-slate-400 italic">본문 내용이 없습니다.</p>
          )}
        </div>

        <div className="flex justify-center border-t border-slate-100 px-6 py-5">
          <ForumLikeButton
            liked={isLiked}
            count={likeCount}
            disabled={likePending}
            compact
            onClick={() => { void handleToggleLike(); }}
          />
        </div>
      </article>

      {/* WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: 공통 AppreciationPanel */}
      <AppreciationPanel
        targetType="forum_post"
        targetId={post.id}
        api={appreciationPanelApi}
        currentUserId={user?.id ?? null}
        theme="emerald"
        variant="inline"
        onSent={({ amount }) => toast.success(`${amount}P 감사 포인트를 전달했습니다 🎁`)}
        onError={handleAppreciationError}
      />


      {/* 댓글 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            댓글 {comments.length > 0 ? `(${comments.length})` : ''}
          </h2>
        </div>

        <ForumCommentForm
          value={commentInput}
          onChange={setCommentInput}
          onSubmit={() => { void handleSubmitComment(); }}
          submitting={commentSubmitting}
          authenticated={Boolean(user?.id)}
          error={commentError}
          loginPrompt={(
            <div className="mb-6 rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
              <Link to="/login" className="text-primary-600 underline">로그인</Link> 후 댓글을 작성할 수 있습니다.
            </div>
          )}
        />

        <ForumCommentList
          comments={comments.map((comment) => ({
            id: comment.id,
            authorName: comment.author?.nickname || comment.author?.name || '익명',
            content: comment.content || comment.body || '',
            createdAt: new Date(comment.createdAt).toLocaleDateString('ko-KR'),
            isAuthor: Boolean(user?.id && comment.author?.id === user.id),
          }))}
          emptyMessage="아직 댓글이 없습니다."
          onEditComment={(commentId, content) => { void handleEditComment(commentId, content); }}
          onDeleteComment={(commentId) => { void handleDeleteComment(commentId); }}
        />
      </section>

      {/* 하단 네비게이션 */}
      <div className="mt-8 flex gap-3">
        <Link
          to="/forum/posts"
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          목록으로
        </Link>
        <Link
          to="/"
          className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          홈
        </Link>
      </div>
    </div>
  );
}
