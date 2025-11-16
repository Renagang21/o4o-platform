/**
 * Product Card Block Renderer
 * Displays a product card for archive/listing pages
 *
 * Used in: CPTArchive, ViewPreset-based listings, Shortcodes
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export interface ProductCardBlockProps extends BlockRendererProps {
  // Additional props for direct usage (non-block context)
  product?: any;
  onClick?: (product: any) => void;
}

export const ProductCardBlock: React.FC<ProductCardBlockProps> = ({ block, product: directProduct, onClick }) => {
  // Access post/product data from either _postData (block context) or direct prop
  const productData = (block as any)?._postData || directProduct;

  if (!productData) {
    return null;
  }

  // Get configuration options
  const showImage = getBlockData(block, 'showImage', true);
  const showTitle = getBlockData(block, 'showTitle', true);
  const showPrice = getBlockData(block, 'showPrice', true);
  const showVendor = getBlockData(block, 'showVendor', false);
  const showAddToCartButton = getBlockData(block, 'showAddToCartButton', true);
  const showBuyNowButton = getBlockData(block, 'showBuyNowButton', false);
  const imageAspectRatio = getBlockData(block, 'imageAspectRatio', '1:1');
  const className = getBlockData(block, 'className', '');

  // Extract product information
  const {
    id,
    title,
    slug,
    featuredImage,
    customFields = {},
    meta = {},
  } = productData;

  // Get price and vendor from customFields or meta
  const price = customFields.price ?? meta.price;
  const originalPrice = customFields.original_price ?? customFields.originalPrice ?? meta.original_price;
  const currency = customFields.currency ?? meta.currency ?? 'KRW';
  const vendor = customFields.vendor ?? customFields.seller_name ?? meta.vendor ?? meta.seller_name;
  const isAvailable = customFields.is_available !== false;
  const stockQuantity = customFields.stock_quantity ?? customFields.stockQuantity ?? meta.stock_quantity ?? 99;

  // Format currency
  const formatCurrency = (amount: number) => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Calculate discount percentage
  const discountRate =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  // Handle card click (navigate to single page)
  const handleCardClick = () => {
    if (onClick) {
      onClick(productData);
    }
  };

  // Handle add to cart
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    const event = new CustomEvent('addToCart', {
      detail: {
        productId: id,
        productName: title,
        price,
        currency,
        quantity: 1,
        customFields,
      },
    });
    window.dispatchEvent(event);
  };

  // Handle buy now
  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    const event = new CustomEvent('buyNow', {
      detail: {
        productId: id,
        productName: title,
        price,
        currency,
        quantity: 1,
        customFields,
      },
    });
    window.dispatchEvent(event);
  };

  const aspectRatioClass = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '3:4': 'aspect-[3/4]',
  }[imageAspectRatio] || 'aspect-square';

  return (
    <article
      className={clsx(
        'product-card',
        'bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Featured Image */}
      {showImage && (
        <div className={clsx('relative bg-gray-100', aspectRatioClass)}>
          {featuredImage ? (
            <img
              src={featuredImage}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          {/* Discount Badge */}
          {showPrice && discountRate > 0 && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
              {discountRate}% OFF
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Vendor */}
        {showVendor && vendor && (
          <div className="text-sm text-gray-500 mb-1">{vendor}</div>
        )}

        {/* Title */}
        {showTitle && (
          <h3 className="text-lg font-semibold mb-2 line-clamp-2">
            {title}
          </h3>
        )}

        {/* Price */}
        {showPrice && price !== undefined && (
          <div className="mb-3">
            {originalPrice && originalPrice > price && (
              <div className="text-sm text-gray-400 line-through mb-1">
                {formatCurrency(originalPrice)}
              </div>
            )}
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(price)}
            </div>
          </div>
        )}

        {/* Stock Status */}
        {showPrice && (
          <div className="text-sm mb-3">
            <span className={clsx(
              'font-medium',
              isAvailable && stockQuantity > 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {isAvailable && stockQuantity > 0 ? '재고 있음' : '품절'}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {(showAddToCartButton || showBuyNowButton) && (
          <div className="flex gap-2">
            {showAddToCartButton && (
              <button
                onClick={handleAddToCart}
                disabled={!isAvailable || stockQuantity === 0}
                className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                장바구니
              </button>
            )}
            {showBuyNowButton && (
              <button
                onClick={handleBuyNow}
                disabled={!isAvailable || stockQuantity === 0}
                className="flex-1 py-2 px-3 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                바로구매
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
