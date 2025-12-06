/**
 * CosmeticsProductListService
 *
 * Product list with filtering, sorting, and pagination
 * Integrates Dropshipping Core Product with Cosmetics metadata
 */

import { DataSource, Repository } from 'typeorm';

// Mock Product type (will be replaced with actual Product entity)
interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  createdAt: Date;
  metadata?: any;
}

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
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
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
   * Fetch products from database
   * TODO: Replace with actual Product entity query
   */
  private async fetchProducts(): Promise<Product[]> {
    // Mock data for now
    return [
      {
        id: 'product-1',
        name: 'Hydrating Essence',
        brand: 'AquaBeau',
        price: 32000,
        image: 'https://via.placeholder.com/300',
        createdAt: new Date('2025-01-15'),
        metadata: {
          skinTypes: ['dry', 'sensitive'],
          concerns: ['hydration', 'redness'],
          category: 'skincare',
          certifications: ['vegan', 'cruelty-free'],
          ingredients: ['Hyaluronic Acid', 'Centella Asiatica'],
        },
      },
      {
        id: 'product-2',
        name: 'Brightening Serum',
        brand: 'LuminGlow',
        price: 45000,
        image: 'https://via.placeholder.com/300',
        createdAt: new Date('2025-01-10'),
        metadata: {
          skinTypes: ['normal', 'combination'],
          concerns: ['whitening', 'dark spots'],
          category: 'skincare',
          certifications: ['dermatologically-tested'],
          ingredients: ['Vitamin C', 'Niacinamide'],
        },
      },
      {
        id: 'product-3',
        name: 'Acne Treatment Cream',
        brand: 'ClearSkin',
        price: 28000,
        image: 'https://via.placeholder.com/300',
        createdAt: new Date('2025-01-20'),
        metadata: {
          skinTypes: ['oily', 'combination'],
          concerns: ['acne', 'pore'],
          category: 'skincare',
          certifications: ['hypoallergenic'],
          ingredients: ['Salicylic Acid', 'Tea Tree Oil'],
        },
      },
      {
        id: 'product-4',
        name: 'Anti-Aging Retinol Serum',
        brand: 'YouthRevive',
        price: 55000,
        image: 'https://via.placeholder.com/300',
        createdAt: new Date('2025-01-05'),
        metadata: {
          skinTypes: ['normal', 'dry'],
          concerns: ['wrinkle', 'elasticity'],
          category: 'skincare',
          certifications: ['dermatologically-tested'],
          ingredients: ['Retinol', 'Peptides'],
        },
      },
      {
        id: 'product-5',
        name: 'Soothing Gel Cream',
        brand: 'CalmDerm',
        price: 35000,
        image: 'https://via.placeholder.com/300',
        createdAt: new Date('2025-01-12'),
        metadata: {
          skinTypes: ['sensitive', 'dry'],
          concerns: ['soothing', 'redness'],
          category: 'skincare',
          certifications: ['vegan', 'hypoallergenic'],
          ingredients: ['Aloe Vera', 'Centella Asiatica'],
        },
      },
    ];
  }

  /**
   * Apply filters to product list
   */
  private applyFilters(products: Product[], filters: ProductListFilters): Product[] {
    let filtered = products;

    // Filter by skin type
    if (filters.skinType && filters.skinType.length > 0) {
      filtered = filtered.filter((product) => {
        const productSkinTypes = product.metadata?.skinTypes || [];
        return this.hasIntersection(productSkinTypes, filters.skinType!);
      });
    }

    // Filter by concerns
    if (filters.concerns && filters.concerns.length > 0) {
      filtered = filtered.filter((product) => {
        const productConcerns = product.metadata?.concerns || [];
        return this.hasIntersection(productConcerns, filters.concerns!);
      });
    }

    // Filter by brand
    if (filters.brand) {
      filtered = filtered.filter((product) => product.brand === filters.brand);
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter((product) => product.metadata?.category === filters.category);
    }

    // Filter by certifications
    if (filters.certifications && filters.certifications.length > 0) {
      filtered = filtered.filter((product) => {
        const productCerts = product.metadata?.certifications || [];
        return this.hasIntersection(productCerts, filters.certifications!);
      });
    }

    // Filter by ingredients
    if (filters.ingredients && filters.ingredients.length > 0) {
      filtered = filtered.filter((product) => {
        const productIngredients = product.metadata?.ingredients || [];
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
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        // Mock: sort by name for now (TODO: integrate sales count)
        sorted.sort((a, b) => a.name.localeCompare(b.name));
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
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      metadata: {
        skinTypes: product.metadata?.skinTypes || [],
        concerns: product.metadata?.concerns || [],
        category: product.metadata?.category,
        certifications: product.metadata?.certifications || [],
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
