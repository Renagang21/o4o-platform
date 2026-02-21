/**
 * PharmacyB2BPage - B2B 구매 화면
 *
 * WO-KPA-PHARMACY-B2B-FUNCTION-V1: 초기 구조
 * WO-O4O-STORE-DOMAIN-TAB-UNIFICATION-V1: 도메인 탭 통합
 *
 * 매장 중심 멀티도메인 구조:
 * - service_key 기반 도메인 탭 필터
 * - 실 API 데이터 (getListings)
 * - 매장 사업자가 한 화면에서 모든 서비스 상품 탐색
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getListings } from '../../api/pharmacyProducts';
import type { ProductListing } from '../../api/pharmacyProducts';
import { colors, shadows, borderRadius } from '../../styles/theme';

// ============================================
// WO-O4O-STORE-DOMAIN-TAB-UNIFICATION-V1
// 도메인 탭 정의
// ============================================

const DOMAIN_TABS = [
  { id: 'all', label: '전체', serviceKey: undefined },
  { id: 'kpa', label: '일반 B2B', serviceKey: 'kpa' },
  { id: 'kpa-groupbuy', label: '공동구매', serviceKey: 'kpa-groupbuy' },
  { id: 'glycopharm', label: '혈당관리', serviceKey: 'glycopharm' },
  { id: 'cosmetics', label: '화장품', serviceKey: 'cosmetics' },
] as const;

const SERVICE_KEY_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  kpa: { text: 'B2B', color: '#2563EB', bg: '#DBEAFE' },
  'kpa-groupbuy': { text: '공동구매', color: '#7C3AED', bg: '#EDE9FE' },
  cosmetics: { text: '화장품', color: '#DB2777', bg: '#FCE7F3' },
  glycopharm: { text: '혈당관리', color: '#059669', bg: '#D1FAE5' },
};

// ============================================
// 컴포넌트
// ============================================

export function PharmacyB2BPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = DOMAIN_TABS.some(t => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')!
    : 'all';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const tab = DOMAIN_TABS.find(t => t.id === activeTab);
      const result = await getListings(
        tab?.serviceKey ? { service_key: tab.serviceKey } : undefined
      );
      setListings(result.data || []);
    } catch (err) {
      console.warn('Failed to load listings:', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams(tabId === 'all' ? {} : { tab: tabId }, { replace: true });
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '가격 미정';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <Link to="/store" style={styles.backLink}>&larr; 약국 경영지원</Link>
        <div style={styles.headerMain}>
          <div>
            <h1 style={styles.pageTitle}>B2B 구매</h1>
            <p style={styles.pageDesc}>매장에서 취급하는 상품을 서비스별로 탐색합니다</p>
          </div>
        </div>
      </header>

      {/* 도메인 탭 (WO-O4O-STORE-DOMAIN-TAB-UNIFICATION-V1) */}
      <div style={styles.tabBar}>
        {DOMAIN_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab.id ? styles.tabButtonActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 공동구매 탭 활성 시 크로스 네비게이션 (WO-O4O-GROUPBUY-IA-ALIGNMENT-V1) */}
      {activeTab === 'kpa-groupbuy' && (
        <div style={styles.crossNavBanner}>
          <span>공동구매 전용 카탈로그에서 더 자세한 정보를 확인하세요.</span>
          <Link to="/groupbuy" style={styles.crossNavLink}>공동구매 홈으로 이동 &rarr;</Link>
        </div>
      )}

      {/* 결과 카운트 */}
      <div style={styles.resultBar}>
        <span style={styles.resultCount}>
          {loading ? '불러오는 중...' : `${listings.length}개 상품`}
        </span>
      </div>

      {/* 상품 그리드 */}
      {loading ? (
        <div style={styles.loadingState}>
          <span style={styles.loadingText}>상품을 불러오는 중...</span>
        </div>
      ) : listings.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📦</span>
          <h3 style={styles.emptyTitle}>
            {activeTab === 'all' ? '등록된 상품이 없습니다' : `${DOMAIN_TABS.find(t => t.id === activeTab)?.label} 상품이 없습니다`}
          </h3>
          <p style={styles.emptyDesc}>
            상품 판매 관리에서 상품을 등록하세요.
          </p>
          <Link to="/store/sell" style={styles.emptyAction}>상품 판매 관리 →</Link>
        </div>
      ) : (
        <div style={styles.productGrid}>
          {listings.map(listing => {
            const labelInfo = SERVICE_KEY_LABELS[listing.service_key];

            return (
              <div key={listing.id} style={styles.productCard}>
                <div style={styles.cardHeader}>
                  {labelInfo && (
                    <span style={{
                      ...styles.serviceKeyBadge,
                      color: labelInfo.color,
                      backgroundColor: labelInfo.bg,
                    }}>
                      {labelInfo.text}
                    </span>
                  )}
                  <span style={{
                    ...styles.statusBadge,
                    ...(listing.is_active ? styles.statusActive : styles.statusInactive),
                  }}>
                    {listing.is_active ? '활성' : '비활성'}
                  </span>
                </div>

                <h3 style={styles.productName}>{listing.product_name}</h3>

                <div style={styles.productMeta}>
                  <span style={styles.productPrice}>{formatPrice(listing.retail_price)}</span>
                </div>

                <div style={styles.cardFooter}>
                  <span style={styles.productDate}>
                    {formatDate(listing.created_at)}
                  </span>
                  <span style={styles.productId}>
                    ID: {listing.external_product_id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지 안내 */}
      <div style={styles.pageNotice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          이 화면은 매장에 등록된 상품을 서비스별로 탐색합니다.
          상품 추가/수정은 <Link to="/store/sell" style={{ color: colors.primary }}>상품 판매 관리</Link>에서 가능합니다.
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },

  // Header
  header: {
    marginBottom: '24px',
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  headerMain: {
    marginTop: '12px',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 4px 0',
  },
  pageDesc: {
    fontSize: '0.95rem',
    color: colors.neutral500,
    margin: 0,
  },

  // Domain Tabs (WO-O4O-STORE-DOMAIN-TAB-UNIFICATION-V1)
  tabBar: {
    display: 'flex',
    gap: 0,
    borderBottom: '2px solid #E5E7EB',
    marginBottom: '24px',
  },
  tabButton: {
    padding: '12px 24px',
    fontSize: '0.95rem',
    fontWeight: 400,
    color: '#6B7280',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabButtonActive: {
    fontWeight: 600,
    color: '#2563EB',
    borderBottom: '2px solid #2563EB',
  },

  // Cross-nav banner (WO-O4O-GROUPBUY-IA-ALIGNMENT-V1)
  crossNavBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '0.875rem',
    color: '#5B21B6',
  },
  crossNavLink: {
    color: '#7C3AED',
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },

  // Result bar
  resultBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  resultCount: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    fontWeight: 500,
  },

  // Loading
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '80px 0',
  },
  loadingText: {
    fontSize: '0.95rem',
    color: colors.neutral500,
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px 0',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral700,
    margin: '0 0 8px 0',
  },
  emptyDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: '0 0 20px 0',
  },
  emptyAction: {
    color: colors.primary,
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
  },

  // Product grid
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  productCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: `1px solid ${colors.neutral200}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceKeyBadge: {
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.6875rem',
    fontWeight: 500,
  },
  statusActive: {
    color: '#047857',
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
  },
  productName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  productMeta: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  productPrice: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: `1px solid ${colors.neutral200}`,
    paddingTop: '12px',
    marginTop: 'auto',
  },
  productDate: {
    fontSize: '0.8125rem',
    color: colors.neutral400,
  },
  productId: {
    fontSize: '0.75rem',
    color: colors.neutral400,
    fontFamily: 'monospace',
  },

  // Page Notice
  pageNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px 22px',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.primary}20`,
    marginTop: '40px',
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
  noticeIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
};
