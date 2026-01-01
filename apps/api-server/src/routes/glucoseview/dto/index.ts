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
  CustomerGender,
  CustomerSyncStatus,
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

// ============================================================================
// Customer DTOs (Phase C-2: Customer Management)
// ============================================================================

/** 고객 정보 응답 DTO */
export interface CustomerDto {
  id: string;
  pharmacist_id: string;
  name: string;
  phone?: string;
  email?: string;
  birth_year?: number;
  gender?: CustomerGender;
  kakao_id?: string;
  last_visit?: string;
  visit_count: number;
  sync_status: CustomerSyncStatus;
  last_sync_at?: string;
  notes?: string;
  data_sharing_consent: boolean;
  consent_date?: string;
  created_at: string;
  updated_at: string;
}

/** 고객 등록 요청 DTO */
export interface CreateCustomerRequestDto {
  name: string;
  phone?: string;
  email?: string;
  birth_year?: number;
  gender?: CustomerGender;
  kakao_id?: string;
  notes?: string;
}

/** 고객 수정 요청 DTO */
export interface UpdateCustomerRequestDto {
  name?: string;
  phone?: string;
  email?: string;
  birth_year?: number;
  gender?: CustomerGender;
  kakao_id?: string;
  notes?: string;
}

/** 고객 방문 기록 요청 DTO */
export interface RecordVisitRequestDto {
  notes?: string;
}

/** 고객 목록 쿼리 DTO */
export interface ListCustomersQueryDto {
  search?: string;
  sort_by?: 'recent' | 'frequent' | 'name';
  page?: number;
  limit?: number;
}

// ============================================================================
// Branch DTOs (Phase C-3: Pharmacist Membership)
// ============================================================================

import type { PharmacistApprovalStatus, PharmacistRole } from '../entities/index.js';

/** 지부 응답 DTO */
export interface BranchDto {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  chapters?: ChapterDto[];
}

/** 분회 응답 DTO */
export interface ChapterDto {
  id: string;
  branch_id: string;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  branch?: BranchDto;
}

// ============================================================================
// Pharmacist DTOs (Phase C-3: Pharmacist Membership)
// ============================================================================

/** 약사 프로필 응답 DTO */
export interface PharmacistDto {
  id: string;
  user_id: string;
  license_number: string;
  real_name: string;
  display_name: string;
  phone: string;
  email: string;
  chapter_id: string;
  pharmacy_name: string;
  role: PharmacistRole;
  approval_status: PharmacistApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  chapter?: ChapterDto;
}

/** 약사 회원가입 요청 DTO */
export interface RegisterPharmacistRequestDto {
  license_number: string;
  real_name: string;
  display_name: string;
  phone: string;
  email: string;
  password: string;
  chapter_id: string;
  pharmacy_name: string;
}

/** 약사 정보 수정 요청 DTO */
export interface UpdatePharmacistRequestDto {
  display_name?: string;
  phone?: string;
  pharmacy_name?: string;
}

/** 약사 승인/거절 요청 DTO */
export interface ApprovePharmacistRequestDto {
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

/** 약사 목록 쿼리 DTO */
export interface ListPharmacistsQueryDto {
  search?: string;
  branch_id?: string;
  chapter_id?: string;
  approval_status?: PharmacistApprovalStatus;
  role?: PharmacistRole;
  page?: number;
  limit?: number;
}

/** 지부 목록 쿼리 DTO */
export interface ListBranchesQueryDto {
  include_chapters?: boolean;
  active_only?: boolean;
}

/** 분회 목록 쿼리 DTO */
export interface ListChaptersQueryDto {
  branch_id?: string;
  search?: string;
  active_only?: boolean;
}
