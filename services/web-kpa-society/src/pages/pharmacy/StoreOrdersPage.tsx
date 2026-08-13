/**
 * StoreOrdersPage - 구매/발주 내역 (buyer)
 *
 * IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1 / WO-...-BUYER-LEDGER-ALIGNMENT-V1:
 *   "내 매장 주문 내역" canonical = buyer(구매/발주 내역). buyerId 기준 checkout_orders(/checkout/orders).
 *   (기존 "판매자 관점" /checkout/store-orders + StoreOrderDetailDrawer(상태변경) 제거.
 *    seller "받은 주문/판매 이행" 은 별도 화면으로 분리 — 본 화면 범위 외.)
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 §8:
 *   헤더 / KPI 3블록 / 상태 필터 바 / loading·error·empty / pagination 뼈대를 GlycoPharm
 *   `PharmacyOrders` 와 공유하는 `BuyerOrderLedgerView` 로 이관했다. 여기 남는 것은
 *   KPA 고유 config 뿐이다 — 상태 탭(3서비스 공통 매핑) · 결제 판정 · 주문 작업대 링크 ·
 *   DataTable 컬럼 정의. 데이터 소스(getBuyerOrders)·문구·집계 정책 무변경.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { getBuyerOrders } from '../../api/checkout';
import type { BuyerOrder } from '../../api/checkout';
// 3서비스 공통 buyer checkout 상태 표시 매핑 (WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1)
import {
  BUYER_CHECKOUT_STATUS_TABS,
  BuyerOrderStatusBadge,
  BuyerOrderLedgerView,
} from '@o4o/store-ui-core';

const PAGE_SIZE = 20;

function isPaid(o: BuyerOrder): boolean {
  const s = (o.status || '').toLowerCase();
  const p = (o.paymentStatus || '').toLowerCase();
  return p === 'paid' || s === 'paid' || s === 'completed' || s === 'fulfilled';
}

function isCancelled(o: BuyerOrder): boolean {
  return (o.status || '').toLowerCase() === 'cancelled';
}

/** KPA 는 checkout status 원값으로 탭을 매칭한다(파생 상태 collapse 없음). */
function matchStatus(o: BuyerOrder, tabKey: string): boolean {
  return tabKey === 'all' ? true : (o.status || '').toLowerCase() === tabKey;
}

const columns: Column<BuyerOrder>[] = [
  {
    key: 'orderNumber',
    title: '주문번호',
    render: (_v: unknown, row: BuyerOrder) => (
      <span className="text-[13px] font-medium text-slate-800">{row.orderNumber}</span>
    ),
  },
  {
    key: 'itemCount',
    title: '상품',
    render: (_v: unknown, row: BuyerOrder) =>
      row.itemCount > 0 ? (
        <span className="text-[13px]">상품 {row.itemCount}개</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: 'totalAmount',
    title: '금액',
    width: '120px',
    align: 'right' as const,
    render: (_v: unknown, row: BuyerOrder) => (
      <span className="text-[13px] font-semibold">
        {Number(row.totalAmount).toLocaleString('ko-KR')}원
      </span>
    ),
  },
  {
    key: 'status',
    title: '상태',
    width: '100px',
    align: 'center' as const,
    render: (_v: unknown, row: BuyerOrder) => <BuyerOrderStatusBadge status={row.status} />,
  },
  {
    key: 'createdAt',
    title: '주문일',
    width: '140px',
    render: (_v: unknown, row: BuyerOrder) => (
      <span className="text-xs text-slate-500">
        {new Date(row.createdAt).toLocaleDateString('ko-KR')}
      </span>
    ),
  },
];

export function StoreOrdersPage() {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // buyer endpoint 는 status 필터 미지원 → 전체 조회 후 client-side 필터/집계
      const res = await getBuyerOrders({ limit: 100 });
      setOrders(res.success ? res.data ?? [] : []);
    } catch {
      setError('주문 내역을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderList = useMemo(
    () => (rows: BuyerOrder[]) => (
      /* WO-O4O-STORE-LAYOUT-WIDTH-OVERFLOW-FIX-V1: table overflow → horizontal scroll */
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <DataTable<BuyerOrder>
          columns={columns}
          dataSource={rows}
          rowKey="id"
          emptyText="주문이 없습니다"
        />
      </div>
    ),
    [],
  );

  return (
    <BuyerOrderLedgerView<BuyerOrder>
      orders={orders}
      loading={loading}
      error={error}
      onRetry={loadData}
      accent="blue"
      title="발주 내역"
      description="공급자에게 주문한 상품의 발주·결제·배송 진행 상태를 확인합니다 (온라인 판매 고객 주문은 ‘온라인 판매 > 주문 관리’)"
      headerAction={
        <Link
          to="/store/commerce/order-worktable"
          className="whitespace-nowrap rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600"
        >
          주문 작업대 →
        </Link>
      }
      statusTabs={BUYER_CHECKOUT_STATUS_TABS}
      matchStatus={matchStatus}
      isPaid={isPaid}
      isCancelled={isCancelled}
      pageSize={PAGE_SIZE}
      renderList={renderList}
      empty={{
        title: '주문 내역이 없습니다',
        description:
          '매장 허브에서 O4O 주문 가능 상품이나 이벤트 오퍼를 주문하면 이곳에서 확인할 수 있습니다.',
        filteredDescription: '검색 조건에 맞는 주문이 없습니다.',
        action: (
          <Link
            to="/store/commerce/order-worktable"
            className="mt-4 inline-block text-sm font-medium text-blue-600"
          >
            주문 작업대 바로가기 →
          </Link>
        ),
      }}
    />
  );
}
