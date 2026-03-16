/**
 * OrdersManagementPage — Neture 주문 관리
 * WO-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
 *
 * API: GET /api/v1/neture/operator/orders (Phase 2에서 생성)
 * 참조: GlycoPharm OrdersPage.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ─── Types ───────────────────────────────────────────────────

type TabType = 'all' | 'pending' | 'processing' | 'shipped' | 'completed';
type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'created';

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  final_amount: number;
  buyer_name: string;
  buyer_email: string;
  created_at: string;
}

interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Status Badge ────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  created: { label: '생성', color: 'bg-slate-100 text-slate-700', icon: Clock },
  pending_payment: { label: '결제대기', color: 'bg-amber-100 text-amber-700', icon: Clock },
  paid: { label: '결제완료', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  preparing: { label: '준비중', color: 'bg-purple-100 text-purple-700', icon: Package },
  shipped: { label: '배송중', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
  delivered: { label: '배송완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-700', icon: XCircle },
  refunded: { label: '환불', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

function OrderStatusBadge({ status }: { status: string }) {
  const cfg = ORDER_STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-500', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: '결제대기', color: 'text-amber-600' },
    paid: { label: '결제완료', color: 'text-green-600' },
    refunded: { label: '환불됨', color: 'text-slate-500' },
  };
  const { label, color } = config[status] || { label: status, color: 'text-slate-500' };
  return <span className={`text-xs font-medium ${color}`}>{label}</span>;
}

// ─── Component ───────────────────────────────────────────────

const EMPTY_STATS: OrderStats = { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0 };

export default function OrdersManagementPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [stats, setStats] = useState<OrderStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const getStatusFilter = (tab: TabType): string | undefined => {
    switch (tab) {
      case 'pending': return 'pending_payment';
      case 'processing': return 'paid';
      case 'shipped': return 'shipped';
      case 'completed': return 'delivered';
      default: return undefined;
    }
  };

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '20',
      });
      const statusFilter = getStatusFilter(activeTab);
      if (statusFilter) params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);

      const data = await apiFetch<{
        success: boolean;
        data: {
          orders: OrderData[];
          stats: OrderStats;
          pagination: PaginationData;
        };
      }>(`/api/v1/neture/operator/orders?${params}`);

      if (data.success && data.data) {
        setOrders(data.data.orders);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
      } else {
        setOrders([]);
        setStats(EMPTY_STATS);
      }
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err?.message || '주문 데이터를 불러올 수 없습니다');
      setOrders([]);
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const tabs = [
    { id: 'all' as const, label: '전체', count: stats.total },
    { id: 'pending' as const, label: '대기', count: stats.pending },
    { id: 'processing' as const, label: '처리중', count: stats.processing },
    { id: 'shipped' as const, label: '배송중', count: stats.shipped },
    { id: 'completed' as const, label: '완료', count: stats.delivered },
  ];

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('ko-KR', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-slate-500 text-sm">주문 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">주문 관리</h1>
          <p className="text-slate-500 text-sm">Neture 주문 현황 및 처리</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">전체 주문</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
              <p className="text-xs text-slate-500">대기 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.processing}</p>
              <p className="text-xs text-slate-500">처리 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.shipped}</p>
              <p className="text-xs text-slate-500">배송 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.delivered}</p>
              <p className="text-xs text-slate-500">배송 완료</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="주문번호, 구매자명 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              검색
            </button>
          </div>
        </div>

        {/* Table or Empty */}
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 text-lg">주문 데이터가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">주문번호</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">구매자</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">금액</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">결제</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">주문일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="font-medium text-slate-800">{order.order_number}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-800">{order.buyer_name || '-'}</p>
                        <p className="text-xs text-slate-500">{order.buyer_email || ''}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-medium text-slate-800">{Number(order.final_amount).toLocaleString()}</span>
                        <span className="text-slate-400 text-xs ml-1">원</span>
                      </td>
                      <td className="px-4 py-4">
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td className="px-4 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(order.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(currentPage - 2, pagination.totalPages - 4));
                    return start + i;
                  }).filter(p => p <= pagination.totalPages).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
