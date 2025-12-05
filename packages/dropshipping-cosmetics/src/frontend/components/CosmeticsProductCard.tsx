/**
 * Cosmetics Product Card Component
 *
 * Displays a cosmetics product with metadata
 */

import React from 'react';
import type { CosmeticsMetadata } from '../../types.js';

export interface CosmeticsProductCardProps {
  product: {
    id: string;
    name?: string;
    title?: string;
    price?: number;
    image?: string;
    metadata?: CosmeticsMetadata;
  };
  onClick?: (productId: string) => void;
}

export const CosmeticsProductCard: React.FC<CosmeticsProductCardProps> = ({
  product,
  onClick,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(product.id);
    }
  };

  return (
    <div
      className="cosmetics-product-card"
      onClick={handleClick}
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {product.image && (
        <img
          src={product.image}
          alt={product.name || product.title}
          style={{ width: '100%', borderRadius: '4px' }}
        />
      )}

      <h3>{product.name || product.title}</h3>

      {product.price && <p className="price">₩{product.price.toLocaleString()}</p>}

      {product.metadata && (
        <div className="metadata">
          {product.metadata.skinType && product.metadata.skinType.length > 0 && (
            <div className="skin-types">
              <strong>Skin Type:</strong>{' '}
              {product.metadata.skinType.join(', ')}
            </div>
          )}

          {product.metadata.concerns && product.metadata.concerns.length > 0 && (
            <div className="concerns">
              <strong>Concerns:</strong> {product.metadata.concerns.join(', ')}
            </div>
          )}

          {product.metadata.certifications &&
            product.metadata.certifications.length > 0 && (
              <div className="certifications">
                <strong>Certifications:</strong>{' '}
                {product.metadata.certifications.join(', ')}
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default CosmeticsProductCard;
