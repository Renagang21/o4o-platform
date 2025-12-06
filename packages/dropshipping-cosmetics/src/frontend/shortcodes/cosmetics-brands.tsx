/**
 * Cosmetics Brands Shortcode
 *
 * Usage: [cosmetics-brands page="1" limit="20" search="..." country="..." tags="..."]
 *
 * Displays a grid of cosmetics brands with filtering
 */

import React from 'react';
import { BrandList } from '../components/BrandList.js';

export interface CosmeticsBrandsShortcodeProps {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  tags?: string; // Comma-separated string: "premium,vegan,organic"
  apiBaseUrl?: string;
}

export const CosmeticsBrandsShortcode: React.FC<CosmeticsBrandsShortcodeProps> = ({
  page = 1,
  limit = 20,
  search,
  country,
  tags: tagsString,
  apiBaseUrl,
}) => {
  // Parse tags string to array
  const parsedTags = tagsString
    ? tagsString.split(',').map((tag) => tag.trim()).filter(Boolean)
    : undefined;

  // Default brand click handler (navigate to brand page)
  const handleBrandClick = (brandId: string) => {
    window.location.href = `/brands/${brandId}`;
  };

  return (
    <BrandList
      apiBaseUrl={apiBaseUrl}
      page={page}
      limit={limit}
      search={search}
      country={country}
      tags={parsedTags}
      onBrandClick={handleBrandClick}
    />
  );
};

export default CosmeticsBrandsShortcode;
