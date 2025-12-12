/**
 * PartnerOps DTOs
 *
 * Partner-Core 기반 통합 DTO (Phase 5 Refactoring)
 *
 * @package @o4o/partnerops
 */

// Re-export Partner-Core types for convenience
export type {
  CreatePartnerDto,
  UpdatePartnerDto,
  PartnerFilter,
  CreatePartnerLinkDto,
  PartnerLinkFilter,
  RecordClickDto,
  ClickFilter,
  ClickValidationResult,
  CreateConversionDto,
  ConversionFilter,
  CreateCommissionDto,
  CommissionFilter,
  CreateSettlementBatchDto,
  SettlementBatchFilter,
  PaymentInfo,
} from '@o4o/partner-core';

// PartnerOps specific DTOs

/**
 * Partner Profile DTO (UI용)
 */
export interface PartnerProfileDto {
  id: string;
  userId: string;
  name: string;
  profileImage?: string;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    blog?: string;
    tiktok?: string;
  };
  level: 'newbie' | 'standard' | 'pro' | 'elite';
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  commissionRate: number;
  clickCount: number;
  conversionCount: number;
  totalCommission: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dashboard Summary DTO
 */
export interface DashboardSummaryDto {
  // Partner Stats
  partnerId: string;
  partnerLevel: 'newbie' | 'standard' | 'pro' | 'elite';
  partnerStatus: 'pending' | 'active' | 'suspended' | 'inactive';

  // Click/Conversion/Commission Stats from Partner-Core
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalEarnings: number;
  pendingEarnings: number;
  settledEarnings: number;

  // Period Stats
  todayClicks: number;
  todayConversions: number;
  todayEarnings: number;

  // Recent Activity
  recentActivity: Array<{
    type: 'click' | 'conversion' | 'commission' | 'settlement';
    description: string;
    amount?: number;
    timestamp: Date;
  }>;
}

/**
 * Partner Link Stats DTO (UI용)
 */
export interface PartnerLinkStatsDto {
  linkId: string;
  shortUrl: string;
  originalUrl: string;
  targetType: string;
  targetId: string;
  productType?: string;

  // Stats
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  totalCommission: number;

  // Daily breakdown
  clicksByDate: Array<{ date: string; clicks: number; conversions: number }>;
}

/**
 * Conversion List Item DTO (UI용)
 */
export interface ConversionListItemDto {
  id: string;
  partnerId: string;
  orderId: string;
  orderNumber?: string;
  productType?: string;
  orderAmount: number;
  commissionAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  attributionDays?: number;
  createdAt: Date;
  confirmedAt?: Date;
}

/**
 * Settlement Summary DTO (UI용)
 */
export interface SettlementSummaryDto {
  totalEarnings: number;
  settledEarnings: number;
  pendingEarnings: number;
  processingAmount: number;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;

  // Batch counts
  totalBatches: number;
  openBatches: number;
  paidBatches: number;
}

/**
 * Settlement Batch Item DTO (UI용)
 */
export interface SettlementBatchItemDto {
  id: string;
  batchNumber: string;
  periodStart: Date;
  periodEnd: Date;
  conversionCount: number;
  totalCommissionAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: 'open' | 'closed' | 'processing' | 'paid' | 'failed';
  paymentDueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
}

/**
 * Partner Routine DTO (콘텐츠 관리용)
 */
export interface PartnerRoutineDto {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  productIds: string[];
  productType?: string;
  status: 'draft' | 'published' | 'archived';
  viewCount: number;
  clickCount: number;
  conversionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Routine DTO
 */
export interface CreateRoutineDto {
  title: string;
  description?: string;
  productIds: string[];
  productType?: string;
}

/**
 * Update Routine DTO
 */
export interface UpdateRoutineDto {
  title?: string;
  description?: string;
  productIds?: string[];
  status?: 'draft' | 'published' | 'archived';
}

/**
 * Query 공통 DTO
 */
export interface ListQueryDto {
  page?: number;
  limit?: number;
  searchTerm?: string;
}

export interface DateRangeQueryDto extends ListQueryDto {
  startDate?: string;
  endDate?: string;
}

export interface ConversionQueryDto extends DateRangeQueryDto {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
}

export interface SettlementQueryDto extends ListQueryDto {
  status?: 'open' | 'closed' | 'processing' | 'paid' | 'failed';
}

/**
 * API Response 공통 DTO
 */
export interface PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponseDto<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
