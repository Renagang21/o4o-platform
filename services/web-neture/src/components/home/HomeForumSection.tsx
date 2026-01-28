/**
 * HomeForumSection - Home 하단 포럼 미리보기 섹션
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * Phase B-2: forum-core API 연동
 *
 * 목적:
 * - o4o 개념에 대한 질문 유도
 * - 네뚜레 구조에 대한 의견 수렴
 * - 운영자가 던진 질문 노출
 * - 포럼 전체 페이지로의 동선 제공
 *
 * 금지:
 * - 커뮤니티 느낌 (통계, 좋아요, 조회수 표시 금지)
 * - 고객센터 느낌
 * - SNS/채팅 느낌
 *
 * NOTE: Home 하단 포럼은 단일 게시판(neture-forum)만을 대상으로 한다.
 * 추후 게시판 확장이 있더라도 Home에서는 이 slug만 사용한다.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchPinnedPosts,
  fetchForumPosts,
  normalizePostType,
  getAuthorName,
  extractTextContent,
  type ForumPost,
} from '../../services/forumApi';
import type { ForumPostType } from '@o4o/types/forum';

// ============================================================
// Types
// ============================================================

type DisplayPostType = ForumPostType;

interface HomeForumPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  authorName?: string;
  createdAt: string;
  isPinned: boolean;
  type: DisplayPostType;
  // NOTE: commentCount는 데이터로는 보유하되 UI 표시는 하지 않음 (커뮤니티 느낌 차단)
  commentCount: number;
}

// ============================================================
// Constants
// ============================================================

/**
 * NOTE: Home 하단 포럼은 단일 게시판(neture-forum)만을 대상으로 한다.
 * 추후 게시판 확장이 있더라도 Home에서는 이 slug만 사용한다.
 */
const FORUM_CONFIG = {
  categorySlug: 'neture-forum',
  maxRecentPosts: 5,
  displayRecentPosts: 3,
  displayPinnedPosts: 1,
} as const;

// ============================================================
// Helper Functions
// ============================================================

function apiTypeToDisplayType(type: string): DisplayPostType {
  // API now returns lowercase values matching DisplayPostType directly
  const valid: DisplayPostType[] = ['discussion', 'question', 'announcement', 'poll', 'guide'];
  const lower = type.toLowerCase() as DisplayPostType;
  return valid.includes(lower) ? lower : 'discussion';
}

function toHomeForumPost(post: ForumPost): HomeForumPost {
  const normalizedType = normalizePostType(post.type);
  const contentText = extractTextContent(post.content);
  const excerpt = contentText.length > 100 ? contentText.slice(0, 100) + '...' : contentText;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt,
    authorName: getAuthorName(post),
    createdAt: post.publishedAt || post.createdAt,
    isPinned: post.isPinned || false,
    type: apiTypeToDisplayType(normalizedType),
    commentCount: post.commentCount || 0,
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * 상대 시간 포맷 (예: "2시간 전")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString('ko-KR');
  } else if (days > 0) {
    return `${days}일 전`;
  } else if (hours > 0) {
    return `${hours}시간 전`;
  } else if (minutes > 0) {
    return `${minutes}분 전`;
  } else {
    return '방금 전';
  }
}

/**
 * 고정글 우선순위 정렬
 * ANNOUNCEMENT > QUESTION > 나머지
 */
function sortPinnedByPriority(posts: HomeForumPost[]): HomeForumPost[] {
  const priority: Record<string, number> = {
    announcement: 1,
    question: 2,
    guide: 3,
    discussion: 4,
    poll: 5,
  };

  return [...posts].sort((a, b) => {
    return (priority[a.type] || 99) - (priority[b.type] || 99);
  });
}

// ============================================================
// Sub-Components
// ============================================================

/**
 * 고정글 카드 (강조 표시)
 */
function PinnedPostCard({ post }: { post: HomeForumPost }) {
  return (
    <Link
      to={`/forum/post/${post.slug}`}
      style={styles.pinnedCard}
    >
      <div style={styles.pinnedBadge}>
        <span style={styles.pinnedIcon}>📌</span>
        <span style={styles.pinnedLabel}>공지</span>
      </div>
      <h4 style={styles.pinnedTitle}>{post.title}</h4>
      {post.excerpt && (
        <p style={styles.pinnedExcerpt}>{post.excerpt}</p>
      )}
    </Link>
  );
}

/**
 * 최근글 아이템 (간결한 리스트 형태)
 */
function RecentPostItem({ post }: { post: HomeForumPost }) {
  return (
    <Link
      to={`/forum/post/${post.slug}`}
      style={styles.recentItem}
    >
      <span style={styles.recentTitle}>{post.title}</span>
      <span style={styles.recentMeta}>
        <span style={styles.recentAuthor}>{post.authorName}</span>
        <span style={styles.recentDot}>·</span>
        <span style={styles.recentTime}>{formatRelativeTime(post.createdAt)}</span>
      </span>
    </Link>
  );
}

// ============================================================
// Main Component
// ============================================================

