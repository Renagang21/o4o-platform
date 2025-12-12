/**
 * Health Product Service
 *
 * Health 제품 상세 및 메타데이터 관리
 * ProductType.HEALTH 기반 필터링
 *
 * @package @o4o/health-extension
 */

import { DataSource, Repository } from 'typeorm';
import {
  type HealthMetadata,
  type HealthFilters,
  isHealthProduct,
  validateHealthMetadata,
  isExpired,
  isExpirationNear,
} from '../../types.js';

// Core Product type reference
interface Product {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  productType?: string;
  brand?: string;
  recommendedPrice?: number;
  images?: {
    main?: string;
    gallery?: string[];
  };
  metadata?: Record<string, any>;
  category?: {
    id: string;
    name: string;
  };
  supplierId?: string;
  isActive?: boolean;
}

export interface HealthProductDetail {
  id: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  description?: string;
  metadata: HealthMetadata;
  expirationStatus: {
    isExpired: boolean;
    isNear: boolean;
    daysUntilExpiration: number | null;
  };
}

export interface HealthProductListItem {
  id: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  healthCategory: string;
  expirationDate?: string;
  certifications: string[];
  isExpired: boolean;
  isExpirationNear: boolean;
}

export class HealthProductService {
  private productRepo: Repository<Product>;

  constructor(private dataSource: DataSource) {
    this.productRepo = dataSource.getRepository('Product') as Repository<Product>;
  }

  /**
   * Get health product list with filters
   */
  async getProductList(
    filters: HealthFilters,
    pagination: { page: number; limit: number },
  ): Promise<{ items: HealthProductListItem[]; total: number }> {
    try {
      const qb = this.productRepo
        .createQueryBuilder('product')
        .where('product.productType = :type', { type: 'HEALTH' })
        .andWhere('product.isActive = :active', { active: true });

      // Apply health-specific filters
      if (filters.healthCategory) {
        qb.andWhere(`product.metadata->>'healthCategory' = :category`, {
          category: filters.healthCategory,
        });
      }

      if (filters.certifications?.length) {
        qb.andWhere(`product.metadata->'certifications' ?| :certs`, {
          certs: filters.certifications,
        });
      }

      if (filters.form) {
        qb.andWhere(`product.metadata->>'form' = :form`, {
          form: filters.form,
        });
      }

      if (filters.search) {
        qb.andWhere(
          `(product.name ILIKE :search OR product.metadata->>'functionDescription' ILIKE :search)`,
          { search: `%${filters.search}%` },
        );
      }

      // Allergy-free filter
      if (filters.allergyFree?.length) {
        for (const allergy of filters.allergyFree) {
          qb.andWhere(`NOT (product.metadata->'allergyInfo' ? :allergy_${allergy})`, {
            [`allergy_${allergy}`]: allergy,
          });
        }
      }

      // Pagination
      const total = await qb.getCount();
      const items = await qb
        .skip((pagination.page - 1) * pagination.limit)
        .take(pagination.limit)
        .orderBy('product.createdAt', 'DESC')
        .getMany();

      return {
        items: items.map((p) => this.mapToListItem(p)),
        total,
      };
    } catch (error) {
      console.error('[HealthProduct] Error fetching product list:', error);
      throw error;
    }
  }

  /**
   * Get product detail with health metadata
   */
  async getProductDetail(productId: string): Promise<HealthProductDetail | null> {
    try {
      const product = await this.productRepo.findOne({
        where: { id: productId },
        relations: ['category'],
      });

      if (!product) {
        return null;
      }

      if (!isHealthProduct(product)) {
        console.warn(`[HealthProduct] Product ${productId} is not a health product`);
        return null;
      }

      const metadata = product.metadata as HealthMetadata;
      const expirationStatus = this.getExpirationStatus(metadata.expirationDate);

      return {
        id: product.id,
        title: product.name,
        brand: product.brand || 'Unknown Brand',
        price: Number(product.recommendedPrice) || 0,
        image: product.images?.main || '',
        description: product.description || product.shortDescription,
        metadata,
        expirationStatus,
      };
    } catch (error) {
      console.error('[HealthProduct] Error fetching product detail:', error);
      throw error;
    }
  }

  /**
   * Validate health product metadata
   */
  async validateProduct(productId: string): Promise<{ valid: boolean; errors: string[] }> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      return { valid: false, errors: ['제품을 찾을 수 없습니다'] };
    }

    if (!isHealthProduct(product)) {
      return { valid: false, errors: ['Health 제품이 아닙니다'] };
    }

    return validateHealthMetadata(product.metadata as HealthMetadata);
  }

  /**
   * Get products expiring soon
   */
  async getExpiringProducts(
    withinDays: number = 90,
    supplierId?: string,
  ): Promise<HealthProductListItem[]> {
    try {
      const qb = this.productRepo
        .createQueryBuilder('product')
        .where('product.productType = :type', { type: 'HEALTH' })
        .andWhere('product.isActive = :active', { active: true });

      if (supplierId) {
        qb.andWhere('product.supplierId = :supplierId', { supplierId });
      }

      const products = await qb.getMany();

      return products
        .filter((p) => {
          const metadata = p.metadata as HealthMetadata;
          return (
            metadata?.expirationDate &&
            !isExpired(metadata.expirationDate) &&
            isExpirationNear(metadata.expirationDate, withinDays)
          );
        })
        .map((p) => this.mapToListItem(p))
        .sort((a, b) => {
          const dateA = new Date(a.expirationDate || 0);
          const dateB = new Date(b.expirationDate || 0);
          return dateA.getTime() - dateB.getTime();
        });
    } catch (error) {
      console.error('[HealthProduct] Error fetching expiring products:', error);
      throw error;
    }
  }

  /**
   * Map product to list item
   */
  private mapToListItem(product: Product): HealthProductListItem {
    const metadata = product.metadata as HealthMetadata;
    const expDate = metadata?.expirationDate;

    return {
      id: product.id,
      title: product.name,
      brand: product.brand || '',
      price: Number(product.recommendedPrice) || 0,
      image: product.images?.main || '',
      healthCategory: metadata?.healthCategory || 'general',
      expirationDate: expDate ? new Date(expDate).toISOString() : undefined,
      certifications: metadata?.certifications || [],
      isExpired: expDate ? isExpired(expDate) : false,
      isExpirationNear: expDate ? isExpirationNear(expDate, 90) : false,
    };
  }

  /**
   * Get expiration status
   */
  private getExpirationStatus(expirationDate?: Date | string): HealthProductDetail['expirationStatus'] {
    if (!expirationDate) {
      return {
        isExpired: false,
        isNear: false,
        daysUntilExpiration: null,
      };
    }

    const expDate = new Date(expirationDate);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isExpired: isExpired(expirationDate),
      isNear: isExpirationNear(expirationDate, 90),
      daysUntilExpiration: diffDays > 0 ? diffDays : 0,
    };
  }
}

export default HealthProductService;
