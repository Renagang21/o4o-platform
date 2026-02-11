/**
 * ForumActivitySection - 포럼별 글 목록 + 정렬
 *
 * Phase 3: 서버 집계 기반 구조
 * - 서버가 카테고리별 top-N 게시글을 집계하여 반환
 * - 정렬 탭: 최근 / 인기 / 추천 (서버 측 정렬)
 * - 클라이언트 그룹핑/정렬 로직 제거
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import type { ForumActivityCategory, ForumActivityPost } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

type SortMode = 'recent' | 'popular' | 'recommended';

const SORT_TABS: { key: SortMode; label: string }[] = [
  { key: 'recent', label: '최근' },
  { key: 'popular', label: '인기' },
  { key: 'recommended', label: '추천' },
];

function ThumbIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-1px' }}>
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-1px' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PostItem({ post, categoryName, basePath }: {
  post: ForumActivityPost;
  categoryName: string;
  basePath: string;
}) {
  return (
    <li style={styles.listItem}>
      <Link to={`${basePath}/post/${post.id}`} style={styles.postLink}>
        {post.isPinned && <span style={styles.pinnedBadge}>공지</span>}
        <span style={styles.forumBadge}>{categoryName}</span>
        <span style={styles.postTitle}>{post.title}</span>
        {(post.commentCount ?? 0) > 0 && (
          <span style={styles.commentCount}>[{post.commentCount}]</span>
        )}
      </Link>
      <div style={styles.meta}>
        <span>{post.authorName ?? '익명'}</span>
        <span style={styles.dot}>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        <span style={styles.dot}>·</span>
        <span style={styles.metaStat}><ThumbIcon /> {post.likeCount ?? 0}</span>
        <span style={styles.dot}>·</span>
        <span style={styles.metaStat}><EyeIcon /> {post.viewCount ?? 0}</span>
        <span style={styles.dot}>·</span>
        <span>댓글 {post.commentCount ?? 0}</span>
      </div>
    </li>
  );
}

export function ForumActivitySection() {
  const basePath = '/forum';
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [categories, setCategories] = useState<ForumActivityCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    homeApi.getForumActivity({ sort: sortMode })
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sortMode]);

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>최근 활동</h2>
      </div>

      {/* Sort Tabs */}
      <div style={styles.tabBar}>
        {SORT_TABS.map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              ...(sortMode === tab.key ? styles.tabActive : {}),
            }}
            onClick={() => setSortMode(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Forum-grouped Post Lists */}
      {loading ? (
        <div style={styles.feedCard}>
          <p style={styles.empty}>불러오는 중...</p>
        </div>
      ) : categories.length === 0 ? (
        <div style={styles.feedCard}>
          <p style={styles.empty}>자료가 없습니다</p>
        </div>
      ) : (
        <div style={styles.forumGrid}>
          {categories.map((cat) => (
            <div key={cat.id} style={styles.feedCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{cat.name}</h3>
                <Link
                  to={`${basePath}/all?category=${cat.id}`}
                  style={styles.cardMoreLink}
                >
                  더보기
                </Link>
              </div>
              <ul style={styles.list}>
                {cat.recentPosts.map((post) => (
                  <PostItem
                    key={`${sortMode}-${post.id}`}
                    post={post}
                    categoryName={cat.name}
                    basePath={basePath}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: spacing.md,
  },
  tab: {
    padding: '6px 16px',
    fontSize: '14px',
    fontWeight: 500,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '20px',
    backgroundColor: colors.white,
    color: colors.neutral700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  forumGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  feedCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.md} ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  cardTitle: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
  },
  cardMoreLink: {
    fontSize: '0.813rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  listItem: {
    padding: `${spacing.sm} ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  postLink: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    textDecoration: 'none',
    color: colors.neutral800,
  },
  pinnedBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accentRed || '#ef4444',
    color: colors.white,
    fontSize: '0.688rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  forumBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: '#EFF6FF',
    color: colors.primary,
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
  commentCount: {
    fontSize: '0.813rem',
    color: colors.primary,
    fontWeight: 500,
    flexShrink: 0,
  },
  meta: {
    display: 'flex',
    gap: spacing.xs,
    marginTop: '4px',
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  metaStat: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  },
  dot: {
    color: colors.neutral300,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: spacing.xl,
    margin: 0,
  },
};
