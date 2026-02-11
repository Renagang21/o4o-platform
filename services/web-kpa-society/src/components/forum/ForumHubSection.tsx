/**
 * ForumHubSection - 포럼 카테고리 허브 카드 섹션
 *
 * WO-KPA-FORUM-HUB-V2-PHASE1 + PHASE2
 * - 활성 카테고리를 카드형 리스트로 표시
 * - 멤버 수, 최근 활동, 최근 글 제목 표시
 * - Phase 2: 정렬 탭 (전체/최근 활동/인기) + 검색 (Enter/버튼 클릭)
 * - ForumHomePage 최상단에 배치
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import { useAuth } from '../../contexts/AuthContext';
import type { ForumHubItem } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// Responsive 2-col grid (inline styles don't support @media)
const gridStyles = `
  .forum-hub-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: ${spacing.md};
  }
  @media (min-width: 768px) {
    .forum-hub-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .forum-hub-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  .forum-hub-sort-tab {
    background: none;
    border: none;
    padding: 6px 12px;
    font-size: 0.813rem;
    font-weight: 500;
    color: ${colors.neutral400};
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s ease;
  }
  .forum-hub-sort-tab:hover {
    color: ${colors.neutral600};
    background-color: ${colors.neutral100};
  }
  .forum-hub-sort-tab.active {
    color: ${colors.primary};
    background-color: #EFF6FF;
  }
`;

const BASE_SORT_TABS = [
  { key: 'default', label: '전체' },
  { key: 'recent', label: '최근 활동' },
  { key: 'popular', label: '인기' },
];

const JOINED_TAB = { key: 'joined', label: '내가 참여한' };

interface Props {
  prefetchedForums?: ForumHubItem[];
  loading?: boolean;
}

export function ForumHubSection({ prefetchedForums, loading: parentLoading }: Props) {
  const { isAuthenticated } = useAuth();
  const [forums, setForums] = useState<ForumHubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<string>('default');
  const sortTabs = isAuthenticated ? [...BASE_SORT_TABS, JOINED_TAB] : BASE_SORT_TABS;
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const initialLoaded = useRef(false);

  // Inject grid styles
  useEffect(() => {
    const styleId = 'forum-hub-section-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = gridStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Initial load from prefetch
  useEffect(() => {
    if (prefetchedForums && !initialLoaded.current) {
      setForums(prefetchedForums);
      setLoading(false);
      initialLoaded.current = true;
      return;
    }
    if (!initialLoaded.current) {
      fetchForums('default', '');
      initialLoaded.current = true;
    }
  }, [prefetchedForums]);

  // Reset to default tab if logged out while on joined tab
  useEffect(() => {
    if (!isAuthenticated && sort === 'joined') {
      setSort('default');
    }
  }, [isAuthenticated, sort]);

  // Re-fetch when sort changes (after initial load)
  useEffect(() => {
    if (!initialLoaded.current) return;
    fetchForums(sort, appliedQuery);
  }, [sort, appliedQuery]);

  function fetchForums(sortVal: string, query: string) {
    setLoading(true);
    const params: { sort?: string; q?: string } = {};
    if (sortVal !== 'default') params.sort = sortVal;
    if (query) params.q = query;

    homeApi.getForumHub(Object.keys(params).length > 0 ? params : undefined)
      .then((res) => {
        if (res.data) setForums(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleSearch() {
    const trimmed = searchInput.trim();
    if (trimmed === appliedQuery) {
      // Same query — re-fetch anyway
      fetchForums(sort, trimmed);
    } else {
      setAppliedQuery(trimmed);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  function handleClearSearch() {
    setSearchInput('');
    if (appliedQuery !== '') {
      setAppliedQuery('');
    }
  }

  const isLoading = parentLoading ?? loading;

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>포럼</h2>
        <Link to="/forum/all" style={styles.moreLink}>전체 보기 →</Link>
      </div>

      {/* Sort tabs + Search */}
      <div style={styles.toolbar}>
        <div style={styles.sortTabs}>
          {sortTabs.map((tab) => (
            <button
              key={tab.key}
              className={`forum-hub-sort-tab${sort === tab.key ? ' active' : ''}`}
              onClick={() => setSort(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="포럼 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={styles.searchInput}
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              style={styles.clearBtn}
              aria-label="검색 초기화"
            >
              ×
            </button>
          )}
          <button
            onClick={handleSearch}
            style={styles.searchBtn}
            aria-label="검색"
          >
            검색
          </button>
        </div>
      </div>

      {/* Applied query indicator */}
      {appliedQuery && (
        <div style={styles.queryIndicator}>
          <span>"{appliedQuery}" 검색 결과</span>
          <button onClick={handleClearSearch} style={styles.queryReset}>초기화</button>
        </div>
      )}

      {isLoading ? (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>불러오는 중...</p>
        </div>
      ) : forums.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>
            {appliedQuery ? '검색 결과가 없습니다.'
              : sort === 'joined' ? '참여한 포럼이 없습니다. 글이나 댓글을 작성하면 여기에 표시됩니다.'
              : '아직 개설된 포럼이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="forum-hub-grid">
          {forums.map((forum) => (
            <Link
              key={forum.id}
              to={`/forum/all?category=${forum.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="forum-hub-card" style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.cardTitleRow}>
                    {forum.iconEmoji && (
                      <span style={styles.emoji}>{forum.iconEmoji}</span>
                    )}
                    <span style={styles.cardName}>{forum.name}</span>
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

                {forum.lastPostTitle && (
                  <div style={styles.lastPost}>
                    <span style={styles.lastPostLabel}>최근 글</span>
                    <span style={styles.lastPostTitle}>{forum.lastPostTitle}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
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
  moreLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
    flexWrap: 'wrap' as const,
  },
  sortTabs: {
    display: 'flex',
    gap: '4px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    position: 'relative' as const,
  },
  searchInput: {
    padding: '6px 12px',
    fontSize: '0.813rem',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.sm,
    outline: 'none',
    width: '180px',
    color: colors.neutral900,
    backgroundColor: colors.white,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    color: colors.neutral400,
    cursor: 'pointer',
    padding: '4px 6px',
    lineHeight: 1,
  },
  searchBtn: {
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  queryIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: '0.813rem',
    color: colors.neutral500,
  },
  queryReset: {
    background: 'none',
    border: 'none',
    fontSize: '0.75rem',
    color: colors.primary,
    cursor: 'pointer',
    padding: '2px 4px',
    textDecoration: 'underline',
  },
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
  dot: {
    color: colors.neutral300,
  },
  lastPost: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  lastPostLabel: {
    fontSize: '0.688rem',
    fontWeight: 500,
    color: colors.neutral400,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  lastPostTitle: {
    fontSize: '0.75rem',
    color: colors.neutral600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    margin: 0,
  },
};
