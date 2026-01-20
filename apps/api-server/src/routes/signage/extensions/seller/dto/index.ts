/**
 * Seller Extension - DTOs
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * Request/Response DTOs for Seller Extension API
 */

import type {
  SellerPartnerStatus,
  SellerPartnerCategory,
  SellerPartnerTier,
  SellerCampaignStatus,
  SellerCampaignType,
  SellerCampaignTargeting,
  SellerCampaignBudget,
  SellerContentType,
  SellerContentStatus,
  SellerContentScope,
  SellerMediaAssets,
  SellerMetricType,
} from '../entities/index.js';

// ============================================================================
// PARTNER DTOs
// ============================================================================

export interface CreatePartnerDto {
  displayName: string;
  code: string;
  description?: string;
  logoUrl?: string;
  category?: SellerPartnerCategory;
  tier?: SellerPartnerTier;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  contractInfo?: {
    contractId?: string;
    startDate?: string;
    endDate?: string;
    terms?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface UpdatePartnerDto {
  displayName?: string;
  description?: string;
  logoUrl?: string;
  category?: SellerPartnerCategory;
  tier?: SellerPartnerTier;
  status?: SellerPartnerStatus;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  contractInfo?: {
    contractId?: string;
    startDate?: string;
    endDate?: string;
    terms?: string;
  };
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface PartnerResponseDto {
  id: string;
  organizationId: string;
  displayName: string;
  code: string;
  description: string | null;
  logoUrl: string | null;
  category: SellerPartnerCategory;
  tier: SellerPartnerTier;
  status: SellerPartnerStatus;
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
  };
  contractInfo: {
    contractId?: string;
    startDate?: string;
    endDate?: string;
    terms?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CAMPAIGN DTOs
// ============================================================================

export interface CreateCampaignDto {
  partnerId: string;
  title: string;
  description?: string;
  campaignType?: SellerCampaignType;
  startAt: string;
  endAt: string;
  targeting?: SellerCampaignTargeting;
  budget?: SellerCampaignBudget;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateCampaignDto {
  title?: string;
  description?: string;
  campaignType?: SellerCampaignType;
  startAt?: string;
  endAt?: string;
  targeting?: SellerCampaignTargeting;
  budget?: SellerCampaignBudget;
  priority?: number;
  status?: SellerCampaignStatus;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ApproveCampaignDto {
  approved: boolean;
  rejectionReason?: string;
}

export interface CampaignResponseDto {
  id: string;
  organizationId: string;
  partnerId: string;
  title: string;
  description: string | null;
  campaignType: SellerCampaignType;
  status: SellerCampaignStatus;
  startAt: string;
  endAt: string;
  targeting: SellerCampaignTargeting;
  budget: SellerCampaignBudget;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONTENT DTOs
// ============================================================================

export interface CreateContentDto {
  partnerId: string;
  campaignId?: string;
  title: string;
  description?: string;
  contentType?: SellerContentType;
  mediaAssets: SellerMediaAssets;
  metricsEnabled?: boolean;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateContentDto {
  title?: string;
  description?: string;
  contentType?: SellerContentType;
  mediaAssets?: Partial<SellerMediaAssets>;
  metricsEnabled?: boolean;
  displayOrder?: number;
  status?: SellerContentStatus;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ApproveContentDto {
  approved: boolean;
  rejectionReason?: string;
}

export interface ContentResponseDto {
  id: string;
  organizationId: string;
  partnerId: string;
  campaignId: string | null;
  title: string;
  description: string | null;
  contentType: SellerContentType;
  mediaAssets: SellerMediaAssets;
  source: 'seller-partner';
  scope: SellerContentScope;
  isForced: false;
  parentContentId: string | null;
  status: SellerContentStatus;
  metricsEnabled: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  displayOrder: number;
  cloneCount: number;
  totalImpressions: number;
  totalClicks: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GLOBAL CONTENT DTOs (Store용)
// ============================================================================

export interface GlobalContentItemDto {
  id: string;
  title: string;
  description: string | null;
  contentType: SellerContentType;
  partnerId: string;
  partnerName: string;
  campaignId: string | null;
  campaignTitle: string | null;
  source: 'seller-partner';
  scope: 'global';
  isForced: false;
  canClone: true;
  thumbnailUrl: string | null;
  campaignStartAt: string | null;
  campaignEndAt: string | null;
  createdAt: string;
}

export interface GlobalContentResponseDto {
  data: GlobalContentItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    partners: string[];
    activeCampaigns: number;
  };
}

// ============================================================================
// CLONE DTOs
// ============================================================================

export interface CloneContentDto {
  title?: string;
  targetStoreId?: string;
}

export interface CloneContentResponseDto {
  content: ContentResponseDto;
  originalId: string;
  clonedAt: string;
}

// ============================================================================
// METRICS DTOs
// ============================================================================

export interface RecordMetricDto {
  contentId: string;
  eventType: SellerMetricType;
  storeId?: string;
  playerId?: string;
  eventValue?: number;
  eventMetadata?: Record<string, unknown>;
}

export interface MetricsSummaryDto {
  contentId: string;
  partnerId: string;
  campaignId: string | null;
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    impressions: number;
    clicks: number;
    qrScans: number;
    videoStarts: number;
    videoCompletes: number;
    totalDurationSeconds: number;
  };
  ctr: number; // Click-through rate
  vtr: number; // Video completion rate
}

export interface PartnerStatsDto {
  partnerId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalCampaigns: number;
  activeCampaigns: number;
  totalContents: number;
  approvedContents: number;
  totalImpressions: number;
  totalClicks: number;
  totalQrScans: number;
  avgCtr: number;
  topContents: {
    contentId: string;
    title: string;
    impressions: number;
    clicks: number;
  }[];
}

export interface ContentStatsDto {
  totalPartners: number;
  activePartners: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalContents: number;
  approvedContents: number;
  pendingContents: number;
  byContentType: Record<string, number>;
  byStatus: Record<string, number>;
  totalImpressions: number;
  totalClicks: number;
  totalClones: number;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export interface PartnerQueryDto {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  tier?: string;
  search?: string;
}

export interface CampaignQueryDto {
  page?: number;
  limit?: number;
  partnerId?: string;
  status?: string;
  campaignType?: string;
  activeOnly?: boolean;
}

export interface ContentQueryDto {
  page?: number;
  limit?: number;
  partnerId?: string;
  campaignId?: string;
  contentType?: string;
  status?: string;
  scope?: string;
  search?: string;
}

export interface MetricsQueryDto {
  contentId?: string;
  partnerId?: string;
  campaignId?: string;
  storeId?: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}
