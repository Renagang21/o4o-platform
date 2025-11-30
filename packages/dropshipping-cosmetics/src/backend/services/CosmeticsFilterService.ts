import { DataSource } from 'typeorm';

/**
 * CosmeticsFilterService
 *
 * Handles filtering of cosmetics products based on metadata.
 */
export class CosmeticsFilterService {
  constructor(private dataSource: DataSource) {}

  /**
   * Filter cosmetics products by various criteria
   */
  async filterProducts(filters: CosmeticsFilters): Promise<any[]> {
    const queryBuilder = this.dataSource
      .getRepository('Product')
      .createQueryBuilder('product')
      .where("product.metadata->>'productType' = :productType", { productType: 'cosmetics' });

    // Filter by skin type
    if (filters.skinType && filters.skinType.length > 0) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'skinType' ?| :skinTypes",
        { skinTypes: filters.skinType }
      );
    }

    // Filter by concerns
    if (filters.concerns && filters.concerns.length > 0) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'concerns' ?| :concerns",
        { concerns: filters.concerns }
      );
    }

    // Filter by certifications
    if (filters.certifications && filters.certifications.length > 0) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'certifications' ?| :certifications",
        { certifications: filters.certifications }
      );
    }

    // Filter by category
    if (filters.category) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->>'productCategory' = :category",
        { category: filters.category }
      );
    }

    // Filter by routine time
    if (filters.timeOfUse) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'routineInfo'->'timeOfUse' ? :timeOfUse",
        { timeOfUse: filters.timeOfUse }
      );
    }

    // Search by name or ingredients
    if (filters.search) {
      queryBuilder.andWhere(
        `(
          product.name ILIKE :search
          OR product.metadata->'cosmetics'->'ingredients' @> :searchJson
        )`,
        {
          search: `%${filters.search}%`,
          searchJson: JSON.stringify([{ name: filters.search }])
        }
      );
    }

    // Pagination
    if (filters.page && filters.limit) {
      const skip = (filters.page - 1) * filters.limit;
      queryBuilder.skip(skip).take(filters.limit);
    }

    // Sorting
    if (filters.sortBy) {
      const order = filters.sortOrder === 'desc' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(`product.${filters.sortBy}`, order);
    } else {
      queryBuilder.orderBy('product.createdAt', 'DESC');
    }

    const products = await queryBuilder.getMany();
    return products;
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(): Promise<FilterOptions> {
    const products = await this.dataSource
      .getRepository('Product')
      .createQueryBuilder('product')
      .where("product.metadata->>'productType' = :productType", { productType: 'cosmetics' })
      .getMany();

    const skinTypes = new Set<string>();
    const concerns = new Set<string>();
    const certifications = new Set<string>();
    const categories = new Set<string>();
    const textures = new Set<string>();

    products.forEach((product: any) => {
      const cosmetics = product.metadata?.cosmetics;
      if (!cosmetics) return;

      // Collect skin types
      if (cosmetics.skinType) {
        Object.keys(cosmetics.skinType).forEach(st => skinTypes.add(st));
      }

      // Collect concerns
      if (cosmetics.concerns) {
        Object.keys(cosmetics.concerns).forEach(c => concerns.add(c));
      }

      // Collect certifications
      if (cosmetics.certifications) {
        Object.keys(cosmetics.certifications).forEach(cert => certifications.add(cert));
      }

      // Collect categories
      if (cosmetics.productCategory) {
        categories.add(cosmetics.productCategory);
      }

      // Collect textures
      if (cosmetics.texture) {
        textures.add(cosmetics.texture);
      }
    });

    return {
      skinTypes: Array.from(skinTypes),
      concerns: Array.from(concerns),
      certifications: Array.from(certifications),
      categories: Array.from(categories),
      textures: Array.from(textures)
    };
  }

  /**
   * Get product count by filters
   */
  async getProductCount(filters: CosmeticsFilters): Promise<number> {
    const queryBuilder = this.dataSource
      .getRepository('Product')
      .createQueryBuilder('product')
      .where("product.metadata->>'productType' = :productType", { productType: 'cosmetics' });

    // Apply same filters as filterProducts
    if (filters.skinType && filters.skinType.length > 0) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'skinType' ?| :skinTypes",
        { skinTypes: filters.skinType }
      );
    }

    if (filters.concerns && filters.concerns.length > 0) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'concerns' ?| :concerns",
        { concerns: filters.concerns }
      );
    }

    if (filters.certifications && filters.certifications.length > 0) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'certifications' ?| :certifications",
        { certifications: filters.certifications }
      );
    }

    if (filters.category) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->>'productCategory' = :category",
        { category: filters.category }
      );
    }

    return await queryBuilder.getCount();
  }
}

// Type definitions
export interface CosmeticsFilters {
  skinType?: string[];
  concerns?: string[];
  certifications?: string[];
  category?: string;
  timeOfUse?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  skinTypes: string[];
  concerns: string[];
  certifications: string[];
  categories: string[];
  textures: string[];
}
