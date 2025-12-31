/**
 * Supplier Catalog Item DTOs
 *
 * DS-3: Admin API DTOs for SupplierCatalogItem
 * @see docs/architecture/dropshipping-domain-rules.md
 */

/**
 * Status values as defined in DS-1
 */
export type SupplierCatalogItemStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'retired';

/**
 * Create SupplierCatalogItem DTO
 */
export interface CreateSupplierCatalogItemDto {
  supplier_id: string;
  name: string;
  description?: string;
  short_description?: string;
  sku?: string;
  barcode?: string;
  base_price: number;
  currency?: string;
  weight?: number;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    unit?: string;
  };
  category?: string;
  tags?: string[];
  images?: {
    url: string;
    alt?: string;
    is_primary?: boolean;
  }[];
  thumbnail_image?: string;
  specifications?: Record<string, unknown>;
  external_product_ref?: string;
  minimum_order_quantity?: number;
  maximum_order_quantity?: number;
  lead_time_days?: number;
  inventory_count?: number;
  low_stock_threshold?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Update SupplierCatalogItem DTO
 */
export interface UpdateSupplierCatalogItemDto {
  name?: string;
  description?: string;
  short_description?: string;
  sku?: string;
  barcode?: string;
  base_price?: number;
  currency?: string;
  weight?: number;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    unit?: string;
  };
  category?: string;
  tags?: string[];
  images?: {
    url: string;
    alt?: string;
    is_primary?: boolean;
  }[];
  thumbnail_image?: string;
  specifications?: Record<string, unknown>;
  external_product_ref?: string;
  minimum_order_quantity?: number;
  maximum_order_quantity?: number;
  lead_time_days?: number;
  inventory_count?: number;
  low_stock_threshold?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Status Change DTO
 */
export interface ChangeSupplierCatalogItemStatusDto {
  status: SupplierCatalogItemStatus;
  reason?: string;
}

/**
 * List Query DTO
 */
export interface ListSupplierCatalogItemsQueryDto {
  supplier_id?: string;
  status?: SupplierCatalogItemStatus;
  category?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Response DTO
 */
export interface SupplierCatalogItemResponseDto {
  id: string;
  supplier_id: string;
  name: string;
  description?: string;
  short_description?: string;
  sku?: string;
  barcode?: string;
  base_price: number;
  currency: string;
  weight?: number;
  dimensions?: Record<string, unknown>;
  category?: string;
  tags?: string[];
  images?: Record<string, unknown>[];
  thumbnail_image?: string;
  specifications?: Record<string, unknown>;
  external_product_ref?: string;
  status: SupplierCatalogItemStatus;
  is_active: boolean;
  minimum_order_quantity: number;
  maximum_order_quantity?: number;
  lead_time_days: number;
  inventory_count: number;
  low_stock_threshold?: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Paginated Response DTO
 */
export interface PaginatedSupplierCatalogItemsDto {
  items: SupplierCatalogItemResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
