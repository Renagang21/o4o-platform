/**
 * Product Type Definitions for Cosmetics Extension
 *
 * Phase 9-C: Core v2 정렬
 * - ProductType enum 사용
 * - productType 필드 추가
 *
 * This file defines the Product interface used by cosmetics services.
 * It contains only the fields needed by the cosmetics extension,
 * avoiding dependency on api-server entities.
 */

import { ProductType } from '@o4o/dropshipping-core';

export interface ProductImages {
  main: string;
  gallery?: string[];
  thumbnails?: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
  slug?: string;
}

/**
 * Product interface for cosmetics services
 *
 * Phase 9-C: productType 필드 추가 (Core enum 사용)
 *
 * This is a subset of the full Product entity from api-server,
 * containing only the fields used by cosmetics extension.
 */
export interface Product {
  id: string;
  name: string;
  brand?: string;
  recommendedPrice: number;
  description?: string;
  shortDescription?: string;
  images?: ProductImages;
  category?: ProductCategory;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;

  /**
   * 산업별 상품 타입 (Core v2)
   * COSMETICS 타입 상품만 화장품 Extension에서 처리
   */
  productType?: ProductType;

  // Helper properties that might exist
  [key: string]: any;
}

/**
 * Type guard to check if a product is a cosmetics product
 * Phase 9-C: productType 기반 체크 우선, fallback으로 cosmetics_metadata 체크
 */
export function isCosmeticsProduct(product: Product): boolean {
  // Primary check: productType = COSMETICS
  if (product.productType === ProductType.COSMETICS) {
    return true;
  }
  // Fallback for legacy data: cosmetics_metadata exists
  return !!product.metadata?.cosmetics_metadata;
}

/**
 * Type guard to check if a product has cosmetics metadata
 * @deprecated Use isCosmeticsProduct instead
 */
export function hasCosmeticsMetadata(product: Product): boolean {
  return !!product.metadata?.cosmetics_metadata;
}

/**
 * Get cosmetics metadata from product
 */
export function getCosmeticsMetadata(product: Product): any {
  return product.metadata?.cosmetics_metadata || {};
}

// Re-export ProductType for convenience
export { ProductType };
