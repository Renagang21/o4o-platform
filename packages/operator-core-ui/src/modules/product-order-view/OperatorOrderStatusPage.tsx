/**
 * @o4o/operator-core-ui — OperatorOrderStatusPage
 *
 * WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1
 *
 * Operator 서비스 전역 "주문 현황" view-only 콘솔 (checkout_orders 조회).
 * GlycoPharm / K-Cosmetics 공통. serviceKey 별 fetch + accent/copy 는 wrapper 가 주입.
 *
 * ⚠️ view-only 불변: 주문 상태변경/배송/취소/환불/송장/정산/bulk action/selectable 없음.
 *    조회·검색·필터·페이지네이션만 제공.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  RefreshCw,
  Calendar,
  Store,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type {
  OperatorOrderStatusPageProps,
  OrderStatusRow,
  OrderStatusStats,
} from './types';

const EMPTY_STATS: OrderStatusStats = { total: 0, paid: 0, pending: 0, cancelled: 0, totalAmount: 0 };
const ITEMS_PER_PAGE = 20;

const ORDER_STATUS_LABEL: Record<string, string> = {
  created: '주문생성',
  pending_payment: '결제대기',
  paid: '결제완료',
  refunded: '환불',
  cancelled: '취소',
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: '결제대기',
  paid: '결제완료',
  failed: '결제실패',
  refunded: '환불',
};

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'paid' ? 'bg-green-100 text-green-700'
    : status === 'cancelled' ? 'bg-slate-100 text-slate-600'
    : status === 'refunded' ? 'bg-slate-100 text-slate-500'
    : 'bg-amber-100 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{ORDER_STATUS_LABEL[status] || status}</span>;
}

function PaymentText({ status }: { status: string }) {
  const color =
    status === 'paid' ? 'text-green-600'
    : status === 'refunded' ? 'text-slate-500'
    : status === 'failed' ? 'text-red-600'
    : 'text-amber-600';
  return <span className={`text-xs font-medium ${color}`}>{PAYMENT_STATUS_LABEL[status] || status}</span>;
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function OperatorOrderStatusPage({ fetchOrders, config }: OperatorOrderStatusPageProps) {
  const {
    title = '주문 현황',
    description = 'B2B 주문 현황 (조회 전용)',
    emptyMessage = '표시할 주문이 없습니다',
    searchPlaceholder = '주문번호 검색...',
    errorFallback = '주문 데이터를 불러올 수 없습니다',
    noticeTitle = '주문 조회 전용',
    noticeBody = '주문 현황을 조회합니다. 주문 확인·배송·취소·환불·송장 등 상태 변경 기능은 후속 매장/판매자 기능에서 제공 예정입니다.',
    accent,
  } = config;

  const [orders, setOrders] = useState<OrderStatusRow[]>([]);
  const [stats, setStats] = useState<OrderStatusStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchOrders({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentStatus: paymentFilter !== 'all' ? paymentFilter : undefined,
        search: searchTerm || undefined,
      });
      setOrders(result.orders || []);
      setStats(result.stats || EMPTY_STATS);
      setTotalOrders(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err?.message || errorFallback);
      setOrders([]);
      setStats(EMPTY_STATS);
      setTotalOrders(0);
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrders, currentPage, statusFilter, paymentFilter, searchTerm, errorFallback]);

  useEffect(() => { load(); }, [load]);

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className={`w-8 h-8 animate-spin ${accent.loaderText}`} />
          <p className="text-slate-500 text-sm">주문 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

  const columns: ListColumnDef<OrderStatusRow>[] = [
    {
      key: 'orderNumber',
      header: '주문번호',
      render: (_v, o) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4 text-slate-400" />
          </div>
          <span className="font-medium text-slate-800">{o.orderNumber}</span>
        </div>
      ),
    },
    {
      key: 'storeName',
      header: '매장/채널',
      render: (_v, o) => (
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-700">{o.storeName || o.channel || '—'}</span>
        </div>
      ),
    },
    {
      key: 'itemCount',
      header: '품목수',
      width: '70px',
      align: 'right',
      render: (_v, o) => (
        <span className="font-medium text-slate-800">{o.itemCount}<span className="text-slate-400 text-xs ml-1">종</span></span>
      ),
    },
    {
      key: 'totalAmount',
      header: '금액',
      width: '120px',
      align: 'right',
      render: (_v, o) => (
        <span className="font-medium text-slate-800">{Number(o.totalAmount).toLocaleString()}<span className="text-slate-400 text-xs ml-1">원</span></span>
      ),
    },
    {
      key: 'paymentStatus',
      header: '결제',
      width: '80px',
      render: (_v, o) => <PaymentText status={o.paymentStatus} />,
    },
    {
      key: 'status',
      header: '상태',
      width: '110px',
      render: (_v, o) => <StatusPill status={o.status} />,
    },
    {
      key: 'createdAt',
      header: '주문일시',
      width: '130px',
      render: (_v, o) => (
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <Calendar className="w-3 h-3" />{formatDateTime(o.createdAt)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 조회 전용 안내 */}
      <div className={`${accent.infoContainer} border rounded-lg p-4 flex items-start gap-3`}>
        <AlertCircle className={`w-5 h-5 ${accent.infoIcon} shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${accent.infoTitle}`}>{noticeTitle}</p>
          <p className={`text-xs ${accent.infoBody} mt-0.5`}>{noticeBody}</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">{error}</p>
            <p className="text-xs text-amber-600">빈 데이터로 표시됩니다.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${accent.iconBg} flex items-center justify-center`}>
              <ShoppingCart className={`w-5 h-5 ${accent.iconText}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">전체 주문</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.paid}</p>
              <p className="text-xs text-slate-500">결제완료</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
              <p className="text-xs text-slate-500">대기</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.cancelled}</p>
              <p className="text-xs text-slate-500">취소</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {stats.totalAmount > 0 ? `${(stats.totalAmount / 10000).toLocaleString()}만` : '0'}
              </p>
              <p className="text-xs text-slate-500">총 주문금액</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 ${accent.focusRing} focus:border-transparent text-sm`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 ${accent.focusRing} text-sm`}
            >
              <option value="all">전체 상태</option>
              <option value="created">주문생성</option>
              <option value="pending_payment">결제대기</option>
              <option value="paid">결제완료</option>
              <option value="refunded">환불</option>
              <option value="cancelled">취소</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 ${accent.focusRing} text-sm`}
            >
              <option value="all">전체 결제</option>
              <option value="pending">결제대기</option>
              <option value="paid">결제완료</option>
              <option value="failed">결제실패</option>
              <option value="refunded">환불</option>
            </select>
          </div>
        </div>

        {/* view-only — row action / selectable / ActionBar 없음 */}
        <DataTable<OrderStatusRow>
          columns={columns}
          data={orders}
          rowKey="id"
          loading={isLoading}
          emptyMessage={emptyMessage}
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalOrders)} / {totalOrders}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-sm text-slate-600">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OperatorOrderStatusPage;
