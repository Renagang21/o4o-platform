/**
 * Cart Item Card Component
 * R-6-7: Modernized cart item display with KPICard-style design
 *
 * Features:
 * - Product image with lazy loading
 * - Quantity controls with stock validation
 * - Subtotal calculation
 * - Remove button
 * - Responsive layout
 */

import React, { useState } from 'react';
import { Trash2, Plus, Minus, AlertCircle } from 'lucide-react';
import type { CartItem } from '../../types/storefront';

interface CartItemCardProps {
  item: CartItem;
  onQuantityChange: (productId: string, newQuantity: number) => void;
  onRemove: (productId: string) => void;
  formatCurrency: (amount: number, currency?: string) => string;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onQuantityChange,
  onRemove,
  formatCurrency,
}) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(item.product_id), 150);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity >= 1 && newQuantity <= item.available_stock) {
      onQuantityChange(item.product_id, newQuantity);
    }
  };

  const subtotal = item.price * item.quantity;
  const isLowStock = item.available_stock < 5;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all duration-150 hover:shadow-md ${
        isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div className="flex gap-4">
        {/* Product Image */}
        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
          {item.main_image ? (
            <img
              src={item.main_image}
              alt={item.product_name}
              className="w-full h-full object-cover"
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
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
            {item.product_name}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            판매자: <span className="font-medium">{item.seller_name}</span>
          </p>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(item.price, item.currency)}
            </p>
            <span className="text-sm text-gray-500">/ 개</span>
          </div>

          {/* Low Stock Warning */}
          {isLowStock && (
            <div className="flex items-center gap-1 text-orange-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>재고 얼마 남지 않음 ({item.available_stock}개)</span>
            </div>
          )}
        </div>

        {/* Quantity Controls & Remove */}
        <div className="flex flex-col items-end gap-3">
          {/* Remove Button */}
          <button
            onClick={handleRemove}
            className="text-gray-400 hover:text-red-600 transition-colors p-1"
            title="삭제"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Quantity Controls */}
          <div className="flex items-center border border-gray-300 rounded-lg bg-white">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={item.quantity <= 1}
              className="px-3 py-2 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="수량 감소"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-4 text-lg font-medium min-w-[3rem] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={item.quantity >= item.available_stock}
              className="px-3 py-2 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="수량 증가"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Stock Info */}
          <p className="text-sm text-gray-500">
            재고: {item.available_stock}개
          </p>
        </div>
      </div>

      {/* Subtotal */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-600">소계</span>
        <span className="text-xl font-bold text-gray-900">
          {formatCurrency(subtotal, item.currency)}
        </span>
      </div>
    </div>
  );
};

export default CartItemCard;
