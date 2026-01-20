/**
 * Cosmetics Extension - DTOs
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * Request/Response DTOs for Cosmetics Extension API
 */

import type {
  CosmeticsPresetType,
  CosmeticsVisualConfig,
  CosmeticsContentType,
  CosmeticsContentStatus,
  CosmeticsContentScope,
  CosmeticsMediaAssets,
  CosmeticsTrendType,
} from '../entities/index.js';

// ============================================================================
// BRAND DTOs
// ============================================================================

export interface CreateBrandDto {
  name: string;
  code: string;
  description?: string;
  logoUrl?: string;
  colorScheme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  category?: string;
  displayOrder?: number;
}

export interface UpdateBrandDto {
  name?: string;
  description?: string;
  logoUrl?: string;
  colorScheme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  category?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface BrandResponseDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  logoUrl: string | null;
  colorScheme: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  category: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONTENT PRESET DTOs
// ============================================================================

export interface CreateContentPresetDto {
  name: string;
  type: CosmeticsPresetType;
  brandId?: string;
  coreTemplateId?: string;
  visualConfig: CosmeticsVisualConfig;
  thumbnailUrl?: string;
}

export interface UpdateContentPresetDto {
  name?: string;
  visualConfig?: Partial<CosmeticsVisualConfig>;
  thumbnailUrl?: string;
  isActive?: boolean;
}

export interface ContentPresetResponseDto {
  id: string;
  organizationId: string;
  name: string;
  type: CosmeticsPresetType;
  brandId: string | null;
  coreTemplateId: string | null;
  visualConfig: CosmeticsVisualConfig;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// BRAND CONTENT DTOs
// ============================================================================

export interface CreateBrandContentDto {
  brandId: string;
  title: string;
  description?: string;
  contentType: CosmeticsContentType;
  mediaAssets: CosmeticsMediaAssets;
  season?: string;
  scope?: CosmeticsContentScope;
  campaignStart?: string;
  campaignEnd?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateBrandContentDto {
  title?: string;
  description?: string;
  mediaAssets?: Partial<CosmeticsMediaAssets>;
  season?: string;
  campaignStart?: string;
  campaignEnd?: string;
  status?: CosmeticsContentStatus;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BrandContentResponseDto {
  id: string;
  organizationId: string;
  brandId: string;
  title: string;
  description: string | null;
  contentType: CosmeticsContentType;
  mediaAssets: CosmeticsMediaAssets;
  season: string | null;
  source: 'cosmetics-brand';
  scope: CosmeticsContentScope;
  isForced: false;
  parentContentId: string | null;
  campaignStart: string | null;
  campaignEnd: string | null;
  status: CosmeticsContentStatus;
  isActive: boolean;
  cloneCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TREND CARD DTOs
// ============================================================================

export interface CreateTrendCardDto {
  title: string;
  description?: string;
  trendType: CosmeticsTrendType;
  colorPalette?: string[];
  productReferences?: string[];
  thumbnailUrl: string;
  season: string;
  year: number;
  displayOrder?: number;
}

export interface UpdateTrendCardDto {
  title?: string;
  description?: string;
  colorPalette?: string[];
  productReferences?: string[];
  thumbnailUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface TrendCardResponseDto {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  trendType: CosmeticsTrendType;
  colorPalette: string[];
  productReferences: string[];
  thumbnailUrl: string;
  season: string;
  year: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export interface BrandQueryDto {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
  search?: string;
}

export interface ContentPresetQueryDto {
  page?: number;
  limit?: number;
  type?: string;
  brandId?: string;
  isActive?: boolean;
}

export interface BrandContentQueryDto {
  page?: number;
  limit?: number;
  brandId?: string;
  contentType?: string;
  scope?: string;
  status?: string;
  season?: string;
  search?: string;
}

export interface TrendCardQueryDto {
  page?: number;
  limit?: number;
  trendType?: string;
  season?: string;
  year?: number;
  isActive?: boolean;
}

// ============================================================================
// CLONE DTOs
// ============================================================================

export interface CloneContentDto {
  title?: string;
  targetOrganizationId?: string;
}

export interface CloneContentResponseDto {
  content: BrandContentResponseDto;
  originalId: string;
  clonedAt: string;
}

// ============================================================================
// GLOBAL CONTENT DTOs (Store용)
// ============================================================================

export interface GlobalContentItemDto {
  id: string;
  title: string;
  description: string | null;
  contentType: CosmeticsContentType;
  brandId: string;
  source: 'cosmetics-brand';
  scope: 'global';
  isForced: false;
  canClone: true;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface GlobalContentResponseDto {
  data: GlobalContentItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    brands: string[];
  };
}

// ============================================================================
// STATS DTOs
// ============================================================================

export interface ContentStatsDto {
  totalContents: number;
  byBrand: Record<string, number>;
  byStatus: Record<string, number>;
  byContentType: Record<string, number>;
  totalClones: number;
  totalViews: number;
}
