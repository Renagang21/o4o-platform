/**
 * Order Summary for Checkout
 * R-6-8: Shows order details and total amount
 *
 * Based on CartSummary from R-6-7 but adapted for checkout flow
 */

import React from 'react';
import { Trash2, ShoppingCart, Shield, Truck, RefreshCw, Headphones } from 'lucide-react';
import type { CartItem } from '../../types/storefront';

interface OrderSummaryCheckoutProps {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  discount?: number;
  formatCurrency: (amount: number, currency?: string) => string;
  onRemoveItem?: (productId: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isDisabled?: boolean;
  submitLabel?: string;
}

export const OrderSummaryCheckout: React.FC<OrderSummaryCheckoutProps> = ({
  items,
  subtotal,
  shippingFee,
  discount = 0,
  formatCurrency,
  onRemoveItem,
  onSubmit,
  isSubmitting,
  isDisabled = false,
  submitLabel,
}) => {
  const total = subtotal + shippingFee - discount;
  const freeShippingThreshold = 30000;
  const remainingForFreeShipping = freeShippingThreshold - subtotal;

  const trustBadges = [
    { icon: Shield, label: '안전 결제' },
    { icon: Truck, label: '빠른 배송' },
    { icon: RefreshCw, label: '환불 보장' },
    { icon: Headphones, label: '고객 지원' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5" />
        주문 요약
      </h2>

      {/* Cart Items */}
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div key={item.product_id} className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
            {/* Product Image */}
            <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
              {item.main_image ? (
                <img
                  src={item.main_image}
                  alt={item.product_name}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {item.product_name}
              </div>
              <div className="text-sm text-gray-500">
                {item.quantity}개 × {formatCurrency(item.price, item.currency)}
              </div>
            </div>

            {/* Remove Button */}
            {onRemoveItem && (
              <button
                type="button"
                onClick={() => onRemoveItem(item.product_id)}
                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Free Shipping Progress */}
      {shippingFee > 0 && remainingForFreeShipping > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">{formatCurrency(remainingForFreeShipping)}</span>
            {' '}더 담으면 <span className="font-semibold">무료배송</span>
          </p>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="border-t border-gray-200 pt-4 space-y-2 mb-4">
        <div className="flex justify-between text-gray-600">
          <span>상품 금액</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>배송비</span>
          <span>{shippingFee === 0 ? '무료' : formatCurrency(shippingFee)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>할인</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold text-gray-900">
          <span>총 결제 금액</span>
          <span className="text-blue-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting || isDisabled || items.length === 0}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>처리 중...</span>
          </>
        ) : (
          <span>{submitLabel || `${formatCurrency(total)} 결제하기`}</span>
        )}
      </button>

      {/* Trust Badges */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          {trustBadges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 text-gray-600"
            >
              <badge.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        주문 완료 시 개인정보 수집 및 이용에 동의한 것으로 간주됩니다.
      </div>
    </div>
  );
};

export default OrderSummaryCheckout;
