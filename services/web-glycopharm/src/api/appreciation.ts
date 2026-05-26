/**
 * Appreciation API — GlycoPharm
 * WO-O4O-APPRECIATION-FRONTEND-BOOTSTRAP-GLYCO-KCOS-V1
 *
 * Backend: /api/v1/appreciation/* (공용 — serviceKey 불필요)
 */

import { api } from '@/lib/apiClient';

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
    api.post<any>('/appreciation/send', data),

  getMySent: (params?: { page?: number; limit?: number }) =>
    api.get<any>('/appreciation/my-sent', { params }),

  getMyReceived: (params?: { page?: number; limit?: number }) =>
    api.get<any>('/appreciation/my-received', { params }),

  getSummary: (targetType: string, targetId: string) =>
    api.get<any>(`/appreciation/${targetType}/${targetId}/summary`),

  getRecent: (targetType: string, targetId: string) =>
    api.get<any>(`/appreciation/${targetType}/${targetId}/recent`),
};

// WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1
// @o4o/shared-space-ui AppreciationPanel 의 AppreciationApi 인터페이스에 맞춘 adapter.
// 기존 appreciationApi 의 raw axios response 를 정규화된 데이터로 변환.
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
    const r: any = await appreciationApi.getSummary(targetType, targetId);
    const body = r?.data;
    const data = body?.data ?? body;
    if (data && typeof data === 'object' && 'totalAmount' in data) {
      return {
        totalAmount: Number(data.totalAmount) || 0,
        count: Number(data.count) || 0,
      } as AppreciationSummaryData;
    }
    return null;
  },
  getRecent: async (targetType: AppreciationTargetType, targetId: string) => {
    const r: any = await appreciationApi.getRecent(targetType, targetId);
    const body = r?.data;
    const data = body?.data ?? body;
    const items: AppreciationRecentItem[] = Array.isArray(data?.items) ? data.items : [];
    return items;
  },
};
