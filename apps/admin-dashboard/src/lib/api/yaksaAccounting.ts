/**
 * Yaksa Accounting API Client
 *
 * 지부/분회 사무실 운영비 회계 API
 *
 * === 원칙 ===
 * - 단식 회계 (복식부기 ❌)
 * - 지출 기록 + 마감 + 집계
 * - 총회 보고용
 */

import { authClient } from '@o4o/auth-client';

// ========== Types ==========

export type ExpenseCategory =
  | 'ENTERTAINMENT'
  | 'GENERAL_ADMIN'
  | 'SUPPLIES'
  | 'OFFICER_EXPENSE'
  | 'MISC';

export type PaymentMethod = 'CARD' | 'TRANSFER' | 'CASH';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ENTERTAINMENT: '접대비/회의비',
  GENERAL_ADMIN: '일반관리비',
  SUPPLIES: '소모품/잡비',
  OFFICER_EXPENSE: '임원 업무비',
  MISC: '기타',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: '카드',
  TRANSFER: '계좌이체',
  CASH: '현금',
};

export interface ExpenseRecord {
  id: string;
  organizationId: string;
  expenseDate: string;
  amount: number;
  category: ExpenseCategory;
  categoryLabel: string;
  description: string;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  relatedPerson?: string;
  receiptImageUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  expenseDate: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  paymentMethod: PaymentMethod;
  relatedPerson?: string;
  receiptImageUrl?: string;
}

export interface UpdateExpenseDto {
  expenseDate?: string;
  amount?: number;
  category?: ExpenseCategory;
  description?: string;
  paymentMethod?: PaymentMethod;
  relatedPerson?: string;
  receiptImageUrl?: string;
}

export interface ExpenseListFilter {
  yearMonth?: string;
  category?: ExpenseCategory;
  page?: number;
  limit?: number;
}

export interface ExpenseListResponse {
  items: ExpenseRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CloseStatus {
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
}

export interface CloseMonthResult {
  yearMonth: string;
  isClosed: boolean;
  closedAt: string;
  closedBy: string;
}

export interface CategorySummary {
  category: ExpenseCategory;
  categoryLabel: string;
  totalAmount: number;
  count: number;
}

export interface MonthlySummary {
  organizationId: string;
  yearMonth: string;
  isClosed: boolean;
  closedAt?: string;
  totalAmount: number;
  totalCount: number;
  byCategory: CategorySummary[];
}

export interface MonthSummary {
  yearMonth: string;
  totalAmount: number;
  count: number;
  isClosed: boolean;
}

export interface AnnualSummary {
  organizationId: string;
  year: number;
  totalAmount: number;
  totalCount: number;
  byCategory: CategorySummary[];
  byMonth: MonthSummary[];
}

export interface ExportRecord {
  no: number;
  date: string;
  category: string;
  description: string;
  paymentMethod: string;
  amount: number;
  relatedPerson?: string;
}

export interface ExportData {
  organizationId: string;
  organizationName: string;
  period: string;
  generatedAt: string;
  summary: {
    totalAmount: number;
    totalCount: number;
    byCategory: CategorySummary[];
  };
  records: ExportRecord[];
}

// ========== API Functions ==========

const API_BASE = '/api/v1/yaksa/accounting';

/**
 * 지출 목록 조회
 */
export async function getExpenses(filter: ExpenseListFilter = {}): Promise<ExpenseListResponse> {
  const params = new URLSearchParams();
  if (filter.yearMonth) params.append('yearMonth', filter.yearMonth);
  if (filter.category) params.append('category', filter.category);
  if (filter.page) params.append('page', String(filter.page));
  if (filter.limit) params.append('limit', String(filter.limit));

  const response = await authClient.api.get(`${API_BASE}/expenses?${params.toString()}`);
  return response.data;
}

/**
 * 지출 상세 조회
 */
export async function getExpense(id: string): Promise<ExpenseRecord> {
  const response = await authClient.api.get(`${API_BASE}/expenses/${id}`);
  return response.data;
}

/**
 * 지출 생성
 */
export async function createExpense(dto: CreateExpenseDto): Promise<ExpenseRecord> {
  const response = await authClient.api.post(`${API_BASE}/expenses`, dto);
  return response.data;
}

/**
 * 지출 수정
 */
export async function updateExpense(id: string, dto: UpdateExpenseDto): Promise<ExpenseRecord> {
  const response = await authClient.api.patch(`${API_BASE}/expenses/${id}`, dto);
  return response.data;
}

/**
 * 지출 삭제
 */
export async function deleteExpense(id: string): Promise<void> {
  await authClient.api.delete(`${API_BASE}/expenses/${id}`);
}

/**
 * 마감 상태 조회
 */
export async function getCloseStatus(yearMonth: string): Promise<CloseStatus> {
  const response = await authClient.api.get(`${API_BASE}/close/${yearMonth}`);
  return response.data;
}

/**
 * 월 마감
 */
export async function closeMonth(yearMonth: string): Promise<CloseMonthResult> {
  const response = await authClient.api.post(`${API_BASE}/close/${yearMonth}`);
  return response.data;
}

/**
 * 연간 마감 상태 목록
 */
export async function getCloseStatuses(year: number): Promise<Array<{ yearMonth: string; isClosed: boolean; closedAt?: string }>> {
  const response = await authClient.api.get(`${API_BASE}/close?year=${year}`);
  return response.data;
}

/**
 * 월별 요약
 */
export async function getMonthlySummary(yearMonth: string): Promise<MonthlySummary> {
  const response = await authClient.api.get(`${API_BASE}/summary/monthly?yearMonth=${yearMonth}`);
  return response.data;
}

/**
 * 연간 요약
 */
export async function getAnnualSummary(year: number): Promise<AnnualSummary> {
  const response = await authClient.api.get(`${API_BASE}/summary/annual?year=${year}`);
  return response.data;
}

/**
 * 내보내기 데이터
 */
export async function getExportData(year: number): Promise<ExportData> {
  const response = await authClient.api.get(`${API_BASE}/export?year=${year}`);
  return response.data;
}
