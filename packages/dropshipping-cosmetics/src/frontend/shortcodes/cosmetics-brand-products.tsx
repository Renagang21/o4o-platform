/**
 * Cosmetics Brand Products Shortcode
 *
 * Usage: [cosmetics-brand-products brand="Brand Name" page="1" limit="20" sort="newest"]
 *
 * Displays products for a specific cosmetics brand
 */

import React from 'react';
import { BrandProductsList } from '../components/BrandProductsList.js';

export interface CosmeticsBrandProductsShortcodeProps {
  brand: string; // Required: brand name to filter by
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  showBrandHeader?: boolean;
  apiBaseUrl?: string;
}

export const CosmeticsBrandProductsShortcode: React.FC<CosmeticsBrandProductsShortcodeProps> = ({
  brand,
  page = 1,
  limit = 20,
  sort = 'newest',
  showBrandHeader = true,
  apiBaseUrl,
}) => {
  // Validate required brand prop
  if (!brand || brand.trim() === '') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-700">
          ⚠️ Brand name is required. Usage: [cosmetics-brand-products brand="Brand Name"]
        </p>
      </div>
    );
  }

  return (
    <BrandProductsList
      brandName={brand}
      apiBaseUrl={apiBaseUrl}
      page={page}
      limit={limit}
      sort={sort}
      showBrandHeader={showBrandHeader}
    />
  );
};

export default CosmeticsBrandProductsShortcode;
