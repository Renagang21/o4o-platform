/**
 * Supplier Product Types
 * Type definitions for supplier product management
 */

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
