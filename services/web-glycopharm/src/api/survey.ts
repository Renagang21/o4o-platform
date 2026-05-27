/**
 * Survey API — GlycoPharm Operator
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-SURVEYS-V1
 *
 * Backend: /api/v1/surveys (serviceKey='glycopharm' 격리)
 * Guard: requireAuth (공통 endpoint, serviceKey로 격리)
 */

import { authClient } from '../lib/apiClient';

export interface SurveyItem {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  responseCount: number;
  maxResponses?: number | null;
  serviceKey: string;
  visibility: string;
  rewardEnabled: boolean;
  rewardAmount: number;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyDetail extends SurveyItem {
  questions: SurveyQuestion[];
}

export interface SurveyQuestion {
  id: string;
  type: 'single' | 'multi' | 'text' | 'rating' | 'scale';
  question: string;
  description?: string;
  options?: Array<{ id: string; label: string; value: string; order: number }>;
  order: number;
  isRequired: boolean;
}

export interface CreateSurveyPayload {
  title: string;
  description?: string;
  questions: Array<{
    type: 'single' | 'multi' | 'text';
    question: string;
    description?: string;
    options?: Array<{ label: string; value: string; order: number }>;
    order?: number;
    isRequired?: boolean;
  }>;
  startAt?: string | null;
  endAt?: string | null;
  allowAnonymous?: boolean;
  rewardEnabled?: boolean;
  rewardAmount?: number;
  serviceKey?: string;
  visibility?: string;
}

interface SurveyListResponse {
  success: boolean;
  data: SurveyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const SERVICE_KEY = 'glycopharm';

export const glycopharmSurveyApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    authClient.api.get<SurveyListResponse>('/surveys', {
      params: { serviceKey: SERVICE_KEY, ...params },
    }),

  get: (id: string) =>
    authClient.api.get<{ success: boolean; data: SurveyDetail }>(`/surveys/${id}`),

  create: (payload: CreateSurveyPayload) =>
    authClient.api.post<{ success: boolean; data: SurveyItem }>('/surveys', {
      ...payload,
      serviceKey: SERVICE_KEY,
      ownerType: 'service_operator',
      visibility: payload.visibility ?? 'members_only',
    }),

  update: (id: string, payload: Partial<CreateSurveyPayload> & { status?: string }) =>
    authClient.api.patch<{ success: boolean; data: SurveyItem }>(`/surveys/${id}`, payload),

  delete: (id: string) =>
    authClient.api.delete<{ success: boolean }>(`/surveys/${id}`),
};
