/**
 * Cosmetics DTO Index
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * DTOs follow OpenAPI spec exactly
 */

import { CosmeticsProductStatus, CosmeticsCurrency, CosmeticsProductImage, CosmeticsProductVariant } from '../entities/index.js';

// ============================================================================
// Request DTOs
// ============================================================================

export interface CreateProductRequestDto {
  name: string;
  brand_id: string;
  line_id?: string;
  description?: string;
  ingredients?: string[];
  price: {
    base: number;
    sale?: number | null;
  };
  status?: CosmeticsProductStatus;
}

export interface UpdateProductRequestDto {
  name?: string;
  brand_id?: string;
  line_id?: string;
  description?: string;
  ingredients?: string[];
}

export interface UpdateStatusRequestDto {
  status: CosmeticsProductStatus;
  reason?: string;
}

export interface UpdatePricePolicyRequestDto {
  base_price: number;
  sale_price?: number | null;
  sale_start_at?: string | null;
  sale_end_at?: string | null;
}

export interface ListProductsQueryDto {
  page?: number;
  limit?: number;
  brand_id?: string;
  line_id?: string;
  status?: CosmeticsProductStatus;
  sort?: 'created_at' | 'price' | 'name';
  order?: 'asc' | 'desc';
}

export interface SearchProductsQueryDto {
  q: string;
  page?: number;
  limit?: number;
}

export interface ListBrandsQueryDto {
  is_active?: boolean;
}

export interface ListLinesQueryDto {
  brand_id?: string;
}

export interface ListLogsQueryDto {
  product_id?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface BrandSummaryDto {
  id: string;
  name: string;
  slug: string;
}

export interface BrandDetailDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  lines?: LineSummaryDto[];
  product_count?: number;
}

export interface LineSummaryDto {
  id: string;
  name: string;
  product_count?: number;
}

export interface PriceDto {
  base: number;
  sale?: number | null;
  currency: CosmeticsCurrency;
}

export interface ProductSummaryDto {
  id: string;
  name: string;
  brand: BrandSummaryDto;
  line?: LineSummaryDto | null;
  description?: string | null;
  status: CosmeticsProductStatus;
  price: PriceDto;
  images?: CosmeticsProductImage[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProductDetailDto {
  id: string;
  name: string;
  brand: BrandDetailDto;
  line?: LineSummaryDto | null;
  description?: string | null;
  ingredients?: string[] | null;
  status: CosmeticsProductStatus;
  price: PriceDto;
  variants?: CosmeticsProductVariant[] | null;
  images?: CosmeticsProductImage[] | null;
  created_at: string;
  updated_at: string;
}

export interface StatusChangeResponseDto {
  data: {
    id: string;
    status: CosmeticsProductStatus;
    previous_status: CosmeticsProductStatus;
    changed_at: string;
    changed_by?: string;
  };
}

export interface PricePolicyResponseDto {
  data: {
    product_id: string;
    base_price: number;
    sale_price?: number | null;
    sale_active: boolean;
    sale_start_at?: string | null;
    sale_end_at?: string | null;
    updated_at: string;
  };
}

export interface AuditLogEntryDto {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  entity_type: string;
  entity_id: string;
  changes?: Record<string, any> | null;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;
}

// ============================================================================
// List Response DTOs
// ============================================================================

export interface ProductListResponseDto {
  data: ProductSummaryDto[];
  meta: PaginationMetaDto;
}

export interface ProductDetailResponseDto {
  data: ProductDetailDto;
}

export interface BrandListResponseDto {
  data: BrandDetailDto[];
}

export interface BrandDetailResponseDto {
  data: BrandDetailDto;
}

export interface LineListResponseDto {
  data: LineSummaryDto[];
}

export interface AuditLogListResponseDto {
  data: AuditLogEntryDto[];
  meta: PaginationMetaDto;
}
