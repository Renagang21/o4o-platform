/**
 * ForumHubPage - 포럼 허브 랜딩 페이지
 *
 * 통합 포럼 허브 디자인 (모든 서비스 공통 UI-UX)
 *
 * ForumHubPage
 * ├─ Header (타이틀 + 설명)
 * ├─ QuickActions (글쓰기, 전체 글, 인기 글, 공지사항)
 * ├─ ActivitySection (최근 글 + 인기 글 2열 그리드)
 * ├─ CategorySection (카테고리 카드 그리드)
 * ├─ WritePrompt (글쓰기 유도 CTA)
 * └─ InfoSection (이용안내 + 바로가기)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';
import {
  fetchForumPosts,
  fetchForumCategories,
  normalizePostType,
  getAuthorName,
  type ForumPost,
  type ForumCategory,
} from '../../services/forumApi';

// ============================================================================
// Props
// ============================================================================

interface ForumHubPageProps {
  /** 포럼 허브 타이틀 */
  title?: string;
  /** 포럼 허브 설명 */
  description?: string;
  /** 포럼 기본 경로 (링크 생성용, e.g. '/workspace/forum' or '/forum') */
  basePath?: string;
  /** 이용안내 항목 */
  guidelines?: string[];
  /** 공지 텍스트 */
  noticeText?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function QuickActions({ basePath }: { basePath: string }) {
  const actions = [
    { label: '글쓰기', href: `${basePath}/write`, icon: '✏️' },
    { label: '전체 글', href: `${basePath}?view=all`, icon: '📋' },
    { label: '인기 글', href: `${basePath}?sort=popular`, icon: '🔥' },
    { label: '공지사항', href: `${basePath}?type=announcement`, icon: '📢' },
  ];

  return (
    <section style={sectionStyles.quickActionsContainer}>
      <div style={sectionStyles.quickActionsInner}>
        {actions.map((action) => (
          <Link key={action.label} to={action.href} style={sectionStyles.quickActionItem}>
            <span style={sectionStyles.quickActionIcon}>{action.icon}</span>
            <span style={sectionStyles.quickActionLabel}>{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

interface DisplayPost {
  id: string;
  title: string;
  slug: string;
  type: string;
  authorName: string;
  isPinned: boolean;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  categoryName: string;
}

function toDisplayPost(post: ForumPost): DisplayPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    type: normalizePostType(post.type),
    authorName: getAuthorName(post),
    isPinned: post.isPinned,
    commentCount: post.commentCount || 0,
    viewCount: post.viewCount || 0,
    createdAt: post.createdAt,
    categoryName: post.category?.name || '',
  };
}

function PostItem({ post, basePath }: { post: DisplayPost; basePath: string }) {
  return (
    <li style={sectionStyles.listItem}>
      <Link to={`${basePath}/post/${post.slug}`} style={sectionStyles.postLink}>
        {post.isPinned && <span style={sectionStyles.pinnedBadge}>공지</span>}
        {post.categoryName && (
          <span style={sectionStyles.categoryBadge}>{post.categoryName}</span>
        )}
        <span style={sectionStyles.postTitle}>{post.title}</span>
      </Link>
      <div style={sectionStyles.postMeta}>
        <span>{post.authorName}</span>
        <span style={sectionStyles.dot}>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
        <span style={sectionStyles.dot}>·</span>
        <span>댓글 {post.commentCount}</span>
      </div>
    </li>
  );
}

function ActivitySection({ basePath }: { basePath: string }) {
  const [recentPosts, setRecentPosts] = useState<DisplayPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<DisplayPost[]>([]);

  useEffect(() => {
    fetchForumPosts({ limit: 5, sortBy: 'latest' })
      .then((res) => {
        if (res.data) setRecentPosts(res.data.map(toDisplayPost));
      })
      .catch(() => {});

    fetchForumPosts({ limit: 5, sortBy: 'popular' })
      .then((res) => {
        if (res.data) {
          const sorted = [...res.data]
            .map(toDisplayPost)
            .sort((a, b) => b.viewCount - a.viewCount);
          setPopularPosts(sorted);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section style={sectionStyles.activityContainer}>
      <h2 style={sectionStyles.sectionTitle}>최근 활동</h2>
      <div style={sectionStyles.activityGrid}>
        {/* 최근 글 */}
        <div style={sectionStyles.feedCard}>
          <div style={sectionStyles.cardHeader}>
            <h3 style={sectionStyles.cardTitle}>최근 글</h3>
            <Link to={`${basePath}?sort=latest`} style={sectionStyles.moreLink}>더보기</Link>
          </div>
          {recentPosts.length === 0 ? (
            <p style={sectionStyles.empty}>아직 게시글이 없습니다</p>
          ) : (
            <ul style={sectionStyles.list}>
              {recentPosts.map((post) => (
                <PostItem key={post.id} post={post} basePath={basePath} />
              ))}
            </ul>
          )}
        </div>

        {/* 인기 글 */}
        <div style={sectionStyles.feedCard}>
          <div style={sectionStyles.cardHeader}>
            <h3 style={sectionStyles.cardTitle}>인기 글</h3>
            <Link to={`${basePath}?sort=popular`} style={sectionStyles.moreLink}>더보기</Link>
          </div>
          {popularPosts.length === 0 ? (
            <p style={sectionStyles.empty}>아직 게시글이 없습니다</p>
          ) : (
            <ul style={sectionStyles.list}>
              {popularPosts.map((post) => (
                <PostItem key={`popular-${post.id}`} post={post} basePath={basePath} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

const categoryIcons: Record<string, string> = {
  '자유게시판': '💬',
  '정보공유': '📌',
  '질문답변': '❓',
  '후기': '⭐',
  '공지사항': '📢',
  'Neture 포럼': '🌿',
  '테스트 피드백': '🧪',
  '서비스 업데이트': '🔄',
};

function CategorySection({ basePath }: { basePath: string }) {
  const [categories, setCategories] = useState<ForumCategory[]>([]);

  useEffect(() => {
    fetchForumCategories()
      .then((res) => {
        if (res.success && res.data) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  return (
    <section style={sectionStyles.categoryContainer}>
      <h2 style={sectionStyles.sectionTitle}>카테고리 둘러보기</h2>
      <div style={sectionStyles.categoryGrid}>
        {categories.map((cat) => {
          const icon = categoryIcons[cat.name] || '📂';
          return (
            <Link
              key={cat.id}
              to={`${basePath}?category=${cat.id}`}
              style={sectionStyles.categoryCard}
            >
              <div style={sectionStyles.categoryIcon}>{icon}</div>
              <div style={sectionStyles.categoryContent}>
                <h3 style={sectionStyles.categoryName}>{cat.name}</h3>
                {cat.description && (
                  <p style={sectionStyles.categoryDesc}>{cat.description}</p>
                )}
              </div>
              <span style={sectionStyles.categoryCount}>
                {cat.postCount ?? 0}건
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function WritePrompt({ basePath }: { basePath: string }) {
  const { isAuthenticated } = useAuth();

  return (
    <section style={sectionStyles.writePromptContainer}>
      <div style={sectionStyles.writePromptCard}>
        <div style={sectionStyles.writePromptContent}>
          <span style={sectionStyles.writePromptIcon}>✏️</span>
          <div>
            <h3 style={sectionStyles.writePromptTitle}>
              {isAuthenticated ? '새 글을 작성해 보세요' : '포럼에 참여해 보세요'}
            </h3>
            <p style={sectionStyles.writePromptDesc}>
              {isAuthenticated
                ? '의견, 질문, 피드백을 자유롭게 공유하세요'
                : '로그인 후 글을 작성하고 토론에 참여할 수 있습니다'}
            </p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link to={`${basePath}/write`} style={sectionStyles.ctaPrimary}>글쓰기</Link>
        ) : (
          <Link to="/workspace" style={sectionStyles.ctaOutline}>로그인</Link>
        )}
      </div>
    </section>
  );
}

function InfoSection({ basePath, guidelines }: { basePath: string; guidelines: string[] }) {
  return (
    <section style={sectionStyles.infoContainer}>
      <div style={sectionStyles.infoGrid}>
        <div style={sectionStyles.infoCard}>
          <h4 style={sectionStyles.infoTitle}>이용안내</h4>
          <ul style={sectionStyles.infoList}>
            {guidelines.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
        <div style={sectionStyles.infoCard}>
          <h4 style={sectionStyles.infoTitle}>바로가기</h4>
          <div style={sectionStyles.linkList}>
            <Link to={`${basePath}/write`} style={sectionStyles.infoLink}>글쓰기</Link>
            <Link to={`${basePath}?sort=popular`} style={sectionStyles.infoLink}>인기 글</Link>
            <Link to={`${basePath}?type=announcement`} style={sectionStyles.infoLink}>공지사항</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const DEFAULT_GUIDELINES = [
  '질문, 의견, 피드백을 자유롭게 남겨주세요',
  '상품 홍보나 고객 문의 용도가 아닌 공간입니다',
  '개인정보 보호에 유의해 주세요',
];

export default function ForumHubPage({
  title = 'o4o · 네뚜레 포럼',
  description = 'o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다',
  basePath = '/forum',
  guidelines = DEFAULT_GUIDELINES,
}: ForumHubPageProps) {
  return (
    <div style={pageStyles.page}>
      <div style={pageStyles.content}>
        {/* Header */}
        <header style={pageStyles.header}>
          <h1 style={pageStyles.title}>{title}</h1>
          <p style={pageStyles.description}>{description}</p>
        </header>

        <QuickActions basePath={basePath} />
        <ActivitySection basePath={basePath} />
        <CategorySection basePath={basePath} />
        <WritePrompt basePath={basePath} />
        <InfoSection basePath={basePath} guidelines={guidelines} />
      </div>
    </div>
  );
}

export { ForumHubPage };

// ============================================================================
// Styles
// ============================================================================

const PRIMARY = '#2563eb';
const PRIMARY_BG = '#eff6ff';

const pageStyles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: '#f8fafc',
    minHeight: 'calc(100vh - 200px)',
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '0 24px 48px',
  },
  header: {
    textAlign: 'center',
    padding: '48px 0 16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
};

const sectionStyles: Record<string, React.CSSProperties> = {
  // ---- Quick Actions ----
  quickActionsContainer: {
    padding: '24px 0',
  },
  quickActionsInner: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  quickActionItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 24px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    textDecoration: 'none',
    color: '#475569',
    minWidth: '80px',
    transition: 'box-shadow 0.2s, transform 0.2s',
    border: '1px solid #f1f5f9',
  },
  quickActionIcon: {
    fontSize: '1.5rem',
  },
  quickActionLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },

  // ---- Activity Section ----
  activityContainer: {
    padding: '32px 0',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '16px',
  },
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  feedCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f1f5f9',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    margin: 0,
    color: '#1e293b',
  },
  moreLink: {
    fontSize: '0.875rem',
    color: PRIMARY,
    textDecoration: 'none',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  listItem: {
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  postLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textDecoration: 'none',
    color: '#334155',
  },
  pinnedBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '4px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '0.688rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: '0.75rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  postTitle: {
    fontSize: '0.875rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  postMeta: {
    display: 'flex',
    gap: '4px',
    marginTop: '4px',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  dot: {
    color: '#cbd5e1',
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '32px',
    margin: 0,
    fontSize: '0.875rem',
  },

  // ---- Category Section ----
  categoryContainer: {
    padding: '32px 0',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  categoryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    textDecoration: 'none',
    color: '#334155',
    transition: 'box-shadow 0.2s',
    border: '1px solid #f1f5f9',
  },
  categoryIcon: {
    fontSize: '2rem',
    flexShrink: 0,
  },
  categoryContent: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontSize: '15px',
    fontWeight: 600,
    margin: 0,
    color: '#1e293b',
  },
  categoryDesc: {
    margin: '4px 0 0',
    fontSize: '0.813rem',
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  categoryCount: {
    fontSize: '0.75rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    padding: '2px 8px',
    borderRadius: '4px',
    color: PRIMARY,
    backgroundColor: PRIMARY_BG,
    flexShrink: 0,
  },

  // ---- Write Prompt ----
  writePromptContainer: {
    padding: '24px 0',
  },
  writePromptCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f1f5f9',
  },
  writePromptContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  writePromptIcon: {
    fontSize: '1.75rem',
    flexShrink: 0,
  },
  writePromptTitle: {
    fontSize: '15px',
    fontWeight: 600,
    margin: 0,
    color: '#1e293b',
  },
  writePromptDesc: {
    margin: '4px 0 0',
    fontSize: '0.813rem',
    color: '#94a3b8',
  },
  ctaPrimary: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: PRIMARY,
    textDecoration: 'none',
    border: 'none',
    borderRadius: '8px',
    whiteSpace: 'nowrap',
  },
  ctaOutline: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: PRIMARY,
    textDecoration: 'none',
    border: `1px solid ${PRIMARY}`,
    borderRadius: '8px',
    whiteSpace: 'nowrap',
  },

  // ---- Info Section ----
  infoContainer: {
    padding: '24px 0',
    borderTop: '1px solid #e2e8f0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  infoCard: {
    padding: '12px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 8px 0',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#94a3b8',
    fontSize: '0.813rem',
    lineHeight: '1.8',
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLink: {
    fontSize: '0.813rem',
    color: '#94a3b8',
    textDecoration: 'none',
  },
};
