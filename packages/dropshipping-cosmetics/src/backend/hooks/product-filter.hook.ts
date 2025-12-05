/**
 * Product Filter Hook for Cosmetics Extension
 *
 * This hook integrates with Dropshipping Core's product filtering system
 * to apply cosmetics-specific filters to products.
 *
 * Usage:
 * ```ts
 * import { registerProductFilter } from '@dropshipping-core/hooks';
 * import { cosmeticsProductFilter } from '@o4o/dropshipping-cosmetics';
 *
 * registerProductFilter('cosmetics-filter', cosmeticsProductFilter);
 * ```
 */

import type { CosmeticsMetadata, CosmeticsFilters } from '../../types.js';

export interface Product {
  id: string;
  name?: string;
  title?: string;
  type?: string;
  category?: string;
  metadata?: CosmeticsMetadata;
  price?: number;
  createdAt?: Date | string;
  [key: string]: any;
}

export interface ProductFilterContext {
  products: Product[];
  filters: Record<string, any>;
  user?: {
    id: string;
    role: string;
  };
}

export interface ProductFilterResult {
  products: Product[];
  filtered: boolean;
  appliedFilters: string[];
}

/**
 * Cosmetics Product Filter Hook
 *
 * This function filters products based on cosmetics-specific metadata.
 * It only applies to products with type 'cosmetics' or category 'cosmetics'.
 */
export function cosmeticsProductFilter(
  context: ProductFilterContext
): ProductFilterResult {
  const { products, filters } = context;

  // Extract cosmetics filters from general filters
  const cosmeticsFilters: CosmeticsFilters = {
    skinType: filters.skinType,
    concerns: filters.concerns,
    certifications: filters.certifications,
    category: filters.category,
    timeOfUse: filters.timeOfUse,
    search: filters.search,
  };

  // Check if any cosmetics filters are applied
  const hasFilters =
    cosmeticsFilters.skinType ||
    cosmeticsFilters.concerns ||
    cosmeticsFilters.certifications ||
    cosmeticsFilters.category ||
    cosmeticsFilters.timeOfUse ||
    cosmeticsFilters.search;

  if (!hasFilters) {
    return {
      products,
      filtered: false,
      appliedFilters: [],
    };
  }

  // Filter only cosmetics products
  let cosmeticsProducts = products.filter(
    (product) =>
      product.type === 'cosmetics' || product.category === 'cosmetics'
  );

  // Apply cosmetics-specific filters
  const appliedFilters: string[] = [];

  // Filter by skin type
  if (cosmeticsFilters.skinType && cosmeticsFilters.skinType.length > 0) {
    cosmeticsProducts = cosmeticsProducts.filter((product) => {
      if (!product.metadata?.skinType) return false;
      return cosmeticsFilters.skinType!.some((type) =>
        product.metadata!.skinType!.includes(type)
      );
    });
    appliedFilters.push('skinType');
  }

  // Filter by concerns
  if (cosmeticsFilters.concerns && cosmeticsFilters.concerns.length > 0) {
    cosmeticsProducts = cosmeticsProducts.filter((product) => {
      if (!product.metadata?.concerns) return false;
      return cosmeticsFilters.concerns!.some((concern) =>
        product.metadata!.concerns!.includes(concern)
      );
    });
    appliedFilters.push('concerns');
  }

  // Filter by certifications
  if (
    cosmeticsFilters.certifications &&
    cosmeticsFilters.certifications.length > 0
  ) {
    cosmeticsProducts = cosmeticsProducts.filter((product) => {
      if (!product.metadata?.certifications) return false;
      return cosmeticsFilters.certifications!.some((cert) =>
        product.metadata!.certifications!.includes(cert)
      );
    });
    appliedFilters.push('certifications');
  }

  // Filter by product category
  if (cosmeticsFilters.category) {
    cosmeticsProducts = cosmeticsProducts.filter(
      (product) =>
        product.metadata?.productCategory === cosmeticsFilters.category
    );
    appliedFilters.push('category');
  }

  // Filter by time of use
  if (cosmeticsFilters.timeOfUse) {
    cosmeticsProducts = cosmeticsProducts.filter((product) =>
      product.metadata?.routineInfo?.timeOfUse?.includes(
        cosmeticsFilters.timeOfUse!
      )
    );
    appliedFilters.push('timeOfUse');
  }

  // Search filter
  if (cosmeticsFilters.search) {
    const searchLower = cosmeticsFilters.search.toLowerCase();
    cosmeticsProducts = cosmeticsProducts.filter((product) => {
      // Search in product name/title
      if (product.name?.toLowerCase().includes(searchLower)) return true;
      if (product.title?.toLowerCase().includes(searchLower)) return true;

      // Search in ingredients
      if (product.metadata?.ingredients) {
        return product.metadata.ingredients.some((ing) =>
          ing.name.toLowerCase().includes(searchLower)
        );
      }

      return false;
    });
    appliedFilters.push('search');
  }

  // Merge filtered cosmetics products with non-cosmetics products
  const nonCosmeticsProducts = products.filter(
    (product) =>
      product.type !== 'cosmetics' && product.category !== 'cosmetics'
  );

  return {
    products: [...cosmeticsProducts, ...nonCosmeticsProducts],
    filtered: appliedFilters.length > 0,
    appliedFilters,
  };
}

/**
 * Register cosmetics product filter
 *
 * This function should be called during extension activation
 * to register the cosmetics filter hook with the Core system.
 */
export function registerCosmeticsFilter(
  registerFn: (name: string, filterFn: any) => void
): void {
  registerFn('cosmetics-filter', cosmeticsProductFilter);
  console.log('[dropshipping-cosmetics] Product filter hook registered');
}

export default cosmeticsProductFilter;
