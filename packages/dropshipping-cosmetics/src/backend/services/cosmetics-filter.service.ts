/**
 * Cosmetics Filter Service
 *
 * Manages cosmetics-specific product filtering logic
 */

import type { CosmeticsFilters, CosmeticsMetadata } from '../../types.js';

export interface FilterConfiguration {
  id?: string;
  name: string;
  type: 'skinType' | 'concerns' | 'certifications' | 'category' | 'texture';
  values: string[];
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CosmeticsFilterService {
  private filterConfigurations: Map<string, FilterConfiguration> = new Map();

  constructor() {
    // Initialize with default configurations
    this.initializeDefaultFilters();
  }

  /**
   * Initialize default filter configurations
   */
  private initializeDefaultFilters(): void {
    const defaults: FilterConfiguration[] = [
      {
        id: 'skinType',
        name: 'Skin Type Filter',
        type: 'skinType',
        values: ['dry', 'oily', 'combination', 'sensitive', 'normal'],
        enabled: true,
      },
      {
        id: 'concerns',
        name: 'Skin Concerns Filter',
        type: 'concerns',
        values: [
          'acne',
          'whitening',
          'wrinkle',
          'pore',
          'soothing',
          'moisturizing',
          'elasticity',
          'trouble',
        ],
        enabled: true,
      },
      {
        id: 'certifications',
        name: 'Certifications Filter',
        type: 'certifications',
        values: [
          'vegan',
          'hypoallergenic',
          'organic',
          'ewgGreen',
          'crueltyfree',
          'dermatologicallyTested',
        ],
        enabled: true,
      },
      {
        id: 'category',
        name: 'Product Category Filter',
        type: 'category',
        values: [
          'skincare',
          'cleansing',
          'makeup',
          'suncare',
          'mask',
          'bodycare',
          'haircare',
        ],
        enabled: true,
      },
      {
        id: 'texture',
        name: 'Texture Filter',
        type: 'texture',
        values: [
          'gel',
          'cream',
          'lotion',
          'serum',
          'oil',
          'foam',
          'water',
          'balm',
        ],
        enabled: true,
      },
    ];

    defaults.forEach((config) => {
      if (config.id) {
        this.filterConfigurations.set(config.id, config);
      }
    });
  }

  /**
   * Get all filter configurations
   */
  async getAllFilters(): Promise<FilterConfiguration[]> {
    return Array.from(this.filterConfigurations.values());
  }

  /**
   * Get filter configuration by ID
   */
  async getFilterById(id: string): Promise<FilterConfiguration | null> {
    return this.filterConfigurations.get(id) || null;
  }

  /**
   * Update filter configuration
   */
  async updateFilter(
    id: string,
    updates: Partial<FilterConfiguration>
  ): Promise<FilterConfiguration | null> {
    const existing = this.filterConfigurations.get(id);
    if (!existing) {
      return null;
    }

    const updated: FilterConfiguration = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.filterConfigurations.set(id, updated);
    return updated;
  }

  /**
   * Filter products by cosmetics metadata
   *
   * This method applies cosmetics-specific filters to products
   */
  filterProducts(
    products: Array<{ metadata?: CosmeticsMetadata; [key: string]: any }>,
    filters: CosmeticsFilters
  ): Array<{ metadata?: CosmeticsMetadata; [key: string]: any }> {
    let filtered = [...products];

    // Filter by skin type
    if (filters.skinType && filters.skinType.length > 0) {
      filtered = filtered.filter((product) => {
        if (!product.metadata?.skinType) return false;
        return filters.skinType!.some((type) =>
          product.metadata!.skinType!.includes(type)
        );
      });
    }

    // Filter by concerns
    if (filters.concerns && filters.concerns.length > 0) {
      filtered = filtered.filter((product) => {
        if (!product.metadata?.concerns) return false;
        return filters.concerns!.some((concern) =>
          product.metadata!.concerns!.includes(concern)
        );
      });
    }

    // Filter by certifications
    if (filters.certifications && filters.certifications.length > 0) {
      filtered = filtered.filter((product) => {
        if (!product.metadata?.certifications) return false;
        return filters.certifications!.some((cert) =>
          product.metadata!.certifications!.includes(cert)
        );
      });
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(
        (product) => product.metadata?.productCategory === filters.category
      );
    }

    // Filter by time of use
    if (filters.timeOfUse) {
      filtered = filtered.filter((product) =>
        product.metadata?.routineInfo?.timeOfUse?.includes(filters.timeOfUse!)
      );
    }

    // Search filter (search in product name, ingredients, etc.)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((product) => {
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
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered = this.sortProducts(filtered, filters.sortBy, filters.sortOrder);
    }

    // Apply pagination
    if (filters.page && filters.limit) {
      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  /**
   * Sort products
   */
  private sortProducts(
    products: any[],
    sortBy: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): any[] {
    const sorted = [...products];

    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'name':
          aVal = a.name || a.title || '';
          bVal = b.name || b.title || '';
          break;
        case 'price':
          aVal = a.price || 0;
          bVal = b.price || 0;
          break;
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Get filter statistics
   * Returns count of products for each filter value
   */
  async getFilterStatistics(
    products: Array<{ metadata?: CosmeticsMetadata; [key: string]: any }>
  ): Promise<Record<string, Record<string, number>>> {
    const stats: Record<string, Record<string, number>> = {
      skinType: {},
      concerns: {},
      certifications: {},
      category: {},
      texture: {},
    };

    products.forEach((product) => {
      if (!product.metadata) return;

      // Count skin types
      product.metadata.skinType?.forEach((type) => {
        stats.skinType[type] = (stats.skinType[type] || 0) + 1;
      });

      // Count concerns
      product.metadata.concerns?.forEach((concern) => {
        stats.concerns[concern] = (stats.concerns[concern] || 0) + 1;
      });

      // Count certifications
      product.metadata.certifications?.forEach((cert) => {
        stats.certifications[cert] = (stats.certifications[cert] || 0) + 1;
      });

      // Count categories
      if (product.metadata.productCategory) {
        const cat = product.metadata.productCategory;
        stats.category[cat] = (stats.category[cat] || 0) + 1;
      }

      // Count textures
      if (product.metadata.texture) {
        const texture = product.metadata.texture;
        stats.texture[texture] = (stats.texture[texture] || 0) + 1;
      }
    });

    return stats;
  }
}

export default CosmeticsFilterService;
