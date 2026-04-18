/**
 * Operator Orders Page (Order Management)
 *
 * 세미-프랜차이즈 주문 관리
 * - 약국 B2B 주문 모니터링
 * - 주문 상태 관리
 * - 배송 추적
 *
 * WO-GLYCOPHARM-ORDERS-API: Real database queries (no mock data)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  MoreVertical,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  FileText,
  RefreshCw,
  Download,
  Calendar,
  Store,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DataTable, ActionBar } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { glycopharmApi, type OperatorOrder, type OperatorOrderStats, type OrderStatus } from '@/api/glycopharm';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

type TabType = 'all' | 'pending' | 'processing' | 'shipped' | 'completed';

// Empty stats (no mock values)
const EMPTY_STATS: OperatorOrderStats = {
  todayOrders: 0,
  todayRevenue: 0,
  pendingOrders: 0,
  processingOrders: 0,
  shippedOrders: 0,
  avgOrderValue: 0,
};

// Payment badge (text-only, no background)
function PaymentBadge({ status }: { status: 'pending' | 'paid' | 'refunded' }) {
  const config = {
    pending: { label: '결제대기', color: 'text-amber-600' },
    paid: { label: '결제완료', color: 'text-green-600' },
    refunded: { label: '환불됨', color: 'text-slate-500' },
  };

  const { label, color } = config[status];

  return <span className={`text-xs font-medium ${color}`}>{label}</span>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [stats, setStats] = useState<OperatorOrderStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const itemsPerPage = 10;

  // Map tab to status filter
  const getStatusFilter = (tab: TabType): OrderStatus | undefined => {
    switch (tab) {
      case 'pending':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'shipped':
        return 'shipped';
      case 'completed':
        return 'delivered';
      default:
        return undefined;
    }
  };

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await glycopharmApi.getOperatorOrders({
        status: getStatusFilter(activeTab),
        page: currentPage,
        limit: itemsPerPage,
        dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
        search: searchTerm || undefined,
      });

      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        setStats(response.data.stats || EMPTY_STATS);
        setTotalPages(response.data.pagination?.totalPages || 0);
        setTotalOrders(response.data.pagination?.total || 0);
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
  }, [activeTab, currentPage, dateFilter, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset selection on tab/filter/search change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, dateFilter, searchTerm]);

  // Tab counts (based on stats)
  const tabs = [
    { id: 'all' as const, label: '전체', count: totalOrders },
    { id: 'pending' as const, label: '대기', count: stats.pendingOrders },
    { id: 'processing' as const, label: '처리중', count: stats.processingOrders },
    { id: 'shipped' as const, label: '배송중', count: stats.shippedOrders },
    { id: 'completed' as const, label: '완료', count: 0 },
  ];

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
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
      <PageHeader
        title="주문 관리"
        description="약국 B2B 주문 현황 및 처리"
        actions={
          <>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
              <Download className="w-4 h-4" />
              내보내기
            </button>
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </>
        }
      />

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.todayOrders}</p>
              <p className="text-xs text-slate-500">오늘 주문</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {stats.todayRevenue > 0 ? `${(stats.todayRevenue / 10000).toLocaleString()}만` : '0'}
              </p>
              <p className="text-xs text-slate-500">오늘 매출</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.pendingOrders}</p>
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
              <p className="text-2xl font-bold text-slate-800">{stats.processingOrders}</p>
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
              <p className="text-2xl font-bold text-slate-800">{stats.shippedOrders}</p>
              <p className="text-xs text-slate-500">배송 중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {stats.avgOrderValue > 0 ? `${(stats.avgOrderValue / 10000).toFixed(1)}만` : '0'}
              </p>
              <p className="text-xs text-slate-500">평균 주문액</p>
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
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
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

        {/* Filters */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="주문번호, 약국명 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="week">이번 주</option>
              <option value="month">이번 달</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {(() => {
          const selectedPendingCount = selectedIds.filter(id => {
            const o = orders.find(ord => ord.id === id);
            return o?.status === 'pending';
          }).length;
          const selectedProcessingCount = selectedIds.filter(id => {
            const o = orders.find(ord => ord.id === id);
            return o?.status === 'processing';
          }).length;
          return (
            <div className="px-4 pt-3">
              <ActionBar
                selectedCount={selectedIds.length}
                onClearSelection={() => setSelectedIds([])}
                actions={[
                  ...(selectedPendingCount > 0 ? [{
                    key: 'confirm',
                    label: `주문 확인 (${selectedPendingCount})`,
                    onClick: () => { /* TODO: wire up order status API */ },
                    variant: 'primary' as const,
                    icon: <CheckCircle size={14} />,
                    loading: isBulkProcessing,
                  }] : []),
                  ...(selectedProcessingCount > 0 ? [{
                    key: 'ship',
                    label: `배송 시작 (${selectedProcessingCount})`,
                    onClick: () => { /* TODO: wire up order status API */ },
                    variant: 'primary' as const,
                    icon: <Truck size={14} />,
                    loading: isBulkProcessing,
                  }] : []),
                  ...(selectedPendingCount > 0 ? [{
                    key: 'cancel',
                    label: `주문 취소 (${selectedPendingCount})`,
                    onClick: () => { /* TODO: wire up order status API */ },
                    variant: 'danger' as const,
                    icon: <XCircle size={14} />,
                    loading: isBulkProcessing,
                  }] : []),
                ]}
              />
            </div>
          );
        })()}

        {/* Table */}
        {(() => {
          const columns: Column<OperatorOrder>[] = [
            {
              key: 'orderNumber',
              title: '주문 정보',
              render: (_v, o) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{o.orderNumber}</p>
                    {o.trackingNumber && <p className="text-xs text-slate-500">운송장: {o.trackingNumber}</p>}
                  </div>
                </div>
              ),
            },
            {
              key: 'pharmacyName',
              title: '약국',
              render: (_v, o) => (
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-800">{o.pharmacyName}</p>
                    <p className="text-xs text-slate-500">{o.pharmacyRegion}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'items',
              title: '수량',
              width: '70px',
              align: 'right',
              render: (_v, o) => (
                <span className="font-medium text-slate-800">{o.items}<span className="text-slate-400 text-xs ml-1">종</span></span>
              ),
            },
            {
              key: 'totalAmount',
              title: '금액',
              width: '110px',
              align: 'right',
              render: (_v, o) => (
                <span className="font-medium text-slate-800">{o.totalAmount.toLocaleString()}<span className="text-slate-400 text-xs ml-1">원</span></span>
              ),
            },
            {
              key: 'paymentStatus',
              title: '결제',
              width: '80px',
              render: (_v, o) => <PaymentBadge status={o.paymentStatus} />,
            },
            {
              key: 'status',
              title: '상태',
              width: '110px',
              render: (_v, o) => <StatusBadge status={o.status} />,
            },
            {
              key: 'createdAt',
              title: '주문일시',
              width: '130px',
              render: (_v, o) => (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Calendar className="w-3 h-3" />{formatDateTime(o.createdAt)}
                </div>
              ),
            },
            {
              key: 'actions',
              title: '액션',
              width: '60px',
              align: 'right',
              render: (_v, o) => (
                <div className="relative flex justify-end">
                  <button onClick={() => setSelectedOrder(selectedOrder === o.id ? null : o.id)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                  {selectedOrder === o.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSelectedOrder(null)} />
                      <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border py-2 z-20">
                        <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Eye className="w-4 h-4" />상세 보기</button>
                        {o.status === 'pending' && <button className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"><CheckCircle className="w-4 h-4" />주문 확인</button>}
                        {o.status === 'processing' && <button className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"><Truck className="w-4 h-4" />배송 시작</button>}
                        <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FileText className="w-4 h-4" />송장 출력</button>
                        {['pending', 'confirmed'].includes(o.status) && (<><hr className="my-1" /><button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><XCircle className="w-4 h-4" />주문 취소</button></>)}
                      </div>
                    </>
                  )}
                </div>
              ),
            },
          ];

          return (
            <DataTable<OperatorOrder>
              columns={columns}
              dataSource={orders}
              rowKey="id"
              loading={isLoading}
              emptyText="자료가 없습니다"
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: setSelectedIds,
              }}
              pagination={{
                current: currentPage,
                pageSize: itemsPerPage,
                total: totalOrders,
                onChange: (p) => setCurrentPage(p),
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}
