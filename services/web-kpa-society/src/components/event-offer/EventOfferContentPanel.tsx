/**
 * EventOfferContentPanel — Event Offer 목록 + 주문 패널 (공용 컴포넌트)
 *
 * WO-O4O-EVENT-OFFER-STORE-INTEGRATION-V1
 *
 * 사용처:
 * - PharmacyB2BPage: kpa-groupbuy 탭 내 인라인 (compact=true)
 * - KpaEventOfferPage: 메인 콘텐츠 (standalone)
 *
 * 포함 범위:
 * - 상태 필터 탭 (진행중 / 종료 / 전체)
 * - 검색 + 공급업체 필터 툴바
 * - 이벤트 상품 테이블
 * - 선택 주문 패널 (공급업체별 묶음)
 * - 페이지네이션
 *
 * 제외 범위 (호출 측 책임):
 * - PageHeader
 * - 운영자 통계 카드
 * - 안내 배너
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { LoadingSpinner, EmptyState, Pagination } from '../common';
import { eventOfferApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors } from '../../styles/theme';
import type { EventOfferItem, EventOfferStatus } from '../../types';

interface OrderResult {
  itemId: string;
  success: boolean;
  error?: string;
}

type StatusTab = { key: EventOfferStatus; label: string };
const STATUS_TABS: StatusTab[] = [
  { key: 'active', label: '진행중' },
  { key: 'ended', label: '종료' },
  { key: 'all', label: '전체' },
];

interface EventOfferContentPanelProps {
  /** Store Products 탭 내 임베딩 여부 — 불필요한 외부 여백 제거 */
  compact?: boolean;
}

