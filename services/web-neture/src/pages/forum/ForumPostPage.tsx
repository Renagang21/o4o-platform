/**
 * ForumPostPage - 게시글 상세 페이지
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * Phase B-2: forum-core API 연동
 *
 * WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1:
 *   자체 구현하던 스켈레톤 / 헤더 / 좋아요 버튼 / 댓글 폼 / 댓글 목록(인라인 수정) /
 *   content→html 변환을 `@o4o/shared-space-ui` 공통 부품으로 수렴한다.
 *   Neture 고유(작성자 연락 섹션 · basePath · 모바일 ⋮ 액션 메뉴 · 로그인 모달)는 그대로 유지한다.
 *
 * 역할: 의견을 읽고, 맥락을 이해하고, 답할 수 있는 공간
 * - 광고/추천 ❌
 * - 사이드바 ❌
 * - 오직 글 → 댓글 흐름
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';

/** Inline media query hook */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
import { useAuth, useLoginModal } from '../../contexts';
import {
  fetchForumPostBySlug,
  fetchForumComments,
  createForumComment,
  updateForumComment,
  deleteForumComment,
  deleteForumPost,
  toggleForumPostLike,
  normalizePostType,
  getAuthorName,
  extractTextContent,
  shouldShowAuthorContact,
  type ForumPost,
  type ForumComment as ApiForumComment,
  type PostType,
} from '../../services/forumApi';
// WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1 / WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1
import {
  ForumPostContent,
  ForumPostHeader,
  ForumDetailNotFoundState,
  ForumDetailSkeletonState,
  ForumCommentList,
  ForumCommentForm,
  ForumLikeButton,
  formatForumDate,
} from '@o4o/shared-space-ui';

interface DisplayComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  isEdited?: boolean;
  createdAt: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeBadge(type: PostType): { label: string; bgColor: string; textColor: string } {
  const badges: Record<string, { label: string; bgColor: string; textColor: string }> = {
    announcement: { label: '공지', bgColor: '#fef2f2', textColor: '#dc2626' },
    question: { label: '질문', bgColor: '#f0fdf4', textColor: '#16a34a' },
    guide: { label: '가이드', bgColor: '#fefce8', textColor: '#ca8a04' },
    discussion: { label: '토론', bgColor: '#eff6ff', textColor: '#2563eb' },
    poll: { label: '투표', bgColor: '#faf5ff', textColor: '#9333ea' },
  };
  return badges[type] || badges.discussion;
}

function toDisplayComment(comment: ApiForumComment): DisplayComment {
  const authorName = comment.author?.name || comment.author?.username || '익명';
  const content = typeof comment.content === 'string'
    ? comment.content
    : extractTextContent(comment.content);

  return {
    id: comment.id,
    content,
    authorId: comment.authorId || comment.author?.id || '',
    authorName,
    isEdited: comment.isEdited,
    createdAt: comment.createdAt,
  };
}

