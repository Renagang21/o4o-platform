/**
 * ForumDetailPage - 포럼 상세 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { blocksToHtml } from '@o4o/forum-core/utils';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { forumApi } from '../../api';
import { forumMembershipApi } from '../../api/forum';
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
  const [isPinning, setIsPinning] = useState(false);
  // WO-KPA-A-PRIVATE-FORUM-JOIN-UX-CONNECT-V1
  const [closedCategoryId, setClosedCategoryId] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<'none' | 'pending' | 'member' | 'loading'>('none');
  const [isRequesting, setIsRequesting] = useState(false);

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

      // Check if current user is the forum owner
      // WO-O4O-FORUM-CATEGORY-CLEANUP-V1: use forumId (forum_category_requests)
      const resolvedForumId = postRes.data?.forumId || postRes.data?.categoryId;
      if (resolvedForumId && user?.id) {
        try {
          const catRes = await forumApi.getCategory(resolvedForumId);
          // forum_category_requests.requester_id (entity property: requesterId) = 포럼 소유자
          setIsForumOwner(catRes.data?.requesterId === user.id);
        } catch {
          // non-critical — ignore
        }
      }
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      const code = err?.response?.data?.code || err?.code;
      if (status === 403 && code === 'CLOSED_FORUM_ACCESS_DENIED') {
        setError('비공개 포럼입니다. 가입 신청 후 승인을 받으면 열람할 수 있습니다.');
        // WO-KPA-A-PRIVATE-FORUM-JOIN-UX-CONNECT-V1: Extract forumId for join request
        // WO-O4O-FORUM-CATEGORY-CLEANUP-V1: prefer forumId, fallback to categoryId
        const catId = err?.data?.forumId || err?.data?.categoryId;
        if (catId) {
          setClosedCategoryId(catId);
          if (user) {
            setJoinStatus('loading');
            try {
              const statusRes = await forumMembershipApi.getMembershipStatus(catId);
              const d = statusRes.data;
              if (d.isMember) setJoinStatus('member');
              else if (d.pendingRequest) setJoinStatus('pending');
              else setJoinStatus('none');
            } catch {
              setJoinStatus('none');
            }
          }
        }
      } else {
        setError(err instanceof Error ? err.message : '게시글을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // WO-KPA-A-PRIVATE-FORUM-JOIN-UX-CONNECT-V1: 가입 신청
  const handleJoinRequest = async () => {
    if (!closedCategoryId || isRequesting) return;
    setIsRequesting(true);
    try {
      await forumMembershipApi.requestJoin(closedCategoryId);
      setJoinStatus('pending');
      toast.success('가입 신청이 완료되었습니다. 포럼 운영자의 승인을 기다려주세요.');
    } catch (err: any) {
      const errCode = err?.code;
      if (errCode === 'ALREADY_MEMBER') {
        toast.info('이미 회원입니다. 페이지를 새로고침해주세요.');
        setJoinStatus('member');
      } else if (errCode === 'PENDING_REQUEST') {
        toast.info('이미 가입 신청이 진행 중입니다.');
        setJoinStatus('pending');
      } else {
        toast.error(err?.message || '가입 신청에 실패했습니다.');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleLike = async () => {
    if (!post || !user || isLiking) return;
    try {
      setIsLiking(true);
      const res = await forumApi.likePost(post.id);
      setPost({ ...post, likeCount: res.data.likeCount });
      setIsLiked((res.data as any).isLiked ?? !isLiked);
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

  if (loading) {
    return <LoadingSpinner message="게시글을 불러오는 중..." />;
  }

  if (error || !post) {
    const isClosed = error?.includes('비공개 포럼');
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <span style={styles.accessDeniedIcon}>{isClosed ? '🔒' : '⚠️'}</span>
          <h2 style={styles.accessDeniedTitle}>
            {isClosed ? '비공개 포럼' : '게시글을 찾을 수 없습니다'}
          </h2>
          <p style={styles.accessDeniedDesc}>
            {error || '삭제되었거나 존재하지 않는 게시글입니다.'}
          </p>

          {isClosed && closedCategoryId && user && (
            <div style={styles.joinSection}>
              {joinStatus === 'loading' ? (
                <p style={styles.joinStatusText}>상태 확인 중...</p>
              ) : joinStatus === 'pending' ? (
                <div style={styles.joinPendingBox}>
                  <p style={styles.joinStatusText}>
                    가입 신청이 진행 중입니다. 포럼 운영자의 승인을 기다려주세요.
                  </p>
                </div>
              ) : joinStatus === 'member' ? (
                <div style={styles.joinApprovedBox}>
                  <p style={styles.joinStatusText}>
                    가입이 승인되었습니다.
                  </p>
                  <button style={styles.joinButton} onClick={() => window.location.reload()}>
                    새로고침
                  </button>
                </div>
              ) : (
                <button
                  style={styles.joinButton}
                  onClick={handleJoinRequest}
                  disabled={isRequesting}
                >
                  {isRequesting ? '신청 중...' : '가입 신청'}
                </button>
              )}
            </div>
          )}

          {isClosed && !user && (
            <p style={styles.loginHint}>
              가입 신청을 하려면 먼저 로그인해주세요.
            </p>
          )}

          <button style={styles.accessDeniedBack} onClick={() => navigate('/forum')}>
            목록으로
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = hasAnyRole(user?.roles ?? [], [...PLATFORM_ROLES, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_SUPER_ADMIN]);
  const isAuthor = user?.id === post.authorId || isAdmin;

  return (
    <div style={styles.container}>
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
          <span style={styles.author}>{post.authorName}</span>
          <span style={styles.separator}>·</span>
          <span>{new Date(post.createdAt).toLocaleString()}</span>
          <span style={styles.separator}>·</span>
          <span>조회 {post.viewCount}</span>
        </div>

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

      {/* 참여 안내 */}
      <p style={styles.engagementGuide}>
        {user
          ? '의견이 있다면 아래 댓글로 나눠주세요.'
          : ''}
        {!user && (
          <>
            <Link to="/login" style={styles.engagementLink}>로그인</Link>하면 좋아요와 댓글을 남길 수 있습니다.
          </>
        )}
      </p>

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
          {comments.map(comment => (
            <div key={comment.id} style={styles.commentItem}>
              <div style={styles.commentHeader}>
                <span style={styles.commentAuthor}>{comment.authorName}</span>
                <span style={styles.commentDate}>
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={styles.commentContent}>{comment.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.footer}>
        <Link to="/forum" style={styles.backToListButton}>
          ← 목록으로
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
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
  engagementGuide: {
    textAlign: 'center',
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '16px',
    marginBottom: 0,
  },
  engagementLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
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
    marginBottom: '8px',
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
  // WO-KPA-A-PRIVATE-FORUM-JOIN-UX-CONNECT-V1
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
  joinSection: {
    marginBottom: '24px',
  },
  joinPendingBox: {
    padding: '16px',
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fde68a',
  },
  joinApprovedBox: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
  },
  joinStatusText: {
    ...typography.bodyM,
    color: colors.neutral700,
    margin: 0,
  },
  joinButton: {
    padding: '10px 28px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loginHint: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginBottom: '24px',
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
