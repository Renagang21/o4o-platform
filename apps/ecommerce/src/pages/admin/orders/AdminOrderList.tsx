/**
 * Admin Order List
 *
 * Phase N-2: 운영 안정화
 *
 * 운영자용 주문 목록 페이지
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@o4o/ui';
import { Tabs, TabsList, TabsTrigger } from '@o4o/ui';
import { Badge } from '@o4o/ui';
import { Button } from '@o4o/ui';
import { Skeleton } from '@o4o/ui';
import {
  Package,
  CreditCard,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import {
  getAdminOrders,
  getOrderStats,
  type AdminOrder,
  type OrderListFilters,
} from '@/lib/api/admin-orders';

type PaymentStatusFilter = 'all' | 'pending' | 'paid' | 'refunded';

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-800">결제완료</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800">대기중</Badge>;
    case 'refunded':
      return <Badge className="bg-red-100 text-red-800">환불</Badge>;
    case 'failed':
      return <Badge className="bg-gray-100 text-gray-800">실패</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return num.toLocaleString('ko-KR');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminOrderList() {
  const [filters, setFilters] = useState<OrderListFilters>({
    limit: 50,
    offset: 0,
  });
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');

  // 주문 통계 조회
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'order-stats'],
    queryFn: getOrderStats,
  });

  // 주문 목록 조회
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: () => getAdminOrders(filters),
  });

  const handleTabChange = (value: string) => {
    setStatusFilter(value as PaymentStatusFilter);
    setFilters({
      ...filters,
      paymentStatus: value === 'all' ? undefined : value,
      offset: 0,
    });
  };

  const isLoading = statsLoading || ordersLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">주문 관리</h1>
        <Button
          variant="outline"
          onClick={() =>
            window.location.reload()
          }
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              대기중
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.counts.pending || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              결제완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {stats?.counts.paid || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              환불
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {stats?.counts.refunded || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              총 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(stats?.revenue.total || 0)}원
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders Tabs */}
      <Tabs defaultValue={statusFilter}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" onClick={() => handleTabChange('all')}>
            전체
            <Badge variant="secondary" className="ml-2">
              {stats?.counts.total || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" onClick={() => handleTabChange('pending')}>
            대기중
            {(stats?.counts.pending ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats?.counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" onClick={() => handleTabChange('paid')}>
            결제완료
            {(stats?.counts.paid ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats?.counts.paid}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="refunded" onClick={() => handleTabChange('refunded')}>
            환불
            {(stats?.counts.refunded ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats?.counts.refunded}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : ordersData && ordersData.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주문번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상품
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주문일시
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      파트너
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상세
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ordersData.orders.map((order: AdminOrder) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-mono text-sm">
                            {order.orderNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.items.length > 0 ? (
                            <>
                              {order.items[0].productName}
                              {order.items.length > 1 && (
                                <span className="text-gray-500">
                                  {' '}
                                  외 {order.items.length - 1}건
                                </span>
                              )}
                            </>
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {formatPrice(order.totalAmount)}원
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.partnerId ? (
                          <Badge variant="outline" className="font-mono">
                            {order.partnerId}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link to={`/admin/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            보기
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">주문이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Info */}
      {ordersData && ordersData.pagination.total > 0 && (
        <div className="text-center text-sm text-gray-500">
          총 {ordersData.pagination.total}건
        </div>
      )}
    </div>
  );
}
