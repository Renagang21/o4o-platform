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
import { getListings, getCatalog, updateListing } from '../../api/pharmacyProducts';
import type { CatalogProduct } from '../../api/pharmacyProducts';
import { colors, borderRadius } from '../../styles/theme';
import { EventOfferContentPanel } from '../../components/event-offer/EventOfferContentPanel';
// WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: 다국어 콘텐츠 연결 상태 배지
import { getMlcSummaryMap, type StoreMlcSummaryItem } from '../../api/multilingualProductContentStore';
import { MultilingualContentBadge, localeLabel } from '../../components/MultilingualContentBadge';
// WO-O4O-KPA-O4O-LISTING-MULTILINGUAL-QR-ACTIONS-V1: O4O 주문 가능 상품(listing) 고객용 링크/QR
import { MultilingualPublicActions } from '../../components/MultilingualPublicActions';
import { QrCode, X as XIcon } from 'lucide-react';

// ── 병합 타입 ──

interface B2BProduct {
  listingId: string;
  /** offer id (= catalog product id). 작업대 주문/공급사 매칭 키. WO-O4O-PRODUCT-MASTER-CORE-RESET-V1 이후 listing.offer_id 에서 도출. */
  catalogProductId: string;
  productName: string;
  serviceKey: string;
  retailPrice: number | null;
  supplierId: string;
  supplierName: string;
  category: string | null;
  createdAt: string;
  // WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1:
  //   is_active=true 인 listing 은 매장 경영활용 제품 리스트(/store/handled-products)에 노출 중 = "경영활용 중".
  isActive: boolean;
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
  all: { title: '내 매장에 추가된 상품이 없습니다', desc: 'B2B 카탈로그에서 상품을 내 매장에 추가해보세요.', linkTo: '/store-hub/b2b', linkLabel: 'B2B 카탈로그 →' },
  kpa: { title: '일반 B2B 상품이 아직 없습니다', desc: 'B2B 카탈로그에서 상품을 내 매장에 추가해보세요.', linkTo: '/store-hub/b2b', linkLabel: 'B2B 카탈로그 →' },
  'kpa-groupbuy': { title: '이벤트 상품이 아직 등록되지 않았습니다', desc: '이벤트 홈에서 안내를 확인하세요.', linkTo: '/store-hub/event-offers', linkLabel: '이벤트 홈 →' },
  glycopharm: { title: '혈당관리 서비스 상품이 아직 없습니다', desc: 'B2B 카탈로그에서 상품을 내 매장에 추가해보세요.', linkTo: '/store-hub/b2b', linkLabel: 'B2B 카탈로그 →' },
  cosmetics: { title: '화장품 서비스 상품이 아직 없습니다', desc: 'B2B 카탈로그에서 상품을 내 매장에 추가해보세요.', linkTo: '/store-hub/b2b', linkLabel: 'B2B 카탈로그 →' },
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
  // WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: listing 별 다국어 콘텐츠 연결 요약
  const [mlcSummary, setMlcSummary] = useState<Map<string, StoreMlcSummaryItem>>(new Map());
  // WO-O4O-KPA-O4O-LISTING-MULTILINGUAL-QR-ACTIONS-V1: 고객용 링크/QR 패널 대상
  const [qrPanel, setQrPanel] = useState<{ product: B2BProduct; summary: StoreMlcSummaryItem } | null>(null);

