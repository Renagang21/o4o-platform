/**
 * ForumSearchResults - 포럼 + 게시글 통합 검색 결과
 *
 * WO-FORUM-SEARCH-FIRST-HUB-UX-V1:
 * - homeApi.getForumHub({ q }) + forumApi.getPosts({ search }) 병렬 호출
 * - 포럼 카드 그리드 + 게시글 리스트
 * - Promise.allSettled: 부분 실패 허용
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import { forumApi } from '../../api';
import type { ForumHubItem } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface ForumSearchResultsProps {
  query: string;
}

interface PostResult {
  id: string;
  title: string;
  categoryName?: string;
  authorName?: string;
  createdAt?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  isPinned?: boolean;
}

// Responsive grid (inline styles don't support @media)
const gridStyles = `
  .forum-search-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: ${spacing.md};
  }
  @media (min-width: 768px) {
    .forum-search-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .forum-search-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
`;

export function ForumSearchResults({ query }: ForumSearchResultsProps) {
  const [forums, setForums] = useState<ForumHubItem[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Inject grid styles
  useEffect(() => {
    const styleId = 'forum-search-results-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = gridStyles;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) return;
    setLoading(true);
    setError(false);

    Promise.allSettled([
      homeApi.getForumHub({ q: query }),
      forumApi.getPosts({ search: query, limit: 10 }),
    ]).then(([forumRes, postRes]) => {
      const forumData = forumRes.status === 'fulfilled' ? forumRes.value.data ?? [] : [];
      const postData = postRes.status === 'fulfilled'
        ? (postRes.value.data ?? []).map((p: any) => ({
            id: p.id,
            title: p.title,
            categoryName: p.categoryName ?? p.category?.name ?? '',
            authorName: p.authorName ?? p.author?.name ?? '익명',
            createdAt: p.createdAt ?? p.created_at ?? '',
            viewCount: p.viewCount ?? 0,
            likeCount: p.likeCount ?? 0,
            commentCount: p.commentCount ?? 0,
            isPinned: p.isPinned ?? false,
          }))
        : [];

      setForums(forumData);
      setPosts(postData);

      if (forumRes.status === 'rejected' && postRes.status === 'rejected') {
        setError(true);
      }
    }).finally(() => setLoading(false));
  }, [query]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.statusCard}>
          <p style={styles.statusText}>검색 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.statusCard}>
          <p style={styles.statusText}>검색 중 오류가 발생했습니다. 다시 시도해 주세요.</p>
        </div>
      </div>
    );
  }

  const noResults = forums.length === 0 && posts.length === 0;

  if (noResults) {
    return (
      <div style={styles.container}>
        <div style={styles.statusCard}>
          <p style={styles.emptyTitle}>'{query}'에 대한 검색 결과가 없습니다</p>
          <p style={styles.emptyHint}>다른 검색어를 입력하거나 전체 포럼을 둘러보세요</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <p style={styles.queryLabel}>"{query}" 검색 결과</p>

      {/* 포럼 결과 */}
      {forums.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>포럼 ({forums.length})</h3>
          <div className="forum-search-grid">
            {forums.map((forum) => (
              <Link
                key={forum.id}
                to={`/forum/all?category=${forum.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="forum-search-card" style={styles.card}>
                  <div style={styles.cardTop}>
                    <div style={styles.cardTitleRow}>
                      {forum.iconEmoji && <span style={styles.emoji}>{forum.iconEmoji}</span>}
                      <span style={styles.cardName}>{forum.name}</span>
                      {forum.forumType === 'closed' && (
                        <span style={{ fontSize: '0.75rem', flexShrink: 0, marginLeft: '4px' }} title="비공개 포럼">🔒</span>
                      )}
                    </div>
                    <span style={styles.postCountBadge}>{forum.postCount}개 글</span>
                  </div>
                  {forum.description && (
                    <p style={styles.description}>{forum.description}</p>
                  )}
                  <div style={styles.cardMeta}>
                    <span>참여자 {forum.memberCount}명</span>
                    {forum.lastActivityAt && (
                      <>
                        <span style={styles.dot}>·</span>
                        <span>{formatRelativeTime(forum.lastActivityAt)}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 게시글 결과 */}
      {posts.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>게시글 ({posts.length})</h3>
          <div style={styles.postListCard}>
            <ul style={styles.list}>
              {posts.map((post) => (
                <li key={post.id} style={styles.listItem}>
                  <Link to={`/forum/post/${post.id}`} style={styles.postLink}>
                    {post.isPinned && <span style={styles.pinnedBadge}>공지</span>}
                    {post.categoryName && <span style={styles.forumBadge}>{post.categoryName}</span>}
                    <span style={styles.postTitle}>{post.title}</span>
                    {(post.commentCount ?? 0) > 0 && (
                      <span style={styles.commentCount}>[{post.commentCount}]</span>
                    )}
                  </Link>
                  <div style={styles.meta}>
                    <span>{post.authorName ?? '익명'}</span>
                    <span style={styles.dot}>·</span>
                    <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</span>
                    <span style={styles.dot}>·</span>
                    <span style={styles.metaStat}><ThumbIcon /> {post.likeCount ?? 0}</span>
                    <span style={styles.dot}>·</span>
                    <span style={styles.metaStat}><EyeIcon /> {post.viewCount ?? 0}</span>
                    <span style={styles.dot}>·</span>
                    <span>댓글 {post.commentCount ?? 0}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Inline SVG Icons (same pattern as ForumActivitySection) ──

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

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Styles (reuses patterns from ForumHubSection + ForumActivitySection) ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0`,
  },
  queryLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md}`,
  },

  // Forum cards (from ForumHubSection)
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
    padding: spacing.lg,
    transition: 'box-shadow 0.15s ease',
    cursor: 'pointer',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
    flex: 1,
  },
  emoji: {
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  cardName: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  postCountBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.primary,
    backgroundColor: '#EFF6FF',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  description: {
    fontSize: '0.813rem',
    color: colors.neutral500,
    margin: `${spacing.xs} 0 0`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    fontSize: '0.75rem',
    color: colors.neutral400,
  },

  // Post list (from ForumActivitySection)
  postListCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
    overflow: 'hidden',
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
    backgroundColor: '#ef4444',
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

  // Status cards
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: spacing.xl,
  },
  statusText: {
    textAlign: 'center',
    color: colors.neutral500,
    margin: 0,
  },
  emptyTitle: {
    textAlign: 'center',
    color: colors.neutral600,
    fontSize: '0.938rem',
    fontWeight: 500,
    margin: 0,
  },
  emptyHint: {
    textAlign: 'center',
    color: colors.neutral400,
    fontSize: '0.813rem',
    margin: `${spacing.sm} 0 0`,
  },
};
