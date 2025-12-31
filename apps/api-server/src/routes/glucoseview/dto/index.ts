/**
 * GlucoseView DTOs
 *
 * Phase C-1: GlucoseView API Implementation
 * Request/Response DTOs for vendors, view profiles, and connections
 */

import type {
  GlucoseViewVendorStatus,
  ViewProfileStatus,
  SummaryLevel,
  ChartType,
  ConnectionStatus,
} from '../entities/index.js';

// ============================================================================
// Vendor DTOs
// ============================================================================

export interface VendorDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  supported_devices: string[];
  integration_type: string;
  status: GlucoseViewVendorStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorRequestDto {
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  supported_devices?: string[];
  integration_type?: string;
  status?: GlucoseViewVendorStatus;
  sort_order?: number;
}

export interface UpdateVendorRequestDto {
  name?: string;
  code?: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  supported_devices?: string[];
  integration_type?: string;
  sort_order?: number;
}

export interface ListVendorsQueryDto {
  status?: GlucoseViewVendorStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// View Profile DTOs
// ============================================================================

export interface ViewProfileDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  summary_level: SummaryLevel;
  chart_type: ChartType;
  time_range_days: number;
  show_tir: boolean;
  show_average: boolean;
  show_variability: boolean;
  target_low: number;
  target_high: number;
  status: ViewProfileStatus;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateViewProfileRequestDto {
  name: string;
  code: string;
  description?: string;
  summary_level?: SummaryLevel;
  chart_type?: ChartType;
  time_range_days?: number;
  show_tir?: boolean;
  show_average?: boolean;
  show_variability?: boolean;
  target_low?: number;
  target_high?: number;
  status?: ViewProfileStatus;
  is_default?: boolean;
  sort_order?: number;
}

export interface UpdateViewProfileRequestDto {
  name?: string;
  code?: string;
  description?: string;
  summary_level?: SummaryLevel;
  chart_type?: ChartType;
  time_range_days?: number;
  show_tir?: boolean;
  show_average?: boolean;
  show_variability?: boolean;
  target_low?: number;
  target_high?: number;
  is_default?: boolean;
  sort_order?: number;
}

export interface ListViewProfilesQueryDto {
  status?: ViewProfileStatus;
  summary_level?: SummaryLevel;
  chart_type?: ChartType;
  page?: number;
  limit?: number;
}

// ============================================================================
// Connection DTOs
// ============================================================================

export interface ConnectionDto {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  vendor_id: string;
  vendor?: VendorDto;
  status: ConnectionStatus;
  connected_at?: string;
  last_verified_at?: string;
  notes?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateConnectionRequestDto {
  pharmacy_id?: string;
  pharmacy_name?: string;
  vendor_id: string;
  status?: ConnectionStatus;
  notes?: string;
  config?: Record<string, any>;
}

export interface UpdateConnectionRequestDto {
  pharmacy_name?: string;
  notes?: string;
  config?: Record<string, any>;
}

export interface ListConnectionsQueryDto {
  pharmacy_id?: string;
  vendor_id?: string;
  status?: ConnectionStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}

// ============================================================================
// Patient DTOs (CGM Summary Data)
// ============================================================================

/** 환자 상태 */
export type PatientStatus = 'normal' | 'warning' | 'risk';

/** 변화 방향 */
export type TrendDirection = 'improving' | 'worsening' | 'stable';

/** 인사이트 유형 */
export type InsightType = 'meal_pattern' | 'nocturnal_pattern' | 'improvement' | 'pharmacist_comment';

/** 인사이트 생성 주체 */
export type InsightSource = 'system' | 'pharmacist' | 'ai';

/** 환자 요약 정보 (리스트용) */
export interface PatientSummaryDto {
  id: string;
  alias: string;
  status: PatientStatus;
  periodDays: number;
  trend: TrendDirection;
  lastUpdated: string;
}

/** 인사이트 DTO */
export interface PatientInsightDto {
  id: string;
  type: InsightType;
  description: string;
  source: InsightSource;
  referencePeriod: string;
}

/** 기간 요약 DTO */
export interface PeriodSummaryDto {
  periodStart: string;
  periodEnd: string;
  status: PatientStatus;
  summaryText: string;
}

/** 기간 비교 DTO */
export interface PeriodComparisonDto {
  previousPeriod: string;
  currentPeriod: string;
  trend: TrendDirection;
  description: string;
}

/** 환자 상세 정보 DTO */
export interface PatientDetailDto {
  id: string;
  alias: string;
  registeredAt: string;
  currentSummary: PeriodSummaryDto;
  previousSummary?: PeriodSummaryDto;
  insights: PatientInsightDto[];
  comparison?: PeriodComparisonDto;
}

/** 환자 목록 쿼리 DTO */
export interface ListPatientsQueryDto {
  page?: number;
  limit?: number;
}
