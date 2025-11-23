/**
 * Cart Page (Modernized)
 * R-6-7: Shopping Cart with Modern UI/UX
 *
 * Features:
 * - Component-based architecture (CartItemCard, CartSummary)
 * - Skeleton loading states
 * - Responsive design
 * - Pre-checkout validation
 * - Free shipping progress indicator
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { CartItemCard } from '../../components/cart/CartItemCard';
import { CartSummary } from '../../components/cart/CartSummary';
import { CartSkeleton } from '../../components/cart/CartSkeleton';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Simulate loading (for skeleton display)
  useEffect(() => {
    // In real implementation, this would fetch cart from API
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Format currency helper
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Calculate shipping fee
  const calculateShippingFee = (subtotal: number): number => {
    const freeShippingThreshold = 30000;
    return subtotal >= freeShippingThreshold ? 0 : 3000;
  };

  // Pre-checkout validation
  const validateCart = (): boolean => {
    const errors: string[] = [];

    cartStore.items.forEach((item) => {
      if (item.quantity > item.available_stock) {
        errors.push(`${item.product_name}: 재고 부족 (현재 ${item.available_stock}개)`);
      }
      if (!item.price || item.price <= 0) {
        errors.push(`${item.product_name}: 가격 정보 오류`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle checkout
  const handleCheckout = () => {
    if (!validateCart()) {
      alert('장바구니에 문제가 있습니다. 확인 후 다시 시도해주세요.');
      return;
    }

    navigate('/checkout');
  };

  // Handle continue shopping
  const handleContinueShopping = () => {
    navigate('/store/products');
  };

  const shippingFee = calculateShippingFee(cartStore.total_amount);
  const isCheckoutDisabled = cartStore.items.length === 0 || validationErrors.length > 0;

  // Loading state
  if (loading) {
    return (
      <Layout>
        <CartSkeleton />
      </Layout>
    );
  }

  // Empty cart view
  if (cartStore.items.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  장바구니가 비어있습니다
                </h2>
                <p className="text-gray-600 mb-8">
                  마음에 드는 상품을 장바구니에 담아보세요!
                </p>
                <button
                  onClick={() => navigate('/store/products')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  상품 둘러보기
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingCart className="w-8 h-8" />
              장바구니
              <span className="text-lg font-normal text-gray-500">
                ({cartStore.total_items}개)
              </span>
            </h1>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-semibold mb-2">주문 전 확인이 필요합니다:</h3>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartStore.items.map((item) => (
                <CartItemCard
                  key={item.product_id}
                  item={item}
                  onQuantityChange={cartStore.updateQuantity}
                  onRemove={cartStore.removeItem}
                  formatCurrency={formatCurrency}
                />
              ))}

              {/* Clear Cart Button */}
              {cartStore.items.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm('장바구니를 비우시겠습니까?')) {
                      cartStore.clearCart();
                    }
                  }}
                  className="w-full py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  장바구니 비우기
                </button>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <CartSummary
                subtotal={cartStore.total_amount}
                shippingFee={shippingFee}
                discount={0}
                totalItems={cartStore.total_items}
                formatCurrency={formatCurrency}
                onCheckout={handleCheckout}
                onContinueShopping={handleContinueShopping}
                isCheckoutDisabled={isCheckoutDisabled}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;
