/**
 * Glycopharm DTOs
 *
 * Phase B-1: Glycopharm API Implementation
 * Data Transfer Objects for API requests/responses
 */

import { GlycopharmProductStatus, GlycopharmProductCategory } from '../entities/glycopharm-product.entity.js';

export type GlycopharmPharmacyStatus = 'active' | 'inactive' | 'suspended';

// ============================================================================
// Error Response
// ============================================================================

export interface ErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============================================================================
// Pharmacy DTOs
// ============================================================================

export interface ListPharmaciesQueryDto {
  status?: GlycopharmPharmacyStatus;
  page?: number;
  limit?: number;
}

export interface CreatePharmacyRequestDto {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  owner_name?: string;
  business_number?: string;
  sort_order?: number;
}

export interface UpdatePharmacyRequestDto {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  owner_name?: string;
  business_number?: string;
  sort_order?: number;
}

export interface UpdatePharmacyStatusRequestDto {
  status: GlycopharmPharmacyStatus;
}

export interface PharmacyResponseDto {
  id: string;
  name: string;
  code: string;
  slug?: string;
  address?: string;
  phone?: string;
  email?: string;
  owner_name?: string;
  business_number?: string;
  description?: string;
  logo?: string;
  hero_image?: string;
  status: GlycopharmPharmacyStatus;
  sort_order: number;
  product_count?: number;
  storefront_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Product DTOs
// ============================================================================

export interface ListProductsQueryDto {
  page?: number;
  limit?: number;
  pharmacy_id?: string;
  category?: GlycopharmProductCategory;
  status?: GlycopharmProductStatus;
  is_featured?: boolean;
  is_partner_recruiting?: boolean;
  sort?: 'created_at' | 'updated_at' | 'price' | 'name';
  order?: 'asc' | 'desc';
  q?: string;
}

export interface CreateProductRequestDto {
  pharmacy_id?: string;
  name: string;
  sku: string;
  category?: GlycopharmProductCategory;
  description?: string;
  price: number;
  sale_price?: number;
  stock_quantity?: number;
  manufacturer?: string;
  status?: GlycopharmProductStatus;
  is_featured?: boolean;
  sort_order?: number;
}

export interface UpdateProductRequestDto {
  pharmacy_id?: string;
  name?: string;
  sku?: string;
  category?: GlycopharmProductCategory;
  description?: string;
  price?: number;
  sale_price?: number;
  stock_quantity?: number;
  manufacturer?: string;
  is_featured?: boolean;
  sort_order?: number;
}

export interface UpdateProductStatusRequestDto {
  status: GlycopharmProductStatus;
  reason?: string;
}

export interface ProductResponseDto {
  id: string;
  pharmacy_id?: string;
  pharmacy?: PharmacyResponseDto;
  name: string;
  sku: string;
  category: GlycopharmProductCategory;
  description?: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  manufacturer?: string;
  status: GlycopharmProductStatus;
  is_featured: boolean;
  is_partner_recruiting: boolean;
  sort_order: number;
  created_by_user_id?: string;
  created_by_user_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductListItemDto {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  name: string;
  sku: string;
  category: GlycopharmProductCategory;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  status: GlycopharmProductStatus;
  is_featured: boolean;
  is_partner_recruiting: boolean;
  created_by_user_name?: string;
  created_at: string;
}

// ============================================================================
// Log DTOs
// ============================================================================

export interface ListLogsQueryDto {
  product_id?: string;
  page?: number;
  limit?: number;
}

export interface ProductLogResponseDto {
  id: string;
  product_id: string;
  action: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  reason?: string;
  changed_by_user_name?: string;
  created_at: string;
}
