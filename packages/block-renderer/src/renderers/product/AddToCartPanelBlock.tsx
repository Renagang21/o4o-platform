/**
 * Add to Cart Panel Block Renderer
 * Displays quantity selector and add to cart button
 *
 * Note: This block requires cart context to be available in the consuming application.
 * For now, it renders a basic UI. Full cart integration should be handled at the application level.
 */

import React, { useState } from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const AddToCartPanelBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Access post data injected by CPTSingle
  const postData = (block as any)._postData;

  if (!postData) {
    return null;
  }

  // Get product data
  const customFields = postData.customFields || postData.meta || {};
  const price = customFields.price || 0;
  const currency = customFields.currency || 'KRW';
  const stockQuantity = customFields.stock_quantity || customFields.stockQuantity || 99;
  const isAvailable = customFields.is_available !== false;

  const [quantity, setQuantity] = useState(1);

  // Get styling options
  const className = getBlockData(block, 'className', '');
  const showStock = getBlockData(block, 'showStock', true);

  // Format currency
  const formatCurrency = (amount: number) => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  const totalPrice = price * quantity;

  // Quantity handlers
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    if (quantity < stockQuantity) {
      setQuantity(quantity + 1);
    } else {
      alert(`최대 ${stockQuantity}개까지 구매 가능합니다.`);
    }
  };

  // Cart handlers (placeholder - actual implementation should use cart context)
  const handleAddToCart = () => {
    // Dispatch custom event that can be handled by the application
    const event = new CustomEvent('addToCart', {
      detail: {
        productId: postData.id,
        productName: postData.title,
        price,
        currency,
        quantity,
        customFields,
      },
    });
    window.dispatchEvent(event);

    alert(`${postData.title} ${quantity}개가 장바구니에 담겼습니다.`);
  };

  const handleBuyNow = () => {
    // Dispatch custom event
    const event = new CustomEvent('buyNow', {
      detail: {
        productId: postData.id,
        productName: postData.title,
        price,
        currency,
        quantity,
        customFields,
      },
    });
    window.dispatchEvent(event);
  };

  const classNames = clsx('add-to-cart-panel', 'bg-white rounded-lg p-6 border border-gray-200', className);

  return (
    <div className={classNames}>
      {/* Stock Information */}
      {showStock && (
        <div className="mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">재고</span>
            <span className={clsx('font-medium', stockQuantity > 0 ? 'text-green-600' : 'text-red-600')}>
              {stockQuantity > 0 ? `${stockQuantity}개` : '품절'}
            </span>
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">수량</label>
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
              className="px-4 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            <span className="px-6 text-lg font-medium">{quantity}</span>
            <button
              onClick={increaseQuantity}
              disabled={quantity >= stockQuantity}
              className="px-4 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
          <div className="text-lg font-medium">
            총 {formatCurrency(totalPrice)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={!isAvailable || stockQuantity === 0}
          className="flex-1 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          장바구니 담기
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!isAvailable || stockQuantity === 0}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          바로 구매
        </button>
      </div>

      {!isAvailable && (
        <div className="mt-3 text-center text-sm text-red-600">
          현재 구매할 수 없는 상품입니다.
        </div>
      )}
    </div>
  );
};
