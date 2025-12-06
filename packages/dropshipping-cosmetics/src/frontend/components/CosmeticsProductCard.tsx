/**
 * CosmeticsProductCard Component (Skeleton)
 *
 * Minimal product card for list display
 * Actual design/styling will be handled by Antigravity
 */

import React from 'react';

export interface CosmeticsProductCardProps {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  metadata: {
    skinTypes: string[];
    concerns: string[];
    category?: string;
    certifications: string[];
  };
  onCardClick?: (id: string) => void;
}

export const CosmeticsProductCard: React.FC<CosmeticsProductCardProps> = ({
  id,
  name,
  brand,
  price,
  image,
  metadata,
  onCardClick,
}) => {
  const handleClick = () => {
    if (onCardClick) {
      onCardClick(id);
    } else {
      // Default: navigate to detail page
      window.location.href = `/cosmetics/product/${id}`;
    }
  };

  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  return (
    <div
      className="cosmetics-product-card bg-white p-4 cursor-pointer"
      onClick={handleClick}
      data-product-id={id}
    >
      {/* Image */}
      <div className="product-image bg-gray-100 mb-3">
        <img src={image} alt={name} className="w-full h-auto" />
      </div>

      {/* Brand */}
      <div className="product-brand text-sm text-gray-600 mb-1">{brand}</div>

      {/* Name */}
      <div className="product-name font-medium mb-2">{name}</div>

      {/* Price */}
      <div className="product-price font-bold mb-3">{formatPrice(price)}</div>

      {/* Tags (Skin Type / Concerns) */}
      <div className="product-tags flex flex-wrap gap-1">
        {metadata.skinTypes.slice(0, 2).map((type, idx) => (
          <span key={idx} className="tag-skin-type text-xs bg-gray-100 px-2 py-1">
            {type}
          </span>
        ))}
        {metadata.concerns.slice(0, 2).map((concern, idx) => (
          <span key={idx} className="tag-concern text-xs bg-gray-100 px-2 py-1">
            {concern}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CosmeticsProductCard;
