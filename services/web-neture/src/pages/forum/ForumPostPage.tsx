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

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts';
import {
  fetchForumPostBySlug,
  fetchForumComments,
  normalizePostType,
  getAuthorName,
  extractTextContent,
  shouldShowAuthorContact,
  type ForumPost,
  type ForumComment as ApiForumComment,
  type PostType,
} from '../../services/forumApi';

interface DisplayComment {
  id: string;
  content: string;
  authorName: string;
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
    authorName,
    createdAt: comment.createdAt,
  };
}

function CommentItem({ comment }: { comment: DisplayComment }) {
  return (
    <div style={styles.comment}>
      <div style={styles.commentHeader}>
        <span style={styles.commentAuthor}>{comment.authorName}</span>
        <span style={styles.commentDate}>{formatRelativeTime(comment.createdAt)}</span>
      </div>
      <p style={styles.commentContent}>{comment.content}</p>
    </div>
  );
}

export function ForumPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<DisplayComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <p>게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.container}>
        <div style={styles.notFound}>
          <h2 style={styles.notFoundTitle}>게시글을 찾을 수 없습니다</h2>
          <p style={styles.notFoundText}>{error || '요청하신 게시글이 존재하지 않거나 삭제되었습니다.'}</p>
          <Link to="/forum" style={styles.backToList}>
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const postType = normalizePostType(post.type);
  const badge = getTypeBadge(postType);
  const authorName = getAuthorName(post);
  const contentText = extractTextContent(post.content);

  return (
    <div style={styles.container}>
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
        <div style={styles.badgeRow}>
          {post.isPinned && (
            <span style={styles.pinnedBadge}>고정</span>
          )}
          <span style={{ ...styles.typeBadge, backgroundColor: badge.bgColor, color: badge.textColor }}>
            {badge.label}
          </span>
        </div>
        <h1 style={styles.postTitle}>{post.title}</h1>
        <div style={styles.postMeta}>
          <span style={styles.authorName}>{authorName}</span>
          <span style={styles.metaDivider}>·</span>
          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
        </div>
      </header>

      {/* Post Content */}
      <article style={styles.postContent}>
        {contentText.split('\n').map((paragraph, index) => (
          <p key={index} style={styles.paragraph}>
            {paragraph || '\u00A0'}
          </p>
        ))}
      </article>

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

      {/* Comments Section */}
      <section style={styles.commentsSection}>
        <h3 style={styles.commentsTitle}>
          댓글 {comments.length}개
        </h3>

        {/* Comment Form */}
        {isAuthenticated ? (
          <div style={styles.commentForm}>
            <textarea
              style={styles.commentTextarea}
              placeholder="댓글을 입력하세요..."
              rows={4}
            />
            <div style={styles.commentFormActions}>
              <button style={styles.submitButton}>댓글 작성</button>
            </div>
          </div>
        ) : (
          <div style={styles.loginPrompt}>
            <p>댓글을 작성하려면 <Link to="/login" style={styles.loginLink}>로그인</Link>이 필요합니다.</p>
          </div>
        )}

        {/* Comments List */}
        <div style={styles.commentsList}>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          ) : (
            <div style={styles.noComments}>
              <p>아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <div style={styles.footer}>
        <Link to="/forum" style={styles.backToList}>
          ← 목록으로 돌아가기
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
  loadingState: {
    padding: '80px 20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '15px',
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
};

export default ForumPostPage;
