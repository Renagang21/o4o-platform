/**
 * Cosmetics Products List Shortcode
 *
 * Usage: [cosmetics-products-list filters="skinType:dry,concerns:hydration" sort="newest" limit="20"]
 *
 * Displays a filterable list of cosmetics products with sidebar filters
 */

import React from 'react';
import { CosmeticsProductsList } from '../components/CosmeticsProductsList.js';
import type { FilterState } from '../components/CosmeticsFilterSidebar.js';

export interface CosmeticsProductsListShortcodeProps {
  filters?: string; // Format: "skinType:dry,concerns:hydration,category:skincare"
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  limit?: number;
  apiBaseUrl?: string;
}

export const CosmeticsProductsListShortcode: React.FC<CosmeticsProductsListShortcodeProps> = ({
  filters: filtersString,
  sort = 'newest',
  limit = 20,
  apiBaseUrl,
}) => {
  // Parse filters string to FilterState object
  const parseFilters = (filterStr?: string): Partial<FilterState> => {
    if (!filterStr) return {};

    const parsed: Partial<FilterState> = {
      skinType: [],
      concerns: [],
      certifications: [],
    };

    const pairs = filterStr.split(',').map((p) => p.trim());

    pairs.forEach((pair) => {
      const [key, value] = pair.split(':').map((s) => s.trim());

      if (key === 'skinType' && value) {
        parsed.skinType = value.split('|');
      } else if (key === 'concerns' && value) {
        parsed.concerns = value.split('|');
      } else if (key === 'category' && value) {
        parsed.category = value;
      } else if (key === 'brand' && value) {
        parsed.brand = value;
      } else if (key === 'certifications' && value) {
        parsed.certifications = value.split('|');
      }
    });

    return parsed;
  };

  const initialFilters = parseFilters(filtersString);

  return (
    <CosmeticsProductsList
      apiBaseUrl={apiBaseUrl}
      initialFilters={initialFilters}
      initialSort={sort}
      initialLimit={limit}
    />
  );
};

export default CosmeticsProductsListShortcode;
