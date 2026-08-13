/**
 * KpaEventOfferPage - 이벤트 상품 테이블 & 장바구니 담기 페이지
 *
 * WO-EVENT-OFFER-HUB-TABLE-AND-DIRECT-ORDER-REFINE-V1:
 * - 카드 그리드 → 테이블 중심 비교/선택 구조
 * - 공급업체별 묶음 담기 패널
 *
 * WO-EVENT-OFFER-HUB-TIME-WINDOW-FILTER-HOTFIX-V1:
 * - 진행중/종료/전체 상태 필터 (기본: 진행중) · 기간 컬럼 · 종료 이벤트 주문 UX 차단
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   테이블 마크업(+ inline style 블록)을 공통 `EventOfferHubView`(@o4o/store-ui-core) 로 이관.
 *   KPA 고유 업무는 **slot 으로 그대로 유지**한다 —
 *   상태 4탭 / 운영자 통계 / 검색 / 공급업체 필터 / 공급업체 묶음 담기 패널 / 기간 컬럼 / 할인 표기.
 *   API · 권한 · 담기 정책(perOrderLimit clamp) 무변경.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { LoadError } from '@o4o/ui';
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '../../components/common';
import { eventOfferApi, storeCartApi } from '../../api';
import { useAuth } from '../../contexts';
import { CART_SERVICE_KEY, buildEventOfferCartPayload } from '../../utils/eventOfferCart';
import { EventOfferHubView } from '@o4o/store-ui-core';
import { PLATFORM_ROLES, hasAnyRole } from '../../lib/role-constants';
import { kpaConfig } from '@o4o/operator-ux-core';
import type { EventOfferItem, EventOfferStatus, EventOfferStats } from '../../types';

interface OrderResult {
  itemId: string;
  success: boolean;
  error?: string;
}

// WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 4-탭 (진행 예정/진행 중/종료/전체)
type StatusTab = { key: EventOfferStatus; label: string };
const STATUS_TABS: StatusTab[] = [
  { key: 'upcoming', label: '진행 예정' },
  { key: 'active', label: '진행 중' },
  { key: 'ended', label: '종료' },
  { key: 'all', label: '전체' },
];

function formatPrice(price: number | null | undefined) {
  if (price === null || price === undefined) return '가격 미정';
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ko-KR');

function formatPeriod(item: EventOfferItem) {
  const start = item.startAt ? formatDate(item.startAt) : formatDate(item.createdAt);
  const end = item.endAt ? formatDate(item.endAt) : null;
  if (item.status === 'active' && !item.startAt) return `${start} ~`;
  if (end) return `${start} ~ ${end}`;
  return `${start} ~`;
}

export function KpaEventOfferPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Data
  const [items, setItems] = useState<EventOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<EventOfferStats | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<EventOfferStatus>('active');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Ordering
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  // WO-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1:
  // 조회 실패를 setItems([]) 로 삼켜 "진행중인 이벤트가 없습니다" 로 위장했다.
  const [loadError, setLoadError] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [ordering, setOrdering] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const hasStore = user?.isStoreOwner === true;
  const isOperator = user ? hasAnyRole(user.roles, PLATFORM_ROLES) : false;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await eventOfferApi.getEnrichedOffers({
        page: currentPage,
        limit: 20,
        status: statusFilter,
      });
      setItems(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.warn('Enriched event offer API not available:', err);
      setLoadError(true);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }

    if (isOperator) {
      try {
        const statsRes = await eventOfferApi.getEventOfferStats();
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

  // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
  // 진행 중(active) 항목만 주문 선택 가능. upcoming/sold_out/ended/canceled 제외.
  const selectableItems = useMemo(
    () => filteredItems.filter(i => i.status === 'active'),
    [filteredItems],
  );

  const groupedSelection = useMemo(() => {
    const selected = items.filter(i => selectedIds.has(i.id) && i.status === 'active');
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

  // WO-O4O-EVENT-OFFER-TO-CART-PHASE1A-FOLLOWUP-V1: participate 직접주문 → cart 담기.
  // 1회 주문 한도(perOrderLimit) 가 있으면 상한 적용. participate API/service 는 미삭제(legacy 유지).
  const clampToLimit = (item: EventOfferItem, qty: number) => {
    const v = Math.max(1, qty || 1);
    return item.perOrderLimit && item.perOrderLimit > 0 ? Math.min(v, item.perOrderLimit) : v;
  };

  const handleDirectOrder = async (item: EventOfferItem) => {
    try {
      await storeCartApi.addItem(
        CART_SERVICE_KEY,
        buildEventOfferCartPayload(item, clampToLimit(item, 1)),
      );
      toast.success(`"${item.productName}" 장바구니에 담았습니다.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || '장바구니에 담지 못했습니다.');
    }
  };

  const handleBatchOrder = async (supplierItems: EventOfferItem[]) => {
    setOrdering(true);
    const results: OrderResult[] = [];

    for (const item of supplierItems) {
      const qty = clampToLimit(item, orderQuantities[item.id] || 1);
      try {
        await storeCartApi.addItem(CART_SERVICE_KEY, buildEventOfferCartPayload(item, qty));
        results.push({ itemId: item.id, success: true });
      } catch (err: any) {
        results.push({
          itemId: item.id,
          success: false,
          error: err?.response?.data?.error?.message || err?.message || '담기 실패',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount === 0) {
      toast.success(`선택한 이벤트오퍼 ${successCount}건을 장바구니에 담았습니다.`);
    } else {
      toast.error(`${successCount}건 담기 성공, ${failCount}건 실패`);
    }

    setOrdering(false);
    setSelectedIds(new Set());
    setOrderPanelOpen(false);
    setOrderQuantities({});
  };

  const handleOrderAll = async () => {
    const allItems = items.filter(i => selectedIds.has(i.id) && i.isActive);
    await handleBatchOrder(allItems);
  };

  const getGroupSubtotal = (groupItems: EventOfferItem[]) =>
    groupItems.reduce((sum, item) => {
      const qty = orderQuantities[item.id] || 1;
      return sum + (Number(item.unitPrice) || 0) * qty;
    }, 0);

  if (loading) {
    return <LoadingSpinner message="이벤트 상품을 불러오는 중..." />;
  }

  // 선택 컬럼은 매장 보유 + 종료 탭이 아닐 때만 (기존 정책 유지)
  const selectionEnabled = hasStore && statusFilter !== 'ended';

  const isEmptyList = items.length === 0 && !searchQuery && !supplierFilter;

  return (
    <div className="max-w-[1200px] mx-auto px-5 pb-10">
      <PageHeader
        title="이벤트/특가"
        description="kpa-society 전용 이벤트 상품"
        breadcrumb={[
          { label: kpaConfig.uiText.appEntry.storeHubTitle, href: '/store-hub' },
          { label: '이벤트/특가' },
        ]}
      />

      {loadError ? (
        <LoadError onRetry={() => void loadData()} />
      ) : (
        <EventOfferHubView<EventOfferItem>
          items={loadError ? [] : filteredItems}
          loading={false}
          nameHeader="이벤트명"
          dateHeader="기간"
          formatDate={formatPeriod}
          showDiscount
          isDimmed={item => item.status !== 'active'}
          selection={
            selectionEnabled
              ? {
                  selectableIds: new Set(selectableItems.map(i => i.id)),
                  selectedIds,
                  onToggle: handleSelectOne,
                  onToggleAll: handleSelectAll,
                  isSelectable: item => item.status === 'active',
                }
              : undefined
          }
          renderName={item => (
            <Link
              to={`/event-offers/${item.id}`}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              {item.productName}
            </Link>
          )}
          renderAction={item => {
            if (item.status === 'upcoming') return <span className="text-xs text-slate-400">곧 시작</span>;
            if (item.status === 'sold_out') return <span className="text-xs text-slate-400">매진</span>;
            if (item.status !== 'active') return <span className="text-xs text-slate-400">종료됨</span>;
            if (!hasStore) return <span className="text-xs text-slate-400">매장 필요</span>;
            return (
              <button
                type="button"
                onClick={() => handleDirectOrder(item)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                담기
              </button>
            );
          }}
          empty={
            isEmptyList ? (
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
              <div className="text-center py-12 text-sm text-slate-500">검색 결과가 없습니다.</div>
            )
          }
          header={
            <>
              {/* 운영자 통계 카드 */}
              {isOperator && stats && (
                <div className="bg-white border border-slate-200 rounded-xl px-6 py-5">
                  <h3 className="text-[15px] font-semibold text-slate-700 mb-4">이벤트 운영 현황</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { label: '총 주문', value: String(stats.totalOrders) },
                      { label: '판매 수량', value: String(stats.totalQuantity) },
                      { label: '매출액', value: formatCurrency(stats.totalRevenue) },
                      { label: '참여 매장', value: String(stats.participatingStores) },
                      { label: '등록 상품', value: String(stats.registeredProducts), accent: true },
                    ].map(card => (
                      <div key={card.label} className="flex flex-col gap-1 rounded-lg bg-slate-50 px-4 py-3">
                        <span className="text-xs text-slate-500">{card.label}</span>
                        <span
                          className={`text-lg font-bold ${card.accent ? 'text-violet-600' : 'text-slate-800'}`}
                        >
                          {card.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 안내 배너 */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg leading-none">🛒</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      kpa-society 이벤트 전용 상품입니다.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {hasStore
                        ? '상품을 선택해 장바구니에 담은 뒤 내 장바구니에서 확인할 수 있습니다.'
                        : '매장 등록 후 장바구니에 담을 수 있습니다.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          }
          beforeTable={
            <div className="space-y-3">
              {/* Status filter tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-slate-200">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleStatusChange(tab.key)}
                    className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                      statusFilter === tab.key
                        ? 'border-blue-600 text-blue-700 font-semibold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="상품명 또는 공급업체 검색"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <select
                  value={supplierFilter}
                  onChange={e => setSupplierFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="">전체 공급업체</option>
                  {uniqueSuppliers.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {/* WO-O4O-EVENT-OFFER-TO-CART-PHASE1A-FOLLOWUP-V1: 내 장바구니 진입점 */}
                {hasStore && (
                  <Link
                    to="/store-hub/cart"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    🛒 내 장바구니
                  </Link>
                )}
              </div>

              {/* Selection action bar */}
              {hasStore && selectedIds.size > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedIds.size}개 선택됨
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrderPanelOpen(!orderPanelOpen)}
                    className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    {orderPanelOpen ? '패널 닫기' : '선택 담기'}
                  </button>
                </div>
              )}
            </div>
          }
          afterTable={
            <>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />

              {/* Order Panel — 진행중 이벤트만 표시 */}
              {orderPanelOpen && selectedIds.size > 0 && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-base font-semibold text-slate-800">공급업체별 장바구니 담기</h3>
                    <button
                      type="button"
                      disabled={ordering}
                      onClick={handleOrderAll}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {ordering ? '담는 중...' : `전체 담기 (${selectedIds.size}건)`}
                    </button>
                  </div>

                  {Object.entries(groupedSelection).map(([supplierName, groupItems]) => (
                    <div key={supplierName} className="mt-4 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                        <span className="text-sm font-semibold text-slate-700">{supplierName}</span>
                        <span className="text-xs text-slate-500">{groupItems.length}개 상품</span>
                      </div>

                      {groupItems.map(item => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"
                        >
                          <span className="text-sm text-slate-700">{item.productName}</span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 text-xs text-slate-500">
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
                                className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                              />
                            </label>
                            <span className="text-sm font-semibold text-slate-800">
                              {formatPrice((Number(item.unitPrice) || 0) * (orderQuantities[item.id] || 1))}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                        <span className="text-sm font-semibold text-slate-800">
                          합계: {formatPrice(getGroupSubtotal(groupItems))}
                        </span>
                        <button
                          type="button"
                          disabled={ordering}
                          onClick={() => handleBatchOrder(groupItems)}
                          className="rounded-md border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                        >
                          {ordering ? '담는 중...' : '장바구니 담기'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          }
        />
      )}
    </div>
  );
}

export default KpaEventOfferPage;
