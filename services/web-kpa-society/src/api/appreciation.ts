/**
 * Appreciation API
 * WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
 */

import { apiClient } from './client';
import type { ApiResponse } from '../types';

export interface AppreciationSummary {
  targetType: string;
  targetId: string;
  totalAmount: number;
  count: number;
}

export interface AppreciationSend {
  id: string;
  fromUserId: string;
  toUserId: string;
  targetType: string;
  targetId: string;
  amount: number;
  message?: string;
  createdAt: string;
}

export const appreciationApi = {
  send: (data: { targetType: string; targetId: string; amount: number; message?: string }) =>
    apiClient.post<ApiResponse<{ appreciation: AppreciationSend }>>('/appreciation/send', data),

  getMySent: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<{ items: AppreciationSend[]; pagination: any }>>('/appreciation/my-sent', params),

  getMyReceived: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<{ items: AppreciationSend[]; pagination: any }>>('/appreciation/my-received', params),

  getSummary: (targetType: string, targetId: string) =>
    apiClient.get<ApiResponse<AppreciationSummary>>(`/appreciation/${targetType}/${targetId}/summary`),
};
