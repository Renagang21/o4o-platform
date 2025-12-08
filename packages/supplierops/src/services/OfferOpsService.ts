/**
 * Offer Operations Service
 *
 * Manages SupplierProductOffer operations
 */

export interface SupplierOffer {
  id: string;
  productId: string;
  productName: string;
  price: number;
  stock: number;
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
    // Demo data
    return [
      {
        id: '1',
        productId: '1',
        productName: '프리미엄 에센스 세럼',
        price: 32000,
        stock: 150,
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
        price: 25000,
        stock: 80,
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
        price: 12000,
        stock: 200,
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
    data: Partial<SupplierOffer>
  ): Promise<SupplierOffer> {
    return {
      id: crypto.randomUUID(),
      productId: data.productId || '',
      productName: data.productName || '',
      price: data.price || 0,
      stock: data.stock || 0,
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
    data: Partial<SupplierOffer>
  ): Promise<SupplierOffer> {
    return {
      id: offerId,
      productId: data.productId || '',
      productName: data.productName || '',
      price: data.price || 0,
      stock: data.stock || 0,
      minOrderQuantity: data.minOrderQuantity || 1,
      isActive: data.isActive ?? true,
      activeSellers: data.activeSellers || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
