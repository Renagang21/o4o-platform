/**
 * RecommendationEngineService
 *
 * Rule-based recommendation engine for cosmetics products
 * Scores products based on skin type, concerns, brand, and category matching
 */

import { DataSource, Repository } from 'typeorm';
import type { Product } from '../types/product.types.js';
import { calculateProductScore } from '../utils/recommendation-utils.js';

export interface RecommendationInput {
  skinTypes?: string[];
  concerns?: string[];
  brand?: string;
  category?: string;
  limit?: number;
  excludeProductId?: string; // Exclude current product from recommendations
  preferences?: string[]; // User preferences for product filtering
}

export interface ScoredProduct {
  product: Product;
  score: number;
}

export class RecommendationEngineService {
  private productRepo: Repository<Product>;

  constructor(private dataSource: DataSource) {
    this.productRepo = dataSource.getRepository('Product') as Repository<Product>;
  }

  /**
   * Recommend products based on input criteria
   * Returns products sorted by relevance score (highest first)
   */
  async recommendProducts(input: RecommendationInput): Promise<Product[]> {
    const limit = input.limit || 5;

    try {
      // 1. Fetch all cosmetics products
      const products = await this.fetchCosmeticsProducts();

      // 2. Filter out excluded product if specified
      const eligibleProducts = input.excludeProductId
        ? products.filter(p => p.id !== input.excludeProductId)
        : products;

      // 3. Score each product
      const scoredProducts: ScoredProduct[] = eligibleProducts.map(product => ({
        product,
        score: calculateProductScore(product, input)
      }));

      // 4. Filter out products with zero score (no match at all)
      const matchedProducts = scoredProducts.filter(sp => sp.score > 0);

      // 5. Sort by score (descending)
      matchedProducts.sort((a, b) => b.score - a.score);

      // 6. Return top N products
      const recommendations = matchedProducts
        .slice(0, limit)
        .map(sp => sp.product);

      console.log(`[RecommendationEngine] Generated ${recommendations.length} recommendations from ${eligibleProducts.length} products`);

      return recommendations;
    } catch (error) {
      console.error('[RecommendationEngine] Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Get similar products to a given product
   * Uses the product's own metadata as recommendation criteria
   */
  async getSimilarProducts(productId: string, limit: number = 5): Promise<Product[]> {
    try {
      // Fetch the source product
      const sourceProduct = await this.productRepo.findOne({
        where: { id: productId },
        relations: ['category']
      });

      if (!sourceProduct || !sourceProduct.metadata?.cosmetics_metadata) {
        console.warn(`[RecommendationEngine] Product ${productId} not found or has no cosmetics metadata`);
        return [];
      }

      const cosmeticsMetadata = sourceProduct.metadata.cosmetics_metadata;

      // Use the product's metadata as recommendation input
      return this.recommendProducts({
        skinTypes: cosmeticsMetadata.skinTypes || [],
        concerns: cosmeticsMetadata.concerns || [],
        brand: sourceProduct.brand,
        category: cosmeticsMetadata.category || sourceProduct.category?.name,
        limit,
        excludeProductId: productId // Don't recommend the same product
      });
    } catch (error) {
      console.error('[RecommendationEngine] Error getting similar products:', error);
      return [];
    }
  }

  /**
   * Fetch all products with cosmetics metadata
   */
  private async fetchCosmeticsProducts(): Promise<Product[]> {
    try {
      const products = await this.productRepo.find({
        relations: ['category']
      });

      // Filter to only cosmetics products
      return products.filter(product => product.metadata?.cosmetics_metadata);
    } catch (error) {
      console.error('[RecommendationEngine] Error fetching cosmetics products:', error);
      return [];
    }
  }

  /**
   * Get recommendations based on user profile
   * This can be extended in the future to use user purchase history, preferences, etc.
   */
  async recommendForUser(userId: string, limit: number = 5): Promise<Product[]> {
    // TODO: Phase 4-4 or later - integrate with user profile/preferences
    // For now, return empty array
    console.log(`[RecommendationEngine] User-based recommendations not yet implemented for user ${userId}`);
    return [];
  }
}

export default RecommendationEngineService;
