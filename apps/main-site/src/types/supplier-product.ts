/**
 * Supplier Product Types
 * Type definitions for supplier product management
 */

import { AuthorizationStatus } from './dropshipping-authorization';

/**
 * Product status enum
 */
export enum SupplierProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

/**
 * Product list item (for table display)
 */
export interface SupplierProductListItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: SupplierProductStatus;
  createdAt: string;
  updatedAt: string;
  // Phase 3-6: 판매자 모집 관련 필드
  is_open_for_applications?: boolean;  // 기본값: true (신규 판매자 신청 허용)
  max_approved_sellers?: number | null; // 승인할 판매자 수 상한 (null이면 제한 없음)
  approved_seller_count?: number;       // 현재 승인된 판매자 수
}

/**
 * Product detail (full product information)
 */
export interface SupplierProductDetail {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  status: SupplierProductStatus;
  images: string[];
  tags: string[];
  specifications: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  // Phase 3-6: 판매자 모집 관련 필드
  is_open_for_applications?: boolean;  // 기본값: true (신규 판매자 신청 허용)
  max_approved_sellers?: number | null; // 승인할 판매자 수 상한 (null이면 제한 없음)
  approved_seller_count?: number;       // 현재 승인된 판매자 수
}

/**
 * Product form values (for create/edit)
 */
export interface SupplierProductFormValues {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  status: SupplierProductStatus;
  images?: string[];
  tags?: string[];
  specifications?: Record<string, string>;
}

/**
 * Product filter parameters
 */
export interface SupplierProductFilters {
  search?: string;
  category?: string;
  status?: SupplierProductStatus;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

/**
 * Product sort parameters
 */
export interface SupplierProductSort {
  field: 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt';
  order: 'asc' | 'desc';
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API response types
 */
export type SupplierProductListResponse = PaginatedResponse<SupplierProductListItem>;

export interface SupplierProductDetailResponse {
  data: SupplierProductDetail;
}

export interface SupplierProductCreateResponse {
  data: SupplierProductDetail;
  message: string;
}

export interface SupplierProductUpdateResponse {
  data: SupplierProductDetail;
  message: string;
}

export interface SupplierProductDeleteResponse {
  message: string;
}

/**
 * Form validation errors
 */
export interface SupplierProductFormErrors {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  costPrice?: string;
  stock?: string;
  minStock?: string;
  unit?: string;
  status?: string;
}

/**
 * Supplier Product For Selection (Seller 측에서 Import 대상 선택 시)
 * Phase 3-6: Authorization 정보 포함
 */
export interface SupplierProductForSelection {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;           // 공급가
  supply_price: number;    // 공급가 (alias)
  stock: number;
  status: SupplierProductStatus;
  images: string[];
  // Authorization 정보
  authorization_status?: AuthorizationStatus;
  authorization_id?: string;
  authorization_rejection_reason?: string;
  // 판매자 모집 관련 필드
  is_open_for_applications?: boolean;  // 기본값: true (신규 판매자 신청 허용)
  max_approved_sellers?: number | null; // 승인할 판매자 수 상한 (null이면 제한 없음)
  approved_seller_count?: number;       // 현재 승인된 판매자 수
}
