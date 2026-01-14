/**
 * ForumPage - 포럼 홈 페이지
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * Phase B-2: forum-core API 연동
 *
 * 역할: Home에서 시작된 "이해와 질문"을 정식 대화와 기록으로 완결
 * - 커뮤니티 ❌ / 고객센터 ❌
 * - 질문·의견·제안의 공식 기록 공간
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchForumPosts,
  fetchPinnedPosts,
  normalizePostType,
  getAuthorName,
  type ForumPost as ApiForumPost,
  type PostType as ApiPostType,
} from '../../services/forumApi';

// Local post type for UI
type PostType = 'discussion' | 'question' | 'announcement' | 'poll' | 'guide';

interface DisplayPost {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  authorName: string;
  isPinned: boolean;
  commentCount: number;
  createdAt: string;
}

function apiTypeToDisplayType(apiType: ApiPostType): PostType {
  const map: Record<string, PostType> = {
    DISCUSSION: 'discussion',
    QUESTION: 'question',
    ANNOUNCEMENT: 'announcement',
    POLL: 'poll',
    GUIDE: 'guide',
  };
  return map[apiType] || 'discussion';
}

function toDisplayPost(post: ApiForumPost): DisplayPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    type: apiTypeToDisplayType(normalizePostType(post.type)),
    authorName: getAuthorName(post),
    isPinned: post.isPinned,
    commentCount: post.commentCount || 0,
    createdAt: post.createdAt,
  };
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

function getTypeBadge(type: PostType): { label: string; bgColor: string; textColor: string } | null {
  const badges: Record<PostType, { label: string; bgColor: string; textColor: string }> = {
    announcement: { label: '공지', bgColor: '#fef2f2', textColor: '#dc2626' },
    question: { label: '질문', bgColor: '#f0fdf4', textColor: '#16a34a' },
    guide: { label: '가이드', bgColor: '#fefce8', textColor: '#ca8a04' },
    discussion: { label: '토론', bgColor: '#eff6ff', textColor: '#2563eb' },
    poll: { label: '투표', bgColor: '#faf5ff', textColor: '#9333ea' },
  };
  // discussion은 기본 타입이므로 배지 표시하지 않음
  if (type === 'discussion') return null;
  return badges[type];
}

function PostItem({ post, onClick }: { post: DisplayPost; onClick: () => void }) {
  const badge = getTypeBadge(post.type);

  return (
    <article style={styles.postItem} onClick={onClick}>
      <div style={styles.postContent}>
        <div style={styles.postTitleRow}>
          {post.isPinned && (
            <span style={styles.pinnedBadge}>고정</span>
          )}
          {badge && (
            <span style={{ ...styles.typeBadge, backgroundColor: badge.bgColor, color: badge.textColor }}>
              {badge.label}
            </span>
          )}
          <h3 style={styles.postTitle}>{post.title}</h3>
          {post.commentCount > 0 && (
            <span style={styles.commentCount}>[{post.commentCount}]</span>
          )}
        </div>
        <div style={styles.postMeta}>
          <span>{post.authorName}</span>
          <span style={styles.metaDivider}>·</span>
          <span>{formatRelativeTime(post.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}

export function ForumPage({ boardSlug }: { boardSlug?: string }) {
  const navigate = useNavigate();
  const [pinnedPosts, setPinnedPosts] = useState<DisplayPost[]>([]);
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPosts() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch pinned and regular posts in parallel
        // TODO: Add categorySlug filter when API supports it
        const [pinnedResponse, postsResponse] = await Promise.all([
          fetchPinnedPosts(2),
          fetchForumPosts({ page: 1, limit: 20 }),
        ]);

        setPinnedPosts(pinnedResponse.map(toDisplayPost));

        // Filter out pinned posts from regular list
        const pinnedIds = new Set(pinnedResponse.map(p => p.id));
        const regularPosts = postsResponse.data
          .filter(p => !pinnedIds.has(p.id) && !p.isPinned)
          .map(toDisplayPost);

        setPosts(regularPosts);
        setTotalCount(postsResponse.totalCount);
      } catch (err) {
        console.error('Error loading forum posts:', err);
        setError('게시글을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadPosts();
  }, [boardSlug]);

  const handlePostClick = (post: DisplayPost) => {
    navigate(`/forum/post/${post.slug}`);
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.pageTitle}>o4o · 네뚜레 의견 나누기</h1>
            <p style={styles.pageDescription}>
              o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다.
            </p>
          </div>
          <Link to="/forum/write" style={styles.writeButton}>
            의견 남기기
          </Link>
        </div>
      </header>

      {/* Notice Banner */}
      <div style={styles.noticeBanner}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <p style={styles.noticeText}>
          이 포럼은 상품 홍보나 고객 문의를 위한 공간이 아닙니다.
          <br />
          o4o와 네뚜레 구조에 대한 질문과 의견을 남겨주세요.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={styles.loadingState}>
          <p>게시글을 불러오는 중...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.errorState}>
          <p>{error}</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Pinned Posts */}
          {pinnedPosts.length > 0 && (
            <section style={styles.pinnedSection}>
              {pinnedPosts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                />
              ))}
            </section>
          )}

          {/* Post List */}
          <section style={styles.postList}>
            <div style={styles.listHeader}>
              <span style={styles.totalCount}>총 {totalCount}개의 게시글</span>
            </div>
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                />
              ))
            ) : (
              <div style={styles.emptyState}>
                <p>아직 등록된 글이 없습니다.</p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Back to Home */}
      <div style={styles.footer}>
        <Link to="/" style={styles.backLink}>
          ← 홈으로 돌아가기
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
  header: {
    marginBottom: '32px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
  },
  writeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: PRIMARY_COLOR,
    textDecoration: 'none',
    borderRadius: '8px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  pageDescription: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
  noticeBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '24px',
  },
  noticeIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.6,
    margin: 0,
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '15px',
  },
  errorState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#dc2626',
    fontSize: '15px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '15px',
  },
  pinnedSection: {
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fde68a',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  postList: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  listHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  totalCount: {
    fontSize: '13px',
    color: '#64748b',
  },
  postItem: {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  postContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  postTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  pinnedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '4px',
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '4px',
  },
  postTitle: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#1e293b',
    margin: 0,
  },
  commentCount: {
    fontSize: '13px',
    color: PRIMARY_COLOR,
    fontWeight: 500,
  },
  postMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  metaDivider: {
    color: '#cbd5e1',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
};

export default ForumPage;