export function HomeForumSection() {
  const [pinnedPost, setPinnedPost] = useState<HomeForumPost | null>(null);
  const [recentPosts, setRecentPosts] = useState<HomeForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForumData() {
      try {
        setIsLoading(true);
        setError(null);

        // forumApi 서비스를 통해 데이터 fetch
        const [pinnedData, postsData] = await Promise.all([
          fetchPinnedPosts(2),
          fetchForumPosts({ page: 1, limit: FORUM_CONFIG.maxRecentPosts }),
        ]);

        // 고정글: 우선순위 정렬 후 1개만 선택 (Home에서는 ANNOUNCEMENT 우선)
        const pinnedPosts = pinnedData.map(toHomeForumPost);
        const sortedPinned = sortPinnedByPriority(pinnedPosts);
        setPinnedPost(sortedPinned[0] || null);

        // 최근글: 고정글 제외하고 표시 개수만큼 선택
        const recentData = postsData.data
          .filter(post => !post.isPinned)
          .slice(0, FORUM_CONFIG.displayRecentPosts)
          .map(toHomeForumPost);
        setRecentPosts(recentData);

      } catch (err) {
        console.error('Failed to fetch forum data:', err);
        setError('포럼 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadForumData();
  }, []);

  // 로딩 중에도 섹션 구조는 유지
  if (isLoading) {
    return (
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h3 style={styles.sectionTitle}>o4o · 네뚜레 의견 나누기</h3>
            <p style={styles.sectionDescription}>
              o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다.
            </p>
          </div>
          <div style={styles.loadingState}>
            <span style={styles.loadingText}>불러오는 중...</span>
          </div>
        </div>
      </section>
    );
  }

  // 에러 시에도 섹션 표시 (포럼 링크는 제공)
  if (error) {
    return (
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h3 style={styles.sectionTitle}>o4o · 네뚜레 의견 나누기</h3>
            <p style={styles.sectionDescription}>
              o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다.
            </p>
          </div>
          <div style={styles.footer}>
            <Link to="/forum" style={styles.viewAllLink}>
              포럼 전체 보기 →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        {/* 섹션 헤더 */}
        <div style={styles.header}>
          <h3 style={styles.sectionTitle}>o4o · 네뚜레 의견 나누기</h3>
          <p style={styles.sectionDescription}>
            o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다.
          </p>
        </div>

        {/* 고정글 (1개만 표시) */}
        {pinnedPost && (
          <div style={styles.pinnedSection}>
            <PinnedPostCard post={pinnedPost} />
          </div>
        )}

        {/* 최근글 목록 */}
        {recentPosts.length > 0 && (
          <div style={styles.recentSection}>
            <h4 style={styles.recentHeader}>최근 글</h4>
            <div style={styles.recentList}>
              {recentPosts.map(post => (
                <RecentPostItem key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}

        {/* 포럼 전체 보기 링크 */}
        <div style={styles.footer}>
          <Link to="/forum" style={styles.viewAllLink}>
            포럼 전체 보기 →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Styles
// ============================================================

const PRIMARY_COLOR = '#2563EB';
const GRAY_50 = '#f8fafc';
const GRAY_100 = '#f1f5f9';
const GRAY_200 = '#e2e8f0';
const GRAY_400 = '#94a3b8';
const GRAY_500 = '#64748b';
const GRAY_600 = '#475569';
const GRAY_700 = '#334155';
const GRAY_900 = '#0f172a';

const styles: Record<string, React.CSSProperties> = {
  // Section Container
  section: {
    backgroundColor: GRAY_50,
    padding: '60px 20px',
    borderTop: `1px solid ${GRAY_200}`,
  },
  container: {
    maxWidth: '720px',
    margin: '0 auto',
  },

  // Header
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: GRAY_900,
    margin: '0 0 8px 0',
  },
  sectionDescription: {
    fontSize: '15px',
    color: GRAY_500,
    margin: 0,
    lineHeight: 1.5,
  },

  // Pinned Post Card
  pinnedSection: {
    marginBottom: '24px',
  },
  pinnedCard: {
    display: 'block',
    backgroundColor: '#fff',
    border: `1px solid ${GRAY_200}`,
    borderRadius: '12px',
    padding: '20px',
    textDecoration: 'none',
    transition: 'box-shadow 0.2s, border-color 0.2s',
    cursor: 'pointer',
  },
  pinnedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '8px',
  },
  pinnedIcon: {
    fontSize: '14px',
  },
  pinnedLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  pinnedTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: GRAY_900,
    margin: '0 0 6px 0',
    lineHeight: 1.4,
  },
  pinnedExcerpt: {
    fontSize: '14px',
    color: GRAY_600,
    margin: 0,
    lineHeight: 1.5,
  },

  // Recent Posts Section
  recentSection: {
    marginBottom: '24px',
  },
  recentHeader: {
    fontSize: '14px',
    fontWeight: 600,
    color: GRAY_500,
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  recentList: {
    backgroundColor: '#fff',
    border: `1px solid ${GRAY_200}`,
    borderRadius: '12px',
    overflow: 'hidden',
  },
  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    textDecoration: 'none',
    borderBottom: `1px solid ${GRAY_100}`,
    transition: 'background-color 0.15s',
    cursor: 'pointer',
    gap: '12px',
  },
  recentTitle: {
    fontSize: '15px',
    color: GRAY_700,
    fontWeight: 500,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  recentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  recentAuthor: {
    fontSize: '13px',
    color: GRAY_500,
  },
  recentDot: {
    fontSize: '13px',
    color: GRAY_400,
  },
  recentTime: {
    fontSize: '13px',
    color: GRAY_400,
  },

  // Footer
  footer: {
    textAlign: 'center',
  },
  viewAllLink: {
    display: 'inline-block',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    border: `1px solid ${PRIMARY_COLOR}`,
    borderRadius: '8px',
    transition: 'background-color 0.2s, color 0.2s',
  },

  // Loading State
  loadingState: {
    textAlign: 'center',
    padding: '40px 0',
  },
  loadingText: {
    fontSize: '14px',
    color: GRAY_500,
  },
};

export default HomeForumSection;
