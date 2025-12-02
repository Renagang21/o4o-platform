/**
 * Supplier Orders Section
 * Can be used in dashboard (summary) or full-page mode
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EmptyState } from '../../common/EmptyState';
import { supplierOrderAPI } from '../../../services/supplierOrderApi';
import {
  SupplierOrderListItem,
  GetSupplierOrdersQuery,
  SupplierOrderStatus,
  DateRangePreset,
} from '../../../types/supplier-order';

export type SectionMode = 'dashboard' | 'full-page';

export interface SupplierOrdersSectionProps {
  mode?: SectionMode;
}

export const SupplierOrdersSection: React.FC<SupplierOrdersSectionProps> = ({
  mode = 'dashboard',
}) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SupplierOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierOrderStatus | 'all'>('all');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30days');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'order_date' | 'total_amount'>('order_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = mode === 'dashboard' ? 5 : 20;

  // Calculate date range based on preset
  const getDateRange = (preset: DateRangePreset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case 'today':
        return {
          date_from: today.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0],
        };
      case '7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return {
          date_from: sevenDaysAgo.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0],
        };
      case '30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return {
          date_from: thirtyDaysAgo.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0],
        };
      default:
        return {};
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const query: GetSupplierOrdersQuery = {
        page: currentPage,
        limit: pageSize,
        search: searchQuery || undefined,
        status: statusFilter,
        ...getDateRange(datePreset),
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await supplierOrderAPI.fetchOrders(query);
      setOrders(response.data.orders);
      setTotalPages(response.data.pagination.total_pages);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError('주문 목록을 불러오는데 실패했습니다.');
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders on mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [searchQuery, statusFilter, datePreset, sortBy, sortOrder, currentPage, mode]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders();
  };

  // Status badge color
  const getStatusColor = (status: SupplierOrderStatus) => {
    switch (status) {
      case SupplierOrderStatus.NEW:
        return 'bg-blue-100 text-blue-800';
      case SupplierOrderStatus.PROCESSING:
        return 'bg-yellow-100 text-yellow-800';
      case SupplierOrderStatus.SHIPPED:
        return 'bg-green-100 text-green-800';
      case SupplierOrderStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800';
      case SupplierOrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Status label
  const getStatusLabel = (status: SupplierOrderStatus) => {
    switch (status) {
      case SupplierOrderStatus.NEW:
        return '신규';
      case SupplierOrderStatus.PROCESSING:
        return '준비중';
      case SupplierOrderStatus.SHIPPED:
        return '발송완료';
      case SupplierOrderStatus.COMPLETED:
        return '완료';
      case SupplierOrderStatus.CANCELLED:
        return '취소';
      default:
        return status;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  };

  if (mode === 'dashboard') {
    // Summary mode for dashboard overview
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">주문 관리</h2>
          <Link
            to="/dashboard/supplier/orders"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기 →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12 text-gray-400" />}
            title="주문이 없습니다"
            description="새로운 주문이 들어오면 여기에 표시됩니다."
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => navigate(`/dashboard/supplier/orders/${order.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {order.order_number}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                        order.order_status
                      )}`}
                    >
                      {getStatusLabel(order.order_status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.buyer_name} · {formatDate(order.order_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {order.total_amount.toLocaleString()}원
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full-page mode continues in next part due to length...
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">주문 관리</h2>
          <p className="text-sm text-gray-600 mt-1">
            공급자에게 들어온 주문을 조회·처리합니다. (총 {total}건)
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="주문번호, 고객명, 상품명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            필터
          </button>
        </form>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as SupplierOrderStatus | 'all');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체</option>
                <option value={SupplierOrderStatus.NEW}>신규</option>
                <option value={SupplierOrderStatus.PROCESSING}>준비중</option>
                <option value={SupplierOrderStatus.SHIPPED}>발송완료</option>
                <option value={SupplierOrderStatus.COMPLETED}>완료</option>
                <option value={SupplierOrderStatus.CANCELLED}>취소</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기간
              </label>
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value as DateRangePreset);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">오늘</option>
                <option value="7days">7일</option>
                <option value="30days">30일</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정렬
              </label>
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('_');
                  setSortBy(by as 'order_date' | 'total_amount');
                  setSortOrder(order as 'asc' | 'desc');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="order_date_desc">최신 주문</option>
                <option value="order_date_asc">오래된 주문</option>
                <option value="total_amount_desc">금액 높은 순</option>
                <option value="total_amount_asc">금액 낮은 순</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : orders.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Package className="w-16 h-16 text-gray-400" />}
              title="주문이 없습니다"
              description={
                searchQuery || statusFilter !== 'all'
                  ? '검색 조건에 맞는 주문이 없습니다. 필터를 변경해보세요.'
                  : '새로운 주문이 들어오면 여기에 표시됩니다.'
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주문일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주문번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      고객/수취인
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      총 금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(order.order_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.buyer_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.total_amount.toLocaleString()}원
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            order.order_status
                          )}`}
                        >
                          {getStatusLabel(order.order_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            navigate(`/dashboard/supplier/orders/${order.id}`)
                          }
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900"
                          title="상세 보기"
                        >
                          <Eye className="w-4 h-4" />
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    페이지 {currentPage} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      이전
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierOrdersSection;
