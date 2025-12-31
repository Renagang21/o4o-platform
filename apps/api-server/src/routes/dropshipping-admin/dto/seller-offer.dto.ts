/**
 * Seller Offer DTOs
 *
 * DS-3: Admin API DTOs for SellerOffer
 * @see docs/architecture/dropshipping-domain-rules.md
 */

/**
 * Status values as defined in DS-1
 */
export type SellerOfferStatus = 'draft' | 'pending' | 'active' | 'paused' | 'retired';

/**
 * Create SellerOffer DTO
 */
export interface CreateSellerOfferDto {
  seller_id: string;
  supplier_catalog_item_id: string;
  offer_name?: string;
  offer_description?: string;
  offer_price: number;
  compare_price?: number;
  cost_price: number;
  currency?: string;
  seller_sku?: string;
  seller_tags?: string[];
  seller_images?: {
    url: string;
    alt?: string;
    is_primary?: boolean;
  }[];
  discount_rate?: number;
  sale_start_date?: Date;
  sale_end_date?: Date;
  is_featured?: boolean;
  featured_until?: Date;
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update SellerOffer DTO
 */
export interface UpdateSellerOfferDto {
  offer_name?: string;
  offer_description?: string;
  offer_price?: number;
  compare_price?: number;
  cost_price?: number;
  currency?: string;
  seller_sku?: string;
  seller_tags?: string[];
  seller_images?: {
    url: string;
    alt?: string;
    is_primary?: boolean;
  }[];
  discount_rate?: number;
  sale_start_date?: Date;
  sale_end_date?: Date;
  is_featured?: boolean;
  featured_until?: Date;
  is_active?: boolean;
  is_visible?: boolean;
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Status Change DTO
 */
export interface ChangeSellerOfferStatusDto {
  status: SellerOfferStatus;
  reason?: string;
}

/**
 * List Query DTO
 */
export interface ListSellerOffersQueryDto {
  seller_id?: string;
  supplier_catalog_item_id?: string;
  status?: SellerOfferStatus;
  is_active?: boolean;
  is_visible?: boolean;
  is_featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Response DTO
 */
export interface SellerOfferResponseDto {
  id: string;
  seller_id: string;
  supplier_catalog_item_id: string;
  ecommerce_order_id?: string;
  offer_name?: string;
  offer_description?: string;
  offer_price: number;
  compare_price?: number;
  cost_price: number;
  profit_amount: number;
  profit_margin: number;
  currency: string;
  status: SellerOfferStatus;
  is_active: boolean;
  is_visible: boolean;
  seller_sku?: string;
  seller_tags?: string[];
  seller_images?: Record<string, unknown>[];
  discount_rate?: number;
  sale_start_date?: Date;
  sale_end_date?: Date;
  is_featured: boolean;
  featured_until?: Date;
  view_count: number;
  cart_add_count: number;
  total_sold: number;
  total_revenue: number;
  conversion_rate: number;
  average_rating: number;
  review_count: number;
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
  activated_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Paginated Response DTO
 */
export interface PaginatedSellerOffersDto {
  items: SellerOfferResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
