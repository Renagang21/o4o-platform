/**
 * ProductMaster Service
 *
 * Manages ProductMaster CRUD operations for Supplier
 *
 * Phase 2 업데이트:
 * - productType 필드 추가
 */

export interface ProductMaster {
  id: string;
  name: string;
  sku: string;
  description: string;
  basePrice: number;
  category: string;
  productType: string; // Phase 2: 추가
  attributes: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductMasterService {
  /**
   * Get all products for a supplier
   */
  async getProducts(supplierId: string): Promise<ProductMaster[]> {
    // Demo data (Phase 2 스펙에 맞게 업데이트)
    return [
      {
        id: '1',
        name: '프리미엄 에센스 세럼',
        sku: 'SKU-001',
        description: '고농축 에센스 세럼',
        basePrice: 35000,
        category: 'skincare',
        productType: 'cosmetics',
        attributes: { volume: '30ml', skinType: 'all' },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: '수분 크림',
        sku: 'SKU-002',
        description: '24시간 보습 크림',
        basePrice: 28000,
        category: 'skincare',
        productType: 'cosmetics',
        attributes: { volume: '50ml', skinType: 'dry' },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: '클렌징 폼',
        sku: 'SKU-003',
        description: '저자극 클렌징 폼',
        basePrice: 15000,
        category: 'cleansing',
        productType: 'cosmetics',
        attributes: { volume: '150ml', skinType: 'sensitive' },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * Create a new product
   */
  async createProduct(
    supplierId: string,
    data: Partial<ProductMaster>
  ): Promise<ProductMaster> {
    return {
      id: crypto.randomUUID(),
      name: data.name || '',
      sku: data.sku || '',
      description: data.description || '',
      basePrice: data.basePrice || 0,
      category: data.category || '',
      productType: data.productType || 'general',
      attributes: data.attributes || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update a product
   */
  async updateProduct(
    productId: string,
    data: Partial<ProductMaster>
  ): Promise<ProductMaster> {
    return {
      id: productId,
      name: data.name || '',
      sku: data.sku || '',
      description: data.description || '',
      basePrice: data.basePrice || 0,
      category: data.category || '',
      productType: data.productType || 'general',
      attributes: data.attributes || {},
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
