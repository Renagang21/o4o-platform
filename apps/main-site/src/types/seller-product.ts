/**
 * Seller Product Types
 * Type definitions for seller product management
 */

/**
 * Product status for seller
 */
export type SellerProductStatus = 'active' | 'inactive';

/**
 * Seller Product (main entity)
 */
export interface SellerProduct {
  id: string;
  seller_id: string;
  supplier_product_id: string;
  title: string;
  sku: string;
  sale_price: number;
  margin_amount: number;
  margin_rate?: number;
  is_published: boolean;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Seller Product List Item (for table display)
 */
export interface SellerProductListItem {
  id: string;
  title: string;
  sku: string;
  thumbnail_url: string | null;
  sale_price: number;
  margin_amount: number;
  status: SellerProductStatus;
  created_at: string;
}

/**
 * Seller Product Detail (full information)
 */
export interface SellerProductDetail extends SellerProduct {
  supplier_product_title?: string;
  supply_price?: number;
}

/**
 * Request to create seller product
 */
export interface SellerProductCreateRequest {
  supplier_product_id: string;
  title?: string;
  sale_price: number;
  margin_amount?: number;
  margin_rate?: number;
  is_published?: boolean;
}

/**
 * Request to update seller product
 */
export interface SellerProductUpdateRequest {
  title?: string;
  sale_price?: number;
  margin_amount?: number;
  margin_rate?: number;
  is_published?: boolean;
}

/**
 * Query parameters for fetching seller products
 */
export interface GetSellerProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: SellerProductStatus | 'all';
  category?: string;
  sort_by?: 'created_at' | 'title' | 'price';
  sort_order?: 'asc' | 'desc';
}

/**
 * Pagination metadata
 */
export interface ProductPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * API Response types
 */
export interface GetSellerProductsResponse {
  success: boolean;
  data: {
    products: SellerProductListItem[];
    pagination: ProductPagination;
  };
}

export interface GetSellerProductDetailResponse {
  success: boolean;
  data: SellerProductDetail;
}

export interface CreateSellerProductResponse {
  success: boolean;
  data: SellerProduct;
  message?: string;
}

export interface UpdateSellerProductResponse {
  success: boolean;
  data: SellerProduct;
  message?: string;
}

export interface DeleteSellerProductResponse {
  success: boolean;
  message?: string;
}

/**
 * Supplier Product (for selection during import)
 */
export interface SupplierProductForSelection {
  id: string;
  title: string;
  sku: string;
  supply_price: number;
  thumbnail_url?: string;
  category?: string;
}

/**
 * API Response for supplier products (for import)
 */
export interface GetSupplierProductsForSelectionResponse {
  success: boolean;
  data: {
    products: SupplierProductForSelection[];
    pagination: ProductPagination;
  };
}
