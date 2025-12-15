/**
 * CosmeticsProduct Service
 *
 * Handles product detail with cosmetics metadata
 * Merges Dropshipping Core Product with Cosmetics-specific data
 */

import { DataSource, Repository } from 'typeorm';
import type { Product } from '../types/product.types.js';
import { RoutineReaderService, type ReadOnlyRoutine } from './routine-reader.service.js';

export interface CosmeticsProductDetail {
  id: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  description?: string;
  metadata: {
    skinTypes: string[];
    concerns: string[];
    ingredients: string[];
    certifications: string[];
    category?: string;
    usage?: string;
  };
  routineMatches: {
    id: string;
    title: string;
    partnerId: string;
  }[];
}

export class CosmeticsProductService {
  private productRepo: Repository<Product>;
  private routineReader: RoutineReaderService;

  constructor(private dataSource: DataSource) {
    this.productRepo = dataSource.getRepository('Product') as Repository<Product>;
    // Use read-only RoutineReaderService for PartnerRoutine access (Phase 7-Y)
    this.routineReader = new RoutineReaderService(dataSource);
  }

  /**
   * Get product detail with cosmetics metadata
   */
  async getProductDetail(productId: string): Promise<CosmeticsProductDetail | null> {
    try {
      const product = await this.fetchCoreProduct(productId);

      if (!product) {
        return null;
      }

      // Check if this is a cosmetics product
      if (!product.metadata?.cosmetics_metadata) {
        console.warn(`[CosmeticsProduct] Product ${productId} has no cosmetics metadata`);
        // Still return the product, but with empty metadata
      }

      // Fetch routines that include this product
      const routineMatches = await this.findRoutinesByProduct(productId);

      return {
        id: product.id,
        title: product.name,
        brand: product.brand || 'Unknown Brand',
        price: Number(product.recommendedPrice),
        image: product.images?.main || '',
        description: product.description || product.shortDescription || undefined,
        metadata: this.extractCosmeticsMetadata(product),
        routineMatches: routineMatches.map(r => ({
          id: r.id,
          title: r.title,
          partnerId: r.partnerId
        }))
      };
    } catch (error) {
      console.error('[CosmeticsProduct] Error fetching product detail:', error);
      throw error;
    }
  }

  /**
   * Fetch core product from Dropshipping Core
   */
  private async fetchCoreProduct(productId: string): Promise<Product | null> {
    try {
      const product = await this.productRepo.findOne({
        where: { id: productId },
        relations: ['category']
      });

      return product;
    } catch (error) {
      console.error('[CosmeticsProduct] Error fetching product:', error);
      return null;
    }
  }

  /**
   * Extract cosmetics metadata from product metadata field
   * Expects: product.metadata.cosmetics_metadata
   */
  private extractCosmeticsMetadata(product: Product): CosmeticsProductDetail['metadata'] {
    const cosmeticsMetadata = product.metadata?.cosmetics_metadata || {};

    return {
      skinTypes: Array.isArray(cosmeticsMetadata.skinTypes) ? cosmeticsMetadata.skinTypes : [],
      concerns: Array.isArray(cosmeticsMetadata.concerns) ? cosmeticsMetadata.concerns : [],
      ingredients: Array.isArray(cosmeticsMetadata.ingredients) ? cosmeticsMetadata.ingredients : [],
      certifications: Array.isArray(cosmeticsMetadata.certifications) ? cosmeticsMetadata.certifications : [],
      category: cosmeticsMetadata.category || product.category?.name || undefined,
      usage: cosmeticsMetadata.usage || undefined
    };
  }

  /**
   * Find routines that include this product
   * Uses read-only RoutineReaderService for PartnerRoutine access (Phase 7-Y)
   */
  private async findRoutinesByProduct(productId: string): Promise<ReadOnlyRoutine[]> {
    try {
      return await this.routineReader.findRoutinesByProduct(productId);
    } catch (error) {
      console.error('[CosmeticsProduct] Error finding routine matches:', error);
      return [];
    }
  }

  /**
   * Get product recommendations based on skin type and concerns
   */
  async getRecommendations(
    skinType: string,
    concerns: string[],
    limit: number = 5
  ): Promise<CosmeticsProductDetail[]> {
    // TODO: Implement recommendation logic
    // This will be used in Phase 4-2 (Recommendation Panel)
    return [];
  }
}

export default CosmeticsProductService;