export function ForumPostPage({ basePath = '/forum' }: { basePath?: string } = {}) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<DisplayComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id;
  const isAdmin = user?.roles?.some(r => r === 'neture:admin' || r === 'platform:super_admin') ?? false;

  // Close action menu on outside click
  useEffect(() => {
    if (!showActionMenu) return;
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showActionMenu]);

  useEffect(() => {
    async function loadPost() {
      if (!slug) {
        setError('게시글을 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchForumPostBySlug(slug);

        if (!response || !response.data) {
          setError('게시글을 찾을 수 없습니다.');
          setIsLoading(false);
          return;
        }

        setPost(response.data);
        setLikeCount(response.data.likeCount || 0);

        // Fetch comments
        const commentsResponse = await fetchForumComments(response.data.id);
        if (commentsResponse.success) {
          setComments(commentsResponse.data.map(toDisplayComment));
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError('게시글을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadPost();
  }, [slug]);

  const handleDeletePost = async () => {
    if (!post || !confirm('게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    const result = await deleteForumPost(post.id);
    if (result.success) {
      navigate(basePath);
    } else {
      toast.error(result.error || '게시글 삭제에 실패했습니다.');
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    const result = await updateForumComment(commentId, content);
    if (result.success && result.data) {
      setComments(prev => prev.map(c => c.id === commentId ? toDisplayComment(result.data!) : c));
    } else {
      toast.error(result.error || '댓글 수정에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    const result = await deleteForumComment(commentId);
    if (result.success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    } else {
      toast.error(result.error || '댓글 삭제에 실패했습니다.');
    }
  };

  const handleLike = async () => {
    if (!post || isLiking) return;
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    setIsLiking(true);
    const result = await toggleForumPostLike(post.id);
    if (result.success && result.data) {
      setLikeCount(result.data.likeCount);
      setIsLiked(result.data.isLiked);
    }
    setIsLiking(false);
  };

  const handleSubmitComment = async () => {
    if (!post || !commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setCommentError(null);
    const result = await createForumComment(post.id, commentText.trim());

    if (result.success && result.data) {
      setComments(prev => [...prev, toDisplayComment(result.data!)]);
      setCommentText('');
    } else {
      // Keep input content, show inline error
      setCommentError(result.error || '댓글 작성에 실패했습니다.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <ForumDetailSkeletonState />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.container}>
        <nav style={styles.breadcrumb}>
          <Link to="/" style={styles.breadcrumbLink}>홈</Link>
          <span style={styles.breadcrumbDivider}>/</span>
          <Link to="/forum" style={styles.breadcrumbLink}>포럼</Link>
        </nav>
        <ForumDetailNotFoundState
          message={error || '요청하신 게시글이 존재하지 않거나 삭제되었습니다.'}
          backLabel="목록으로 돌아가기"
          onBack={() => navigate(basePath || '/forum')}
        />
      </div>
    );
  }

  const postType = normalizePostType(post.type);
  const badge = getTypeBadge(postType);
  const authorName = getAuthorName(post);
  const canManagePost = isAdmin || (!!currentUserId && post.authorId === currentUserId);

  return (
    <div style={isMobile ? styles.containerMobile : styles.container}>
      {/* Breadcrumb */}
      <nav style={styles.breadcrumb}>
        <Link to="/" style={styles.breadcrumbLink}>홈</Link>
        <span style={styles.breadcrumbDivider}>/</span>
        <Link to="/forum" style={styles.breadcrumbLink}>포럼</Link>
        <span style={styles.breadcrumbDivider}>/</span>
        <span style={styles.breadcrumbCurrent}>게시글</span>
      </nav>

      {/* Post Header — 공통 ForumPostHeader + Neture 고유 badge/action slot */}
      <ForumPostHeader
        title={post.title}
        authorName={authorName}
        createdAt={formatDate(post.publishedAt || post.createdAt)}
        style={styles.postHeader}
        titleStyle={isMobile ? styles.postTitleMobile : styles.postTitle}
        badgeSlot={
          <>
            {post.isPinned && <span style={styles.pinnedBadge}>고정</span>}
            <span style={{ ...styles.typeBadge, backgroundColor: badge.bgColor, color: badge.textColor }}>
              {badge.label}
            </span>
          </>
        }
        actionSlot={
          canManagePost ? (
            isMobile ? (
              /* Mobile: ⋮ action menu */
              <div ref={actionMenuRef} style={styles.moreMenuWrapper}>
                <button
                  style={styles.moreMenuButton}
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  aria-label="게시글 메뉴"
                >
                  ⋮
                </button>
                {showActionMenu && (
                  <div style={styles.moreMenuDropdown}>
                    <button
                      style={styles.moreMenuItem}
                      onClick={() => { setShowActionMenu(false); navigate(`${basePath}/write?edit=${post.id}`); }}
                    >
                      수정
                    </button>
                    <button
                      style={{ ...styles.moreMenuItem, color: '#dc2626' }}
                      onClick={() => { setShowActionMenu(false); handleDeletePost(); }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: inline actions */
              <>
                <button style={styles.actionBtn} onClick={() => navigate(`${basePath}/write?edit=${post.id}`)}>수정</button>
                <button style={{ ...styles.actionBtn, color: '#dc2626' }} onClick={handleDeletePost}>삭제</button>
              </>
            )
          ) : null
        }
      />

      {/* Post Content — legacy plain-text 는 escape 후 개행 변환(공통 변환기 옵션) */}
      <ForumPostContent content={post.content} escapePlainText style={styles.postContent} />

      {/* WO-NETURE-EXTERNAL-CONTACT-V1: Author Contact Section */}
      {shouldShowAuthorContact(post) && (
        <div style={styles.contactSection}>
          <div style={styles.contactHeader}>
            <span style={styles.contactIcon}>💬</span>
            <h4 style={styles.contactTitle}>작성자에게 연락하기</h4>
          </div>
          <p style={styles.contactDescription}>
            {authorName}님과 대화를 원하시면 아래 링크를 통해 연락하세요.
          </p>
          <div style={styles.contactLinks}>
            {post.author?.kakaoOpenChatUrl && (
              <a
                href={post.author.kakaoOpenChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.contactLink}
              >
                <span style={styles.kakaoIcon}>💬</span>
                카카오톡 오픈채팅
              </a>
            )}
            {post.author?.kakaoChannelUrl && (
              <a
                href={post.author.kakaoChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.contactLinkSecondary}
              >
                <span style={styles.kakaoIcon}>📢</span>
                카카오 채널
              </a>
            )}
          </div>
          <p style={styles.contactNote}>
            연락 시 이 글의 내용을 언급하시면 원활한 소통에 도움이 됩니다.
          </p>
        </div>
      )}

      {/* Like Button */}
      <div style={styles.likeBar}>
        <ForumLikeButton
          liked={isLiked}
          count={likeCount}
          disabled={isLiking}
          onClick={handleLike}
          compact={isMobile}
        />
      </div>

      {/* Comments Section */}
      <section style={styles.commentsSection}>
        <h3 style={styles.commentsTitle}>
          댓글 {comments.length}개
        </h3>

        {/* Comment Form */}
        <ForumCommentForm
          value={commentText}
          onChange={(v) => { setCommentText(v); setCommentError(null); }}
          onSubmit={handleSubmitComment}
          submitting={isSubmitting}
          authenticated={isAuthenticated}
          error={commentError}
          placeholder="댓글을 입력하세요..."
          rows={4}
          submitLabel="댓글 작성"
          submittingLabel="작성 중..."
          compact={isMobile}
          accentColor={PRIMARY_COLOR}
          style={styles.commentForm}
          loginPrompt={
            <div style={styles.loginPrompt}>
              <p>댓글을 작성하려면 <button onClick={() => openLoginModal()} style={styles.loginLink}>로그인</button>이 필요합니다.</p>
            </div>
          }
        />

        {/* Comments List — 인라인 수정/삭제는 공통 부품이 제공, mutation 은 서비스 adapter 소유 */}
        <ForumCommentList
          comments={comments.map((c) => ({
            id: c.id,
            authorName: c.authorName,
            content: c.content,
            createdAt: `${formatForumDate(c.createdAt)}${c.isEdited ? ' (수정됨)' : ''}`,
            isAuthor: (!!currentUserId && c.authorId === currentUserId) || isAdmin,
          }))}
          onEditComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          compact={isMobile}
          accentColor={PRIMARY_COLOR}
          emptyMessage="아직 댓글이 없습니다."
          emptyDescription="의견을 나누면 더 깊은 대화가 시작됩니다."
        />
      </section>

      {/* Footer */}
      <div style={styles.footer}>
        <Link to="/forum" style={styles.backToList}>
          다른 글 둘러보기 →
        </Link>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  containerMobile: {
    maxWidth: '100%',
    margin: '0 auto',
    padding: '16px 12px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    marginBottom: '24px',
  },
  breadcrumbLink: {
    color: '#64748b',
    textDecoration: 'none',
  },
  breadcrumbDivider: {
    color: '#cbd5e1',
  },
  breadcrumbCurrent: {
    color: '#94a3b8',
  },
  postHeader: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e2e8f0',
  },
  pinnedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '4px',
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '4px',
  },
  postTitle: {
    fontSize: '28px',
    lineHeight: 1.4,
    margin: '0 0 16px 0',
  },
  postTitleMobile: {
    fontSize: '20px',
    lineHeight: 1.4,
    margin: '0 0 12px 0',
  },
  // ⋮ action menu (mobile)
  moreMenuWrapper: {
    position: 'relative',
  } as React.CSSProperties,
  moreMenuButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    minHeight: '44px',
    fontSize: '20px',
    fontWeight: 700,
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '8px',
    padding: 0,
    lineHeight: 1,
  } as React.CSSProperties,
  moreMenuDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    minWidth: '120px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 100,
    overflow: 'hidden',
  } as React.CSSProperties,
  moreMenuItem: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    minHeight: '44px',
    fontSize: '14px',
    color: '#334155',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    textAlign: 'left',
  } as React.CSSProperties,
  postContent: {
    marginBottom: '32px',
    fontSize: '16px',
    lineHeight: 1.8,
    color: '#334155',
  },

  // WO-NETURE-EXTERNAL-CONTACT-V1: Contact Section
  contactSection: {
    padding: '24px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    marginBottom: '48px',
  },
  contactHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  contactIcon: {
    fontSize: '18px',
  },
  contactTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e',
    margin: 0,
  },
  contactDescription: {
    fontSize: '14px',
    color: '#78350f',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  },
  contactLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '12px',
  },
  contactLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#fee500',
    color: '#3c1e1e',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
  contactLinkSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#fff',
    color: '#3c1e1e',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
  kakaoIcon: {
    fontSize: '16px',
  },
  contactNote: {
    fontSize: '13px',
    color: '#a16207',
    margin: 0,
    fontStyle: 'italic',
  },

  likeBar: {
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 0',
    borderTop: '1px solid #e2e8f0',
    marginTop: '32px',
  },
  commentsSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '32px',
  },
  commentsTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 24px 0',
  },
  commentForm: {
    marginBottom: '32px',
  },
  loginPrompt: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '32px',
    fontSize: '14px',
    color: '#64748b',
  },
  loginLink: {
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'inherit',
    padding: 0,
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '2px 6px',
  },
  footer: {
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  backToList: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
};

export default ForumPostPage;
