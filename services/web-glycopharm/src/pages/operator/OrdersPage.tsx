/**
 * Operator Orders Page (Order Management)
 *
 * 세미-프랜차이즈 주문 관리
 * - 약국 B2B 주문 모니터링
 * - 주문 상태 관리
 * - 배송 추적
 */

import { useState } from 'react';
import {
  ShoppingCart,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';

// Types
interface Order {
  id: string;
  orderNumber: string;
  pharmacyName: string;
  pharmacyRegion: string;
  items: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

type TabType = 'all' | 'pending' | 'processing' | 'shipped' | 'completed';

// Sample data
const sampleOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2025-001234',
    pharmacyName: '건강한약국',
    pharmacyRegion: '서울 강남구',
    items: 5,
    totalAmount: 850000,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: '2025-01-16T09:30:00',
  },
  {
    id: '2',
    orderNumber: 'ORD-2025-001233',
    pharmacyName: '행복약국',
    pharmacyRegion: '서울 마포구',
    items: 3,
    totalAmount: 420000,
    status: 'confirmed',
    paymentStatus: 'paid',
    createdAt: '2025-01-16T08:15:00',
  },
  {
    id: '3',
    orderNumber: 'ORD-2025-001232',
    pharmacyName: '사랑약국',
    pharmacyRegion: '부산 해운대구',
    items: 8,
    totalAmount: 1250000,
    status: 'processing',
    paymentStatus: 'paid',
    createdAt: '2025-01-15T16:45:00',
  },
  {
    id: '4',
    orderNumber: 'ORD-2025-001231',
    pharmacyName: '미래약국',
    pharmacyRegion: '인천 남동구',
    items: 2,
    totalAmount: 178000,
    status: 'shipped',
    paymentStatus: 'paid',
    createdAt: '2025-01-15T11:20:00',
    estimatedDelivery: '2025-01-17',
    trackingNumber: 'CJ1234567890',
  },
  {
    id: '5',
    orderNumber: 'ORD-2025-001230',
    pharmacyName: '청춘약국',
    pharmacyRegion: '대전 유성구',
    items: 4,
    totalAmount: 560000,
    status: 'delivered',
    paymentStatus: 'paid',
    createdAt: '2025-01-14T10:00:00',
  },
  {
    id: '6',
    orderNumber: 'ORD-2025-001229',
    pharmacyName: '희망약국',
    pharmacyRegion: '대구 수성구',
    items: 1,
    totalAmount: 89000,
    status: 'cancelled',
    paymentStatus: 'refunded',
    createdAt: '2025-01-14T09:30:00',
  },
];

// Stats
const orderStats = {
  todayOrders: 45,
  todayRevenue: 12500000,
  pendingOrders: 23,
  processingOrders: 18,
  shippedOrders: 32,
  avgOrderValue: 278000,
};

// Status badge
function StatusBadge({ status }: { status: Order['status'] }) {
  const config = {
    pending: { label: '대기', color: 'bg-amber-100 text-amber-700', icon: Clock },
    confirmed: { label: '확인됨', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    processing: { label: '처리중', color: 'bg-purple-100 text-purple-700', icon: Package },
    shipped: { label: '배송중', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
    delivered: { label: '배송완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: '취소됨', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// Payment badge
function PaymentBadge({ status }: { status: Order['paymentStatus'] }) {
  const config = {
    pending: { label: '결제대기', color: 'text-amber-600' },
    paid: { label: '결제완료', color: 'text-green-600' },
    refunded: { label: '환불됨', color: 'text-slate-500' },
  };

  const { label, color } = config[status];

  return <span className={`text-xs font-medium ${color}`}>{label}</span>;
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter orders
  const filteredOrders = sampleOrders.filter((order) => {
    if (activeTab === 'pending' && order.status !== 'pending') return false;
    if (activeTab === 'processing' && !['confirmed', 'processing'].includes(order.status)) return false;
    if (activeTab === 'shipped' && order.status !== 'shipped') return false;
    if (activeTab === 'completed' && !['delivered', 'cancelled'].includes(order.status)) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !order.orderNumber.toLowerCase().includes(search) &&
        !order.pharmacyName.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tabs = [
    { id: 'all' as const, label: '전체', count: sampleOrders.length },
    { id: 'pending' as const, label: '대기', count: sampleOrders.filter(o => o.status === 'pending').length },
    { id: 'processing' as const, label: '처리중', count: sampleOrders.filter(o => ['confirmed', 'processing'].includes(o.status)).length },
    { id: 'shipped' as const, label: '배송중', count: sampleOrders.filter(o => o.status === 'shipped').length },
    { id: 'completed' as const, label: '완료', count: sampleOrders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">주문 관리</h1>
          <p className="text-slate-500 text-sm">약국 B2B 주문 현황 및 처리</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
            <Download className="w-4 h-4" />
            내보내기
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{orderStats.todayOrders}</p>
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
              <p className="text-2xl font-bold text-slate-800">{(orderStats.todayRevenue / 10000).toLocaleString()}만</p>
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
              <p className="text-2xl font-bold text-slate-800">{orderStats.pendingOrders}</p>
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
              <p className="text-2xl font-bold text-slate-800">{orderStats.processingOrders}</p>
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
              <p className="text-2xl font-bold text-slate-800">{orderStats.shippedOrders}</p>
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
              <p className="text-2xl font-bold text-slate-800">{(orderStats.avgOrderValue / 10000).toFixed(1)}만</p>
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="week">이번 주</option>
              <option value="month">이번 달</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  주문 정보
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  약국
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  수량
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  결제
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  주문일시
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{order.orderNumber}</p>
                        {order.trackingNumber && (
                          <p className="text-xs text-slate-500">운송장: {order.trackingNumber}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-800">{order.pharmacyName}</p>
                        <p className="text-xs text-slate-500">{order.pharmacyRegion}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-slate-800">{order.items}</span>
                    <span className="text-slate-400 text-xs ml-1">종</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-slate-800">{order.totalAmount.toLocaleString()}</span>
                    <span className="text-slate-400 text-xs ml-1">원</span>
                  </td>
                  <td className="px-4 py-4">
                    <PaymentBadge status={order.paymentStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(order.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {selectedOrder === order.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setSelectedOrder(null)}
                            />
                            <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border py-2 z-20">
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                상세 보기
                              </button>
                              {order.status === 'pending' && (
                                <button className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  주문 확인
                                </button>
                              )}
                              {order.status === 'processing' && (
                                <button className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  배송 시작
                                </button>
                              )}
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                송장 출력
                              </button>
                              {['pending', 'confirmed'].includes(order.status) && (
                                <>
                                  <hr className="my-1" />
                                  <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
                                    주문 취소
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              총 {filteredOrders.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredOrders.length)}개 표시
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-500 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
