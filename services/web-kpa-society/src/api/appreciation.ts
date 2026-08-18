/**
 * Appreciation API
 * WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
 */

// WO-O4O-LMS-KPA-FRONTEND-API-CONTRACT-RESIDUE-CLEANUP-V1 §5/§6:
// appreciation 은 서비스 중립 공용 도메인이며 backend mount 는 `/api/v1/appreciation/*` 하나뿐이다.
// KPA `apiClient`(base=/api/v1/kpa)를 쓰면 `/api/v1/kpa/appreciation/*` 로 나가 전부 404 였다.
// 화면별 URL patch 가 아니라 client 한 곳에서 canonical base(`coreApiClient`)로 정렬한다.
import { coreApiClient } from './client';
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
    coreApiClient.post<ApiResponse<{ appreciation: AppreciationSend }>>('/appreciation/send', data),

  // backend 는 okPaginated 로 `{ success, data: AppreciationSend[], pagination }` 를 준다.
  getMySent: (params?: { page?: number; limit?: number }) =>
    coreApiClient.get<ApiResponse<AppreciationSend[]>>('/appreciation/my-sent', params),

  getMyReceived: (params?: { page?: number; limit?: number }) =>
    coreApiClient.get<ApiResponse<AppreciationSend[]>>('/appreciation/my-received', params),

  getSummary: (targetType: string, targetId: string) =>
    coreApiClient.get<ApiResponse<AppreciationSummary>>(`/appreciation/${targetType}/${targetId}/summary`),

  getRecent: (targetType: string, targetId: string) =>
    coreApiClient.get<ApiResponse<{ items: AppreciationSend[] }>>(`/appreciation/${targetType}/${targetId}/recent`),
};

// WO-O4O-KPA-APPRECIATION-PANEL-ALIGN-V1
// @o4o/shared-space-ui AppreciationPanel 의 AppreciationApi 인터페이스에 맞춘 adapter.
// KPA coreApiClient 는 raw Promise<T> 를 반환 (axios wrap 없음) — { success, data: ... } 그대로.
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
