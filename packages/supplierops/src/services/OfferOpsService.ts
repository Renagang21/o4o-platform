/**
 * Offer Operations Service
 *
 * Manages SupplierProductOffer operations
 *
 * Phase 2 업데이트:
 * - supplierPrice 통일 (price → supplierPrice)
 * - stockQuantity 통일 (stock → stockQuantity)
 * - productType 지원
 */

export interface SupplierOffer {
  id: string;
  productId: string;
  productName: string;
  productType?: string;
  supplierPrice: number; // Phase 2: price → supplierPrice
  stockQuantity: number; // Phase 2: stock → stockQuantity
  minOrderQuantity: number;
  isActive: boolean;
  activeSellers: number;
  createdAt: Date;
  updatedAt: Date;
}

export class OfferOpsService {
  /**
   * Get all offers for a supplier
   */
  async getOffers(supplierId: string): Promise<SupplierOffer[]> {
    // Demo data (Phase 2 스펙에 맞게 업데이트)
    return [
      {
        id: '1',
        productId: '1',
        productName: '프리미엄 에센스 세럼',
        productType: 'cosmetics',
        supplierPrice: 32000,
        stockQuantity: 150,
        minOrderQuantity: 1,
        isActive: true,
        activeSellers: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        productId: '2',
        productName: '수분 크림',
        productType: 'cosmetics',
        supplierPrice: 25000,
        stockQuantity: 80,
        minOrderQuantity: 1,
        isActive: true,
        activeSellers: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        productId: '3',
        productName: '클렌징 폼',
        productType: 'cosmetics',
        supplierPrice: 12000,
        stockQuantity: 200,
        minOrderQuantity: 2,
        isActive: false,
        activeSellers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * Create a new offer
   */
  async createOffer(
    supplierId: string,
    data: {
      productId: string;
      productName?: string;
      productType?: string;
      supplierPrice: number;
      stockQuantity: number;
      minOrderQuantity?: number;
    }
  ): Promise<SupplierOffer> {
    return {
      id: crypto.randomUUID(),
      productId: data.productId,
      productName: data.productName || '',
      productType: data.productType || 'general',
      supplierPrice: data.supplierPrice,
      stockQuantity: data.stockQuantity,
      minOrderQuantity: data.minOrderQuantity || 1,
      isActive: true,
      activeSellers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update an offer
   */
  async updateOffer(
    offerId: string,
    data: Partial<{
      productId: string;
      productName: string;
      productType: string;
      supplierPrice: number;
      stockQuantity: number;
      minOrderQuantity: number;
      isActive: boolean;
      activeSellers: number;
    }>
  ): Promise<SupplierOffer> {
    return {
      id: offerId,
      productId: data.productId || '',
      productName: data.productName || '',
      productType: data.productType || 'general',
      supplierPrice: data.supplierPrice || 0,
      stockQuantity: data.stockQuantity || 0,
      minOrderQuantity: data.minOrderQuantity || 1,
      isActive: data.isActive ?? true,
      activeSellers: data.activeSellers || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
