/**
 * Expense DTOs
 *
 * 지출 기록 관련 DTO
 */

import { ExpenseCategory, PaymentMethod } from '../entities';

/**
 * 지출 생성 DTO
 */
export interface CreateExpenseDto {
  expenseDate: string;  // YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  description: string;
  paymentMethod: PaymentMethod;
  relatedPerson?: string;
  receiptImageUrl?: string;
}

/**
 * 지출 수정 DTO
 */
export interface UpdateExpenseDto {
  expenseDate?: string;
  amount?: number;
  category?: ExpenseCategory;
  description?: string;
  paymentMethod?: PaymentMethod;
  relatedPerson?: string;
  receiptImageUrl?: string;
}

/**
 * 지출 목록 조회 필터
 */
export interface ListExpensesFilter {
  organizationId: string;
  yearMonth?: string;       // YYYY-MM
  category?: ExpenseCategory;
  startDate?: string;       // YYYY-MM-DD
  endDate?: string;         // YYYY-MM-DD
  page?: number;
  limit?: number;
}

/**
 * 지출 응답 DTO
 */
export interface ExpenseResponseDto {
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

/**
 * 카테고리 레이블 매핑
 */
export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.ENTERTAINMENT]: '접대비/회의비',
  [ExpenseCategory.GENERAL_ADMIN]: '일반관리비',
  [ExpenseCategory.SUPPLIES]: '소모품/잡비',
  [ExpenseCategory.OFFICER_EXPENSE]: '임원 업무비',
  [ExpenseCategory.MISC]: '기타',
};

/**
 * 결제 방법 레이블 매핑
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CARD]: '카드',
  [PaymentMethod.TRANSFER]: '계좌이체',
  [PaymentMethod.CASH]: '현금',
};
