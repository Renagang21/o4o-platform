/**
 * Neture Web Types
 *
 * Phase D-2: Neture Web Server (B2C) 구축
 */

// ============================================================================
// Product Types
// ============================================================================

export type ProductStatus = 'draft' | 'visible' | 'hidden' | 'sold_out';
export type ProductCategory = 'healthcare' | 'beauty' | 'food' | 'lifestyle' | 'other';

export interface ProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}

export interface Product {
  id: string;
  partner_id: string | null;
  name: string;
  subtitle: string | null;
  description: string | null;
  category: ProductCategory;
  status: ProductStatus;
  base_price: number;
  sale_price: number | null;
  currency: string;
  stock: number;
  sku: string | null;
  images: ProductImage[] | null;
  tags: string[] | null;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  partner?: Partner;
}

// ============================================================================
// Partner Types
// ============================================================================

export type PartnerType = 'seller' | 'supplier' | 'partner';
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'inactive';

export interface PartnerContact {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
}

export interface Partner {
  id: string;
  name: string;
  business_name: string | null;
  business_number: string | null;
  type: PartnerType;
  status: PartnerStatus;
  description: string | null;
  logo: string | null;
  website: string | null;
  contact: PartnerContact | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SingleResponse<T> {
  data: T;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
