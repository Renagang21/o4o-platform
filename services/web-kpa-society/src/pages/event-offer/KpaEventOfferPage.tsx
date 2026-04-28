/**
 * KpaEventOfferPage - 이벤트 상품 테이블 & 직접 주문 페이지
 *
 * WO-EVENT-OFFER-HUB-TABLE-AND-DIRECT-ORDER-REFINE-V1:
 * - 카드 그리드 → 테이블 중심 비교/선택 구조
 * - 공급업체별 묶음 주문 패널
 * - 이벤트 공간에서 직접 주문 (내 매장 반영 없음)
 *
 * WO-EVENT-OFFER-HUB-TIME-WINDOW-FILTER-HOTFIX-V1:
 * - 진행중/종료/전체 상태 필터 (기본: 진행중)
 * - 기간 컬럼 표시 (시작일 ~ 진행중 or 종료일)
 * - 종료 이벤트 주문 UX 차단
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '../../components/common';
import { eventOfferApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors } from '../../styles/theme';
import { PLATFORM_ROLES, hasAnyRole } from '../../lib/role-constants';
import type { EventOfferItem, EventOfferStatus, GroupbuyStats } from '../../types';

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

export function KpaEventOfferPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Data
  const [items, setItems] = useState<EventOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<GroupbuyStats | null>(null);

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

  const currentPage = parseInt(searchParams.get('page') || '1');
  const hasStore = user?.isStoreOwner === true;
  const isOperator = user ? hasAnyRole(user.roles, PLATFORM_ROLES) : false;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await eventOfferApi.getEnrichedGroupbuys({
        page: currentPage,
        limit: 20,
        status: statusFilter,
      });
      setItems(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.warn('Enriched groupbuy API not available:', err);
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }

    if (isOperator) {
      try {
        const statsRes = await eventOfferApi.getGroupbuyStats();
        setStats(statsRes.data);
      } catch {
        // 통계 실패 시 무시
      }
    }
  }, [currentPage, statusFilter, isOperator]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 상태 필터 변경 시 선택 초기화 + 페이지 리셋
  const handleStatusChange = (status: EventOfferStatus) => {
    setStatusFilter(status);
    setSelectedIds(new Set());
    setOrderPanelOpen(false);
    setSearchParams(prev => {
      prev.set('page', '1');
      return prev;
    });
  };

  // Derived data
  const uniqueSuppliers = useMemo(
    () => [...new Set(items.map(i => i.supplierName))].sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    let result = items;
    if (supplierFilter) {
      result = result.filter(i => i.supplierName === supplierFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        i => i.productName.toLowerCase().includes(q) || i.supplierName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, supplierFilter, searchQuery]);

  // 진행중 항목만 선택 가능
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
  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

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

  const handleDirectOrder = async (item: EventOfferItem) => {
    try {
      await eventOfferApi.participate(item.id, 1);
      toast.success(`"${item.productName}" 주문이 완료되었습니다.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || '주문에 실패했습니다.');
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
          error: err?.response?.data?.error?.message || err?.message || '주문 실패',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount === 0) {
      toast.success(`${successCount}건 주문이 완료되었습니다.`);
    } else {
      toast.error(`${successCount}건 성공, ${failCount}건 실패`);
    }

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

  // Formatting helpers
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '가격 미정';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ko-KR');

  const formatPeriod = (item: EventOfferItem) => {
    const start = item.startAt ? formatDate(item.startAt) : formatDate(item.createdAt);
    const end = item.endAt ? formatDate(item.endAt) : null;
    if (item.status === 'active' || (item.status === 'approved' && !item.startAt)) return `${start} ~`;
    if (end) return `${start} ~ ${end}`;
    return `${start} ~`;
  };

  // WO-O4O-EVENT-OFFER-CORE-REFORM-V1: 런타임 상태 기반 배지
  const getStatusBadge = (item: EventOfferItem): { style: React.CSSProperties; label: string } => {
    if (item.status === 'approved') return { style: styles.badgeSoon, label: '곧 시작' };
    if (item.status === 'active' || item.isActive) return { style: styles.badgeActive, label: '진행중' };
    return { style: styles.badgeEnded, label: '종료' };
  };

  const getGroupSubtotal = (groupItems: EventOfferItem[]) =>
    groupItems.reduce((sum, item) => {
      const qty = orderQuantities[item.id] || 1;
      return sum + (Number(item.unitPrice) || 0) * qty;
    }, 0);

  if (loading) {
    return <LoadingSpinner message="이벤트 상품을 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="이벤트/특가"
        description="kpa-society 전용 이벤트 상품"
        breadcrumb={[{ label: '약국 HUB', href: '/store-hub' }, { label: '이벤트/특가' }]}
      />

      {/* 운영자 통계 카드 */}
      {isOperator && stats && (
        <div style={styles.statsSection}>
          <h3 style={styles.statsTitle}>이벤트 운영 현황</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>총 주문</span>
              <span style={styles.statValue}>{stats.totalOrders}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>판매 수량</span>
              <span style={styles.statValue}>{stats.totalQuantity}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>매출액</span>
              <span style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>참여 매장</span>
              <span style={styles.statValue}>{stats.participatingStores}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>등록 상품</span>
              <span style={{ ...styles.statValue, color: '#7C3AED' }}>{stats.registeredProducts}</span>
            </div>
          </div>
        </div>
      )}

      {/* 안내 배너 */}
      <div style={styles.banner}>
        <div style={styles.bannerContent}>
          <span style={styles.bannerIcon}>🛒</span>
          <div>
            <p style={styles.bannerTitle}>kpa-society 이벤트 전용 상품입니다.</p>
            <p style={styles.bannerDesc}>
              {hasStore
                ? '상품을 선택하고 이벤트 공간에서 바로 주문할 수 있습니다.'
                : '매장 등록 후 주문에 참여할 수 있습니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div style={styles.statusTabs}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.statusTab,
              ...(statusFilter === tab.key ? styles.statusTabActive : {}),
            }}
            onClick={() => handleStatusChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input
          type="text"
          style={styles.searchInput}
          placeholder="상품명 또는 공급업체 검색"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          style={styles.select}
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
          {/* Selection action bar */}
          {hasStore && selectedIds.size > 0 && (
            <div style={styles.selectionBar}>
              <span style={styles.selectionText}>{selectedIds.size}개 선택됨</span>
              <button
                style={styles.selectionOrderBtn}
                onClick={() => setOrderPanelOpen(!orderPanelOpen)}
              >
                {orderPanelOpen ? '패널 닫기' : '선택 주문'}
              </button>
            </div>
          )}

          {/* Table */}
          <div style={styles.listCard}>
            {/* Header */}
            <div style={styles.listHeader}>
              {hasStore && statusFilter !== 'ended' && (
                <span style={{ ...styles.colCenter, width: 48 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === selectableItems.length && selectableItems.length > 0}
                    onChange={handleSelectAll}
                    style={styles.checkbox}
                  />
                </span>
              )}
              <span style={{ ...styles.col, flex: 3 }}>이벤트명</span>
              <span style={{ ...styles.col, flex: 2 }}>공급업체</span>
              <span style={{ ...styles.colRight, width: 120 }}>가격</span>
              <span style={{ ...styles.colCenter, width: 140 }}>기간</span>
              <span style={{ ...styles.colCenter, width: 80 }}>상태</span>
              <span style={{ ...styles.colCenter, width: 100 }}>액션</span>
            </div>

            {/* Rows */}
            {filteredItems.map(item => (
              <div
                key={item.id}
                style={{
                  ...styles.listRow,
                  ...(!item.isActive ? { opacity: 0.6, backgroundColor: colors.neutral50 } : {}),
                }}
              >
                {hasStore && statusFilter !== 'ended' && (
                  <span style={{ ...styles.colCenter, width: 48 }}>
                    {item.isActive ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleSelectOne(item.id)}
                        style={styles.checkbox}
                      />
                    ) : (
                      <span style={{ width: 16, height: 16, display: 'inline-block' }} />
                    )}
                  </span>
                )}
                <div style={{ ...styles.col, flex: 3 }}>
                  <Link to={`/event-offers/${item.id}`} style={styles.productLink}>
                    {item.productName}
                  </Link>
                </div>
                <span style={{ ...styles.col, flex: 2, color: colors.neutral600, fontSize: 13 }}>
                  {item.supplierName}
                </span>
                <span style={{ ...styles.colRight, width: 120, fontWeight: 600 }}>
                  {formatPrice(item.unitPrice)}
                </span>
                <span style={{ ...styles.colCenter, width: 140, fontSize: 12, color: colors.neutral500 }}>
                  {formatPeriod(item)}
                </span>
                <span style={{ ...styles.colCenter, width: 80 }}>
                  {(() => { const b = getStatusBadge(item); return <span style={b.style}>{b.label}</span>; })()}
                </span>
                <span style={{ ...styles.colCenter, width: 100 }}>
                  {item.isActive && hasStore ? (
                    <button
                      style={styles.orderBtn}
                      onClick={() => handleDirectOrder(item)}
                    >
                      주문
                    </button>
                  ) : item.isActive && !hasStore ? (
                    <span style={styles.disabledText}>매장 필요</span>
                  ) : (
                    <span style={styles.disabledText}>종료됨</span>
                  )}
                </span>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div style={styles.emptyRow}>
                검색 결과가 없습니다.
              </div>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />

          {/* Order Panel — 진행중 이벤트만 표시 */}
          {orderPanelOpen && selectedIds.size > 0 && (
            <div style={styles.orderPanel}>
              <div style={styles.orderPanelHeader}>
                <h3 style={styles.orderPanelTitle}>공급업체별 주문</h3>
                <button
                  style={styles.orderAllBtn}
                  disabled={ordering}
                  onClick={handleOrderAll}
                >
                  {ordering ? '주문 처리중...' : `전체 주문 (${selectedIds.size}건)`}
                </button>
              </div>

              {Object.entries(groupedSelection).map(([supplierName, groupItems]) => (
                <div key={supplierName} style={styles.supplierGroup}>
                  <div style={styles.supplierHeader}>
                    <span style={styles.supplierName}>{supplierName}</span>
                    <span style={styles.supplierItemCount}>{groupItems.length}개 상품</span>
                  </div>

                  {groupItems.map(item => (
                    <div key={item.id} style={styles.orderItem}>
                      <span style={styles.orderItemName}>{item.productName}</span>
                      <div style={styles.orderItemRight}>
                        <label style={styles.qtyLabel}>
                          수량:
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={orderQuantities[item.id] || 1}
                            onChange={e =>
                              setOrderQuantities(prev => ({
                                ...prev,
                                [item.id]: Math.max(1, parseInt(e.target.value) || 1),
                              }))
                            }
                            style={styles.qtyInput}
                          />
                        </label>
                        <span style={styles.orderItemPrice}>
                          {formatPrice((Number(item.unitPrice) || 0) * (orderQuantities[item.id] || 1))}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div style={styles.supplierFooter}>
                    <span style={styles.supplierTotal}>
                      합계: {formatPrice(getGroupSubtotal(groupItems))}
                    </span>
                    <button
                      style={styles.supplierOrderBtn}
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  // Stats
  statsSection: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '20px',
  },
  statsTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral700,
    margin: '0 0 16px 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
  },
  statCard: {
    textAlign: 'center',
    padding: '12px 8px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: colors.neutral500,
    marginBottom: '4px',
  },
  statValue: {
    display: 'block',
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  // Banner
  banner: {
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  bannerIcon: { fontSize: '24px', flexShrink: 0 },
  bannerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#5B21B6',
    margin: '0 0 2px 0',
  },
  bannerDesc: {
    fontSize: '13px',
    color: '#6D28D9',
    margin: 0,
  },
  // Status filter tabs
  statusTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  statusTab: {
    padding: '8px 18px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.white,
    cursor: 'pointer',
  },
  statusTabActive: {
    backgroundColor: '#7C3AED',
    color: colors.white,
    borderColor: '#7C3AED',
  },
  // Toolbar
  toolbar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: colors.white,
    cursor: 'pointer',
    minWidth: '160px',
  },
  // Selection bar
  selectionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    backgroundColor: '#EDE9FE',
    border: '1px solid #DDD6FE',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  selectionText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#5B21B6',
  },
  selectionOrderBtn: {
    padding: '8px 20px',
    backgroundColor: '#7C3AED',
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Table
  listCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral100}`,
    fontSize: '11px',
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.neutral50}`,
  },
  col: {
    display: 'flex',
    flexDirection: 'column' as const,
    paddingRight: '12px',
  },
  colCenter: {
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  colRight: {
    textAlign: 'right' as const,
    flexShrink: 0,
    paddingRight: '12px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#7C3AED',
  },
  productLink: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral900,
    textDecoration: 'none',
  },
  badgeActive: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  badgeSoon: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  badgeEnded: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: colors.neutral200,
    color: colors.neutral500,
  },
  orderBtn: {
    padding: '6px 14px',
    backgroundColor: '#7C3AED',
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  disabledText: {
    fontSize: '11px',
    color: colors.neutral400,
  },
  emptyRow: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    color: colors.neutral500,
    fontSize: '14px',
  },
  // Order Panel
  orderPanel: {
    backgroundColor: colors.white,
    border: '2px solid #7C3AED',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  orderPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  orderPanelTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  orderAllBtn: {
    padding: '10px 24px',
    backgroundColor: '#7C3AED',
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Supplier group
  supplierGroup: {
    backgroundColor: colors.neutral50,
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
  },
  supplierHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  supplierName: {
    fontSize: '15px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  supplierItemCount: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  orderItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  orderItemName: {
    fontSize: '14px',
    color: colors.neutral800,
    flex: 1,
  },
  orderItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  qtyLabel: {
    fontSize: '13px',
    color: colors.neutral600,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  qtyInput: {
    width: '56px',
    padding: '6px 8px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  orderItemPrice: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
    minWidth: '100px',
    textAlign: 'right' as const,
  },
  supplierFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    paddingTop: '12px',
  },
  supplierTotal: {
    fontSize: '16px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  supplierOrderBtn: {
    padding: '8px 20px',
    backgroundColor: '#059669',
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
