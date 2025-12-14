/**
 * Health Offer Service
 *
 * Health 제품 Offer 관리
 * - 유통기한 검증 필수
 * - 기능성 내용 필수
 *
 * @package @o4o/health-extension
 */

import { DataSource, Repository } from 'typeorm';
import {
  type HealthMetadata,
  isHealthProduct,
  isExpired,
  isExpirationNear,
} from '../../types.js';
import { healthValidationHooks } from '../hooks/health-validation.hook.js';

// Core entity type references
interface Offer {
  id: string;
  productId: string;
  sellerId: string;
  price: number;
  status: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Product {
  id: string;
  name: string;
  productType?: string;
  metadata?: Record<string, any>;
}

export interface HealthOfferDetail {
  id: string;
  productId: string;
  productName: string;
  sellerId: string;
  price: number;
  status: string;
  healthMetadata: {
    expirationDate: string;
    functionDescription: string;
    intakeMethod: string;
    healthCategory: string;
  };
  expirationStatus: {
    isExpired: boolean;
    isNear: boolean;
    daysRemaining: number;
  };
}

export interface CreateHealthOfferDto {
  productId: string;
  sellerId: string;
  price: number;
  metadata?: Record<string, any>;
}

export class HealthOfferService {
  private offerRepo: Repository<Offer>;
  private productRepo: Repository<Product>;

  constructor(private dataSource: DataSource) {
    this.offerRepo = dataSource.getRepository('Offer') as Repository<Offer>;
    this.productRepo = dataSource.getRepository('Product') as Repository<Product>;
  }

  /**
   * Create offer with health validation
   */
  async createOffer(
    dto: CreateHealthOfferDto,
    user: { id: string; role: string; sellerId?: string },
  ): Promise<{ success: boolean; offer?: HealthOfferDetail; errors?: string[]; warnings?: string[] }> {
    try {
      // Fetch product
      const product = await this.productRepo.findOne({
        where: { id: dto.productId },
      });

      if (!product) {
        return { success: false, errors: ['제품을 찾을 수 없습니다'] };
      }

      if (!isHealthProduct(product)) {
        return { success: false, errors: ['Health 제품이 아닙니다'] };
      }

      // Run before hook
      const hookResult = await healthValidationHooks.beforeOfferCreate({
        data: {
          product,
          offer: dto,
        },
        user,
      });

      if (!hookResult.success) {
        return {
          success: false,
          errors: hookResult.errors,
          warnings: hookResult.warnings,
        };
      }

      // Create offer
      const offer = this.offerRepo.create({
        productId: dto.productId,
        sellerId: dto.sellerId,
        price: dto.price,
        status: 'pending',
        metadata: {
          ...dto.metadata,
          healthValidated: true,
        },
      });

      const savedOffer = await this.offerRepo.save(offer);

      // Run after hook
      await healthValidationHooks.afterOfferCreate({
        data: {
          product,
          offer: savedOffer,
        },
        user,
      });

      const detail = await this.getOfferDetail(savedOffer.id);

      return {
        success: true,
        offer: detail || undefined,
        warnings: hookResult.warnings,
      };
    } catch (error) {
      console.error('[HealthOffer] Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Get offer list for health products
   */
  async getOfferList(
    filters: {
      sellerId?: string;
      status?: string;
      expirationWithinDays?: number;
    },
    pagination: { page: number; limit: number },
  ): Promise<{ items: HealthOfferDetail[]; total: number }> {
    try {
      const qb = this.offerRepo
        .createQueryBuilder('offer')
        .innerJoin('Product', 'product', 'product.id = offer.productId')
        .where('product.productType = :type', { type: 'HEALTH' });

      if (filters.sellerId) {
        qb.andWhere('offer.sellerId = :sellerId', { sellerId: filters.sellerId });
      }

      if (filters.status) {
        qb.andWhere('offer.status = :status', { status: filters.status });
      }

      const total = await qb.getCount();
      const offers = await qb
        .skip((pagination.page - 1) * pagination.limit)
        .take(pagination.limit)
        .orderBy('offer.createdAt', 'DESC')
        .getMany();

      const items: HealthOfferDetail[] = [];
      for (const offer of offers) {
        const detail = await this.getOfferDetail(offer.id);
        if (detail) {
          // Filter by expiration if specified
          if (filters.expirationWithinDays !== undefined) {
            if (detail.expirationStatus.daysRemaining <= filters.expirationWithinDays) {
              items.push(detail);
            }
          } else {
            items.push(detail);
          }
        }
      }

      return { items, total };
    } catch (error) {
      console.error('[HealthOffer] Error fetching offer list:', error);
      throw error;
    }
  }

  /**
   * Get offer detail
   */
  async getOfferDetail(offerId: string): Promise<HealthOfferDetail | null> {
    try {
      const offer = await this.offerRepo.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        return null;
      }

      const product = await this.productRepo.findOne({
        where: { id: offer.productId },
      });

      if (!product || !isHealthProduct(product)) {
        return null;
      }

      const metadata = product.metadata as HealthMetadata;
      const expDate = metadata.expirationDate;
      const daysRemaining = this.calculateDaysRemaining(expDate);

      return {
        id: offer.id,
        productId: offer.productId,
        productName: product.name,
        sellerId: offer.sellerId,
        price: offer.price,
        status: offer.status,
        healthMetadata: {
          expirationDate: expDate ? new Date(expDate).toISOString() : '',
          functionDescription: metadata.functionDescription || '',
          intakeMethod: metadata.intakeMethod || '',
          healthCategory: metadata.healthCategory || 'general',
        },
        expirationStatus: {
          isExpired: expDate ? isExpired(expDate) : false,
          isNear: expDate ? isExpirationNear(expDate, 90) : false,
          daysRemaining,
        },
      };
    } catch (error) {
      console.error('[HealthOffer] Error fetching offer detail:', error);
      throw error;
    }
  }

  /**
   * Get offers expiring soon
   */
  async getExpiringOffers(
    withinDays: number = 30,
    sellerId?: string,
  ): Promise<HealthOfferDetail[]> {
    const { items } = await this.getOfferList(
      { sellerId, status: 'active', expirationWithinDays: withinDays },
      { page: 1, limit: 100 },
    );

    return items.filter((offer) => !offer.expirationStatus.isExpired);
  }

  /**
   * Update offer status
   */
  async updateOfferStatus(
    offerId: string,
    status: string,
    user: { id: string; role: string },
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const offer = await this.offerRepo.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        return { success: false, errors: ['Offer를 찾을 수 없습니다'] };
      }

      // For activation, re-validate expiration
      if (status === 'active') {
        const detail = await this.getOfferDetail(offerId);
        if (detail?.expirationStatus.isExpired) {
          return {
            success: false,
            errors: ['유통기한이 만료된 제품의 Offer는 활성화할 수 없습니다'],
          };
        }
      }

      await this.offerRepo.update(offerId, { status });

      return { success: true };
    } catch (error) {
      console.error('[HealthOffer] Error updating offer status:', error);
      throw error;
    }
  }

  /**
   * Calculate days remaining until expiration
   */
  private calculateDaysRemaining(expirationDate?: Date | string): number {
    if (!expirationDate) return 0;

    const expDate = new Date(expirationDate);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }
}

export default HealthOfferService;
