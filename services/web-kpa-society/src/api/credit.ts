/**
 * Credit API 서비스
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * Neture Credit 잔액 조회 및 거래 내역
 */

import { apiClient } from './client';
import type { ApiResponse, CreditTransaction } from '../types';

export const creditApi = {
  getMyBalance: () =>
    apiClient.get<ApiResponse<{ balance: number }>>('/credits/me'),

  getMyTransactions: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<{
      transactions: CreditTransaction[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>>('/credits/me/transactions', params),
};
