/**
 * Order List Item Card
 * R-6-9: Individual order card in the list view
 */

import React from 'react';
import { Package, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import type { OrderListItem } from '../../../services/orderService';

interface OrderListItemCardProps {
  order: OrderListItem;
  onClick: () => void;
  formatCurrency: (amount: number, currency?: string) => string;
}

// Status badge styling
const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; className: string }> = {
    pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: '확인됨', className: 'bg-blue-100 text-blue-800' },
    processing: { label: '처리중', className: 'bg-purple-100 text-purple-800' },
    shipped: { label: '배송중', className: 'bg-indigo-100 text-indigo-800' },
    delivered: { label: '배송완료', className: 'bg-green-100 text-green-800' },
    cancelled: { label: '취소됨', className: 'bg-red-100 text-red-800' },
    returned: { label: '반품됨', className: 'bg-gray-100 text-gray-800' },
  };

  const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
};

// Payment status badge
const getPaymentStatusBadge = (status?: string) => {
  if (!status) return null;

  const badges: Record<string, { label: string; className: string }> = {
    pending: { label: '결제 대기', className: 'bg-yellow-100 text-yellow-700' },
    completed: { label: '결제 완료', className: 'bg-green-100 text-green-700' },
    failed: { label: '결제 실패', className: 'bg-red-100 text-red-700' },
    refunded: { label: '환불됨', className: 'bg-gray-100 text-gray-700' },
  };

  const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
};

export const OrderListItemCard: React.FC<OrderListItemCardProps> = ({
  order,
  onClick,
  formatCurrency,
}) => {
  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">{order.orderNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getStatusBadge(order.status)}
          {getPaymentStatusBadge(order.paymentStatus)}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 my-4" />

      {/* Order Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">상품 수량</span>
          <span className="font-medium text-gray-900">{order.itemCount}개</span>
        </div>
        {order.paymentMethod && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />
              결제 수단
            </span>
            <span className="font-medium text-gray-900">
              {order.paymentMethod === 'card' ? '카드' : order.paymentMethod}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-1">총 결제 금액</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(order.totalAmount, order.currency)}
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          상세보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Action Badges */}
      {(order.isCancellable || order.isReturnable) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
          {order.isCancellable && (
            <span className="text-xs text-gray-500">• 취소 가능</span>
          )}
          {order.isReturnable && (
            <span className="text-xs text-gray-500">• 반품 가능</span>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderListItemCard;
