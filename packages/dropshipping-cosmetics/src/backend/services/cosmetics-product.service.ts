/**
 * CosmeticsProduct Service
 *
 * Handles product detail with cosmetics metadata
 * Merges Dropshipping Core Product with Cosmetics-specific data
 */

import { DataSource, Repository } from 'typeorm';
import { CosmeticsRoutine } from '../entities/cosmetics-routine.entity.js';

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
  private routineRepo: Repository<CosmeticsRoutine>;

  constructor(private dataSource: DataSource) {
    this.routineRepo = dataSource.getRepository(CosmeticsRoutine);
  }

  /**
   * Get product detail with cosmetics metadata
   */
  async getProductDetail(productId: string): Promise<CosmeticsProductDetail | null> {
    try {
      // TODO: Fetch from Dropshipping Core Product entity
      // For now, use mock data structure
      const product = await this.fetchCoreProduct(productId);

      if (!product) {
        return null;
      }

      // Fetch routines that include this product
      const routineMatches = await this.findRoutinesByProduct(productId);

      return {
        id: product.id,
        title: product.title,
        brand: product.brand || 'Unknown Brand',
        price: product.price,
        image: product.image || '',
        description: product.description,
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
   * TODO: Replace with actual Product entity query
   */
  private async fetchCoreProduct(productId: string): Promise<any> {
    // Mock implementation - will be replaced with actual Product repository query
    // const productRepo = this.dataSource.getRepository(Product);
    // return productRepo.findOne({ where: { id: productId } });

    return {
      id: productId,
      title: 'Sample Product',
      brand: 'Sample Brand',
      price: 35000,
      image: 'https://via.placeholder.com/400',
      description: 'Sample description',
      customFields: {
        skinTypes: ['dry', 'sensitive'],
        concerns: ['hydration', 'redness'],
        ingredients: ['Hyaluronic Acid', 'Panthenol', 'Centella Asiatica'],
        certifications: ['vegan', 'cruelty-free']
      }
    };
  }

  /**
   * Extract cosmetics metadata from product custom fields
   */
  private extractCosmeticsMetadata(product: any): CosmeticsProductDetail['metadata'] {
    const customFields = product.customFields || {};

    return {
      skinTypes: Array.isArray(customFields.skinTypes) ? customFields.skinTypes : [],
      concerns: Array.isArray(customFields.concerns) ? customFields.concerns : [],
      ingredients: Array.isArray(customFields.ingredients) ? customFields.ingredients : [],
      certifications: Array.isArray(customFields.certifications) ? customFields.certifications : [],
      category: customFields.category || undefined,
      usage: customFields.usage || undefined
    };
  }

  /**
   * Find routines that include this product
   */
  private async findRoutinesByProduct(productId: string): Promise<CosmeticsRoutine[]> {
    try {
      // Query routines where steps contain this productId
      const routines = await this.routineRepo
        .createQueryBuilder('routine')
        .where('routine.isPublished = :isPublished', { isPublished: true })
        .andWhere(`routine.steps::text LIKE :productId`, {
          productId: `%${productId}%`
        })
        .select(['routine.id', 'routine.title', 'routine.partnerId'])
        .getMany();

      return routines;
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
