/**
 * PharmacyB2BPage - B2B 구매 화면
 *
 * WO-KPA-PHARMACY-B2B-FUNCTION-V1: 초기 구조
 * WO-O4O-STORE-DOMAIN-TAB-UNIFICATION-V1: 도메인 탭 통합
 * WO-O4O-STORE-DOMAIN-TABS-OPERATIONAL-READINESS-V1: 에러/EmptyState 운영 보강
 * WO-KPA-A-STORE-PHASE1-UI-UX-REFINE-V1: 카드 그리드 → DataTable 표준 전환
 * WO-STORE-B2B-CATALOG-TO-WORKTABLE-FLOW-V1: 체크박스+수량+작업대 담기 추가
 *
 * 매장 중심 멀티도메인 구조:
 * - service_key 기반 도메인 탭 필터
 * - getListings + getCatalog 병합 (supplier 정보 확보)
 * - 체크박스 선택 + 수량 입력 → 주문 작업대로 전달
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { toast } from '@o4o/error-handling';
import { getListings, getCatalog } from '../../api/pharmacyProducts';
import type { CatalogProduct } from '../../api/pharmacyProducts';
import { colors, borderRadius } from '../../styles/theme';
import { EventOfferContentPanel } from '../../components/event-offer/EventOfferContentPanel';

// ── 병합 타입 ──

interface B2BProduct {
  listingId: string;
  catalogProductId: string;
  productName: string;
  serviceKey: string;
  retailPrice: number | null;
  supplierId: string;
  supplierName: string;
  category: string | null;
  createdAt: string;
}

// ── 도메인 탭 ──

const DOMAIN_TABS = [
  { id: 'all', label: '전체', serviceKey: undefined },
  { id: 'kpa', label: '일반 B2B', serviceKey: 'kpa' },
  { id: 'kpa-groupbuy', label: 'Event Offer', serviceKey: 'kpa-groupbuy' },
  { id: 'glycopharm', label: '혈당관리', serviceKey: 'glycopharm' },
  { id: 'cosmetics', label: '화장품', serviceKey: 'cosmetics' },
] as const;

const SERVICE_KEY_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  kpa: { text: 'B2B', color: '#2563EB', bg: '#DBEAFE' },
  'kpa-groupbuy': { text: '이벤트', color: '#7C3AED', bg: '#EDE9FE' },
  cosmetics: { text: '화장품', color: '#DB2777', bg: '#FCE7F3' },
  glycopharm: { text: '혈당관리', color: '#059669', bg: '#D1FAE5' },
};

// ── 에러/EmptyState ──

type ErrorType = 'network' | 'unauthorized' | 'forbidden' | 'invalid_key' | 'server' | null;

const EMPTY_STATE_CONFIG: Record<string, { title: string; desc: string; linkTo: string; linkLabel: string }> = {
  all: { title: '현재 구매 가능한 상품이 없습니다', desc: '공급자 승인 및 진열 여부를 확인하세요.', linkTo: '/store/sell', linkLabel: '상품 판매 관리 →' },
  kpa: { title: '일반 B2B 상품이 아직 없습니다', desc: '상품 판매 관리에서 상품을 등록하세요.', linkTo: '/store/sell', linkLabel: '상품 판매 관리 →' },
  'kpa-groupbuy': { title: '이벤트 상품이 아직 등록되지 않았습니다', desc: '이벤트 홈에서 안내를 확인하세요.', linkTo: '/store-hub/event-offers', linkLabel: '이벤트 홈 →' },
  glycopharm: { title: '혈당관리 서비스 상품이 아직 없습니다', desc: '상품 판매 관리에서 상품을 등록하세요.', linkTo: '/store/sell', linkLabel: '상품 판매 관리 →' },
  cosmetics: { title: '화장품 서비스 상품이 아직 없습니다', desc: '상품 판매 관리에서 상품을 등록하세요.', linkTo: '/store/sell', linkLabel: '상품 판매 관리 →' },
};

// ── 컴포넌트 ──

export function PharmacyB2BPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = DOMAIN_TABS.some(t => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')!
    : 'all';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);

  // 선택 + 수량
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tab = DOMAIN_TABS.find(t => t.id === activeTab);

      const [listingsRes, catalogRes] = await Promise.all([
        getListings(tab?.serviceKey ? { service_key: tab.serviceKey } : undefined),
        getCatalog({ limit: 200 }),
      ]);

      const listings = listingsRes.data || [];
      const catalog = catalogRes.data || [];

      // Build catalog lookup by id
      const catalogMap = new Map<string, CatalogProduct>();
      catalog.forEach(c => catalogMap.set(c.id, c));

      // Merge listings with catalog
      const merged: B2BProduct[] = listings.map(l => {
        const cat = catalogMap.get(l.external_product_id);
        return {
          listingId: l.id,
          catalogProductId: l.external_product_id,
          productName: l.product_name,
          serviceKey: l.service_key,
          retailPrice: l.retail_price,
          supplierId: cat?.supplierId || '',
          supplierName: cat?.supplierName || '—',
          category: cat?.category || null,
          createdAt: l.created_at,
        };
      });

      setProducts(merged);
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      const code = err?.response?.data?.error?.code || err?.code;
      if (status === 401) setError('unauthorized');
      else if (status === 403) setError('forbidden');
      else if (code === 'INVALID_SERVICE_KEY') setError('invalid_key');
      else if (!navigator.onLine || err?.message?.includes('Network')) setError('network');
      else setError('server');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 탭 변경 시 선택/수량 초기화
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams(tabId === 'all' ? {} : { tab: tabId }, { replace: true });
    setSelectedIds(new Set());
    setQuantities({});
  };

  // ── 선택 관리 ──

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, qty) }));
  }, []);

  // ── 작업대 담기 ──

  const selectedCount = useMemo(
    () => [...selectedIds].filter(id => (quantities[id] || 0) > 0).length,
    [selectedIds, quantities],
  );

  const handleAddToWorktable = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error('상품을 선택해주세요.');
      return;
    }

    // 선택된 상품 중 수량이 1 이상인 것만
    const validItems: [string, number][] = [];
    let noQtyCount = 0;
    let noSupplierCount = 0;

    for (const id of selectedIds) {
      const qty = quantities[id] || 0;
      if (qty < 1) { noQtyCount++; continue; }
      const product = products.find(p => p.catalogProductId === id);
      if (!product?.supplierId) { noSupplierCount++; continue; }
      validItems.push([id, qty]);
    }

    if (validItems.length === 0) {
      if (noQtyCount > 0) toast.error('선택한 상품의 수량을 입력해주세요.');
      else if (noSupplierCount > 0) toast.error('공급사 정보가 없는 상품은 작업대에 담을 수 없습니다.');
      return;
    }

    if (noQtyCount > 0) {
      toast('수량이 입력되지 않은 상품은 제외되었습니다.', { icon: '⚠️' });
    }

    // sessionStorage에 저장
    const preselect = Object.fromEntries(validItems);
    sessionStorage.setItem('worktable_preselect', JSON.stringify(preselect));

    toast.success(`${validItems.length}건의 상품을 작업대에 담았습니다.`);
    navigate('/store/commerce/order-worktable');
  }, [selectedIds, quantities, products, navigate]);

  // ── 포맷 ──

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '가격 미정';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  // ── DataTable 컬럼 ──

  const columns: Column<B2BProduct>[] = [
    {
      key: '_check',
      title: '',
      width: '44px',
      render: (_v, row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.catalogProductId)}
          onChange={() => toggleSelect(row.catalogProductId)}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      ),
    },
    {
      key: 'productName',
      title: '상품명',
      sortable: true,
      render: (_v, row) => (
        <span style={{ fontWeight: 500, color: colors.neutral900 }}>{row.productName}</span>
      ),
    },
    {
      key: 'supplierName',
      title: '공급사',
      width: '120px',
      render: (_v, row) => (
        <span style={{ fontSize: '0.8125rem', color: colors.neutral600 }}>{row.supplierName}</span>
      ),
    },
    {
      key: 'serviceKey',
      title: '서비스',
      width: '100px',
      render: (_v, row) => {
        const info = SERVICE_KEY_LABELS[row.serviceKey];
        if (!info) return row.serviceKey;
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
      key: 'retailPrice',
      title: '소매가',
      width: '120px',
      sortable: true,
      align: 'right',
      render: (_v, row) => formatPrice(row.retailPrice),
    },
    {
      key: 'qty',
      title: '수량',
      width: '90px',
      align: 'center' as const,
      render: (_v, row) => (
        <input
          type="number"
          min={0}
          value={quantities[row.catalogProductId] || 0}
          onChange={e => updateQuantity(row.catalogProductId, parseInt(e.target.value) || 0)}
          onClick={e => e.stopPropagation()}
          style={styles.qtyInput}
        />
      ),
    },
    {
      key: 'createdAt',
      title: '등록일',
      width: '110px',
      sortable: true,
      render: (_v, row) => (
        <span style={{ fontSize: '0.8125rem', color: colors.neutral400 }}>
          {formatDate(row.createdAt)}
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

      {/* 상품 도메인 서브 네비게이션 */}
      <div style={styles.productNav}>
        <Link to="/store/products" style={styles.productNavActive}>B2B 구매</Link>
        <Link to="/store/products/b2c" style={styles.productNavLink}>판매 신청</Link>
      </div>

      {/* 도메인 탭 */}
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

      {/* Event Offer 탭: 인라인 패널 / 일반 B2B 탭: 상품 테이블 */}
      {activeTab === 'kpa-groupbuy' ? (
        <EventOfferContentPanel compact />
      ) : (
        <>
          {/* 결과 카운트 + 작업대 담기 */}
          <div style={styles.resultBar}>
            <span style={styles.resultCount}>
              {loading ? '불러오는 중...' : `${products.length}개 상품`}
              {selectedIds.size > 0 && ` · ${selectedIds.size}개 선택`}
            </span>
            {selectedIds.size > 0 && (
              <button onClick={handleAddToWorktable} style={styles.worktableButton}>
                {selectedCount > 0 ? `선택 상품 ${selectedCount}건 작업대 담기` : '작업대 담기'}
              </button>
            )}
          </div>

          {/* 상품 테이블 */}
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
                <button onClick={loadData} style={styles.retryButton}>다시 시도</button>
              )}
              {error === 'unauthorized' && (
                <Link to="/" style={styles.emptyAction}>로그인</Link>
              )}
              {error === 'invalid_key' && (
                <button onClick={() => handleTabChange('all')} style={styles.retryButton}>전체 보기</button>
              )}
            </div>
          ) : products.length === 0 ? (
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
            <DataTable<B2BProduct>
              columns={columns}
              dataSource={products}
              rowKey="listingId"
              emptyText="등록된 상품이 없습니다"
            />
          )}
        </>
      )}

      {/* 페이지 안내 */}
      <div style={styles.pageNotice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          상품을 선택하고 수량을 입력한 뒤, 작업대 담기를 누르면 주문 작업대로 이동합니다.
          상품 추가/수정은 <Link to="/store/sell" style={{ color: colors.primary }}>상품 판매 관리</Link>에서 가능합니다.
        </span>
      </div>
    </div>
  );
}

// ── 스타일 ──

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

  // Product Domain Sub-Navigation
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

  // Domain Tabs
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

  // Worktable button
  worktableButton: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  // Quantity input
  qtyInput: {
    width: '60px',
    padding: '4px 6px',
    fontSize: '0.8125rem',
    textAlign: 'center',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    outline: 'none',
  } as React.CSSProperties,

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
