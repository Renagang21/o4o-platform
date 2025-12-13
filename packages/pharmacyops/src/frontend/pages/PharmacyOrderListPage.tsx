/**
 * PharmacyOrderListPage v2
 *
 * 약국 주문 목록 - Reorder Engine 구현 (Task 4)
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LoadingSpinner,
  EmptyState,
  StatusBadge,
  PriceDisplay,
  ReorderButton,
} from '../components/index.js';
import type { PharmacyOrderListItemDto } from '../../dto/index.js';

// Mock data
const mockOrders: PharmacyOrderListItemDto[] = [
  {
    id: 'order-001',
    orderNumber: 'PO-2024-001234',
    productId: 'prod-001',
    productName: '타이레놀 500mg',
    productDrugCode: 'DC-001234',
    supplierName: '대한도매',
    quantity: 100,
    unitPrice: 3200,
    totalAmount: 320000,
    status: 'in_transit',
    paymentStatus: 'paid',
    createdAt: new Date(),
    hasTracking: true,
    canReorder: true,
    canCancel: false,
  },
  {
    id: 'order-002',
    orderNumber: 'PO-2024-001233',
    productId: 'prod-002',
    productName: '아목시실린캡슐 500mg',
    productDrugCode: 'DC-002001',
    supplierName: '종근당',
    quantity: 200,
    unitPrice: 850,
    totalAmount: 170000,
    status: 'delivered',
    paymentStatus: 'paid',
    createdAt: new Date(Date.now() - 86400000 * 2),
    hasTracking: true,
    canReorder: true,
    canCancel: false,
    deliveredAt: new Date(Date.now() - 86400000),
  },
  {
    id: 'order-003',
    orderNumber: 'PO-2024-001232',
    productId: 'prod-003',
    productName: '인슐린 노보래피드',
    productDrugCode: 'DC-003001',
    supplierName: '노보노디스크',
    quantity: 10,
    unitPrice: 45000,
    totalAmount: 450000,
    status: 'pending',
    paymentStatus: 'awaiting_payment',
    createdAt: new Date(Date.now() - 3600000),
    hasTracking: false,
    canReorder: false,
    canCancel: true,
    requiresColdChain: true,
  },
  {
    id: 'order-004',
    orderNumber: 'PO-2024-001231',
    productId: 'prod-004',
    productName: '리피토정 20mg',
    productDrugCode: 'DC-004001',
    supplierName: '한국화이자',
    quantity: 50,
    unitPrice: 15200,
    totalAmount: 760000,
    status: 'confirmed',
    paymentStatus: 'paid',
    createdAt: new Date(Date.now() - 86400000 * 3),
    hasTracking: false,
    canReorder: false,
    canCancel: true,
  },
  {
    id: 'order-005',
    orderNumber: 'PO-2024-001230',
    productId: 'prod-005',
    productName: '게보린정',
    productDrugCode: 'DC-005001',
    supplierName: '삼진제약',
    quantity: 500,
    unitPrice: 2800,
    totalAmount: 1400000,
    status: 'cancelled',
    paymentStatus: 'refunded',
    createdAt: new Date(Date.now() - 86400000 * 5),
    hasTracking: false,
    canReorder: true,
    canCancel: false,
    cancelledAt: new Date(Date.now() - 86400000 * 4),
  },
];

interface OrderFilters {
  status: string;
  paymentStatus: string;
  supplierName: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export const PharmacyOrderListPage: React.FC = () => {
  const [orders, setOrders] = useState<PharmacyOrderListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OrderFilters>({
    status: '',
    paymentStatus: '',
    supplierName: '',
    dateRange: 'all',
  });
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      let filtered = [...mockOrders];

      // Apply status filter
      if (filters.status) {
        filtered = filtered.filter((o) => o.status === filters.status);
      }

      // Apply payment status filter
      if (filters.paymentStatus) {
        filtered = filtered.filter((o) => o.paymentStatus === filters.paymentStatus);
      }

      // Apply supplier filter
      if (filters.supplierName) {
        filtered = filtered.filter((o) =>
          o.supplierName.toLowerCase().includes(filters.supplierName.toLowerCase())
        );
      }

      // Apply date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = new Date(0);
        }

        filtered = filtered.filter(
          (o) => new Date(o.createdAt).getTime() >= startDate.getTime()
        );
      }

      // Sort by date (newest first)
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setTotalPages(Math.ceil(filtered.length / pageSize));
      setOrders(filtered.slice((page - 1) * pageSize, page * pageSize));
      setLoading(false);
    }, 300);
  }, [filters, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    // TODO: Implement actual reorder API call
    setTimeout(() => {
      alert(`주문 ${orderId}이(가) 다시 주문되었습니다.`);
      setReorderingId(null);
      // Navigate to new order or refresh
    }, 1000);
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('정말 이 주문을 취소하시겠습니까?')) return;
    // TODO: Implement actual cancel API call
    alert(`주문 ${orderId}이(가) 취소되었습니다.`);
    loadOrders();
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));

  // Calculate summary stats
  const stats = {
    total: mockOrders.length,
    pending: mockOrders.filter((o) => o.status === 'pending').length,
    inTransit: mockOrders.filter((o) => o.status === 'in_transit').length,
    delivered: mockOrders.filter((o) => o.status === 'delivered').length,
    totalAmount: mockOrders.reduce((sum, o) => sum + o.totalAmount, 0),
  };

  return (
    <div className="pharmacy-order-list-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
            <p className="text-sm text-gray-500 mt-1">
              주문 내역을 확인하고 재주문하세요
            </p>
          </div>
          <a
            href="/pharmacyops/orders/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 새 주문
          </a>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">전체 주문</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 border-yellow-200 rounded-lg border p-4">
          <p className="text-sm text-yellow-700">대기 중</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 border-blue-200 rounded-lg border p-4">
          <p className="text-sm text-blue-700">배송 중</p>
          <p className="text-2xl font-bold text-blue-700">{stats.inTransit}</p>
        </div>
        <div className="bg-green-50 border-green-200 rounded-lg border p-4">
          <p className="text-sm text-green-700">완료</p>
          <p className="text-2xl font-bold text-green-700">{stats.delivered}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">총 주문액</p>
          <p className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat('ko-KR', {
              style: 'currency',
              currency: 'KRW',
              maximumFractionDigits: 0,
            }).format(stats.totalAmount)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주문 상태
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">전체</option>
              <option value="pending">대기</option>
              <option value="confirmed">확인</option>
              <option value="preparing">준비중</option>
              <option value="shipped">출고</option>
              <option value="in_transit">배송중</option>
              <option value="delivered">완료</option>
              <option value="cancelled">취소</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              결제 상태
            </label>
            <select
              value={filters.paymentStatus}
              onChange={(e) =>
                setFilters((f) => ({ ...f, paymentStatus: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">전체</option>
              <option value="awaiting_payment">결제대기</option>
              <option value="paid">결제완료</option>
              <option value="refunded">환불</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              기간
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  dateRange: e.target.value as OrderFilters['dateRange'],
                }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="week">최근 1주</option>
              <option value="month">이번 달</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              공급자
            </label>
            <input
              type="text"
              value={filters.supplierName}
              onChange={(e) =>
                setFilters((f) => ({ ...f, supplierName: e.target.value }))
              }
              placeholder="공급자명 검색"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState
          message="주문 내역이 없습니다."
          icon="📦"
          action={{
            label: '새 주문',
            onClick: () => (window.location.href = '/pharmacyops/orders/create'),
          }}
        />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <span className="text-sm text-gray-600">
              총 <strong>{orders.length}</strong>건
            </span>
          </div>
          <div className="divide-y">
            {orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-gray-500">
                        {order.orderNumber}
                      </span>
                      <StatusBadge status={order.status} type="order" />
                      <StatusBadge status={order.paymentStatus} type="payment" />
                      {order.requiresColdChain && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          ❄️
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{order.productName}</h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <span>공급자: {order.supplierName}</span>
                      <span className="mx-2">·</span>
                      <span>수량: {order.quantity}개</span>
                      <span className="mx-2">·</span>
                      <span>단가: {(order.unitPrice ?? 0).toLocaleString()}원</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      주문일: {formatDate(order.createdAt)}
                      {order.deliveredAt && (
                        <> · 배송완료: {formatDate(order.deliveredAt)}</>
                      )}
                      {order.cancelledAt && (
                        <> · 취소일: {formatDate(order.cancelledAt)}</>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <PriceDisplay amount={order.totalAmount} />
                    </div>
                    <div className="flex flex-col gap-2">
                      {order.hasTracking && (
                        <a
                          href={`/pharmacyops/dispatch?orderId=${order.id}`}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-center"
                        >
                          배송 조회
                        </a>
                      )}
                      {order.canReorder && (
                        <ReorderButton
                          orderId={order.id}
                          productName={order.productName}
                          onReorder={handleReorder}
                          loading={reorderingId === order.id}
                        />
                      )}
                      {order.canCancel && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          주문 취소
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages} 페이지
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PharmacyOrderListPage;
