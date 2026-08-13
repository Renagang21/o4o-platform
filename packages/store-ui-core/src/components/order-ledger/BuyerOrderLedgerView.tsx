/**
 * BuyerOrderLedgerView — 매장 buyer 주문(구매/발주) 내역 공통 View
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 §8
 *
 * 업무 계약 구분(§8) — 주문 내역은 하나가 아니다:
 *   (1) **buyer checkout ledger** = 매장이 공급자에게 낸 구매/발주 내역.
 *       buyerId 기준 `checkout_orders` (`/checkout/orders`). ← **본 View 의 범위**
 *       현행 소비처: KPA `StoreOrdersPage`, GlycoPharm `PharmacyOrders`.
 *   (2) 소비자 storefront 주문 = 매장이 **받은** 주문(K-Cosmetics `/cosmetics/orders`,
 *       channel local/travel · fulfillment). 방향이 반대이므로 합치지 않는다.
 *   (3) PharmacyHub 주문 = paymentGroup 결제 우선 계약(`supplierNotified` 기준 표시).
 *       결제 전 주문을 "접수됨"으로 표현하지 않는 고유 규칙이 있어 합치지 않는다.
 *
 * 공통화 대상은 두 buyer ledger 화면이 문자 그대로 복제하고 있던 뼈대다:
 *   헤더 / KPI 3블록(총 주문 · 결제완료 · 이번 달 주문액) / 상태 필터 바 /
 *   (선택) 주문번호 검색 / loading · error · empty 상태 / (선택) 페이지네이션.
 *
 * 서비스 차이는 조건문이 아니라 config·adapter·slot 으로 유지한다(§10):
 *   - 상태 탭 정의와 매칭 = `statusTabs` + `matchStatus` (GP 의 결제중심 파생 3상태 유지)
 *   - 결제완료 / 취소 판정 = `isPaid` · `isCancelled` adapter (KPI 집계 정책 보존)
 *   - 목록 본문 = `renderList` slot (KPA DataTable / GP 확장 카드 — 업무상 다른 표현)
 *   - 헤더 우측 액션 = `headerAction` slot (KPA 주문 작업대 링크)
 *
 * 상태 변경 기능은 없다. buyer ledger 는 **읽기 전용**이다(seller 이행 화면은 별도).
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, AlertCircle, Package, Search } from 'lucide-react';
import { Pagination } from '@o4o/operator-ux-core';
import { STORE_ACCENT_CLASSES, type StoreAccent } from '../../theme/storeAccent';

/** 두 화면이 공통으로 쓰는 최소 주문 형상. 서비스 타입은 이 형상을 만족하면 된다. */
export interface BuyerLedgerOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

export interface BuyerLedgerStatusTab {
  key: string;
  label: string;
}

export interface BuyerOrderLedgerEmptyConfig {
  title: string;
  /** 필터·검색 없이 0건일 때 */
  description: string;
  /** 필터·검색 결과가 0건일 때 (미지정 시 description 사용) */
  filteredDescription?: string;
  /** 빈 상태 하단 액션 (예: 주문 작업대 바로가기) */
  action?: ReactNode;
}

export interface BuyerOrderLedgerViewProps<T extends BuyerLedgerOrder> {
  orders: T[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** 서버가 내려준 총 건수. 미지정 시 `orders.length`. */
  totalCount?: number;

  accent?: StoreAccent;
  title: string;
  /** 설명 문구. 총 건수를 문장에 넣는 서비스는 함수형을 쓴다. */
  description: string | ((ctx: { loading: boolean; totalCount: number }) => ReactNode);
  headerAction?: ReactNode;

  statusTabs: readonly BuyerLedgerStatusTab[];
  /** 상태 탭 매칭 — 서비스별 파생 상태 정책을 그대로 유지한다. */
  matchStatus: (order: T, tabKey: string) => boolean;

  /** KPI 집계 판정 — 서비스별 결제/취소 해석을 그대로 유지한다. */
  isPaid: (order: T) => boolean;
  isCancelled: (order: T) => boolean;

  /** 지정 시 주문번호 검색 입력을 노출한다(client-side, 300ms debounce). */
  searchPlaceholder?: string;

  /** 지정 시 공통 Pagination 으로 client-side 분할한다. 미지정 시 전체를 넘긴다. */
  pageSize?: number;

  /** 목록 본문 — 서비스가 소유한다. */
  renderList: (rows: T[]) => ReactNode;

  empty: BuyerOrderLedgerEmptyConfig;
}

export function BuyerOrderLedgerView<T extends BuyerLedgerOrder>({
  orders,
  loading,
  error,
  onRetry,
  totalCount,
  accent = 'blue',
  title,
  description,
  headerAction,
  statusTabs,
  matchStatus,
  isPaid,
  isCancelled,
  searchPlaceholder,
  pageSize,
  renderList,
  empty,
}: BuyerOrderLedgerViewProps<T>) {
  const ac = STORE_ACCENT_CLASSES[accent];

  const [statusKey, setStatusKey] = useState<string>(statusTabs[0]?.key ?? 'all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 필터가 바뀌면 첫 페이지로.
  useEffect(() => {
    setPage(1);
  }, [statusKey, search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchStatus(order, statusKey)) return false;
      if (q && !order.orderNumber.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, statusKey, search, matchStatus]);

  // KPI — buyer 관점: 총 주문 / 결제완료 / 이번 달 주문액.
  const kpi = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyAmount = orders
      .filter((o) => new Date(o.createdAt) >= monthStart && !isCancelled(o))
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    return {
      total: totalCount ?? orders.length,
      paid: orders.filter(isPaid).length,
      monthlyAmount,
    };
  }, [orders, totalCount, isPaid, isCancelled]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const rows = pageSize ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;

  const isFiltered = statusKey !== (statusTabs[0]?.key ?? 'all') || search.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {typeof description === 'function'
              ? description({ loading, totalCount: kpi.total })
              : description}
          </p>
        </div>
        {headerAction}
      </div>

      {/* KPI 3블록 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">총 주문</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {kpi.total.toLocaleString('ko-KR')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">결제완료</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {kpi.paid.toLocaleString('ko-KR')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">이번 달 주문액</p>
          <p className={`mt-1 text-2xl font-bold ${ac.text}`}>
            {kpi.monthlyAmount > 0 ? `₩${kpi.monthlyAmount.toLocaleString('ko-KR')}` : '—'}
          </p>
        </div>
      </div>

      {/* 검색 + 상태 필터 바 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {searchPlaceholder && (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        )}
        <div className="flex items-center gap-1 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusKey(tab.key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                statusKey === tab.key
                  ? ac.pillActive
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 본문 — loading / error / empty / list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">주문 내역을 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16">
          <AlertCircle className="h-12 w-12 text-red-300" />
          <p className="mt-3 text-sm text-slate-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium ${ac.solidBtn}`}
          >
            다시 시도
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-slate-200" />
          <h3 className="mb-2 text-lg font-medium text-slate-800">{empty.title}</h3>
          <p className="text-sm text-slate-500">
            {isFiltered ? (empty.filteredDescription ?? empty.description) : empty.description}
          </p>
          {!isFiltered && empty.action}
        </div>
      ) : (
        <div>
          {renderList(rows)}
          {pageSize && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={(p: number) => setPage(p)}
            />
          )}
        </div>
      )}
    </div>
  );
}
