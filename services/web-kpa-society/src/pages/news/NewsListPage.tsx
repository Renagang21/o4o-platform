/**
 * NewsListPage - KPA Society CMS 콘텐츠 허브
 *
 * WO-KPA-SOCIETY-CONTENT-HUB-REBUILD-V1:
 * - 타입 필터: 공지사항(notice) + 뉴스(news) 2탭
 * - 허브 소개 영역 + 활성 탭 표시
 * - 빈 상태 구분 (데이터 없음 vs 오류)
 *
 * UX 원칙:
 * - 리스트: 추천/조회는 숫자 표시만 (액션 없음)
 * - 리스트: 가져오기(Copy) 버튼 제거 → 상세 페이지에서만 가능
 * - 리스트: "사용 중" 상태 표시는 유지
 * - 상세 페이지에서 추천/가져오기 액션 수행
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
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
const sortTypes: ContentSortType[] = ['latest', 'featured', 'views'];

export function NewsListPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sort, setSort] = useState<ContentSortType>('latest');
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

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
      setNotices(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.total || 0);
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
          대한약사회에서 제공하는 공지사항과 뉴스를 확인하세요.
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
          onChange={handleSortChange as (sort: 'latest' | 'featured' | 'views') => void}
          options={sortTypes as ('latest' | 'featured' | 'views')[]}
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
                  {/* 하단: 조회수, 추천수, 날짜 (표시만, 액션은 상세 페이지에서) */}
                  <div style={{ marginTop: '12px' }}>
                    <ContentMetaBar
                      viewCount={notice.viewCount || notice.views || 0}
                      likeCount={notice.recommendCount ?? notice.likeCount ?? 0}
                      date={notice.publishedAt || notice.createdAt}
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
