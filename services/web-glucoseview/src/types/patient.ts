/**
 * Patient Types for GlucoseView
 *
 * Based on cgm_patients and cgm_patient_summaries tables
 */

/** 환자 상태 */
export type PatientStatus = 'normal' | 'warning' | 'risk';

/** 변화 방향 */
export type TrendDirection = 'improving' | 'worsening' | 'stable';

/** 환자 요약 정보 (리스트용) */
export interface PatientSummary {
  id: string;
  /** 환자 가명 (실명 표시 금지) */
  alias: string;
  /** 최근 상태 */
  status: PatientStatus;
  /** 기준 기간 (일) */
  periodDays: number;
  /** 변화 방향 */
  trend: TrendDirection;
  /** 마지막 업데이트 */
  lastUpdated: string;
}

/** API 응답 타입 */
export interface PatientsResponse {
  data: PatientSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Patient Detail Types
// ============================================================================

/** 인사이트 유형 */
export type InsightType =
  | 'meal_pattern'        // 식후 패턴
  | 'nocturnal_pattern'   // 야간 패턴
  | 'improvement'         // 개선 관찰
  | 'pharmacist_comment'; // 약사 코멘트

/** 인사이트 생성 주체 */
export type InsightSource = 'system' | 'pharmacist' | 'ai';

/** 인사이트 카드 */
export interface PatientInsight {
  id: string;
  /** 인사이트 유형 */
  type: InsightType;
  /** 설명 문장 */
  description: string;
  /** 생성 주체 */
  source: InsightSource;
  /** 참조 기간 */
  referencePeriod: string;
}

/** 기간 요약 */
export interface PeriodSummary {
  /** 시작일 */
  periodStart: string;
  /** 종료일 */
  periodEnd: string;
  /** 상태 */
  status: PatientStatus;
  /** 요약 문장 (서술형) */
  summaryText: string;
}

/** 이전 기간 대비 변화 */
export interface PeriodComparison {
  /** 비교 대상 기간 */
  previousPeriod: string;
  /** 현재 기간 */
  currentPeriod: string;
  /** 변화 방향 */
  trend: TrendDirection;
  /** 변화 설명 */
  description: string;
}

/** 환자 상세 정보 */
export interface PatientDetail {
  id: string;
  /** 환자 가명 */
  alias: string;
  /** 등록일 */
  registeredAt: string;
  /** 현재 기간 요약 */
  currentSummary: PeriodSummary;
  /** 이전 기간 요약 (비교용) */
  previousSummary?: PeriodSummary;
  /** 인사이트 목록 */
  insights: PatientInsight[];
  /** 이전 대비 변화 */
  comparison?: PeriodComparison;
}
