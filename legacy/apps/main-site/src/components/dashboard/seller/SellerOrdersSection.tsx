/**
 * Seller Orders Section
 * Phase 3-7: 판매자 주문 관리 섹션
 * Can be used in dashboard (summary) or full-page mode
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { EmptyState } from '../../common/EmptyState';
import { sellerOrderAPI } from '../../../services/sellerOrderApi';
import {
  SellerOrderListItem,
  SellerOrderStatus,
  GetSellerOrdersQuery,
} from '../../../types/seller-order';

export type SectionMode = 'dashboard' | 'full-page';

export interface SellerOrdersSectionProps {
  mode?: SectionMode;
}

export const SellerOrdersSection: React.FC<SellerOrdersSectionProps> = ({
  mode = 'dashboard',
}) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SellerOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query state
  const [query, setQuery] = useState<GetSellerOrdersQuery>({
    page: 1,
    limit: mode === 'dashboard' ? 5 : 20,
    sort_by: 'created_at',
    sort_order: 'desc',
    status: 'ALL',
  });

  // UI state
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sellerOrderAPI.fetchSellerOrders(query);
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

  useEffect(() => {
    fetchOrders();
  }, [query]);

  // Handle search
  const handleSearch = () => {
    setQuery({
      ...query,
      search: searchInput || undefined,
      page: 1,
    });
  };

  // Handle date filter
  const handleDateFilter = (range: string) => {
    const now = new Date();
    let date_from: string | undefined;
    let date_to: string | undefined;

    if (range === 'today') {
      date_from = now.toISOString().split('T')[0];
      date_to = now.toISOString().split('T')[0];
    } else if (range === '7days') {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      date_from = from.toISOString().split('T')[0];
      date_to = now.toISOString().split('T')[0];
    } else if (range === '30days') {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      date_from = from.toISOString().split('T')[0];
      date_to = now.toISOString().split('T')[0];
    }

    setQuery({
      ...query,
      date_from,
      date_to,
      page: 1,
    });
  };

  // Get status badge
  const getStatusBadge = (status: SellerOrderStatus) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            신규
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800">
            확인됨
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
            처리중
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
            발송완료
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            완료
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            취소됨
          </span>
        );
      default:
        return null;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (mode === 'dashboard') {
    // Summary mode for dashboard overview
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">주문 관리</h2>
          <Link
            to="/dashboard/seller/orders"
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
            description="고객 주문이 들어오면 여기에 표시됩니다."
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/dashboard/seller/orders/${order.id}`)}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {order.order_number}
                    </h3>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {order.buyer_name} · {order.item_summary}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-medium text-gray-900">
                    {order.total_amount.toLocaleString()}원
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(order.created_at).split(' ')[0]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full-page mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">주문 목록</h2>
          <p className="text-sm text-gray-600 mt-1">
            총 {total}건의 주문이 있습니다.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="주문번호, 고객명, 상품명 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            필터
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={query.status || 'ALL'}
                onChange={(e) => {
                  setQuery({
                    ...query,
                    status: e.target.value as SellerOrderStatus | 'ALL',
                    page: 1,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                <option value="NEW">신규</option>
                <option value="CONFIRMED">확인됨</option>
                <option value="IN_PROGRESS">처리중</option>
                <option value="SHIPPED">발송완료</option>
                <option value="COMPLETED">완료</option>
                <option value="CANCELLED">취소됨</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기간
              </label>
              <select
                onChange={(e) => handleDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체</option>
                <option value="today">오늘</option>
                <option value="7days">최근 7일</option>
                <option value="30days">최근 30일</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정렬
              </label>
              <select
                value={`${query.sort_by || 'created_at'}_${query.sort_order || 'desc'}`}
                onChange={(e) => {
                  const [sort_by, sort_order] = e.target.value.split('_');
                  setQuery({
                    ...query,
                    sort_by: sort_by as 'created_at' | 'total_amount',
                    sort_order: sort_order as 'asc' | 'desc',
                    page: 1,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at_desc">최신순</option>
                <option value="created_at_asc">오래된순</option>
                <option value="total_amount_desc">금액 높은순</option>
                <option value="total_amount_asc">금액 낮은순</option>
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
                query.search || query.status !== 'ALL'
                  ? '검색 조건에 맞는 주문이 없습니다. 필터를 변경해보세요.'
                  : '고객 주문이 들어오면 여기에 표시됩니다.'
              }
            />
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주문번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주문일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      고객명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      채널
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상품
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      금액
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.buyer_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {order.channel || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {order.item_summary}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.total_amount.toLocaleString()}원
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            navigate(`/dashboard/seller/orders/${order.id}`)
                          }
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                          title="상세보기"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    페이지 {query.page} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setQuery({
                          ...query,
                          page: Math.max(1, (query.page || 1) - 1),
                        })
                      }
                      disabled={query.page === 1}
                      className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      이전
                    </button>
                    <button
                      onClick={() =>
                        setQuery({
                          ...query,
                          page: Math.min(totalPages, (query.page || 1) + 1),
                        })
                      }
                      disabled={query.page === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default SellerOrdersSection;
