/**
 * Offer Operations Service
 *
 * Phase 9-B: Core 정렬 업데이트
 * - Core ProductType, OfferStatus enum 사용
 * - PHARMACEUTICAL Offer 생성 제한
 * - productType 기반 필터링 지원
 */

import { ProductType, OfferStatus } from '@o4o/dropshipping-core';

export interface SupplierOffer {
  id: string;
  productId: string;
  productMasterId?: string;
  productName: string;
  productType: ProductType;
  supplierPrice: number;
  suggestedRetailPrice?: number;
  stockQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  status: OfferStatus;
  isActive: boolean;
  activeSellers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferFilterOptions {
  productType?: ProductType;
  status?: OfferStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface OfferCreateData {
  productId: string;
  productMasterId?: string;
  productName?: string;
  productType?: ProductType;
  supplierPrice: number;
  suggestedRetailPrice?: number;
  stockQuantity: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
}

export class OfferOpsService {
  /**
   * Offer 생성 전 검증 - PHARMACEUTICAL 제한
   */
  validateOfferCreate(data: OfferCreateData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.supplierPrice <= 0) {
      errors.push('공급가는 0보다 커야 합니다.');
    }

    if (data.stockQuantity < 0) {
      errors.push('재고 수량은 0 이상이어야 합니다.');
    }

    if (data.productType === ProductType.PHARMACEUTICAL) {
      errors.push('의약품 Offer는 SupplierOps에서 직접 생성할 수 없습니다. pharmaceutical-core Extension을 사용하세요.');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get all offers for a supplier (productType 필터링 지원)
   */
  async getOffers(supplierId: string, options?: OfferFilterOptions): Promise<SupplierOffer[]> {
    // Demo data (Core 스펙에 맞게 업데이트)
    const demoOffers: SupplierOffer[] = [
      {
        id: '1',
        productId: '1',
        productMasterId: 'pm-1',
        productName: '프리미엄 에센스 세럼',
        productType: ProductType.COSMETICS,
        supplierPrice: 32000,
        suggestedRetailPrice: 45000,
        stockQuantity: 150,
        minOrderQuantity: 1,
        status: OfferStatus.ACTIVE,
        isActive: true,
        activeSellers: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        productId: '2',
        productMasterId: 'pm-2',
        productName: '수분 크림',
        productType: ProductType.COSMETICS,
        supplierPrice: 25000,
        suggestedRetailPrice: 35000,
        stockQuantity: 80,
        minOrderQuantity: 1,
        status: OfferStatus.ACTIVE,
        isActive: true,
        activeSellers: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        productId: '3',
        productMasterId: 'pm-3',
        productName: '클렌징 폼',
        productType: ProductType.COSMETICS,
        supplierPrice: 12000,
        suggestedRetailPrice: 18000,
        stockQuantity: 0,
        minOrderQuantity: 2,
        status: OfferStatus.OUT_OF_STOCK,
        isActive: false,
        activeSellers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // 필터링 적용
    let filtered = demoOffers;
    if (options?.productType) {
      filtered = filtered.filter(o => o.productType === options.productType);
    }
    if (options?.status) {
      filtered = filtered.filter(o => o.status === options.status);
    }
    if (options?.isActive !== undefined) {
      filtered = filtered.filter(o => o.isActive === options.isActive);
    }

    return filtered;
  }

  /**
   * productType별 Offer 조회
   */
  async getOffersByProductType(supplierId: string, productType: ProductType): Promise<SupplierOffer[]> {
    return this.getOffers(supplierId, { productType });
  }

  /**
   * Create a new offer (PHARMACEUTICAL 차단)
   */
  async createOffer(supplierId: string, data: OfferCreateData): Promise<SupplierOffer> {
    const validation = this.validateOfferCreate(data);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    return {
      id: crypto.randomUUID(),
      productId: data.productId,
      productMasterId: data.productMasterId,
      productName: data.productName || '',
      productType: data.productType || ProductType.GENERAL,
      supplierPrice: data.supplierPrice,
      suggestedRetailPrice: data.suggestedRetailPrice,
      stockQuantity: data.stockQuantity,
      minOrderQuantity: data.minOrderQuantity || 1,
      maxOrderQuantity: data.maxOrderQuantity,
      status: data.stockQuantity > 0 ? OfferStatus.ACTIVE : OfferStatus.OUT_OF_STOCK,
      isActive: data.stockQuantity > 0,
      activeSellers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update an offer (PHARMACEUTICAL 타입 변경 차단)
   */
  async updateOffer(
    offerId: string,
    data: Partial<{
      productId: string;
      productMasterId: string;
      productName: string;
      productType: ProductType;
      supplierPrice: number;
      suggestedRetailPrice: number;
      stockQuantity: number;
      minOrderQuantity: number;
      maxOrderQuantity: number;
      status: OfferStatus;
      isActive: boolean;
    }>
  ): Promise<SupplierOffer> {
    if (data.productType === ProductType.PHARMACEUTICAL) {
      throw new Error('의약품 타입으로 변경할 수 없습니다.');
    }

    // 재고가 0이면 자동으로 OUT_OF_STOCK 상태로 변경
    let status = data.status;
    let isActive = data.isActive;
    if (data.stockQuantity !== undefined && data.stockQuantity <= 0) {
      status = OfferStatus.OUT_OF_STOCK;
      isActive = false;
    }

    return {
      id: offerId,
      productId: data.productId || '',
      productMasterId: data.productMasterId,
      productName: data.productName || '',
      productType: data.productType || ProductType.GENERAL,
      supplierPrice: data.supplierPrice || 0,
      suggestedRetailPrice: data.suggestedRetailPrice,
      stockQuantity: data.stockQuantity || 0,
      minOrderQuantity: data.minOrderQuantity || 1,
      maxOrderQuantity: data.maxOrderQuantity,
      status: status || OfferStatus.ACTIVE,
      isActive: isActive ?? true,
      activeSellers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Offer 상태 변경
   */
  async updateOfferStatus(offerId: string, status: OfferStatus): Promise<void> {
    // 상태 변경 로직 (실제 구현에서는 DB 업데이트)
    console.log(`[OfferOpsService] Offer ${offerId} status changed to ${status}`);
  }

  /**
   * Offer 비활성화
   */
  async deactivateOffer(offerId: string): Promise<void> {
    await this.updateOfferStatus(offerId, OfferStatus.INACTIVE);
  }
}
