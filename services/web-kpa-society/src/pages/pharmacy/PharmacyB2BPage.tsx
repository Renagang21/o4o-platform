/**
 * PharmacyB2BPage — 내 약국 주문 상품 목록 (공급유형별 탭)
 *
 * WO-KPA-PHARMACY-B2B-FUNCTION-V1: 초기 구조
 * WO-O4O-STORE-DOMAIN-TAB-UNIFICATION-V1: 도메인 탭 통합 (구버전)
 * WO-STORE-B2B-CATALOG-TO-WORKTABLE-FLOW-V1: 체크박스+수량+작업대 담기
 * WO-O4O-KPA-STORE-ORDERABLE-PRODUCT-SOURCE-TABS-V1:
 *   service_key 도메인 탭 → 공급유형 탭(전체/B2B/운영자 승인/이벤트·특가/판매자 모집)으로 교체.
 *   "현재 주문 가능한 활성 상품(active OPL + 유효 공급 오퍼)"만 표시 — GET /pharmacy/products/orderable.
 *   활성화 대기(inactive OPL) 개념 미사용(KPA): 허브 선택 시 즉시 active 가 되므로 별도 활성화 버튼/배지 없음.
 *   출처별 주문 동작 보존: B2B/운영자 승인/판매자 모집 = 작업대(→ /checkout), 이벤트·특가 = 기존 이벤트 패널(장바구니).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { toast } from '@o4o/error-handling';
import { getOrderable, type OrderableProduct, type OrderableSourceTab } from '../../api/pharmacyProducts';
import { colors, borderRadius } from '../../styles/theme';
import { EventOfferContentPanel } from '../../components/event-offer/EventOfferContentPanel';
// WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: 다국어 콘텐츠 연결 상태 배지
import { getMlcSummaryMap, type StoreMlcSummaryItem } from '../../api/multilingualProductContentStore';
import { MultilingualContentBadge, localeLabel } from '../../components/MultilingualContentBadge';
// WO-O4O-KPA-O4O-LISTING-MULTILINGUAL-QR-ACTIONS-V1: 고객용 링크/QR
import { MultilingualPublicActions } from '../../components/MultilingualPublicActions';
import { QrCode, X as XIcon } from 'lucide-react';

// ── 공급유형 탭 ──
// WO-O4O-KPA-STORE-ORDERABLE-PRODUCT-SOURCE-TABS-V1 (사용자 확정 권위 기준):
//   전체 / B2B(distribution_type=PUBLIC) / 운영자 승인(SERVICE+유효 서비스 승인) /
//   이벤트·특가(service_key=kpa-groupbuy 진행중) / 판매자 모집(승인+활성 OPL).
const SOURCE_TABS: { id: OrderableSourceTab; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'b2b', label: 'B2B' },
  { id: 'operator', label: '운영자 승인' },
  { id: 'event', label: '이벤트·특가' },
  { id: 'seller-recruitment', label: '판매자 모집' },
];

const SOURCE_BADGE: Record<OrderableProduct['sourceType'], { text: string; color: string; bg: string }> = {
  b2b: { text: 'B2B', color: '#2563EB', bg: '#DBEAFE' },
  operator: { text: '운영자 승인', color: '#7C3AED', bg: '#EDE9FE' },
  event_offer: { text: '이벤트·특가', color: '#DC2626', bg: '#FEE2E2' },
  seller_recruitment: { text: '판매자 모집', color: '#059669', bg: '#D1FAE5' },
};

const EMPTY_STATE: Record<OrderableSourceTab, { title: string; desc: string }> = {
  all: { title: '현재 주문할 수 있는 상품이 없습니다', desc: '매장 허브 상품 카탈로그에서 상품을 선택하면 주문 상품에 추가됩니다.' },
  b2b: { title: '현재 주문할 수 있는 B2B 상품이 없습니다', desc: '매장 허브 상품 카탈로그에서 공급 상품을 선택하세요.' },
  operator: { title: '현재 운영자 승인 주문 가능 상품이 없습니다', desc: '운영자 승인(SERVICE) 완료 후 주문할 수 있습니다.' },
  event: { title: '현재 진행 중인 이벤트·특가 상품이 없습니다', desc: '이벤트 홈에서 안내를 확인하세요.' },
  'seller-recruitment': { title: '판매자 모집 신청 후 승인된 주문 가능 상품이 없습니다', desc: '판매자 모집에 신청하고 공급자 승인을 받으면 여기에 표시됩니다.' },
};

type ErrorType = 'network' | 'unauthorized' | 'forbidden' | 'server' | null;

const PAGE_LIMIT = 20;

// ── 컴포넌트 ──

export function PharmacyB2BPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceFromUrl = searchParams.get('source');
  const initialSource: OrderableSourceTab = SOURCE_TABS.some(t => t.id === sourceFromUrl)
    ? (sourceFromUrl as OrderableSourceTab)
    : 'all';

  const [activeSource, setActiveSource] = useState<OrderableSourceTab>(initialSource);
  const [products, setProducts] = useState<OrderableProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);
  // WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: listing 별 다국어 연결 요약
  const [mlcSummary, setMlcSummary] = useState<Map<string, StoreMlcSummaryItem>>(new Map());
  const [qrPanel, setQrPanel] = useState<{ product: OrderableProduct; summary: StoreMlcSummaryItem } | null>(null);

  // 선택 + 수량 (작업대 주문 — 이벤트 외 출처 행만). 선택 키 = listingId
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const isEventTab = activeSource === 'event';

  const loadData = useCallback(async () => {
    // 이벤트·특가 탭은 기존 이벤트 패널이 자체 조회/주문(장바구니)을 담당 — orderable 조회 생략.
    if (isEventTab) { setLoading(false); setError(null); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await getOrderable({ source: activeSource, search: search || undefined, page, limit: PAGE_LIMIT });
      setProducts(res.data || []);
      setTotal(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 401) setError('unauthorized');
      else if (status === 403) setError('forbidden');
      else if (!navigator.onLine || err?.message?.includes('Network')) setError('network');
      else setError('server');
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [activeSource, search, page, isEventTab]);

  useEffect(() => { loadData(); }, [loadData]);

  // 검색어 디바운스 → 적용 시 1페이지로
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(prev => {
        const next = searchInput.trim();
        if (next !== prev) setPage(1);
        return next;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // 다국어 연결 요약 (org 단위 1회)
  useEffect(() => {
    let cancelled = false;
    getMlcSummaryMap('listing')
      .then((map) => { if (!cancelled) setMlcSummary(map); })
      .catch(() => { /* 보조 정보 — 실패해도 목록 동작에 영향 없음 */ });
    return () => { cancelled = true; };
  }, []);

  const handleTabChange = (tabId: OrderableSourceTab) => {
    setActiveSource(tabId);
    setSearchParams(tabId === 'all' ? {} : { source: tabId }, { replace: true });
    setSelectedIds(new Set());
    setQuantities({});
    setPage(1);
  };

  // ── 선택 관리 (이벤트 외 행만) ──

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

  const selectedCount = useMemo(
    () => [...selectedIds].filter(id => (quantities[id] || 0) > 0).length,
    [selectedIds, quantities],
  );

  // ── 작업대 담기 (B2B / 운영자 승인 / 판매자 모집 → /checkout) ──
  // 이벤트·특가는 별도 장바구니 흐름이라 선택 대상이 아니다(체크박스 미노출).
  const handleAddToWorktable = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error('상품을 선택해주세요.');
      return;
    }
    const validItems: [string, number][] = [];
    let noQtyCount = 0;
    let noOfferCount = 0;

    for (const id of selectedIds) {
      const qty = quantities[id] || 0;
      if (qty < 1) { noQtyCount++; continue; }
      const product = products.find(p => p.listingId === id);
      if (!product?.offerId || product.sourceType === 'event_offer') { noOfferCount++; continue; }
      validItems.push([product.offerId, qty]);
    }

    if (validItems.length === 0) {
      if (noQtyCount > 0) toast.error('선택한 상품의 수량을 입력해주세요.');
      else if (noOfferCount > 0) toast.error('이 상품은 작업대에 담을 수 없습니다.');
      return;
    }
    if (noQtyCount > 0) {
      toast('수량이 입력되지 않은 상품은 제외되었습니다.', { icon: '⚠️' });
    }

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

  // ── 컬럼 ──

  const columns: Column<OrderableProduct>[] = [
    {
      key: '_check',
      title: '',
      width: '44px',
      render: (_v, row) =>
        row.sourceType === 'event_offer' ? (
          <span style={{ color: colors.neutral300, fontSize: '0.75rem' }}>—</span>
        ) : (
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
      key: 'sourceType',
      title: '출처',
      width: '120px',
      align: 'center' as const,
      render: (_v, row) => {
        const b = SOURCE_BADGE[row.sourceType];
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: b.color, backgroundColor: b.bg, whiteSpace: 'nowrap' }}>
            {b.text}
          </span>
        );
      },
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
      key: 'multilingual',
      title: '다국어',
      width: '170px',
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
      key: 'unitPrice',
      title: '단가',
      width: '120px',
      sortable: true,
      align: 'right',
      render: (_v, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span>{formatPrice(row.unitPrice)}</span>
          {row.sourceType === 'event_offer' && row.eventPrice != null && (
            <span style={{ fontSize: '0.625rem', color: '#DC2626', fontWeight: 600 }}>이벤트가</span>
          )}
        </div>
      ),
    },
    {
      key: 'qty',
      title: '수량',
      width: '90px',
      align: 'center' as const,
      render: (_v, row) =>
        row.sourceType === 'event_offer' ? (
          <button
            type="button"
            onClick={() => handleTabChange('event')}
            style={styles.eventOrderLink}
            title="이벤트·특가 탭에서 주문"
          >
            이벤트에서 주문 →
          </button>
        ) : (
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
  ];

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <Link to="/store" style={styles.backLink}>&larr; 내 약국</Link>
        <div style={styles.headerMain}>
          <div>
            <h1 style={styles.pageTitle}>주문 상품</h1>
            <p style={styles.pageDesc}>
              현재 약국에서 주문할 수 있는 상품을 공급 유형별로 확인합니다.
            </p>
          </div>
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

      {/* 공급유형 탭 */}
      <div style={styles.tabBar}>
        {SOURCE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              ...styles.tabButton,
              ...(activeSource === tab.id ? styles.tabButtonActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 이벤트·특가 탭: 기존 이벤트 패널(장바구니 흐름) / 그 외: 주문 가능 상품 테이블 */}
      {isEventTab ? (
        <EventOfferContentPanel compact />
      ) : (
        <>
          {/* 검색 + 결과 카운트 + 선택 작업 */}
          <div style={styles.resultBar}>
            <div style={styles.resultBarLeft}>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="상품명 검색"
                style={styles.searchInput}
              />
              <span style={styles.resultCount}>
                {loading ? '불러오는 중...' : `${total}개 상품`}
                {selectedIds.size > 0 && ` · ${selectedIds.size}개 선택`}
              </span>
            </div>
            {selectedIds.size > 0 && (
              <div style={styles.selectionActions}>
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
                {error === 'server' && '일시적인 오류가 발생했습니다'}
              </h3>
              <p style={styles.emptyDesc}>
                {error === 'network' && '인터넷 연결 상태를 확인한 후 다시 시도해주세요.'}
                {error === 'unauthorized' && '상품을 조회하려면 로그인이 필요합니다.'}
                {error === 'forbidden' && '약국 매장 등록이 완료된 후 상품을 조회할 수 있습니다.'}
                {error === 'server' && '잠시 후 다시 시도해주세요.'}
              </p>
              {(error === 'network' || error === 'server') && (
                <button onClick={loadData} style={styles.retryButton}>다시 시도</button>
              )}
              {error === 'unauthorized' && <Link to="/" style={styles.emptyAction}>로그인</Link>}
            </div>
          ) : products.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📦</span>
              <h3 style={styles.emptyTitle}>{EMPTY_STATE[activeSource].title}</h3>
              <p style={styles.emptyDesc}>{EMPTY_STATE[activeSource].desc}</p>
              <Link to="/store-hub/b2b" style={styles.emptyAction}>상품 카탈로그 →</Link>
            </div>
          ) : (
            <>
              <DataTable<OrderableProduct>
                columns={columns}
                dataSource={products}
                rowKey="listingId"
                emptyText="주문 가능한 상품이 없습니다"
              />
              {totalPages > 1 && (
                <div style={styles.pager}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{ ...styles.pagerButton, opacity: page <= 1 ? 0.4 : 1 }}
                  >
                    이전
                  </button>
                  <span style={styles.pagerInfo}>{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{ ...styles.pagerButton, opacity: page >= totalPages ? 0.4 : 1 }}
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* 페이지 안내 */}
      <div style={styles.pageNotice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          B2B · 운영자 승인 · 판매자 모집 상품은 선택 후 작업대에 담아 주문합니다.
          이벤트·특가는 이벤트·특가 탭에서 장바구니로 주문합니다.
        </span>
      </div>

      {/* 다국어 고객용 링크/QR */}
      {qrPanel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={() => setQrPanel(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900">다국어 상품 안내 — 고객용</h2>
                <p className="text-xs text-slate-500 mt-1 truncate">{qrPanel.product.productName}</p>
              </div>
              <button onClick={() => setQrPanel(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <MultilingualContentBadge summary={qrPanel.summary} showLocales={false} />
                <span className="text-sm font-medium text-slate-800 truncate">{qrPanel.summary.title}</span>
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
  container: { maxWidth: '1200px', margin: '0 auto', padding: '24px' },

  header: { marginBottom: '24px' },
  backLink: { color: colors.primary, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 },
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
  pageTitle: { fontSize: '1.75rem', fontWeight: 700, color: colors.neutral900, margin: '0 0 4px 0' },
  pageDesc: { fontSize: '0.95rem', color: colors.neutral500, margin: 0 },

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

  tabBar: { display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', marginBottom: '24px', flexWrap: 'wrap' as const },
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
  tabButtonActive: { fontWeight: 600, color: '#2563EB', borderBottom: '2px solid #2563EB' },

  resultBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  resultBarLeft: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const },
  searchInput: {
    padding: '8px 12px',
    fontSize: '0.875rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    outline: 'none',
    minWidth: '200px',
  } as React.CSSProperties,
  resultCount: { fontSize: '0.875rem', color: colors.neutral500, fontWeight: 500 },

  selectionActions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const },
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

  eventOrderLink: {
    padding: '4px 8px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  qtyInput: {
    width: '60px',
    padding: '4px 6px',
    fontSize: '0.8125rem',
    textAlign: 'center',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    outline: 'none',
  } as React.CSSProperties,

  pager: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' },
  pagerButton: {
    padding: '6px 16px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral700,
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    cursor: 'pointer',
  } as React.CSSProperties,
  pagerInfo: { fontSize: '0.8125rem', color: colors.neutral500 },

  loadingState: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' },
  loadingText: { fontSize: '0.95rem', color: colors.neutral500 },

  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center' },
  emptyIcon: { fontSize: '48px', marginBottom: '16px' },
  emptyTitle: { fontSize: '1.125rem', fontWeight: 600, color: colors.neutral700, margin: '0 0 8px 0' },
  emptyDesc: { fontSize: '0.875rem', color: colors.neutral500, margin: '0 0 20px 0' },
  emptyAction: { color: colors.primary, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' },
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
  noticeIcon: { fontSize: '18px', flexShrink: 0 },
};
