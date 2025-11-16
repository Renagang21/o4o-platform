/**
 * Product Price Block Renderer
 * Displays product price with optional original price and discount
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export const ProductPriceBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Access post data injected by CPTSingle
  const postData = (block as any)._postData;

  if (!postData) {
    return null;
  }

  // Get price from customFields or meta
  const customFields = postData.customFields || postData.meta || {};
  const price = customFields.price;
  const originalPrice = customFields.original_price || customFields.originalPrice;
  const currency = customFields.currency || 'KRW';

  if (!price && price !== 0) {
    return null;
  }

  // Get styling options
  const align = getBlockData(block, 'align', 'left');
  const className = getBlockData(block, 'className', '');
  const showDiscount = getBlockData(block, 'showDiscount', true);

  // Format currency
  const formatCurrency = (amount: number) => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Calculate discount percentage
  const discountRate =
    showDiscount && originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  const classNames = clsx(
    'product-price',
    `text-${align}`,
    'mb-4',
    className
  );

  return (
    <div className={classNames}>
      {discountRate > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg text-gray-400 line-through">
            {formatCurrency(originalPrice)}
          </span>
          <span className="px-2 py-1 bg-red-500 text-white text-sm font-bold rounded">
            {discountRate}% OFF
          </span>
        </div>
      )}
      <div className="text-3xl font-bold text-gray-900">
        {formatCurrency(price)}
      </div>
    </div>
  );
};
