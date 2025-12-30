/**
 * Neture DTOs
 *
 * Phase D-1: Neture API Server 골격 구축
 */

import {
  NetureProductStatus,
  NetureProductCategory,
  NetureCurrency,
  NetureProductImage,
} from '../entities/neture-product.entity.js';
import {
  NeturePartnerType,
  NeturePartnerStatus,
  NeturePartnerContact,
  NeturePartnerAddress,
} from '../entities/neture-partner.entity.js';
import { NetureLogAction } from '../entities/neture-product-log.entity.js';

// ============================================================================
// Common DTOs
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// Product DTOs
// ============================================================================

export interface ProductDto {
  id: string;
  partner_id: string | null;
  name: string;
  subtitle: string | null;
  description: string | null;
  category: NetureProductCategory;
  status: NetureProductStatus;
  base_price: number;
  sale_price: number | null;
  currency: NetureCurrency;
  stock: number;
  sku: string | null;
  images: NetureProductImage[] | null;
  tags: string[] | null;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  partner?: PartnerDto;
}

export interface ListProductsQueryDto {
  page?: number;
  limit?: number;
  partner_id?: string;
  category?: NetureProductCategory;
  status?: NetureProductStatus;
  is_featured?: boolean;
  sort?: 'created_at' | 'price' | 'name' | 'view_count';
  order?: 'asc' | 'desc';
}

export interface SearchProductsQueryDto {
  q: string;
  page?: number;
  limit?: number;
}

export interface ListProductsResponseDto {
  data: ProductDto[];
  meta: PaginationMeta;
}

export interface CreateProductRequestDto {
  partner_id?: string;
  name: string;
  subtitle?: string;
  description?: string;
  category?: NetureProductCategory;
  base_price: number;
  sale_price?: number;
  currency?: NetureCurrency;
  stock?: number;
  sku?: string;
  images?: NetureProductImage[];
  tags?: string[];
  is_featured?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateProductRequestDto {
  partner_id?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  category?: NetureProductCategory;
  base_price?: number;
  sale_price?: number | null;
  currency?: NetureCurrency;
  stock?: number;
  sku?: string;
  images?: NetureProductImage[];
  tags?: string[];
  is_featured?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateProductStatusRequestDto {
  status: NetureProductStatus;
}

// ============================================================================
// Partner DTOs
// ============================================================================

export interface PartnerDto {
  id: string;
  name: string;
  business_name: string | null;
  business_number: string | null;
  type: NeturePartnerType;
  status: NeturePartnerStatus;
  description: string | null;
  logo: string | null;
  website: string | null;
  contact: NeturePartnerContact | null;
  address: NeturePartnerAddress | null;
  created_at: string;
  updated_at: string;
}

export interface ListPartnersQueryDto {
  page?: number;
  limit?: number;
  type?: NeturePartnerType;
  status?: NeturePartnerStatus;
  sort?: 'created_at' | 'name';
  order?: 'asc' | 'desc';
}

export interface ListPartnersResponseDto {
  data: PartnerDto[];
  meta: PaginationMeta;
}

export interface CreatePartnerRequestDto {
  name: string;
  business_name?: string;
  business_number?: string;
  type?: NeturePartnerType;
  description?: string;
  logo?: string;
  website?: string;
  contact?: NeturePartnerContact;
  address?: NeturePartnerAddress;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePartnerRequestDto {
  name?: string;
  business_name?: string;
  business_number?: string;
  type?: NeturePartnerType;
  description?: string;
  logo?: string;
  website?: string;
  contact?: NeturePartnerContact;
  address?: NeturePartnerAddress;
  metadata?: Record<string, any>;
}

export interface UpdatePartnerStatusRequestDto {
  status: NeturePartnerStatus;
}

// ============================================================================
// Log DTOs
// ============================================================================

export interface ProductLogDto {
  id: string;
  product_id: string;
  action: NetureLogAction;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  note: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface ListLogsQueryDto {
  page?: number;
  limit?: number;
  product_id?: string;
  action?: NetureLogAction;
}

export interface ListLogsResponseDto {
  data: ProductLogDto[];
  meta: PaginationMeta;
}
