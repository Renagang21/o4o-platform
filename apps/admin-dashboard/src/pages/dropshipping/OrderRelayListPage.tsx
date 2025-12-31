/**
 * Order Relay List Page
 *
 * DS-4 Order Relay 목록 관리 화면
 *
 * 경로: /admin/dropshipping/order-relays
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGSelect,
  AGTag,
  AGTablePagination,
} from '@o4o/ui';
import {
  Package,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Truck,
} from 'lucide-react';
import {
  getOrderRelays,
  OrderRelay,
  OrderRelayStatus,
  ORDER_RELAY_STATUS_LABELS,
  ORDER_RELAY_STATUS_COLORS,
} from '../../api/dropshipping-admin';

const OrderRelayListPage: React.FC = () => {
  const [orderRelays, setOrderRelays] = useState<OrderRelay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderRelayStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const fetchOrderRelays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOrderRelays({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        limit: itemsPerPage,
      });

      if (response.success) {
        setOrderRelays(response.data);
        setTotalItems(response.meta.total);
        setTotalPages(response.meta.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch order relays:', err);
      setError(err.message || '주문 목록을 불러오는데 실패했습니다.');
      setOrderRelays([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage]);

  useEffect(() => {
    fetchOrderRelays();
  }, [fetchOrderRelays]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  if (loading && orderRelays.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title="Order Relay 관리"
        description="드롭쉬핑 주문 전달 현황"
        icon={<Truck className="w-5 h-5" />}
        actions={
          <AGButton
            variant="ghost"
            size="sm"
            onClick={fetchOrderRelays}
            iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            새로고침
          </AGButton>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <AGSection>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">상태:</span>
              <AGSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderRelayStatus | 'all')}
                className="w-40"
              >
                <option value="all">전체</option>
                {Object.entries(ORDER_RELAY_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </AGSelect>
            </div>
            <div className="text-sm text-gray-600">
              총 <span className="font-medium">{totalItems}</span>건
            </div>
          </div>
        </AGSection>

        {/* Order Relay List */}
        <AGSection>
          {orderRelays.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>주문이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderRelays.map((order) => (
                <Link key={order.id} to={`/admin/dropshipping/order-relays/${order.id}`}>
                  <AGCard hoverable padding="md">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Truck className="w-6 h-6 text-gray-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {order.orderNumber}
                          </span>
                          <AGTag
                            color={ORDER_RELAY_STATUS_COLORS[order.status]}
                            size="sm"
                          >
                            {ORDER_RELAY_STATUS_LABELS[order.status]}
                          </AGTag>
                        </div>
                        <div className="text-sm text-gray-500">
                          <span>수량: {order.quantity}</span>
                          <span className="mx-2">|</span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                        {order.listing?.seller?.name && (
                          <div className="text-xs text-gray-400 mt-1">
                            판매자: {order.listing.seller.name}
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-gray-900">
                          {formatPrice(order.totalPrice)}
                        </div>
                        <div className="text-xs text-gray-400">
                          단가 {formatPrice(order.unitPrice)}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6">
              <AGTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default OrderRelayListPage;
