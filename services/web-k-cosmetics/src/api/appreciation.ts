/**
 * Appreciation API — K-Cosmetics
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
