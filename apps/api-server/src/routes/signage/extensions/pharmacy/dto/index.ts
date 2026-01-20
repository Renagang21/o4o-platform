/**
 * Pharmacy Extension - DTOs
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * Request/Response DTOs for Pharmacy Extension API
 */

import type {
  PharmacyContentType,
  PharmacyContentSource,
  PharmacyContentScope,
  PharmacyContentStatus,
  PharmacyMediaData,
  PharmacyTemplateType,
  PharmacyTemplateConfig,
  PharmacySeasonType,
} from '../entities/index.js';

// ============================================================================
// CATEGORY DTOs
// ============================================================================

export interface CreateCategoryDto {
  name: string;
  code: string;
  parentId?: string;
  iconUrl?: string;
  displayOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CategoryResponseDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  parentId: string | null;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CAMPAIGN DTOs
// ============================================================================

export interface CreateCampaignDto {
  name: string;
  season: PharmacySeasonType;
  healthCondition?: string;
  categoryId: string;
  productKeywords?: string[];
  startDate: string;
  endDate: string;
  priority?: number;
  scope?: PharmacyContentScope;
  isForced?: boolean;
}

export interface UpdateCampaignDto {
  name?: string;
  season?: PharmacySeasonType;
  healthCondition?: string;
  productKeywords?: string[];
  startDate?: string;
  endDate?: string;
  priority?: number;
  isForced?: boolean;
  isActive?: boolean;
}

export interface CampaignResponseDto {
  id: string;
  organizationId: string;
  name: string;
  season: PharmacySeasonType;
  healthCondition: string | null;
  categoryId: string;
  productKeywords: string[];
  startDate: string;
  endDate: string;
  priority: number;
  scope: PharmacyContentScope;
  isForced: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TEMPLATE PRESET DTOs
// ============================================================================

export interface CreateTemplatePresetDto {
  name: string;
  type: PharmacyTemplateType;
  coreTemplateId?: string;
  config: PharmacyTemplateConfig;
  thumbnailUrl?: string;
}

export interface UpdateTemplatePresetDto {
  name?: string;
  config?: Partial<PharmacyTemplateConfig>;
  thumbnailUrl?: string;
  isActive?: boolean;
}

export interface TemplatePresetResponseDto {
  id: string;
  organizationId: string;
  name: string;
  type: PharmacyTemplateType;
  coreTemplateId: string | null;
  config: PharmacyTemplateConfig;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONTENT DTOs
// ============================================================================

export interface CreateContentDto {
  title: string;
  description?: string;
  contentType: PharmacyContentType;
  categoryId?: string;
  campaignId?: string;
  templatePresetId?: string;
  mediaData: PharmacyMediaData;
  source?: PharmacyContentSource;
  scope?: PharmacyContentScope;
  isForced?: boolean;
  validFrom?: string;
  validUntil?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateContentDto {
  title?: string;
  description?: string;
  categoryId?: string;
  campaignId?: string;
  mediaData?: Partial<PharmacyMediaData>;
  isForced?: boolean;
  validFrom?: string;
  validUntil?: string;
  status?: PharmacyContentStatus;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ContentResponseDto {
  id: string;
  organizationId: string;
  supplierId: string | null;
  title: string;
  description: string | null;
  contentType: PharmacyContentType;
  categoryId: string | null;
  campaignId: string | null;
  templatePresetId: string | null;
  mediaData: PharmacyMediaData;
  source: PharmacyContentSource;
  scope: PharmacyContentScope;
  isForced: boolean;
  parentContentId: string | null;
  validFrom: string | null;
  validUntil: string | null;
  status: PharmacyContentStatus;
  isActive: boolean;
  cloneCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export interface ContentQueryDto {
  page?: number;
  limit?: number;
  source?: string;
  scope?: string;
  status?: string;
  contentType?: string;
  categoryId?: string;
  campaignId?: string;
  isForced?: boolean;
  search?: string;
}

export interface CategoryQueryDto {
  page?: number;
  limit?: number;
  parentId?: string;
  isActive?: boolean;
}

export interface CampaignQueryDto {
  page?: number;
  limit?: number;
  season?: string;
  scope?: string;
  isActive?: boolean;
  current?: boolean; // Filter by current date within start/end
}

// ============================================================================
// CLONE DTOs
// ============================================================================

export interface CloneContentDto {
  title?: string;
  targetOrganizationId?: string;
}

export interface CloneContentResponseDto {
  content: ContentResponseDto;
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
  contentType: PharmacyContentType;
  source: PharmacyContentSource;
  scope: 'global';
  isForced: boolean;
  canClone: boolean;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface GlobalContentResponseDto {
  data: GlobalContentItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasForced: boolean;
    sources: string[];
  };
}

// ============================================================================
// STATS DTOs (Operator용)
// ============================================================================

export interface ContentStatsDto {
  totalContents: number;
  bySource: Record<PharmacyContentSource, number>;
  byStatus: Record<PharmacyContentStatus, number>;
  byContentType: Record<PharmacyContentType, number>;
  forcedCount: number;
  totalClones: number;
  totalViews: number;
}
