/**
 * PharmacyB2BPage - B2B 구매 화면
 *
 * WO-KPA-PHARMACY-B2B-FUNCTION-V1: 초기 구조
 * WO-O4O-STORE-DOMAIN-TAB-UNIFICATION-V1: 도메인 탭 통합
 * WO-O4O-STORE-DOMAIN-TABS-OPERATIONAL-READINESS-V1: 에러/EmptyState 운영 보강
 * WO-KPA-A-STORE-PHASE1-UI-UX-REFINE-V1: 카드 그리드 → DataTable 표준 전환
 *
 * 매장 중심 멀티도메인 구조:
 * - service_key 기반 도메인 탭 필터
 * - 실 API 데이터 (getListings)
 * - 매장 사업자가 한 화면에서 모든 서비스 상품 탐색
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { getListings } from '../../api/pharmacyProducts';
import type { ProductListing } from '../../api/pharmacyProducts';
import { colors, borderRadius } from '../../styles/theme';

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
// WO-O4O-STORE-DOMAIN-TABS-OPERATIONAL-READINESS-V1
// 에러 타입 분류
// ============================================

type ErrorType = 'network' | 'unauthorized' | 'forbidden' | 'invalid_key' | 'server' | null;

// 도메인별 EmptyState 정의
const EMPTY_STATE_CONFIG: Record<string, { title: string; desc: string; linkTo: string; linkLabel: string }> = {
  all: { title: '현재 구매 가능한 상품이 없습니다', desc: '공급자 승인 및 진열 여부를 확인하세요.', linkTo: '/store/sell', linkLabel: '상품 판매 관리 →' },
  kpa: { title: '일반 B2B 상품이 아직 없습니다', desc: '상품 판매 관리에서 상품을 등록하세요.', linkTo: '/store/sell', linkLabel: '상품 판매 관리 →' },
  'kpa-groupbuy': { title: '이벤트 상품이 아직 등록되지 않았습니다', desc: '이벤트 홈에서 안내를 확인하세요.', linkTo: '/hub/event-offers', linkLabel: '이벤트 홈 →' },
  glycopharm: { title: '혈당관리 서비스 상품이 아직 없습니다', desc: '상품 판매 관리에서 상품을 등록하세요.', linkTo: '/store/sell', linkLabel: '상품 판매 관리 →' },
  cosmetics: { title: '화장품 서비스 상품이 아직 없습니다', desc: '상품 판매 관리에서 상품을 등록하세요.', linkTo: '/store/sell', linkLabel: '상품 판매 관리 →' },
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
  const [error, setError] = useState<ErrorType>(null);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tab = DOMAIN_TABS.find(t => t.id === activeTab);
      const result = await getListings(
        tab?.serviceKey ? { service_key: tab.serviceKey } : undefined
      );
      setListings(result.data || []);
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      const code = err?.response?.data?.error?.code || err?.code;
      if (status === 401) setError('unauthorized');
      else if (status === 403) setError('forbidden');
      else if (code === 'INVALID_SERVICE_KEY') setError('invalid_key');
      else if (!navigator.onLine || err?.message?.includes('Network')) setError('network');
      else setError('server');
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

  // WO-KPA-A-STORE-PHASE1-UI-UX-REFINE-V1: DataTable 컬럼 정의
  const columns: Column<ProductListing>[] = [
    {
      key: 'product_name',
      title: '상품명',
      sortable: true,
      render: (_v, row) => (
        <span style={{ fontWeight: 500, color: colors.neutral900 }}>{row.product_name}</span>
      ),
    },
    {
      key: 'service_key',
      title: '서비스',
      width: '100px',
      render: (_v, row) => {
        const info = SERVICE_KEY_LABELS[row.service_key];
        if (!info) return row.service_key;
        return (
          <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: info.color,
            backgroundColor: info.bg,
          }}>
            {info.text}
          </span>
        );
      },
    },
    {
      key: 'retail_price',
      title: '소매가',
      width: '120px',
      sortable: true,
      align: 'right',
      render: (_v, row) => formatPrice(row.retail_price),
    },
    {
      key: 'is_active',
      title: '상태',
      width: '80px',
      sortable: true,
      render: (_v, row) => (
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: row.is_active ? '#047857' : '#6B7280',
          backgroundColor: row.is_active ? '#D1FAE5' : '#F3F4F6',
        }}>
          {row.is_active ? '활성' : '비활성'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '등록일',
      width: '110px',
      sortable: true,
      render: (_v, row) => (
        <span style={{ fontSize: '0.8125rem', color: colors.neutral400 }}>
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: 'external_product_id',
      title: '외부 ID',
      width: '120px',
      render: (_v, row) => (
        <span style={{ fontSize: '0.75rem', color: colors.neutral400, fontFamily: 'monospace' }}>
          {row.external_product_id}
        </span>
      ),
    },
  ];

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <Link to="/store" style={styles.backLink}>&larr; 내 매장</Link>
        <div style={styles.headerMain}>
          <div>
            <h1 style={styles.pageTitle}>상품 관리</h1>
            <p style={styles.pageDesc}>매장에서 취급하는 상품을 서비스별로 탐색합니다</p>
          </div>
        </div>
      </header>

      {/* 상품 도메인 서브 네비게이션 (WO-STORE-IA-ALIGNMENT-V1) */}
      <div style={styles.productNav}>
        <Link to="/store/products" style={styles.productNavActive}>B2B 구매</Link>
        <Link to="/store/products/b2c" style={styles.productNavLink}>판매 신청</Link>
      </div>

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

      {/* 이벤트 탭 활성 시 크로스 네비게이션 */}
      {activeTab === 'kpa-groupbuy' && (
        <div style={styles.crossNavBanner}>
          <span>이벤트 전용 카탈로그에서 더 자세한 정보를 확인하세요.</span>
          <Link to="/hub/event-offers" style={styles.crossNavLink}>이벤트 홈으로 이동 &rarr;</Link>
        </div>
      )}

      {/* 결과 카운트 */}
      <div style={styles.resultBar}>
        <span style={styles.resultCount}>
          {loading ? '불러오는 중...' : `${listings.length}개 상품`}
        </span>
      </div>

      {/* 상품 그리드 (WO-O4O-STORE-DOMAIN-TABS-OPERATIONAL-READINESS-V1) */}
      {loading ? (
        <div style={styles.loadingState}>
          <span style={styles.loadingText}>상품을 불러오는 중...</span>
        </div>
      ) : error ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>
            {error === 'network' ? '🌐' : error === 'unauthorized' ? '🔒' : error === 'forbidden' ? '🚫' : '⚠️'}
          </span>
          <h3 style={styles.emptyTitle}>
            {error === 'network' && '네트워크 연결을 확인해주세요'}
            {error === 'unauthorized' && '로그인이 필요합니다'}
            {error === 'forbidden' && '매장 등록 후 이용할 수 있습니다'}
            {error === 'invalid_key' && '잘못된 도메인 요청입니다'}
            {error === 'server' && '일시적인 오류가 발생했습니다'}
          </h3>
          <p style={styles.emptyDesc}>
            {error === 'network' && '인터넷 연결 상태를 확인한 후 다시 시도해주세요.'}
            {error === 'unauthorized' && '상품을 조회하려면 로그인이 필요합니다.'}
            {error === 'forbidden' && '약국 매장 등록이 완료된 후 상품을 조회할 수 있습니다.'}
            {error === 'invalid_key' && '링크가 잘못되었을 수 있습니다.'}
            {error === 'server' && '잠시 후 다시 시도해주세요.'}
          </p>
          {(error === 'network' || error === 'server') && (
            <button onClick={loadListings} style={styles.retryButton}>다시 시도</button>
          )}
          {error === 'unauthorized' && (
            <Link to="/" style={styles.emptyAction}>로그인</Link>
          )}
          {error === 'invalid_key' && (
            <button onClick={() => handleTabChange('all')} style={styles.retryButton}>전체 보기</button>
          )}
        </div>
      ) : listings.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📦</span>
          <h3 style={styles.emptyTitle}>
            {EMPTY_STATE_CONFIG[activeTab]?.title || '등록된 상품이 없습니다'}
          </h3>
          <p style={styles.emptyDesc}>
            {EMPTY_STATE_CONFIG[activeTab]?.desc || '상품 판매 관리에서 상품을 등록하세요.'}
          </p>
          <Link to={EMPTY_STATE_CONFIG[activeTab]?.linkTo || '/store/sell'} style={styles.emptyAction}>
            {EMPTY_STATE_CONFIG[activeTab]?.linkLabel || '상품 판매 관리 →'}
          </Link>
        </div>
      ) : (
        <DataTable<ProductListing>
          columns={columns}
          dataSource={listings}
          rowKey="id"
          emptyText="등록된 상품이 없습니다"
        />
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

  // Product Domain Sub-Navigation (WO-STORE-IA-ALIGNMENT-V1)
  productNav: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    padding: '4px',
    backgroundColor: '#F1F5F9',
    borderRadius: '10px',
    width: 'fit-content',
  } as React.CSSProperties,
  productNavActive: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.primary,
    backgroundColor: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  } as React.CSSProperties,
  productNavLink: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748B',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    textDecoration: 'none',
  } as React.CSSProperties,

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
  retryButton: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
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
