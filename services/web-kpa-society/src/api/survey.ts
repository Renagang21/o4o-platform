/**
 * Survey API — WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1
 *
 * Operator-facing wrapper for /api/v1/surveys with reward fields.
 * User-facing survey list also uses this client.
 */

import { coreApiClient } from './client';

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
    type: 'single' | 'multi' | 'text' | 'rating' | 'scale';
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

interface CoreListResponse {
  success: boolean;
  data: SurveyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CoreOk<T> { success: boolean; data: T }

export const surveyApi = {
  list: (params?: { status?: string; page?: number; limit?: number; audience?: string }) =>
    coreApiClient.get<CoreListResponse>('/surveys', {
      serviceKey: 'kpa-society',
      ...(params ?? {}),
    } as any),

  get: (id: string) =>
    coreApiClient.get<CoreOk<SurveyDetail>>(`/surveys/${id}`),

  create: (payload: CreateSurveyPayload) =>
    coreApiClient.post<CoreOk<SurveyItem>>('/surveys', {
      ...payload,
      serviceKey: payload.serviceKey ?? 'kpa-society',
      ownerType: 'service_operator',
      visibility: payload.visibility ?? 'members_only',
    }),

  update: (id: string, payload: Partial<CreateSurveyPayload> & { status?: string }) =>
    coreApiClient.patch<CoreOk<SurveyItem>>(`/surveys/${id}`, payload),

  delete: (id: string) =>
    coreApiClient.delete<{ success: boolean }>(`/surveys/${id}`),
};
