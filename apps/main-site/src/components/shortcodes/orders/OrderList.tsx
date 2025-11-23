/**
 * Order List Page
 * R-6-9: Customer order list with filtering, sorting, and pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToastContext } from '../../../contexts/ToastProvider';
import { orderService, type OrderListQuery, type OrderListItem } from '../../../services/orderService';
import { OrderListItemCard } from './OrderListItemCard';
import { OrderListSkeleton } from './OrderListSkeleton';

type StatusTab = 'all' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type DateRange = '7d' | '30d' | '90d' | 'custom';

type SortOption = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

export const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToastContext();

  // State
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [dateRange, setDateRange] = useState<DateRange>('90d');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Calculate date range
  const getDateRange = useCallback(() => {
    if (dateRange === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }

    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [dateRange, customStartDate, customEndDate]);

  // Get sort params
  const getSortParams = useCallback(() => {
    switch (sortOption) {
      case 'newest':
        return { sortBy: 'createdAt' as const, sortOrder: 'desc' as const };
      case 'oldest':
        return { sortBy: 'createdAt' as const, sortOrder: 'asc' as const };
      case 'amount_high':
        return { sortBy: 'totalAmount' as const, sortOrder: 'desc' as const };
      case 'amount_low':
        return { sortBy: 'totalAmount' as const, sortOrder: 'asc' as const };
      default:
        return { sortBy: 'createdAt' as const, sortOrder: 'desc' as const };
    }
  }, [sortOption]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const dateRangeParams = getDateRange();
      const sortParams = getSortParams();

      const query: OrderListQuery = {
        page: currentPage,
        limit: 10,
        status: statusTab === 'all' ? undefined : statusTab,
        ...dateRangeParams,
        ...sortParams,
      };

      const response = await orderService.getOrders(query);

      if (response.success) {
        setOrders(response.data.orders);
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      }
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      toast.error(error.response?.data?.message || '주문 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, statusTab, getDateRange, getSortParams, toast]);

  // Fetch on mount and filter changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchOrders();
    }
  }, [authLoading, user, fetchOrders]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.warning('로그인이 필요합니다.');
      navigate('/login?redirect=/my-account/orders');
    }
  }, [authLoading, user, navigate, toast]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, dateRange, sortOption, customStartDate, customEndDate]);

  // Handle order click
  const handleOrderClick = (orderId: string) => {
    navigate(`/my-account/orders/${orderId}`);
  };

  // Loading or not authenticated
  if (authLoading || !user) {
    return null;
  }

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">주문 내역</h1>
          <OrderListSkeleton />
        </div>
      </div>
    );
  }

  // Status tabs
  const statusTabs: Array<{ id: StatusTab; label: string }> = [
    { id: 'all', label: '전체' },
    { id: 'pending', label: '대기중' },
    { id: 'confirmed', label: '확인됨' },
    { id: 'processing', label: '처리중' },
    { id: 'shipped', label: '배송중' },
    { id: 'delivered', label: '배송완료' },
    { id: 'cancelled', label: '취소됨' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">주문 내역</h1>
          <p className="text-gray-600">총 {totalItems}건의 주문</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Status Tabs */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range & Sort */}
          <div className="flex flex-wrap gap-4">
            {/* Date Range */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">기간</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
                <option value="custom">직접 설정</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">정렬</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="amount_high">금액 높은순</option>
                <option value="amount_low">금액 낮은순</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="mt-4 flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Order List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">주문 내역이 없습니다</h3>
            <p className="text-gray-600 mb-6">아직 주문하신 상품이 없습니다.</p>
            <button
              onClick={() => navigate('/storefront')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              쇼핑하러 가기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderListItemCard
                key={order.id}
                order={order}
                onClick={() => handleOrderClick(order.id)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