  // 선택 + 수량 (선택 키 = listingId — WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // 매장 경영활용 제품 등록 진행 상태
  const [registering, setRegistering] = useState(false);

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
      // WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1:
      //   external_product_id 컬럼 제거(WO-...-RemoveExternalProductIdFromListings) 이후 listing 응답에는
      //   product_name/external_product_id 가 없다. offer_id ↔ catalog(spo.id) 로 병합해 상품명/공급사를 복원한다.
      const merged: B2BProduct[] = listings.map(l => {
        const cat = l.offer_id ? catalogMap.get(l.offer_id) : undefined;
        return {
          listingId: l.id,
          catalogProductId: l.offer_id || '',
          productName: cat?.name || l.product_name || '(상품 정보 없음)',
          serviceKey: l.service_key,
          retailPrice: (l.price ?? l.retail_price) ?? null,
          supplierId: cat?.supplierId || '',
          supplierName: cat?.supplierName || '—',
          category: cat?.category || null,
          createdAt: l.created_at,
          isActive: l.is_active,
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

  // WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: 다국어 콘텐츠 연결 요약 (org 단위 1회 조회)
  useEffect(() => {
    let cancelled = false;
    getMlcSummaryMap('listing')
      .then((map) => { if (!cancelled) setMlcSummary(map); })
      .catch(() => { /* 배지는 보조 정보 — 실패해도 목록 동작에 영향 없음 */ });
    return () => { cancelled = true; };
  }, []);

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

  // WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1:
  //   선택된 listing 중 아직 경영활용(is_active=false)이 아닌 것 = 등록 대상.
  const registerableCount = useMemo(
    () => products.filter(p => selectedIds.has(p.listingId) && !p.isActive).length,
    [products, selectedIds],
  );

  const handleAddToWorktable = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error('상품을 선택해주세요.');
      return;
    }

    // 선택된 상품(listingId) 중 수량이 1 이상이고 공급사가 있는 것만 → 작업대 preselect 는 offer id 키
    const validItems: [string, number][] = [];
    let noQtyCount = 0;
    let noSupplierCount = 0;

    for (const id of selectedIds) {
      const qty = quantities[id] || 0;
      if (qty < 1) { noQtyCount++; continue; }
      const product = products.find(p => p.listingId === id);
      if (!product?.supplierId || !product.catalogProductId) { noSupplierCount++; continue; }
      validItems.push([product.catalogProductId, qty]);
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

  // ── 매장 경영활용 제품으로 등록 ──
  // WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1:
  //   선택한 O4O 제품(listing)을 복사하지 않고, 같은 row 의 is_active=true 로 전환해
  //   매장 경영활용 제품 리스트(/store/handled-products)에 노출시킨다. 기존 PUT /listings/:id 재사용.
  //   이미 경영활용 중(is_active=true)인 항목은 건너뛴다(중복 등록 방지).
  const handleRegisterManagement = useCallback(async () => {
    if (registering) return;
    const targets = products.filter(p => selectedIds.has(p.listingId) && !p.isActive);
    if (targets.length === 0) {
      const allActive = [...selectedIds].every(id => products.find(p => p.listingId === id)?.isActive);
      toast.error(allActive ? '선택한 제품이 이미 모두 매장 경영활용 제품입니다.' : '등록할 제품을 선택해주세요.');
      return;
    }

    setRegistering(true);
    const results = await Promise.allSettled(
      targets.map(p => updateListing(p.listingId, { isActive: true, service_key: p.serviceKey }).then(() => p.listingId)),
    );

    const successIds = new Set<string>();
    let failCount = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') successIds.add(r.value);
      else failCount++;
    }

    // 성공 항목 로컬 즉시 반영(새로고침 없이 상태 갱신)
    if (successIds.size > 0) {
      setProducts(prev => prev.map(p => successIds.has(p.listingId) ? { ...p, isActive: true } : p));
      setSelectedIds(prev => {
        const next = new Set(prev);
        successIds.forEach(id => next.delete(id));
        return next;
      });
    }

    if (successIds.size > 0 && failCount === 0) {
      toast.success(
        `${successIds.size}개 제품을 매장 경영활용 제품에 등록했습니다.`,
        {
          duration: 5000,
          // 완료 후 등록된 제품 보기 진입 (현재 목록 유지 — 별도 자동 이동 안 함)
        },
      );
    } else if (successIds.size > 0) {
      toast.success(`${successIds.size}개 등록 완료. ${failCount}개 실패.`);
    } else {
      toast.error('등록에 실패했습니다. 다시 시도해주세요.');
    }
    setRegistering(false);
  }, [registering, products, selectedIds]);

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
          checked={selectedIds.has(row.listingId)}
          onChange={() => toggleSelect(row.listingId)}
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
      // WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1: 매장 경영활용 등록 상태
      key: 'manageStatus',
      title: '경영활용',
      width: '110px',
      align: 'center' as const,
      render: (_v, row) =>
        row.isActive ? (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5' }}>
            경영활용 중
          </span>
        ) : (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, color: colors.neutral500, backgroundColor: colors.neutral100 }}>
            등록 가능
          </span>
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
      // WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: targetKind=listing, targetId=listingId
      // WO-O4O-KPA-O4O-LISTING-MULTILINGUAL-QR-ACTIONS-V1: 연결된 콘텐츠에 고객용 링크/QR 트리거
      key: 'multilingual',
      title: '다국어',
      width: '180px',
      render: (_v, row) => {
        const summary = mlcSummary.get(row.listingId);
        if (!summary) return null;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <MultilingualContentBadge summary={summary} showLocales={false} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setQrPanel({ product: row, summary }); }}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              title="고객용 링크 / QR 보기"
            >
              <QrCode className="w-3 h-3" />
              고객용
            </button>
          </div>
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
          value={quantities[row.listingId] || 0}
          onChange={e => updateQuantity(row.listingId, parseInt(e.target.value) || 0)}
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
            <p style={styles.pageDesc}>
              약국의 O4O 제품을 확인하고, 매장 경영활용 제품으로 등록하거나 주문 작업대에 담을 수 있습니다
            </p>
          </div>
          {/* WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1: 등록된 제품 보기 진입 */}
          <Link to="/store/handled-products" style={styles.handledLink}>
            매장 경영활용 제품 보기 &rarr;
          </Link>
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
          {/* 결과 카운트 + 선택 작업 영역 */}
          <div style={styles.resultBar}>
            <span style={styles.resultCount}>
              {loading ? '불러오는 중...' : `${products.length}개 상품`}
              {selectedIds.size > 0 && ` · ${selectedIds.size}개 선택`}
            </span>
            {/* WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1:
                선택 작업 영역 — 경영활용 등록(기본) + 작업대 담기(주문) + 선택 해제 */}
            {selectedIds.size > 0 && (
              <div style={styles.selectionActions}>
                <button
                  onClick={handleRegisterManagement}
                  disabled={registering || registerableCount === 0}
                  style={{ ...styles.registerButton, opacity: registering || registerableCount === 0 ? 0.55 : 1 }}
                  title={registerableCount === 0 ? '선택한 제품이 모두 경영활용 중입니다' : '선택한 제품을 매장 경영활용 제품에 등록'}
                >
                  {registering
                    ? '등록 중...'
                    : `매장 경영활용 제품으로 등록${registerableCount > 0 ? ` (${registerableCount}건)` : ''}`}
                </button>
                <button onClick={handleAddToWorktable} style={styles.worktableButton}>
                  {selectedCount > 0 ? `작업대 담기 (${selectedCount}건)` : '작업대 담기'}
                </button>
                <button onClick={() => { setSelectedIds(new Set()); setQuantities({}); }} style={styles.clearSelectionButton}>
                  선택 해제
                </button>
              </div>
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

      {/* WO-O4O-KPA-O4O-LISTING-MULTILINGUAL-QR-ACTIONS-V1: O4O 주문 가능 상품 다국어 안내 고객용 링크/QR */}
      {qrPanel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={() => setQrPanel(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900">다국어 상품 안내 — 고객용</h2>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {qrPanel.product.productName}
                  <span className="text-slate-300"> · </span>
                  O4O 주문 가능 상품
                </p>
              </div>
              <button onClick={() => setQrPanel(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <MultilingualContentBadge summary={qrPanel.summary} showLocales={false} />
                <span className="text-sm font-medium text-slate-800 truncate">{qrPanel.summary.title}</span>
                {qrPanel.summary.sourceType === 'operator_hub' && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border bg-blue-50 border-blue-200 text-blue-700 shrink-0">운영자 자료 복사</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {qrPanel.summary.locales.map((l) => (
                  <span key={l} className="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded border bg-white border-slate-200 text-slate-600">{localeLabel(l)}</span>
                ))}
              </div>
              <MultilingualPublicActions groupId={qrPanel.summary.groupId} />
            </div>
          </div>
        </div>
      )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '16px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  handledLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
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

  // Selection actions (WO-O4O-KPA-COMMERCE-PRODUCT-TO-STORE-MANAGEMENT-USE-FLOW-V1)
  selectionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  registerButton: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: '#059669',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  clearSelectionButton: {
    padding: '8px 12px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral500,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

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
