/**
 * Cosmetics Filter Service (DB-based)
 *
 * Manages cosmetics-specific product filtering logic using TypeORM
 */

import type { Repository, DataSource } from 'typeorm';
import { CosmeticsFilter } from '../entities/cosmetics-filter.entity.js';
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
  private repository: Repository<CosmeticsFilter>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(CosmeticsFilter);
  }

  /**
   * Initialize default filters (call during installation)
   */
  async initializeDefaultFilters(): Promise<void> {
    const existingCount = await this.repository.count();

    if (existingCount > 0) {
      // Filters already initialized
      return;
    }

    const defaults: Omit<CosmeticsFilter, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Skin Type Filter',
        type: 'skinType',
        filters: {
          values: ['dry', 'oily', 'combination', 'sensitive', 'normal'],
        },
        enabled: true,
        updatedBy: null,
      },
      {
        name: 'Skin Concerns Filter',
        type: 'concerns',
        filters: {
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
        },
        enabled: true,
        updatedBy: null,
      },
      {
        name: 'Certifications Filter',
        type: 'certifications',
        filters: {
          values: [
            'vegan',
            'hypoallergenic',
            'organic',
            'ewgGreen',
            'crueltyfree',
            'dermatologicallyTested',
          ],
        },
        enabled: true,
        updatedBy: null,
      },
      {
        name: 'Product Category Filter',
        type: 'category',
        filters: {
          values: [
            'skincare',
            'cleansing',
            'makeup',
            'suncare',
            'mask',
            'bodycare',
            'haircare',
          ],
        },
        enabled: true,
        updatedBy: null,
      },
      {
        name: 'Texture Filter',
        type: 'texture',
        filters: {
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
        },
        enabled: true,
        updatedBy: null,
      },
    ];

    await this.repository.save(defaults as any);
  }

  /**
   * Get all filter configurations
   */
  async getAllFilters(): Promise<CosmeticsFilter[]> {
    return await this.repository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Get filter configuration by ID
   */
  async getFilterById(id: string): Promise<CosmeticsFilter | null> {
    return await this.repository.findOne({ where: { id } });
  }

  /**
   * Get filter configuration by name
   */
  async getFilterByName(name: string): Promise<CosmeticsFilter | null> {
    return await this.repository.findOne({ where: { name } });
  }

  /**
   * Update filter configuration
   */
  async updateFilter(
    id: string,
    updates: Partial<CosmeticsFilter>,
    userId?: string
  ): Promise<CosmeticsFilter | null> {
    const existing = await this.repository.findOne({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = this.repository.merge(existing, {
      ...updates,
      updatedBy: userId || null,
    });

    return await this.repository.save(updated);
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
