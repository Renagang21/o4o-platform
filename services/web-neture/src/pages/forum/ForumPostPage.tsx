/**
 * ForumPostPage - 게시글 상세 페이지
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * Phase B-2: forum-core API 연동
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
import { blocksToHtml } from '@o4o/forum-core/utils';

/** Convert post content (Block[] or string) to safe HTML */
function contentToHtml(content: string | object[] | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') {
    // Legacy plain text: escape HTML and convert newlines to <br>
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');
  }
  if (Array.isArray(content)) {
    return blocksToHtml(content as any);
  }
  return '';
}

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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 7) {
    return date.toLocaleDateString('ko-KR');
  } else if (days > 0) {
    return `${days}일 전`;
  } else {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) {
      return `${hours}시간 전`;
    }
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes > 0 ? `${minutes}분 전` : '방금 전';
  }
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

function CommentItem({ comment, currentUserId, isAdmin, onUpdate, onDelete, compact }: {
  comment: DisplayComment;
  currentUserId?: string;
  isAdmin?: boolean;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  compact?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = (currentUserId && comment.authorId === currentUserId) || isAdmin;

  const handleSave = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    await onUpdate(comment.id, editContent.trim());
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    await onDelete(comment.id);
  };

  return (
    <div style={compact ? styles.commentCompact : styles.comment}>
      <div style={styles.commentHeader}>
        <span style={styles.commentAuthor}>{comment.authorName}</span>
        <span style={styles.commentDate}>
          {formatRelativeTime(comment.createdAt)}
          {comment.isEdited && ' (수정됨)'}
        </span>
        {isOwner && !isEditing && (
          <div style={styles.commentActions}>
            <button style={compact ? styles.actionBtnMobile : styles.actionBtn} onClick={() => { setIsEditing(true); setEditContent(comment.content); }}>수정</button>
            <button style={compact ? { ...styles.actionBtnMobile, color: '#dc2626' } : { ...styles.actionBtn, color: '#dc2626' }} onClick={handleDelete}>삭제</button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div style={{ marginTop: '8px' }}>
          <textarea
            style={styles.commentTextarea}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
            <button style={compact ? styles.cancelBtnMobile : styles.cancelBtn} onClick={() => setIsEditing(false)}>취소</button>
            <button
              style={{ ...styles.submitButton, padding: compact ? '10px 18px' : '6px 14px', fontSize: '13px', opacity: isSaving ? 0.5 : 1, minHeight: compact ? '44px' : undefined }}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <p style={styles.commentContent}>{comment.content}</p>
      )}
    </div>
  );
}

