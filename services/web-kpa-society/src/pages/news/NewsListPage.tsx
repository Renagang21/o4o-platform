/**
 * NewsListPage - KPA Society CMS 콘텐츠 허브
 *
 * WO-KPA-SOCIETY-CONTENT-HUB-REBUILD-V1:
 * - 타입 필터: 공지사항(notice) + 뉴스(news) 2탭
 * - 허브 소개 영역 + 활성 탭 표시
 * - 빈 상태 구분 (데이터 없음 vs 오류)
 *
 * WO-KPA-CONTENT-LIKE-AND-SORT-V1:
 * - 리스트에서 좋아요(추천) 토글 가능 (optimistic update)
 * - 인기순(popular) 정렬 추가
 * - 비로그인 시 로그인 유도
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { newsApi, dashboardApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { colors, typography } from '../../styles/theme';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_SOURCE_COLORS,
  CONTENT_SOURCE_LABELS,
} from '@o4o/types/content';
import type { ContentType, ContentSortType } from '@o4o/types/content';
import type { Notice } from '../../types';
import { ContentSortButtons, ContentPagination, ContentMetaBar } from '@o4o/ui';

// KPA Society 콘텐츠 허브 — 공지사항 + 뉴스 2탭
const filterTypes: { type: ContentType; label: string }[] = [
  { type: 'notice', label: '공지사항' },
  { type: 'news', label: '뉴스' },
];
const sortTypes: ContentSortType[] = ['latest', 'popular', 'featured', 'views'];

export function NewsListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sort, setSort] = useState<ContentSortType>('latest');
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState<string | null>(null);

  // Phase 3: 이미 복사한 콘텐츠 ID 로드
  useEffect(() => {
    if (!user?.id) return;
    dashboardApi.getCopiedSourceIds(user.id)
      .then(res => setCopiedIds(new Set(res.sourceIds || [])))
      .catch(() => {}); // 실패 시 무시 (복사 버튼 그대로 표시)
  }, [user?.id]);

  const getTypeFromPath = (): ContentType | undefined => {
    const path = location.pathname;
    if (path.includes('/content/notice') || path.includes('/news/notice')) return 'notice';
    if (path.endsWith('/content/news') || path.endsWith('/news/news')) return 'news';
    return undefined;
  };

  // WO-KPA-SOCIETY-CONTENT-POLICY-IMPLEMENTATION-AB-V1: hero 의존 제거, notice만 조회
  const getApiType = (uiType: ContentType | undefined): string | undefined => {
    return uiType;
  };

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentType = getTypeFromPath();
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    loadData();
  }, [currentPage, currentType, searchQuery, sort]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await newsApi.getNotices({
        type: getApiType(currentType),
        page: currentPage,
        limit: 10,
        search: searchQuery || undefined,
        sort,
      });
      const items = res.data || [];
      setNotices(items);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.total || 0);
      // WO-KPA-CONTENT-LIKE-AND-SORT-V1: 좋아요 상태 초기화
      const liked = new Set<string>();
      items.forEach((n: any) => { if (n.isRecommendedByMe) liked.add(n.id); });
      setLikedIds(liked);
    } catch (err) {
      console.warn('News API not available:', err);
      setNotices([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  const handleSortChange = (newSort: ContentSortType) => {
    setSort(newSort);
    setSearchParams(prev => {
      prev.set('page', '1');
      return prev;
    });
  };

  // WO-KPA-CONTENT-LIKE-AND-SORT-V1: 좋아요 토글 (optimistic update)
  const handleLike = useCallback(async (id: string) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    setLikingId(id);
    const wasLiked = likedIds.has(id);
    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(id) : next.add(id);
      return next;
    });
    setNotices(prev => prev.map(n =>
      n.id === id
        ? { ...n, recommendCount: ((n as any).recommendCount ?? 0) + (wasLiked ? -1 : 1) }
        : n
    ));
    try {
      await newsApi.toggleRecommend(id);
    } catch {
      // Rollback on failure
      setLikedIds(prev => {
        const next = new Set(prev);
        wasLiked ? next.add(id) : next.delete(id);
        return next;
      });
      setNotices(prev => prev.map(n =>
        n.id === id
          ? { ...n, recommendCount: ((n as any).recommendCount ?? 0) + (wasLiked ? 1 : -1) }
          : n
      ));
    }
    setLikingId(null);
  }, [user, likedIds, navigate, location]);

  const pageTitle = currentType ? CONTENT_TYPE_LABELS[currentType] : '콘텐츠';

  if (loading) {
    return <LoadingSpinner message="콘텐츠를 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={pageTitle}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '콘텐츠', href: '/content' },
          ...(currentType ? [{ label: CONTENT_TYPE_LABELS[currentType] }] : []),
        ]}
      />

      {/* 허브 소개 */}
      {!currentType && (
        <p style={styles.hubDescription}>
          KPA-Society 공지사항과 뉴스를 확인하세요.
        </p>
      )}

      {/* 타입 필터 탭 */}
      <div style={styles.tabs}>
        <Link
          to="/content"
          style={{
            ...styles.tab,
            ...(currentType === undefined ? styles.tabActive : {}),
          }}
        >
          전체
        </Link>
        {filterTypes.map(({ type, label }) => (
          <Link
            key={type}
            to={`/content/${type}`}
            style={{
              ...styles.tab,
              ...(currentType === type ? styles.tabActive : {}),
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* 정렬 토글 */}
      <div style={{ marginBottom: '24px' }}>
        <ContentSortButtons
          value={sort}
          onChange={handleSortChange}
          options={sortTypes}
        />
      </div>

      {notices.length === 0 ? (
        <EmptyState
          icon="📢"
          title={currentType ? `${CONTENT_TYPE_LABELS[currentType]} 콘텐츠가 없습니다` : '등록된 콘텐츠가 없습니다'}
          description={currentType
            ? `아직 ${CONTENT_TYPE_LABELS[currentType]} 유형의 콘텐츠가 등록되지 않았습니다.`
            : '새로운 콘텐츠가 등록되면 여기에 표시됩니다.'}
        />
      ) : (
        <>
          <div style={styles.list}>
            {notices.map(notice => (
              <Link key={notice.id} to={`/content/${notice.id}`} style={styles.itemLink}>
                <Card hover padding="medium">
                  {/* 상단: 배지 + 사용 중 표시 */}
                  <div style={styles.cardTop}>
                    <div style={styles.badgeGroup}>
                      {notice.isPinned && <span style={styles.pinnedBadge}>중요</span>}
                      {notice.type && CONTENT_TYPE_LABELS[notice.type as ContentType] && (
                        <span style={styles.typeBadge}>{CONTENT_TYPE_LABELS[notice.type as ContentType]}</span>
                      )}
                      {notice.metadata?.creatorType && CONTENT_SOURCE_LABELS[notice.metadata.creatorType] && (
                        <span style={{
                          ...styles.sourceBadge,
                          backgroundColor: CONTENT_SOURCE_COLORS[notice.metadata.creatorType] || colors.neutral500,
                        }}>
                          {CONTENT_SOURCE_LABELS[notice.metadata.creatorType]}
                        </span>
                      )}
                      {notice.metadata?.category && (
                        <span style={styles.categoryBadge}>{notice.metadata.category}</span>
                      )}
                    </div>
                    {copiedIds.has(notice.id) && (
                      <span style={styles.inUseBadge}>&#10003; 사용 중</span>
                    )}
                  </div>
                  <h3 style={styles.itemTitle}>{notice.title}</h3>
                  {(notice.summary || notice.excerpt) && (
                    <p style={styles.itemExcerpt}>{notice.summary || notice.excerpt}</p>
                  )}
                  {/* 하단: 조회수, 좋아요(토글), 날짜 */}
                  <div style={{ marginTop: '12px' }}>
                    <ContentMetaBar
                      viewCount={notice.viewCount || notice.views || 0}
                      likeCount={(notice as any).recommendCount ?? notice.likeCount ?? 0}
                      date={notice.publishedAt || notice.createdAt}
                      isLiked={likedIds.has(notice.id)}
                      onLikeClick={() => handleLike(notice.id)}
                      likeLoading={likingId === notice.id}
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <ContentPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            showItemRange
            totalItems={totalItems}
            pageSize={10}
          />
        </>
      )}

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  hubDescription: {
    ...typography.bodyM,
    color: colors.neutral500,
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 400,
    transition: 'all 0.15s ease',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    fontWeight: 500,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemLink: {
    textDecoration: 'none',
    color: 'inherit',
    minHeight: '44px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  badgeGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  pinnedBadge: {
    padding: '2px 8px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  typeBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    borderRadius: '4px',
    fontSize: '12px',
  },
  sourceBadge: {
    padding: '2px 8px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  categoryBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral50,
    color: colors.neutral500,
    borderRadius: '4px',
    fontSize: '11px',
  },
  itemTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  itemExcerpt: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginTop: '8px',
    marginBottom: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  inUseBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: '#DCFCE7',
    color: '#16A34A',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
};
