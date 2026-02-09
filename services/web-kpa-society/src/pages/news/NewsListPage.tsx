/**
 * NewsListPage - 콘텐츠 목록 페이지
 *
 * APP-CONTENT Phase 2: @o4o/types/content 공유 상수 사용
 * WO-APP-DATA-HUB-COPY-PHASE2A-V1: Dashboard copy 연동
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { newsApi } from '../../api';
import { useDashboardCopy } from '../../hooks/useDashboardCopy';
import { colors, typography } from '../../styles/theme';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_SOURCE_COLORS,
  CONTENT_SOURCE_LABELS,
} from '@o4o/types/content';
import type { ContentType, ContentSortType } from '@o4o/types/content';
import type { Notice } from '../../types';
import { ContentSortButtons, ContentPagination, ContentMetaBar, ContentCardActions, CopyOptionsModal } from '@o4o/ui';

// Page-level filter types (subset of all content types shown in list)
const filterTypes: ContentType[] = ['notice', 'hero', 'promo', 'news'];
const sortTypes: ContentSortType[] = ['latest', 'featured', 'views'];

export function NewsListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState<ContentSortType>('latest');

  // Phase 2-B: Dashboard copy hook with modal support
  const {
    loading: copyLoading,
    modalState,
    openCopyModal,
    closeCopyModal,
    executeCopy,
  } = useDashboardCopy({
    sourceType: 'content',
  });

  // Copy handler - opens modal for options selection
  const handleCopy = useCallback((noticeId: string, noticeTitle?: string) => {
    openCopyModal(noticeId, noticeTitle);
  }, [openCopyModal]);

  const getTypeFromPath = (): ContentType | undefined => {
    const path = location.pathname;
    if (path.includes('/news/notice')) return 'notice';
    if (path.includes('/news/hero')) return 'hero';
    if (path.includes('/news/promo')) return 'promo';
    if (path.endsWith('/news/news')) return 'news';
    return undefined;
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
        type: currentType,
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
        sort,
      });
      setNotices(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.warn('News API not available:', err);
      setNotices([]);
      setTotalPages(1);
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
          { label: '콘텐츠', href: '/news' },
          ...(currentType ? [{ label: CONTENT_TYPE_LABELS[currentType] }] : []),
        ]}
      />

      {/* 타입 필터 */}
      {!currentType && (
        <div style={styles.tabs}>
          {filterTypes.map(t => (
            <Link key={t} to={`/news/${t}`} style={styles.tab}>{CONTENT_TYPE_LABELS[t]}</Link>
          ))}
        </div>
      )}

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
          title="등록된 콘텐츠가 없습니다"
          description="새로운 콘텐츠가 등록되면 여기에 표시됩니다."
        />
      ) : (
        <>
          <div style={styles.list}>
            {notices.map(notice => (
              <Link key={notice.id} to={`/news/${notice.id}`} style={styles.itemLink}>
                <Card hover padding="medium">
                  {/* 상단: 배지 + 액션 버튼 */}
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
                    <ContentCardActions
                      showCopy
                      onCopy={() => handleCopy(notice.id, notice.title)}
                    />
                  </div>
                  <h3 style={styles.itemTitle}>{notice.title}</h3>
                  {(notice.summary || notice.excerpt) && (
                    <p style={styles.itemExcerpt}>{notice.summary || notice.excerpt}</p>
                  )}
                  {/* 하단: 조회수, 좋아요, 날짜 */}
                  <div style={{ marginTop: '12px' }}>
                    <ContentMetaBar
                      viewCount={notice.viewCount || notice.views}
                      likeCount={notice.likeCount}
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
          />
        </>
      )}

      {/* Phase 2-B: Copy Options Modal */}
      <CopyOptionsModal
        isOpen={modalState.isOpen}
        onClose={closeCopyModal}
        onConfirm={executeCopy}
        originalTitle={modalState.sourceTitle || ''}
        loading={copyLoading}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
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
};
