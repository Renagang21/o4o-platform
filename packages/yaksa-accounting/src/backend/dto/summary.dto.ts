/**
 * Summary DTOs
 *
 * 집계 관련 DTO
 */

import { ExpenseCategory } from '../entities';

/**
 * 카테고리별 집계
 */
export interface CategorySummary {
  category: ExpenseCategory;
  categoryLabel: string;
  totalAmount: number;
  count: number;
}

/**
 * 월별 요약 DTO
 */
export interface MonthlySummaryDto {
  organizationId: string;
  yearMonth: string;
  isClosed: boolean;
  closedAt?: string;
  totalAmount: number;
  totalCount: number;
  byCategory: CategorySummary[];
}

/**
 * 연간 요약 DTO
 */
export interface AnnualSummaryDto {
  organizationId: string;
  year: number;
  totalAmount: number;
  totalCount: number;
  byCategory: CategorySummary[];
  byMonth: MonthSummary[];
}

/**
 * 월별 간단 요약 (연간 요약 내 사용)
 */
export interface MonthSummary {
  yearMonth: string;
  totalAmount: number;
  count: number;
  isClosed: boolean;
}

/**
 * 내보내기용 데이터 DTO
 */
export interface ExportDataDto {
  organizationId: string;
  organizationName: string;
  period: string;
  generatedAt: string;
  summary: {
    totalAmount: number;
    totalCount: number;
    byCategory: CategorySummary[];
  };
  records: ExportRecordDto[];
}

/**
 * 내보내기용 개별 레코드
 */
export interface ExportRecordDto {
  no: number;
  date: string;
  category: string;
  description: string;
  paymentMethod: string;
  amount: number;
  relatedPerson?: string;
}
