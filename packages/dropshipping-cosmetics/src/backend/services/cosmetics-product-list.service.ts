/**
 * CosmeticsProductListService
 *
 * Phase 9-C: Core v2 정렬
 * - ProductType.COSMETICS 기반 필터링
 * - isCosmeticsProduct 타입 가드 사용
 *
 * Product list with filtering, sorting, and pagination
 * Integrates Dropshipping Core Product with Cosmetics metadata
 */

import { DataSource, Repository } from 'typeorm';
import { type Product, isCosmeticsProduct } from '../types/product.types.js';

export interface ProductListFilters {
  skinType?: string[];
  concerns?: string[];
  brand?: string;
  category?: string;
  certifications?: string[];
  ingredients?: string[];
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  filters?: ProductListFilters;
}

export interface ProductListItem {
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
}

export interface ProductListResult {
  items: ProductListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class CosmeticsProductListService {
  private productRepo: Repository<Product>;

  constructor(private dataSource: DataSource) {
    this.productRepo = dataSource.getRepository('Product') as Repository<Product>;
  }

  /**
   * List products with filtering, sorting, and pagination
   */
  async listProducts(params: ProductListParams): Promise<ProductListResult> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const sort = params.sort || 'newest';
    const filters = params.filters || {};

    // Fetch products (mock data for now)
    let products = await this.fetchProducts();

    // Apply filters
    products = this.applyFilters(products, filters);

    // Apply sorting
    products = this.applySorting(products, sort);

    // Calculate pagination
    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Slice for current page
    const items = products.slice(offset, offset + limit);

    // Transform to ProductListItem format
    const transformedItems = items.map((product) => this.transformProduct(product));

    return {
      items: transformedItems,
      page,
      limit,
      total,
      totalPages,
    };
  }

  /**
   * Get products by brand name
   * Convenience method for brand-specific product lists
   */
  async getProductsByBrandName(brandName: string, params?: Omit<ProductListParams, 'filters'>): Promise<ProductListResult> {
    return this.listProducts({
      ...params,
      filters: {
        brand: brandName,
      },
    });
  }

  /**
   * Fetch products from database
   *
   * Phase 9-C: productType = COSMETICS 기반 필터링
   * isCosmeticsProduct 타입 가드 사용 (Core v2 정렬 + legacy fallback)
   */
  private async fetchProducts(): Promise<Product[]> {
    try {
      // Fetch all products with category relation
      const products = await this.productRepo.find({
        relations: ['category']
      });

      // Filter to only cosmetics products using Core v2 type guard
      // Primary: productType = COSMETICS
      // Fallback: cosmetics_metadata exists (legacy support)
      return products.filter(product => isCosmeticsProduct(product));
    } catch (error) {
      console.error('[CosmeticsProductList] Error fetching products:', error);
      return [];
    }
  }

  /**
   * Apply filters to product list
   */
  private applyFilters(products: Product[], filters: ProductListFilters): Product[] {
    let filtered = products;

    // Filter by skin type
    if (filters.skinType && filters.skinType.length > 0) {
      filtered = filtered.filter((product) => {
        const cosmeticsMetadata = product.metadata?.cosmetics_metadata || {};
        const productSkinTypes = cosmeticsMetadata.skinTypes || [];
        return this.hasIntersection(productSkinTypes, filters.skinType!);
      });
    }

    // Filter by concerns
    if (filters.concerns && filters.concerns.length > 0) {
      filtered = filtered.filter((product) => {
        const cosmeticsMetadata = product.metadata?.cosmetics_metadata || {};
        const productConcerns = cosmeticsMetadata.concerns || [];
        return this.hasIntersection(productConcerns, filters.concerns!);
      });
    }

    // Filter by brand
    if (filters.brand) {
      filtered = filtered.filter((product) => product.brand === filters.brand);
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter((product) => {
        const cosmeticsMetadata = product.metadata?.cosmetics_metadata || {};
        return cosmeticsMetadata.category === filters.category || product.category?.name === filters.category;
      });
    }

    // Filter by certifications
    if (filters.certifications && filters.certifications.length > 0) {
      filtered = filtered.filter((product) => {
        const cosmeticsMetadata = product.metadata?.cosmetics_metadata || {};
        const productCerts = cosmeticsMetadata.certifications || [];
        return this.hasIntersection(productCerts, filters.certifications!);
      });
    }

    // Filter by ingredients
    if (filters.ingredients && filters.ingredients.length > 0) {
      filtered = filtered.filter((product) => {
        const cosmeticsMetadata = product.metadata?.cosmetics_metadata || {};
        const productIngredients = cosmeticsMetadata.ingredients || [];
        return this.hasIntersection(productIngredients, filters.ingredients!);
      });
    }

    return filtered;
  }

  /**
   * Apply sorting to product list
   */
  private applySorting(products: Product[], sort: string): Product[] {
    const sorted = [...products];

    switch (sort) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'price_asc':
        sorted.sort((a, b) => Number(a.recommendedPrice) - Number(b.recommendedPrice));
        break;
      case 'price_desc':
        sorted.sort((a, b) => Number(b.recommendedPrice) - Number(a.recommendedPrice));
        break;
      case 'popular':
        // TODO: integrate sales count when available
        // For now, sort by createdAt as fallback
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      default:
        // Default to newest
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return sorted;
  }

  /**
   * Transform Product to ProductListItem
   */
  private transformProduct(product: Product): ProductListItem {
    const cosmeticsMetadata = product.metadata?.cosmetics_metadata || {};

    return {
      id: product.id,
      name: product.name,
      brand: product.brand || 'Unknown Brand',
      price: Number(product.recommendedPrice),
      image: product.images?.main || '',
      metadata: {
        skinTypes: cosmeticsMetadata.skinTypes || [],
        concerns: cosmeticsMetadata.concerns || [],
        category: cosmeticsMetadata.category || product.category?.name,
        certifications: cosmeticsMetadata.certifications || [],
      },
    };
  }

  /**
   * Check if two arrays have any common elements
   */
  private hasIntersection(arr1: string[], arr2: string[]): boolean {
    return arr1.some((item) => arr2.includes(item));
  }
}

export default CosmeticsProductListService;
