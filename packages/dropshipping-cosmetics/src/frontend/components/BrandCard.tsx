/**
 * BrandCard Component
 *
 * Displays a single cosmetics brand card
 */

import React from 'react';

export interface BrandData {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  metadata?: {
    country?: string;
    founded?: string;
    tags?: string[];
  };
}

interface BrandCardProps {
  brand: BrandData;
  onClick?: (brandId: string) => void;
}

export const BrandCard: React.FC<BrandCardProps> = ({ brand, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(brand.id);
    }
  };

  return (
    <div
      className="brand-card group cursor-pointer bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden"
      onClick={handleClick}
    >
      {/* Logo Section */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-6 border-b border-gray-200 group-hover:bg-blue-50 transition-colors">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-4xl font-bold text-gray-300">
            {brand.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {brand.name}
        </h3>

        {brand.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {brand.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {brand.metadata?.country && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded">
              🌍 {brand.metadata.country}
            </span>
          )}
          {brand.metadata?.founded && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded">
              📅 {brand.metadata.founded}
            </span>
          )}
        </div>

        {/* Tags */}
        {brand.metadata?.tags && brand.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {brand.metadata.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {brand.metadata.tags.length > 3 && (
              <span className="inline-block px-2 py-0.5 text-gray-500 text-xs">
                +{brand.metadata.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandCard;
