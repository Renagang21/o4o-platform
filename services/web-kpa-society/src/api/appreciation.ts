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

  getRecent: (targetType: string, targetId: string) =>
    apiClient.get<ApiResponse<{ items: AppreciationSend[] }>>(`/appreciation/${targetType}/${targetId}/recent`),
};

// WO-O4O-KPA-APPRECIATION-PANEL-ALIGN-V1
// @o4o/shared-space-ui AppreciationPanel 의 AppreciationApi 인터페이스에 맞춘 adapter.
// KPA apiClient 는 raw Promise<T> 를 반환 (axios wrap 없음) — { success, data: ... } 그대로.
import type {
  AppreciationApi,
  AppreciationTargetType,
  AppreciationSummaryData,
  AppreciationRecentItem,
} from '@o4o/shared-space-ui';

export const appreciationPanelApi: AppreciationApi = {
  send: async (data) => {
    await appreciationApi.send(data);
  },
  getSummary: async (targetType: AppreciationTargetType, targetId: string) => {
    const r = await appreciationApi.getSummary(targetType, targetId);
    const data = r?.data as AppreciationSummary | undefined;
    if (data && typeof data === 'object' && 'totalAmount' in data) {
      return {
        totalAmount: Number(data.totalAmount) || 0,
        count: Number(data.count) || 0,
      } as AppreciationSummaryData;
    }
    return null;
  },
  getRecent: async (targetType: AppreciationTargetType, targetId: string) => {
    const r = await appreciationApi.getRecent(targetType, targetId);
    const items = (r?.data?.items ?? []) as AppreciationRecentItem[];
    return items;
  },
};