export function ForumPostPage() {
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
  const isAdmin = user?.roles?.includes('admin') ?? false;

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
      navigate('/forum');
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
        {/* Breadcrumb skeleton */}
        <div style={{ ...styles.breadcrumb, marginBottom: '24px' }}>
          <span style={{ ...styles.skeletonBar, width: '40px' }} />
          <span style={styles.breadcrumbDivider}>/</span>
          <span style={{ ...styles.skeletonBar, width: '40px' }} />
          <span style={styles.breadcrumbDivider}>/</span>
          <span style={{ ...styles.skeletonBar, width: '50px' }} />
        </div>
        {/* Title skeleton */}
        <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ ...styles.skeletonBar, width: '80px', height: '20px', marginBottom: '16px' }} />
          <div style={{ ...styles.skeletonBar, width: '70%', height: '28px', marginBottom: '16px' }} />
          <div style={{ ...styles.skeletonBar, width: '180px', height: '14px' }} />
        </div>
        {/* Content skeleton */}
        <div style={{ marginBottom: '32px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...styles.skeletonBar, width: `${90 - (i * 10)}%`, height: '16px', marginBottom: '12px' }} />
          ))}
        </div>
        {/* Comments skeleton */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <div style={{ ...styles.skeletonBar, width: '100px', height: '18px', marginBottom: '24px' }} />
          {[1, 2].map((i) => (
            <div key={i} style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ ...styles.skeletonBar, width: '120px', height: '14px', marginBottom: '8px' }} />
              <div style={{ ...styles.skeletonBar, width: '80%', height: '14px' }} />
            </div>
          ))}
        </div>
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
        <div style={styles.notFound}>
          <h2 style={styles.notFoundTitle}>게시글을 찾을 수 없습니다</h2>
          <p style={styles.notFoundText}>{error || '요청하신 게시글이 존재하지 않거나 삭제되었습니다.'}</p>
          <Link to="/forum" style={styles.notFoundButton}>
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const postType = normalizePostType(post.type);
  const badge = getTypeBadge(postType);
  const authorName = getAuthorName(post);


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

      {/* Post Header */}
      <header style={styles.postHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={styles.badgeRow}>
            {post.isPinned && (
              <span style={styles.pinnedBadge}>고정</span>
            )}
            <span style={{ ...styles.typeBadge, backgroundColor: badge.bgColor, color: badge.textColor }}>
              {badge.label}
            </span>
          </div>
          {/* Mobile: ⋮ action menu */}
          {isMobile && (isAdmin || (currentUserId && post.authorId === currentUserId)) && (
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
                    onClick={() => { setShowActionMenu(false); navigate(`/forum/write?edit=${post.id}`); }}
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
          )}
        </div>
        <h1 style={isMobile ? styles.postTitleMobile : styles.postTitle}>{post.title}</h1>
        <div style={styles.postMeta}>
          <span style={styles.authorName}>{authorName}</span>
          <span style={styles.metaDivider}>·</span>
          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
        </div>
        {/* Desktop: inline actions */}
        {!isMobile && (isAdmin || (currentUserId && post.authorId === currentUserId)) && (
          <div style={styles.postActions}>
            <button style={styles.actionBtn} onClick={() => navigate(`/forum/write?edit=${post.id}`)}>수정</button>
            <button style={{ ...styles.actionBtn, color: '#dc2626' }} onClick={handleDeletePost}>삭제</button>
          </div>
        )}
      </header>

      {/* Post Content */}
      <article
        style={styles.postContent}
        dangerouslySetInnerHTML={{ __html: contentToHtml(post.content) }}
      />

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
        <button
          style={{
            ...styles.likeButton,
            ...(isLiked ? styles.likeButtonActive : {}),
          }}
          onClick={handleLike}
          disabled={isLiking}
        >
          <span>{isLiked ? '❤️' : '🤍'}</span>
          <span>좋아요{likeCount > 0 ? ` ${likeCount}` : ''}</span>
        </button>
      </div>

      {/* Comments Section */}
      <section style={styles.commentsSection}>
        <h3 style={styles.commentsTitle}>
          댓글 {comments.length}개
        </h3>

        {/* Comment Form */}
        {isAuthenticated ? (
          <div style={styles.commentForm}>
            {commentError && (
              <div style={styles.commentErrorBanner}>
                <p style={styles.commentErrorText}>{commentError}</p>
              </div>
            )}
            <textarea
              style={styles.commentTextarea}
              placeholder="댓글을 입력하세요..."
              rows={4}
              value={commentText}
              onChange={(e) => { setCommentText(e.target.value); setCommentError(null); }}
            />
            <div style={styles.commentFormActions}>
              <button
                style={{
                  ...styles.submitButton,
                  ...(isMobile ? { minHeight: '44px', padding: '10px 18px' } : {}),
                  opacity: !commentText.trim() || isSubmitting ? 0.5 : 1,
                  cursor: !commentText.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || isSubmitting}
              >
                {isSubmitting ? '작성 중...' : '댓글 작성'}
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.loginPrompt}>
            <p>댓글을 작성하려면 <button onClick={() => openLoginModal()} style={styles.loginLink}>로그인</button>이 필요합니다.</p>
          </div>
        )}

        {/* Comments List */}
        <div style={styles.commentsList}>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} isAdmin={isAdmin} onUpdate={handleUpdateComment} onDelete={handleDeleteComment} compact={isMobile} />
            ))
          ) : (
            <div style={styles.noComments}>
              <p>아직 댓글이 없습니다.</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>의견을 나누면 더 깊은 대화가 시작됩니다.</p>
            </div>
          )}
        </div>
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
  skeletonBar: {
    display: 'block',
    height: '14px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  } as React.CSSProperties,
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
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
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
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 16px 0',
    lineHeight: 1.4,
  },
  postTitleMobile: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
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
  postMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
  },
  authorName: {
    fontWeight: 500,
    color: '#1e293b',
  },
  metaDivider: {
    color: '#cbd5e1',
  },
  postContent: {
    marginBottom: '32px',
    fontSize: '16px',
    lineHeight: 1.8,
    color: '#334155',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: 1.8,
    color: '#334155',
    margin: '0 0 16px 0',
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
  likeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: '24px',
    backgroundColor: '#fff',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  likeButtonActive: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
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
  commentErrorBanner: {
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  commentErrorText: {
    fontSize: '13px',
    color: '#dc2626',
    margin: 0,
  },
  commentTextarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  commentFormActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
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
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  comment: {
    padding: '20px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  commentAuthor: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },
  commentDate: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  commentActions: {
    display: 'flex',
    gap: '8px',
    marginLeft: 'auto',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '2px 6px',
  },
  actionBtnMobile: {
    background: 'none',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '8px 12px',
    minHeight: '36px',
    borderRadius: '6px',
  } as React.CSSProperties,
  cancelBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '6px 14px',
    borderRadius: '6px',
  },
  cancelBtnMobile: {
    background: 'none',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '10px 18px',
    minHeight: '44px',
    borderRadius: '6px',
  } as React.CSSProperties,
  commentCompact: {
    padding: '16px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  postActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  commentContent: {
    fontSize: '14px',
    lineHeight: 1.7,
    color: '#475569',
    margin: 0,
  },
  noComments: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
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
  notFound: {
    textAlign: 'center',
    padding: '80px 20px',
  },
  notFoundTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  notFoundText: {
    fontSize: '15px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  notFoundButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#2563eb',
    textDecoration: 'none',
    borderRadius: '8px',
  },
};

export default ForumPostPage;
