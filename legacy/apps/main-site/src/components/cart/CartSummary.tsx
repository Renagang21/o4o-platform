/**
 * Cart Summary Component
 * R-6-7: Order summary with pricing breakdown
 *
 * Features:
 * - Itemized pricing (subtotal, shipping, discounts)
 * - Total calculation
 * - Checkout button
 * - Continue shopping button
 * - Sticky positioning on desktop
 */

import React from 'react';
import { ShoppingCart, ArrowRight, Package } from 'lucide-react';

interface CartSummaryProps {
  subtotal: number;
  shippingFee: number;
  discount?: number;
  totalItems: number;
  formatCurrency: (amount: number, currency?: string) => string;
  onCheckout: () => void;
  onContinueShopping: () => void;
  isCheckoutDisabled?: boolean;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  shippingFee,
  discount = 0,
  totalItems,
  formatCurrency,
  onCheckout,
  onContinueShopping,
  isCheckoutDisabled = false,
}) => {
  const total = subtotal + shippingFee - discount;
  const freeShippingThreshold = 30000;
  const remainingForFreeShipping = freeShippingThreshold - subtotal;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-gray-700" />
        <h2 className="text-xl font-semibold text-gray-900">주문 요약</h2>
      </div>

      {/* Item Count */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>상품 개수</span>
          <span className="font-medium text-gray-900">{totalItems}개</span>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-gray-700">
          <span>상품 금액</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between text-gray-700">
          <span>배송비</span>
          <span className="font-medium">
            {shippingFee === 0 ? (
              <span className="text-green-600 font-semibold">무료</span>
            ) : (
              formatCurrency(shippingFee)
            )}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>할인</span>
            <span className="font-medium">-{formatCurrency(discount)}</span>
          </div>
        )}
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
              style={{
                width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Total */}
      <div className="border-t border-gray-200 pt-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">총 결제 금액</span>
          <span className="text-2xl font-bold text-blue-600">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        disabled={isCheckoutDisabled}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2 mb-2"
      >
        {isCheckoutDisabled ? (
          '주문 불가'
        ) : (
          <>
            주문하기
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      {/* Continue Shopping Button */}
      <button
        onClick={onContinueShopping}
        className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-5 h-5" />
        계속 쇼핑하기
      </button>

      {/* Trust Badges */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="text-green-600">✓</span>
            <span>안전 결제</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-600">✓</span>
            <span>빠른 배송</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-600">✓</span>
            <span>환불 보장</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-600">✓</span>
            <span>고객 지원</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
