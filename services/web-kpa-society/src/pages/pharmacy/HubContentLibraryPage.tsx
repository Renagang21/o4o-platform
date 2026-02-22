/**
 * HubContentLibraryPage - 플랫폼 콘텐츠 라이브러리
 *
 * WO-O4O-HUB-CONTENT-LIBRARY-V1
 *
 * Hub 공용공간에서 플랫폼이 제공하는 CMS 콘텐츠를 탐색하고
 * "내 매장에 복사" 버튼으로 자신의 매장 자산에 추가하는 페이지.
 *
 * 사용 API:
 *   - cmsApi.getContents() : 플랫폼 CMS 콘텐츠 목록 조회
 *   - assetSnapshotApi.copy() : 콘텐츠를 내 매장에 복사
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cmsApi, type CmsContent } from '../../api/cms';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { colors, shadows, borderRadius } from '../../styles/theme';

// ============================================
// 타입 필터 정의
// ============================================

type ContentTypeFilter = 'all' | 'hero' | 'notice' | 'news' | 'featured' | 'promo' | 'event';

const TYPE_TABS: { key: ContentTypeFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'hero', label: '히어로' },
  { key: 'notice', label: '공지' },
  { key: 'news', label: '뉴스' },
  { key: 'featured', label: '추천' },
  { key: 'promo', label: '프로모션' },
  { key: 'event', label: '이벤트' },
];

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  hero: { bg: '#dbeafe', text: '#1e40af' },
  notice: { bg: '#fef3c7', text: '#92400e' },
  news: { bg: '#d1fae5', text: '#065f46' },
  featured: { bg: '#ede9fe', text: '#5b21b6' },
  promo: { bg: '#fce7f3', text: '#9d174d' },
  event: { bg: '#ffedd5', text: '#9a3412' },
};

const PAGE_LIMIT = 20;

// ============================================
// 컴포넌트
// ============================================

export function HubContentLibraryPage() {
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ContentTypeFilter>('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchContents = useCallback(async (type: ContentTypeFilter, pageOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await cmsApi.getContents({
        serviceKey: 'kpa',
        type: type === 'all' ? undefined : type,
        status: 'published',
        limit: PAGE_LIMIT,
        offset: pageOffset,
      });
      setContents(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e.message || '콘텐츠 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(typeFilter, offset);
  }, [fetchContents, typeFilter, offset]);

  const handleTypeChange = (type: ContentTypeFilter) => {
    setTypeFilter(type);
    setOffset(0);
  };

  const handleCopy = async (content: CmsContent) => {
    setCopyingId(content.id);
    setToast(null);
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: content.id,
        assetType: 'cms',
      });
      setToast({ type: 'success', message: `"${content.title}" 이(가) 내 매장에 복사되었습니다.` });
    } catch (e: any) {
      const msg = e.message || '복사에 실패했습니다.';
      setToast({ type: 'error', message: msg });
    } finally {
      setCopyingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        <Link to="/hub" style={styles.breadcrumbLink}>&larr; 공용공간</Link>
      </div>

      {/* Hero */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>플랫폼 콘텐츠</h1>
        <p style={styles.heroDesc}>
          본부/공급사가 제공하는 CMS 콘텐츠를 탐색하고 내 매장에 복사합니다.
        </p>
      </header>

      {/* Toast */}
      {toast && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
        }}>
          <span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Type Filter Tabs */}
      <div style={styles.filterBar}>
        {TYPE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTypeChange(tab.key)}
            style={{
              ...styles.filterTab,
              ...(typeFilter === tab.key ? styles.filterTabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content List */}
      {loading ? (
        <div style={styles.emptyState}>콘텐츠 목록을 불러오는 중...</div>
      ) : error ? (
        <div style={styles.errorState}>
          <p>{error}</p>
          <button onClick={() => fetchContents(typeFilter, offset)} style={styles.retryButton}>
            다시 시도
          </button>
        </div>
      ) : contents.length === 0 ? (
        <div style={styles.emptyState}>
          {typeFilter === 'all'
            ? '현재 제공되는 콘텐츠가 없습니다.'
            : `"${TYPE_TABS.find(t => t.key === typeFilter)?.label}" 유형의 콘텐츠가 없습니다.`}
        </div>
      ) : (
        <>
          {/* Result count */}
          <div style={styles.resultCount}>
            총 {total}건{typeFilter !== 'all' && ` (${TYPE_TABS.find(t => t.key === typeFilter)?.label})`}
          </div>

          {/* Card Grid */}
          <div style={styles.cardGrid}>
            {contents.map(item => {
              const badgeColor = TYPE_BADGE_COLORS[item.type] || { bg: '#f1f5f9', text: '#475569' };
              const isCopying = copyingId === item.id;

              return (
                <div key={item.id} style={styles.card}>
                  {/* Image placeholder */}
                  {item.imageUrl ? (
                    <div style={{
                      ...styles.cardImage,
                      backgroundImage: `url(${item.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }} />
                  ) : (
                    <div style={styles.cardImagePlaceholder}>
                      <span style={{ fontSize: '24px' }}>📄</span>
                    </div>
                  )}

                  {/* Body */}
                  <div style={styles.cardBody}>
                    <div style={styles.cardMeta}>
                      <span style={{
                        ...styles.typeBadge,
                        backgroundColor: badgeColor.bg,
                        color: badgeColor.text,
                      }}>
                        {TYPE_TABS.find(t => t.key === item.type)?.label || item.type}
                      </span>
                      {item.isPinned && <span style={styles.pinnedBadge}>고정</span>}
                    </div>
                    <h3 style={styles.cardTitle}>{item.title}</h3>
                    {item.summary && (
                      <p style={styles.cardSummary}>{item.summary}</p>
                    )}
                    <div style={styles.cardFooter}>
                      <span style={styles.cardDate}>
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString('ko-KR')
                          : new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                      <button
                        onClick={() => handleCopy(item)}
                        disabled={isCopying}
                        style={{
                          ...styles.copyButton,
                          opacity: isCopying ? 0.6 : 1,
                          cursor: isCopying ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isCopying ? '복사 중...' : '내 매장에 복사'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
                disabled={currentPage <= 1}
                style={{
                  ...styles.pageButton,
                  opacity: currentPage <= 1 ? 0.4 : 1,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                &laquo; 이전
              </button>
              <span style={styles.pageInfo}>{currentPage} / {totalPages}</span>
              <button
                onClick={() => setOffset(offset + PAGE_LIMIT)}
                disabled={currentPage >= totalPages}
                style={{
                  ...styles.pageButton,
                  opacity: currentPage >= totalPages ? 0.4 : 1,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                다음 &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Guide notice */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          복사된 콘텐츠는{' '}
          <Link to="/store/content" style={{ color: colors.primary }}>내 매장 &gt; 자산 관리</Link>
          에서 게시 상태를 관리할 수 있습니다.
        </span>
      </div>
    </div>
  );
}

// ============================================
// 스타일
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
  },

  // Breadcrumb
  breadcrumb: {
    marginBottom: '16px',
  },
  breadcrumbLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
  },

  // Hero
  hero: {
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
  },
  heroTitle: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  heroDesc: {
    margin: '8px 0 0',
    fontSize: '0.95rem',
    color: colors.neutral500,
  },

  // Toast
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.875rem',
    marginBottom: '16px',
  },

  // Filter
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  filterTab: {
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral500,
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    color: '#fff',
  },

  // Result count
  resultCount: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    marginBottom: '12px',
  },

  // Card grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  cardImage: {
    height: '140px',
    backgroundColor: '#f1f5f9',
  },
  cardImagePlaceholder: {
    height: '100px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '4px',
  },
  pinnedBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: '0.625rem',
    fontWeight: 600,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    borderRadius: '4px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 600,
    color: colors.neutral900,
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardSummary: {
    margin: 0,
    fontSize: '0.8125rem',
    color: colors.neutral500,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f1f5f9',
  },
  cardDate: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  copyButton: {
    padding: '5px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '6px',
    transition: 'opacity 0.15s',
  },

  // Pagination
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  pageButton: {
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },

  // Empty / Error
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    fontSize: '0.9rem',
    color: colors.neutral400,
  },
  errorState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#dc2626',
    fontSize: '0.9rem',
  },
  retryButton: {
    marginTop: '12px',
    padding: '6px 16px',
    fontSize: '0.8125rem',
    color: colors.primary,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    cursor: 'pointer',
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px 22px',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.primary}20`,
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
    marginTop: '24px',
  },
  noticeIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
};
