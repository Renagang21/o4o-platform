/**
 * ForumDetailPage - 포럼 상세 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { blocksToHtml } from '@o4o/forum-core/utils';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { PageSection, PageContainer } from '@o4o/ui';
import { ClosedForumAccessBlocker } from '../../components/forum/ClosedForumAccessBlocker';
import { forumApi } from '../../api';
import { appreciationApi } from '../../api/appreciation';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { ForumPost, ForumComment } from '../../types';
import { PLATFORM_ROLES, ROLES, hasAnyRole } from '../../lib/role-constants';
import { ContentRenderer } from '@o4o/content-editor';

export function ForumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isForumOwner, setIsForumOwner] = useState(false);
  // WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
  const [showAppreciation, setShowAppreciation] = useState(false);
  const [appreciationAmount, setAppreciationAmount] = useState<number | ''>('');
  const [appreciationMsg, setAppreciationMsg] = useState('');
  const [isSendingAppreciation, setIsSendingAppreciation] = useState(false);
  const [appreciationSummary, setAppreciationSummary] = useState<{ totalAmount: number; count: number } | null>(null);
  // WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1
  const [appreciationRecent, setAppreciationRecent] = useState<{ amount: number; message?: string; createdAt: string }[]>([]);
  const [isPinning, setIsPinning] = useState(false);
  // WO-O4O-KPA-CLOSED-FORUM-FRONTEND-ACCESS-UX-V1
  const [closedForumId, setClosedForumId] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [postRes, commentsRes] = await Promise.all([
        forumApi.getPost(id!),
        forumApi.getComments(id!),
      ]);

      setPost(postRes.data);
      setComments(commentsRes.data);
      // WO-FORUM-LIKE-SYSTEM-V1: initialize isLiked from server response
      setIsLiked(!!(postRes.data as any)?.isLiked);
      // WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1 / WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1: 감사 집계 + 최근 메시지
      try {
        const [sumRes, recentRes] = await Promise.allSettled([
          appreciationApi.getSummary('forum_post', id!),
          appreciationApi.getRecent('forum_post', id!),
        ]);
        if (sumRes.status === 'fulfilled') setAppreciationSummary(sumRes.value.data);
        if (recentRes.status === 'fulfilled') setAppreciationRecent(recentRes.value.data?.items ?? []);
      } catch {
        // non-critical
      }

      // Check if current user is the forum owner
      // WO-O4O-FORUM-CATEGORY-CLEANUP-V1: use forumId (forum_category_requests)
      const resolvedForumId = postRes.data?.forumId;
      if (resolvedForumId && user?.id) {
        try {
          const catRes = await forumApi.getForum(resolvedForumId);
          // forum_category_requests.requester_id (entity property: requesterId) = 포럼 소유자
          setIsForumOwner(catRes.data?.requesterId === user.id);
        } catch {
          // non-critical — ignore
        }
      }
    } catch (err: any) {
      // WO-O4O-KPA-CLOSED-FORUM-FRONTEND-ACCESS-UX-V1: custom fetch client sets err.status / err.code directly
      if (err?.status === 403 && err?.code === 'CLOSED_FORUM_ACCESS_DENIED') {
        setError('CLOSED_FORUM');
        // Backend returns data: { forumId } in the 403 body
        setClosedForumId(err?.data?.forumId ?? null);
      } else {
        setError(err instanceof Error ? err.message : '게시글을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post || !user || isLiking) return;
    try {
      setIsLiking(true);
      const res = await forumApi.likePost(post.id);
      setPost({ ...post, likeCount: res.data.likeCount });
      setIsLiked(res.data.isLiked);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('token') || msg.includes('expired') || msg.includes('401')) {
        toast.error('로그인 세션이 만료되었습니다. 페이지를 새로고침해 주세요.');
      } else {
        toast.error('좋아요 처리에 실패했습니다.');
      }
    } finally {
      setIsLiking(false);
    }
  };

  // WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
  const handleSendAppreciation = async () => {
    if (!post || !user || isSendingAppreciation) return;
    const amt = Number(appreciationAmount);
    if (!amt || amt < 1) { toast.error('금액은 1P 이상이어야 합니다'); return; }
    try {
      setIsSendingAppreciation(true);
      await appreciationApi.send({
        targetType: 'forum_post',
        targetId: post.id,
        amount: amt,
        message: appreciationMsg.trim() || undefined,
      });
      toast.success(`${amt}P 감사 포인트를 전달했습니다 🎁`);
      setShowAppreciation(false);
      setAppreciationAmount('');
      setAppreciationMsg('');
      // 집계 + 최근 메시지 갱신
      const [sumRes, recentRes] = await Promise.allSettled([
        appreciationApi.getSummary('forum_post', post.id),
        appreciationApi.getRecent('forum_post', post.id),
      ]);
      if (sumRes.status === 'fulfilled') setAppreciationSummary(sumRes.value.data);
      if (recentRes.status === 'fulfilled') setAppreciationRecent(recentRes.value.data?.items ?? []);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('INSUFFICIENT_BALANCE') || msg.includes('부족')) toast.error('포인트가 부족합니다');
      else if (msg.includes('SELF')) toast.error('자신의 게시글에는 감사 포인트를 보낼 수 없습니다');
      else if (msg.includes('INVALID')) toast.error('금액은 1P 이상이어야 합니다');
      else toast.error('감사 포인트 전송에 실패했습니다');
    } finally {
      setIsSendingAppreciation(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    try {
      setSubmitting(true);
      const res = await forumApi.createComment(post.id, newComment);
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      toast.error('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePin = async (pin: boolean) => {
    if (!post || isPinning) return;
    try {
      setIsPinning(true);
      const res = await forumApi.pinPost(post.id, pin);
      setPost({ ...post, isPinned: res.data.isPinned });
    } catch (err: any) {
      toast.error(pin ? '공지 지정에 실패했습니다.' : '공지 해제에 실패했습니다.');
    } finally {
      setIsPinning(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm('정말 삭제하시겠습니까?')) return;

    try {
      await forumApi.deletePost(post.id);
      navigate('/forum');
    } catch (err) {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post || !confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await forumApi.deleteComment(post.id, commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      toast.error('댓글 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="게시글을 불러오는 중..." />;
  }

  if (error || !post) {
    const isClosed = error === 'CLOSED_FORUM';
    if (isClosed) {
      return (
        <PageSection last>
          <PageContainer width="form">
            <ClosedForumAccessBlocker
              categoryId={closedForumId}
              user={user}
              variant="page"
              onBack={() => navigate('/forum')}
            />
          </PageContainer>
        </PageSection>
      );
    }
    return (
      <PageSection last>
        <PageContainer width="form">
          <div style={styles.accessDenied}>
            <span style={styles.accessDeniedIcon}>⚠️</span>
            <h2 style={styles.accessDeniedTitle}>게시글을 찾을 수 없습니다</h2>
            <p style={styles.accessDeniedDesc}>
              {error || '삭제되었거나 존재하지 않는 게시글입니다.'}
            </p>
            <button style={styles.accessDeniedBack} onClick={() => navigate('/forum')}>
              목록으로
            </button>
          </div>
        </PageContainer>
      </PageSection>
    );
  }

  const isAdmin = hasAnyRole(user?.roles ?? [], [...PLATFORM_ROLES, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_SUPER_ADMIN]);
  const isAuthor = user?.id === post.authorId || isAdmin;

  return (
    <PageSection last>
    <PageContainer width="form" className="pb-10">
      <PageHeader
        title=""
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '포럼', href: '/forum' },
          { label: post.categoryName },
        ]}
      />

      <Card padding="large">
        <div style={styles.postHeader}>
          <span style={styles.categoryBadge}>{post.categoryName}</span>
          {post.isPinned && <span style={styles.pinnedBadge}>공지</span>}
        </div>

        <h1 style={styles.title}>{post.title}</h1>

        <div style={styles.meta}>
          <span style={styles.author}>작성자: {post.authorName}</span>
          <span style={styles.separator}>·</span>
          <span>등록일: {new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
          <span style={styles.separator}>·</span>
          <span>조회 {post.viewCount}</span>
          <span style={styles.separator}>·</span>
          <span>댓글 {post.commentCount ?? 0}</span>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div style={styles.tagRow}>
            {post.tags.map((tag) => (
              <span key={tag} style={styles.tagChip}>#{tag}</span>
            ))}
          </div>
        )}

        <div style={styles.content}>
          <ContentRenderer
            html={Array.isArray(post.content) ? blocksToHtml(post.content) : post.content}
          />
        </div>

        <div style={styles.actions}>
          <button
            style={{ ...styles.likeButton, ...(isLiked ? styles.likeButtonActive : {}) }}
            onClick={handleLike}
            disabled={isLiking || !user}
          >
            {isLiked ? '❤️' : '🤍'} 좋아요{post.likeCount > 0 ? ` ${post.likeCount}` : ''}
          </button>

          {/* WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1 */}
          {user && (
            <button
              style={styles.appreciationButton}
              onClick={() => setShowAppreciation(true)}
            >
              🎁 감사하기
              {appreciationSummary && appreciationSummary.totalAmount > 0 && (
                <span style={styles.appreciationBtnBadge}>{appreciationSummary.totalAmount.toLocaleString()}P · {appreciationSummary.count}명</span>
              )}
            </button>
          )}
          {!user && appreciationSummary && appreciationSummary.totalAmount > 0 && (
            <span style={styles.appreciationCount}>🎁 {appreciationSummary.totalAmount.toLocaleString()}P · {appreciationSummary.count}명</span>
          )}

          <div style={styles.authorActions}>
            {isForumOwner && (
              post.isPinned ? (
                <button
                  style={styles.unpinButton}
                  onClick={() => handlePin(false)}
                  disabled={isPinning}
                >
                  {isPinning ? '처리 중...' : '공지 해제'}
                </button>
              ) : (
                <button
                  style={styles.pinButton}
                  onClick={() => handlePin(true)}
                  disabled={isPinning}
                >
                  {isPinning ? '처리 중...' : '공지 지정'}
                </button>
              )
            )}
            {isAuthor && (
              <>
                <Link to={`/forum/edit/${post.id}`} style={styles.editButton}>
                  수정
                </Link>
                <button style={styles.deleteButton} onClick={handleDelete}>
                  삭제
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1: 감사 집계 + 최근 메시지 */}
      {(appreciationSummary && appreciationSummary.totalAmount > 0) && (
        <div style={styles.appreciationCultureBlock}>
          <div style={styles.appreciationStats}>
            <span style={styles.appreciationStatItem}>🎁 감사 <strong>{appreciationSummary.totalAmount.toLocaleString()}P</strong></span>
            <span style={styles.appreciationStatSep}>·</span>
            <span style={styles.appreciationStatItem}>👥 감사한 사람 <strong>{appreciationSummary.count}명</strong></span>
          </div>

          {appreciationRecent.length > 0 && (
            <div style={styles.appreciationMessages}>
              <p style={styles.appreciationMessagesLabel}>최근 감사</p>
              {appreciationRecent.map((r, i) => (
                <div key={i} style={styles.appreciationMessageRow}>
                  <span style={styles.appreciationMessageText}>
                    "{r.message!.length > 60 ? r.message!.slice(0, 60) + '…' : r.message}"
                  </span>
                  <span style={styles.appreciationMessageAmount}>+{r.amount}P</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1: 감사 포인트 모달 */}
      {showAppreciation && (
        <div style={styles.appreciationOverlay} onClick={() => setShowAppreciation(false)}>
          <div style={styles.appreciationModal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.appreciationModalTitle}>🎁 감사 포인트 보내기</h3>
            <p style={styles.appreciationModalDesc}>
              작성자에게 감사의 마음을 포인트로 전달할 수 있습니다.
            </p>
            <div style={styles.appreciationPresets}>
              {[10, 30, 50].map(p => (
                <button
                  key={p}
                  style={{
                    ...styles.presetButton,
                    ...(appreciationAmount === p ? styles.presetButtonActive : {}),
                  }}
                  onClick={() => setAppreciationAmount(p)}
                >
                  {p}P
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              style={styles.appreciationInput}
              placeholder="직접 입력 (1P 이상)"
              value={appreciationAmount}
              onChange={e => setAppreciationAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <textarea
              style={styles.appreciationTextarea}
              placeholder="감사 메시지 (선택)"
              rows={3}
              value={appreciationMsg}
              onChange={e => setAppreciationMsg(e.target.value)}
            />
            <div style={styles.appreciationModalActions}>
              <button
                style={styles.appreciationCancelButton}
                onClick={() => { setShowAppreciation(false); setAppreciationAmount(''); setAppreciationMsg(''); }}
              >
                취소
              </button>
              <button
                style={styles.appreciationSendButton}
                onClick={handleSendAppreciation}
                disabled={isSendingAppreciation || !appreciationAmount}
              >
                {isSendingAppreciation ? '전송 중...' : `${appreciationAmount || 0}P 보내기`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 섹션 */}
      <div style={styles.commentsSection}>
        <h2 style={styles.commentsTitle}>댓글 {comments.length}개</h2>

        {user ? (
          <form onSubmit={handleCommentSubmit} style={styles.commentForm}>
            <textarea
              style={styles.commentInput}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요"
              rows={3}
            />
            <button
              type="submit"
              style={styles.commentSubmit}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? '등록 중...' : '댓글 등록'}
            </button>
          </form>
        ) : (
          <div style={styles.loginPrompt}>
            <p style={styles.loginPromptText}>로그인하고 대화에 참여하세요</p>
            <Link to="/login" style={styles.loginButton}>로그인 →</Link>
          </div>
        )}

        <div style={styles.commentList}>
          {comments.map(comment => {
            const isCommentAuthor = user?.id === comment.authorId || isAdmin;
            return (
              <div key={comment.id} style={styles.commentItem}>
                <div style={styles.commentHeader}>
                  <div style={styles.commentHeaderLeft}>
                    <span style={styles.commentAuthor}>{comment.authorName}</span>
                    <span style={styles.commentDate}>
                      {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  {isCommentAuthor && (
                    <button
                      style={styles.commentDeleteButton}
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>
                <p style={styles.commentContent}>{comment.content}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.footer}>
        <Link to="/forum" style={styles.backToListButton}>
          ← 목록으로
        </Link>
      </div>
    </PageContainer>
    </PageSection>
  );
}

const styles: Record<string, React.CSSProperties> = {
  postHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  categoryBadge: {
    padding: '4px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '13px',
  },
  pinnedBadge: {
    padding: '4px 12px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '13px',
  },
  title: {
    ...typography.headingXL,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '16px',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: '8px',
    ...typography.bodyM,
    color: colors.neutral500,
    paddingBottom: '20px',
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: '24px',
  },
  author: {
    fontWeight: 500,
    color: colors.neutral700,
  },
  separator: {
    color: colors.neutral300,
  },
  content: {
    ...typography.bodyL,
    color: colors.neutral800,
    lineHeight: 1.8,
    minHeight: '200px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '32px',
    paddingTop: '20px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  likeButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral50,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '24px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  likeButtonActive: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
  },
  authorActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  pinButton: {
    padding: '8px 16px',
    backgroundColor: '#fef2f2',
    color: colors.accentRed,
    border: `1px solid #fecaca`,
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  unpinButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  commentsSection: {
    marginTop: '32px',
  },
  commentsTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: '20px',
  },
  commentForm: {
    marginBottom: '24px',
  },
  commentInput: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  commentSubmit: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '20px',
  },
  tagChip: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    padding: '3px 10px',
    borderRadius: '999px',
    whiteSpace: 'nowrap' as const,
  },
  loginPrompt: {
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textAlign: 'center',
  },
  loginPromptText: {
    ...typography.bodyM,
    color: colors.neutral500,
    margin: '0 0 12px',
  },
  loginButton: {
    display: 'inline-block',
    padding: '8px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  commentItem: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  commentHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  commentDeleteButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: colors.neutral500,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  commentAuthor: {
    fontWeight: 500,
    color: colors.neutral700,
    fontSize: '14px',
  },
  commentDate: {
    color: colors.neutral500,
    fontSize: '13px',
  },
  commentContent: {
    ...typography.bodyM,
    color: colors.neutral800,
    margin: 0,
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  backToListButton: {
    display: 'inline-block',
    padding: '12px 32px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    border: `1px solid ${colors.neutral300}`,
    transition: 'all 0.2s',
  },
  // WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1
  appreciationCultureBlock: {
    marginTop: '16px',
    padding: '16px 20px',
    backgroundColor: '#fffbeb',
    borderRadius: '10px',
    border: '1px solid #fde68a',
  },
  appreciationStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#92400e',
  },
  appreciationStatItem: {
    fontSize: '14px',
    color: '#92400e',
  },
  appreciationStatSep: {
    color: '#d97706',
    fontSize: '12px',
  },
  appreciationMessages: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #fde68a',
  },
  appreciationMessagesLabel: {
    margin: '0 0 8px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#b45309',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  appreciationMessageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #fef3c7',
  },
  appreciationMessageText: {
    fontSize: '13px',
    color: '#78350f',
    fontStyle: 'italic',
    flex: 1,
    marginRight: '12px',
  },
  appreciationMessageAmount: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#92400e',
    whiteSpace: 'nowrap' as const,
  },
  appreciationBtnBadge: {
    marginLeft: '6px',
    fontSize: '12px',
    opacity: 0.8,
  },
  // WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
  appreciationButton: {
    padding: '10px 20px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '24px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#92400e',
    transition: 'all 0.2s',
  },
  appreciationCount: {
    fontSize: '14px',
    color: '#92400e',
    padding: '10px 12px',
  },
  appreciationOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  appreciationModal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '28px 24px',
    width: '360px',
    maxWidth: '90vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  appreciationModalTitle: {
    margin: '0 0 8px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  appreciationModalDesc: {
    margin: '0 0 20px',
    fontSize: '14px',
    color: '#6b7280',
  },
  appreciationPresets: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  presetButton: {
    flex: 1,
    padding: '10px 0',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    backgroundColor: '#f9fafb',
    color: '#374151',
  },
  presetButtonActive: {
    border: '1px solid #f59e0b',
    backgroundColor: '#fffbeb',
    color: '#92400e',
  },
  appreciationInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box' as const,
  },
  appreciationTextarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical' as const,
    marginBottom: '20px',
    boxSizing: 'border-box' as const,
  },
  appreciationModalActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  appreciationCancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  appreciationSendButton: {
    padding: '10px 20px',
    backgroundColor: '#f59e0b',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // WO-O4O-KPA-CLOSED-FORUM-FRONTEND-ACCESS-UX-V1: generic error fallback
  accessDenied: {
    maxWidth: '480px',
    margin: '60px auto',
    padding: '48px 24px',
    textAlign: 'center' as const,
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
  },
  accessDeniedIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  accessDeniedTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: '0 0 8px',
  },
  accessDeniedDesc: {
    ...typography.bodyM,
    color: colors.neutral500,
    margin: '0 0 24px',
  },
  accessDeniedBack: {
    padding: '10px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
