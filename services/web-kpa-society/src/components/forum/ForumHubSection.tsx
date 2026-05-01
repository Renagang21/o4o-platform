/**
 * ForumHubSection - 포럼 카테고리 허브 카드 섹션
 *
 * WO-KPA-FORUM-HUB-V2-PHASE1 + PHASE2
 * - 활성 카테고리를 카드형 리스트로 표시
 * - 멤버 수, 최근 활동, 최근 글 제목 표시
 * - Phase 2: 정렬 탭 (전체/최근 활동/인기)
 * - WO-FORUM-SEARCH-UX-REFINEMENT-V1: 내부 검색 제거 (상단 통합 검색으로 일원화)
 * - ForumHomePage 최상단에 배치
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import { useAuth } from '../../contexts/AuthContext';
import { HubEntityCard, type HubBadge } from '../common';
import type { ForumHubItem } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// Responsive 2-col grid (inline styles don't support @media)
// WO-O4O-SHARED-HUB-CARD-COMPONENT-V1: hover 효과는 HubEntityCard 내부에서 처리.
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
  .forum-hub-tag-chip {
    background: none;
    border: 1px solid ${colors.neutral200};
    padding: 4px 10px;
    font-size: 0.75rem;
    font-weight: 500;
    color: ${colors.neutral500};
    cursor: pointer;
    border-radius: 999px;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .forum-hub-tag-chip:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
  }
  .forum-hub-tag-chip.active {
    background-color: #EFF6FF;
    border-color: ${colors.primary};
    color: ${colors.primary};
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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const sortTabs = isAuthenticated ? [...BASE_SORT_TABS, JOINED_TAB] : BASE_SORT_TABS;
  const initialLoaded = useRef(false);

  // 현재 허브 데이터에서 실제 사용 중인 태그를 유니크 추출
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    forums.forEach((f) => (f.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [forums]);

  // 정렬 결과에 태그 필터 후처리
  const filteredForums = useMemo(() => {
    if (!selectedTag) return forums;
    return forums.filter((f) => (f.tags || []).includes(selectedTag));
  }, [forums, selectedTag]);

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
      fetchForums('default');
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
    fetchForums(sort);
  }, [sort]);

  function fetchForums(sortVal: string) {
    setLoading(true);
    const params: { sort?: string } = {};
    if (sortVal !== 'default') params.sort = sortVal;

    homeApi.getForumHub(Object.keys(params).length > 0 ? params : undefined)
      .then((res) => {
        if (res.data) setForums(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  const isLoading = parentLoading ?? loading;

  return (
    <section id="forum-hub" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>포럼</h2>
        <Link to="/forum/all" style={styles.moreLink}>전체 보기 →</Link>
      </div>

      {/* Sort tabs */}
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

      {/* Tag filter bar */}
      {availableTags.length > 0 && (
        <div style={styles.tagFilterBar}>
          <button
            className={`forum-hub-tag-chip${selectedTag === null ? ' active' : ''}`}
            onClick={() => setSelectedTag(null)}
          >
            전체
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              className={`forum-hub-tag-chip${selectedTag === tag ? ' active' : ''}`}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>불러오는 중...</p>
        </div>
      ) : filteredForums.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>
            {selectedTag
              ? `'${selectedTag}' 태그에 해당하는 포럼이 없습니다.`
              : sort === 'joined'
                ? '참여한 포럼이 없습니다. 글이나 댓글을 작성하면 여기에 표시됩니다.'
                : '아직 개설된 포럼이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="forum-hub-grid">
          {/* WO-O4O-SHARED-HUB-CARD-COMPONENT-V1: HubEntityCard로 교체. 표시 항목 유지. */}
          {filteredForums.map((forum) => {
            const isClosed = forum.forumType === 'closed';
            const tagsLen = forum.tags?.length ?? 0;
            const tagChipBadges: HubBadge[] = (forum.tags || []).slice(0, 3).map((t) => ({
              label: `#${t}`,
              color: 'blue',
            }));
            const overflowBadge: HubBadge[] =
              tagsLen > 3 ? [{ label: `+${tagsLen - 3}`, color: 'gray' }] : [];
            const memberBadge: HubBadge[] =
              isClosed && forum.memberCount > 0
                ? [{ label: `참여자 ${forum.memberCount}명`, color: 'gray' }]
                : [];

            const bottomBadges: HubBadge[] = [
              { label: isClosed ? '가입 필요' : '공개', color: isClosed ? 'orange' : 'green' },
              { label: '닉네임 표시', color: 'gray' },
              ...memberBadge,
              ...tagChipBadges,
              ...overflowBadge,
            ];

            return (
              <HubEntityCard
                key={forum.id}
                href={`/forum/${forum.slug}`}
                title={forum.name}
                titlePrefix={forum.iconEmoji || undefined}
                titleAside={
                  <span style={styles.postCountBadge}>{forum.postCount}개 글</span>
                }
                subline={forum.creatorName ? `개설자: ${forum.creatorName}` : undefined}
                description={forum.description || undefined}
                bottomBadges={bottomBadges}
                minHeight={160}
              />
            );
          })}
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
  moreLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  sortTabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: spacing.sm,
  },
  tagFilterBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: spacing.md,
  },
  // WO-O4O-SHARED-HUB-CARD-COMPONENT-V1: 카드 본문 스타일은 HubEntityCard로 이관.
  // 여기 남은 postCountBadge는 titleAside 슬롯에 주입되는 커스텀 pill (Forum 전용).
  postCountBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.primary,
    backgroundColor: '#EFF6FF',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
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
