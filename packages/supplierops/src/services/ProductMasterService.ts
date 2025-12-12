/**
 * ProductMaster Service
 *
 * Phase 9-B: Core 정렬 업데이트
 * - Core ProductMaster Entity와 정렬
 * - productType 기반 필터링 지원
 * - PHARMACEUTICAL 제품 생성 제한
 */

import { ProductType, ProductStatus } from '@o4o/dropshipping-core';

export interface ProductMaster {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  brand?: string;
  category?: string;
  productType: ProductType;
  status: ProductStatus;
  images?: string[];
  attributes?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFilterOptions {
  productType?: ProductType;
  status?: ProductStatus;
  category?: string;
  page?: number;
  limit?: number;
}

export class ProductMasterService {
  /**
   * 제품 생성 전 검증 - PHARMACEUTICAL 제한
   */
  validateProductCreate(data: Partial<ProductMaster>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('상품명은 필수입니다.');
    }

    if (data.productType === ProductType.PHARMACEUTICAL) {
      errors.push('의약품은 SupplierOps에서 직접 등록할 수 없습니다. pharmaceutical-core Extension을 사용하세요.');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Supplier의 제품 목록 조회 (productType 필터링 지원)
   */
  async getProducts(supplierId: string, options?: ProductFilterOptions): Promise<ProductMaster[]> {
    // Demo data (Core 스펙에 맞게 업데이트)
    const demoProducts: ProductMaster[] = [
      {
        id: '1',
        name: '프리미엄 에센스 세럼',
        sku: 'SKU-001',
        description: '고농축 에센스 세럼',
        brand: '뷰티코리아',
        category: 'skincare',
        productType: ProductType.COSMETICS,
        status: ProductStatus.ACTIVE,
        attributes: { volume: '30ml', skinType: 'all' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: '수분 크림',
        sku: 'SKU-002',
        description: '24시간 보습 크림',
        brand: '뷰티코리아',
        category: 'skincare',
        productType: ProductType.COSMETICS,
        status: ProductStatus.ACTIVE,
        attributes: { volume: '50ml', skinType: 'dry' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: '클렌징 폼',
        sku: 'SKU-003',
        description: '저자극 클렌징 폼',
        brand: '뷰티코리아',
        category: 'cleansing',
        productType: ProductType.COSMETICS,
        status: ProductStatus.ACTIVE,
        attributes: { volume: '150ml', skinType: 'sensitive' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // productType 필터링
    let filtered = demoProducts;
    if (options?.productType) {
      filtered = filtered.filter(p => p.productType === options.productType);
    }
    if (options?.status) {
      filtered = filtered.filter(p => p.status === options.status);
    }
    if (options?.category) {
      filtered = filtered.filter(p => p.category === options.category);
    }

    return filtered;
  }

  /**
   * 제품 생성 (PHARMACEUTICAL 차단)
   */
  async createProduct(supplierId: string, data: Partial<ProductMaster>): Promise<ProductMaster> {
    const validation = this.validateProductCreate(data);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    return {
      id: crypto.randomUUID(),
      name: data.name || '',
      sku: data.sku,
      barcode: data.barcode,
      description: data.description,
      brand: data.brand,
      category: data.category,
      productType: data.productType || ProductType.GENERAL,
      status: ProductStatus.DRAFT,
      images: data.images,
      attributes: data.attributes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 제품 수정 (PHARMACEUTICAL 타입 변경 차단)
   */
  async updateProduct(productId: string, data: Partial<ProductMaster>): Promise<ProductMaster> {
    if (data.productType === ProductType.PHARMACEUTICAL) {
      throw new Error('의약품 타입으로 변경할 수 없습니다.');
    }

    return {
      id: productId,
      name: data.name || '',
      sku: data.sku,
      barcode: data.barcode,
      description: data.description,
      brand: data.brand,
      category: data.category,
      productType: data.productType || ProductType.GENERAL,
      status: data.status || ProductStatus.ACTIVE,
      images: data.images,
      attributes: data.attributes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