export function EventOfferContentPanel({ compact = false }: EventOfferContentPanelProps) {
  const { user } = useAuth();

  // Data
  const [items, setItems] = useState<EventOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<EventOfferStatus>('active');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Ordering
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [ordering, setOrdering] = useState(false);

  const hasStore = user?.isStoreOwner === true;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await eventOfferApi.getEnrichedOffers({
        page: currentPage,
        limit: 20,
        status: statusFilter,
      });
      setItems(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.warn('Enriched event offer API not available:', err);
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = (status: EventOfferStatus) => {
    setStatusFilter(status);
    setCurrentPage(1);
    setSelectedIds(new Set());
    setOrderPanelOpen(false);
  };

  // Derived
  const uniqueSuppliers = useMemo(
    () => [...new Set(items.map(i => i.supplierName))].sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    let result = items;
    if (supplierFilter) result = result.filter(i => i.supplierName === supplierFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        i => i.productName.toLowerCase().includes(q) || i.supplierName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, supplierFilter, searchQuery]);

  const selectableItems = useMemo(
    () => filteredItems.filter(i => i.isActive),
    [filteredItems],
  );

  const groupedSelection = useMemo(() => {
    const selected = items.filter(i => selectedIds.has(i.id) && i.isActive);
    const groups: Record<string, EventOfferItem[]> = {};
    for (const item of selected) {
      if (!groups[item.supplierName]) groups[item.supplierName] = [];
      groups[item.supplierName].push(item);
    }
    return groups;
  }, [items, selectedIds]);

  // Handlers
  const handleSelectAll = () => {
    if (selectedIds.size === selectableItems.length && selectableItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableItems.map(i => i.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2: 에러 코드 기반 메시지
  const parseOrderError = (err: any): string => {
    const code = err?.response?.data?.error?.code;
    const msg = err?.response?.data?.error?.message;
    if (code === 'SOLD_OUT') return '판매 종료된 이벤트입니다.';
    if (code === 'INSUFFICIENT_QUANTITY') return msg || '잔여 수량이 부족합니다.';
    if (code === 'PER_ORDER_LIMIT_EXCEEDED') return msg || '1회 주문 수량 한도를 초과하였습니다.';
    if (code === 'PER_STORE_LIMIT_EXCEEDED') return msg || '매장 구매 한도를 초과하였습니다.';
    return msg || err?.message || '주문에 실패했습니다.';
  };

  const handleDirectOrder = async (item: EventOfferItem) => {
    try {
      await eventOfferApi.participate(item.id, 1);
      toast.success(`"${item.productName}" 주문이 완료되었습니다.`);
      loadData();
    } catch (err: any) {
      toast.error(parseOrderError(err));
    }
  };

  const handleBatchOrder = async (supplierItems: EventOfferItem[]) => {
    setOrdering(true);
    const results: OrderResult[] = [];
    for (const item of supplierItems) {
      const qty = orderQuantities[item.id] || 1;
      try {
        await eventOfferApi.participate(item.id, qty);
        results.push({ itemId: item.id, success: true });
      } catch (err: any) {
        results.push({
          itemId: item.id,
          success: false,
          error: parseOrderError(err),
        });
      }
    }
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    if (failCount === 0) toast.success(`${successCount}건 주문이 완료되었습니다.`);
    else toast.error(`${successCount}건 성공, ${failCount}건 실패`);
    setOrdering(false);
    setSelectedIds(new Set());
    setOrderPanelOpen(false);
    setOrderQuantities({});
    loadData();
  };

  const handleOrderAll = async () => {
    const allItems = items.filter(i => selectedIds.has(i.id) && i.isActive);
    await handleBatchOrder(allItems);
  };

  // Formatting
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '가격 미정';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ko-KR');

  const formatPeriod = (item: EventOfferItem) => {
    const start = item.startAt ? formatDate(item.startAt) : formatDate(item.createdAt);
    const end = item.endAt ? formatDate(item.endAt) : null;
    if (item.status === 'active' || (item.status === 'approved' && !item.startAt)) return `${start} ~`;
    if (end) return `${start} ~ ${end}`;
    return `${start} ~`;
  };

  const getStatusBadge = (item: EventOfferItem): { style: React.CSSProperties; label: string } => {
    if (item.status === 'approved') return { style: badgeSoon, label: '곧 시작' };
    if (item.status === 'active' || item.isActive) return { style: badgeActive, label: '진행중' };
    return { style: badgeEnded, label: '종료' };
  };

  const getGroupSubtotal = (groupItems: EventOfferItem[]) =>
    groupItems.reduce((sum, item) => {
      const qty = orderQuantities[item.id] || 1;
      return sum + (Number(item.unitPrice) || 0) * qty;
    }, 0);

  if (loading) {
    return <LoadingSpinner message="이벤트 상품을 불러오는 중..." />;
  }

  const containerStyle: React.CSSProperties = compact
    ? {}
    : { maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' };

  return (
    <div style={containerStyle}>
      {/* 상태 필터 탭 */}
      <div style={statusTabs}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            style={{ ...statusTab, ...(statusFilter === tab.key ? statusTabActive : {}) }}
            onClick={() => handleStatusChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 툴바 */}
      <div style={toolbar}>
        <input
          type="text"
          style={searchInput}
          placeholder="상품명 또는 공급업체 검색"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          style={selectStyle}
          value={supplierFilter}
          onChange={e => setSupplierFilter(e.target.value)}
        >
          <option value="">전체 공급업체</option>
          {uniqueSuppliers.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {items.length === 0 && !searchQuery && !supplierFilter ? (
        <EmptyState
          icon="🛒"
          title={statusFilter === 'active' ? '진행중인 이벤트가 없습니다' : '이벤트 상품이 없습니다'}
          description={
            statusFilter === 'active'
              ? '현재 진행중인 이벤트가 없습니다. 종료 탭에서 이전 이벤트를 확인할 수 있습니다.'
              : '해당 상태의 이벤트 상품이 없습니다.'
          }
        />
      ) : (
        <>
          {/* 선택 액션바 */}
          {hasStore && selectedIds.size > 0 && (
            <div style={selectionBar}>
              <span style={selectionText}>{selectedIds.size}개 선택됨</span>
              <button
                style={selectionOrderBtn}
                onClick={() => setOrderPanelOpen(!orderPanelOpen)}
              >
                {orderPanelOpen ? '패널 닫기' : '선택 주문'}
              </button>
            </div>
          )}

          {/* 테이블 */}
          <div style={listCard}>
            <div style={listHeader}>
              {hasStore && statusFilter !== 'ended' && (
                <span style={{ ...colCenter, width: 48 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === selectableItems.length && selectableItems.length > 0}
                    onChange={handleSelectAll}
                    style={checkbox}
                  />
                </span>
              )}
              <span style={{ ...col, flex: 3 }}>이벤트명</span>
              <span style={{ ...col, flex: 2 }}>공급업체</span>
              <span style={{ ...colRight, width: 120 }}>가격</span>
              <span style={{ ...colCenter, width: 140 }}>기간</span>
              <span style={{ ...colCenter, width: 80 }}>상태</span>
              <span style={{ ...colCenter, width: 100 }}>액션</span>
            </div>

            {filteredItems.map(item => (
              <div
                key={item.id}
                style={{
                  ...listRow,
                  ...(!item.isActive ? { opacity: 0.6, backgroundColor: colors.neutral50 } : {}),
                }}
              >
                {hasStore && statusFilter !== 'ended' && (
                  <span style={{ ...colCenter, width: 48 }}>
                    {item.isActive ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleSelectOne(item.id)}
                        style={checkbox}
                      />
                    ) : (
                      <span style={{ width: 16, height: 16, display: 'inline-block' }} />
                    )}
                  </span>
                )}
                <div style={{ ...col, flex: 3 }}>
                  <Link to={`/event-offers/${item.id}`} style={productLink}>
                    {item.productName}
                  </Link>
                  {/* WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2: 잔여 수량 표시 */}
                  {item.totalQuantity !== null && (
                    <span style={item.totalQuantity <= 10 ? qtyBadgeLow : qtyBadgeNormal}>
                      잔여 {item.totalQuantity}개
                    </span>
                  )}
                </div>
                <span style={{ ...col, flex: 2, color: colors.neutral600, fontSize: 13 }}>
                  {item.supplierName}
                </span>
                <span style={{ ...colRight, width: 120, fontWeight: 600 }}>
                  {formatPrice(item.unitPrice)}
                </span>
                <span style={{ ...colCenter, width: 140, fontSize: 12, color: colors.neutral500 }}>
                  {formatPeriod(item)}
                </span>
                <span style={{ ...colCenter, width: 80 }}>
                  {(() => { const b = getStatusBadge(item); return <span style={b.style}>{b.label}</span>; })()}
                </span>
                <span style={{ ...colCenter, width: 100 }}>
                  {item.isActive && hasStore ? (
                    <button style={orderBtn} onClick={() => handleDirectOrder(item)}>
                      내 매장에 추가
                    </button>
                  ) : item.isActive && !hasStore ? (
                    <span style={disabledText}>매장 필요</span>
                  ) : (
                    <span style={disabledText}>종료됨</span>
                  )}
                </span>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div style={emptyRow}>검색 결과가 없습니다.</div>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          {/* 주문 패널 */}
          {orderPanelOpen && selectedIds.size > 0 && (
            <div style={orderPanel}>
              <div style={orderPanelHeader}>
                <h3 style={orderPanelTitle}>공급업체별 주문</h3>
                <button
                  style={orderAllBtn}
                  disabled={ordering}
                  onClick={handleOrderAll}
                >
                  {ordering ? '주문 처리중...' : `전체 주문 (${selectedIds.size}건)`}
                </button>
              </div>

              {Object.entries(groupedSelection).map(([supplierName, groupItems]) => (
                <div key={supplierName} style={supplierGroup}>
                  <div style={supplierHeader}>
                    <span style={supplierName_}>{supplierName}</span>
                    <span style={supplierItemCount}>{groupItems.length}개 상품</span>
                  </div>
                  {groupItems.map(item => (
                    <div key={item.id} style={orderItem}>
                      <span style={orderItemName}>{item.productName}</span>
                      <div style={orderItemRight}>
                        <label style={qtyLabel}>
                          수량:
                          <input
                            type="number"
                            min={1}
                            max={item.perOrderLimit ?? 99}
                            value={orderQuantities[item.id] || 1}
                            onChange={e =>
                              setOrderQuantities(prev => ({
                                ...prev,
                                [item.id]: Math.max(
                                  1,
                                  Math.min(
                                    parseInt(e.target.value) || 1,
                                    item.perOrderLimit ?? 99,
                                  ),
                                ),
                              }))
                            }
                            style={qtyInput}
                          />
                        </label>
                        {item.perOrderLimit !== null && (
                          <span style={perOrderNote}>최대 {item.perOrderLimit}개</span>
                        )}
                        <span style={orderItemPrice}>
                          {formatPrice((Number(item.unitPrice) || 0) * (orderQuantities[item.id] || 1))}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div style={supplierFooter}>
                    <span style={supplierTotal}>합계: {formatPrice(getGroupSubtotal(groupItems))}</span>
                    <button
                      style={supplierOrderBtn}
                      disabled={ordering}
                      onClick={() => handleBatchOrder(groupItems)}
                    >
                      {ordering ? '처리중...' : '주문하기'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 스타일 ──

const statusTabs: React.CSSProperties = { display: 'flex', gap: '8px', marginBottom: '16px' };
const statusTab: React.CSSProperties = {
  padding: '8px 18px',
  border: `1px solid ${colors.neutral300}`,
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 500,
  color: colors.neutral600,
  backgroundColor: colors.white,
  cursor: 'pointer',
};
const statusTabActive: React.CSSProperties = {
  backgroundColor: '#7C3AED',
  color: colors.white,
  borderColor: '#7C3AED',
};
const toolbar: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '16px',
  flexWrap: 'wrap',
};
const searchInput: React.CSSProperties = {
  flex: 1,
  minWidth: '200px',
  padding: '10px 14px',
  border: `1px solid ${colors.neutral300}`,
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
};
const selectStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: `1px solid ${colors.neutral300}`,
  borderRadius: '8px',
  fontSize: '14px',
  backgroundColor: colors.white,
  cursor: 'pointer',
  minWidth: '160px',
};
const selectionBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  backgroundColor: '#EDE9FE',
  border: '1px solid #DDD6FE',
  borderRadius: '8px',
  marginBottom: '12px',
};
const selectionText: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#5B21B6' };
const selectionOrderBtn: React.CSSProperties = {
  padding: '8px 20px',
  backgroundColor: '#7C3AED',
  color: colors.white,
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};
const listCard: React.CSSProperties = {
  backgroundColor: colors.white,
  border: `1px solid ${colors.neutral200}`,
  borderRadius: '12px',
  overflow: 'hidden',
  marginBottom: '20px',
};
const listHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 20px',
  backgroundColor: colors.neutral50,
  borderBottom: `1px solid ${colors.neutral100}`,
  fontSize: '11px',
  fontWeight: 600,
  color: colors.neutral500,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};
const listRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '14px 20px',
  borderBottom: `1px solid ${colors.neutral50}`,
};
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', paddingRight: '12px' };
const colCenter: React.CSSProperties = { textAlign: 'center', flexShrink: 0 };
const colRight: React.CSSProperties = { textAlign: 'right', flexShrink: 0, paddingRight: '12px' };
const checkbox: React.CSSProperties = { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#7C3AED' };
const productLink: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: colors.neutral900,
  textDecoration: 'none',
};
const badgeActive: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 8px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: '#D1FAE5',
  color: '#059669',
};
const badgeSoon: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 8px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: '#FEF3C7',
  color: '#D97706',
};
const badgeEnded: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 8px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: colors.neutral200,
  color: colors.neutral500,
};
const orderBtn: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#7C3AED',
  color: colors.white,
  border: 'none',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const disabledText: React.CSSProperties = { fontSize: '11px', color: colors.neutral400 };
const emptyRow: React.CSSProperties = {
  padding: '40px 20px',
  textAlign: 'center',
  color: colors.neutral500,
  fontSize: '14px',
};
const orderPanel: React.CSSProperties = {
  backgroundColor: colors.white,
  border: '2px solid #7C3AED',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
};
const orderPanelHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  paddingBottom: '16px',
  borderBottom: `1px solid ${colors.neutral200}`,
};
const orderPanelTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: colors.neutral900,
  margin: 0,
};
const orderAllBtn: React.CSSProperties = {
  padding: '10px 24px',
  backgroundColor: '#7C3AED',
  color: colors.white,
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};
const supplierGroup: React.CSSProperties = {
  backgroundColor: colors.neutral50,
  borderRadius: '10px',
  padding: '16px',
  marginBottom: '12px',
};
const supplierHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};
const supplierName_: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: colors.neutral900 };
const supplierItemCount: React.CSSProperties = { fontSize: '12px', color: colors.neutral500 };
const orderItem: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: `1px solid ${colors.neutral200}`,
};
const orderItemName: React.CSSProperties = { fontSize: '14px', color: colors.neutral800, flex: 1 };
const orderItemRight: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '16px' };
const qtyLabel: React.CSSProperties = {
  fontSize: '13px',
  color: colors.neutral600,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};
const qtyInput: React.CSSProperties = {
  width: '56px',
  padding: '6px 8px',
  border: `1px solid ${colors.neutral300}`,
  borderRadius: '6px',
  fontSize: '14px',
  textAlign: 'center',
};
const orderItemPrice: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: colors.neutral900,
  minWidth: '100px',
  textAlign: 'right',
};
const supplierFooter: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '12px',
  paddingTop: '12px',
};
const supplierTotal: React.CSSProperties = { fontSize: '16px', fontWeight: 700, color: colors.neutral900 };
const supplierOrderBtn: React.CSSProperties = {
  padding: '8px 20px',
  backgroundColor: '#059669',
  color: colors.white,
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};
// WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2
const qtyBadgeNormal: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '3px',
  padding: '1px 6px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
  backgroundColor: '#DBEAFE',
  color: '#1D4ED8',
};
const qtyBadgeLow: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '3px',
  padding: '1px 6px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: '#FEF3C7',
  color: '#D97706',
};
const perOrderNote: React.CSSProperties = {
  fontSize: '11px',
  color: colors.neutral500,
  whiteSpace: 'nowrap',
};
