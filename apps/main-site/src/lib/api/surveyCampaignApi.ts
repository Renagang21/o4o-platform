/**
 * Survey Campaign API Client
 *
 * API client for interacting with marketing survey campaigns.
 * Phase R8: Survey Campaign Module
 */

import { authClient } from '@o4o/auth-client';

const apiClient = authClient.api;
const BASE_PATH = '/api/v1/lms/marketing/survey-campaigns';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

export interface SurveyQuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
  value?: string | number;
}

export interface SurveyQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'textarea' | 'rating' | 'scale' | 'date' | 'email' | 'phone';
  question: string;
  description?: string;
  options?: SurveyQuestionOption[];
  required: boolean;
  order: number;
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface SurveyReward {
  type: 'points' | 'coupon' | 'badge' | 'none';
  value: string;
  description?: string;
}

export interface SurveyCampaignTargeting {
  targets: ('seller' | 'consumer' | 'pharmacist' | 'all')[];
  regions?: string[];
  tags?: string[];
  sellerTypes?: string[];
}

export interface SurveyCampaign {
  id: string;
  supplierId: string;
  surveyId: string | null;
  title: string;
  description: string | null;
  bundleId: string | null;
  questions: SurveyQuestion[];
  targeting: SurveyCampaignTargeting;
  reward: SurveyReward | null;
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'archived';
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isPublished: boolean;
  allowAnonymous: boolean;
  maxResponses: number | null;
  participationCount: number;
  completionCount: number;
  publishedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyAnswer {
  questionId: string;
  value: string | string[] | number;
  timeSpentSeconds?: number;
}

export interface SurveySubmissionData {
  userId?: string;
  isAnonymous?: boolean;
  answers: SurveyAnswer[];
  metadata?: Record<string, unknown>;
}

export interface SurveyStatistics {
  campaignId: string;
  title: string;
  totalParticipants: number;
  completionCount: number;
  completionRate: number;
  questionStats: Array<{
    questionId: string;
    question: string;
    type: string;
    responseCount: number;
    answers: Record<string, number>;
  }>;
}

/**
 * Get active survey campaigns for the current user
 */
export async function getActiveSurveyCampaigns(
  role: 'seller' | 'consumer' | 'pharmacist' | 'all',
  options?: {
    region?: string;
    sellerType?: string;
    tags?: string[];
  }
): Promise<ApiResponse<SurveyCampaign[]>> {
  try {
    const params = new URLSearchParams({ role });

    if (options?.region) {
      params.append('region', options.region);
    }
    if (options?.sellerType) {
      params.append('sellerType', options.sellerType);
    }
    if (options?.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','));
    }

    const response = await apiClient.get(`${BASE_PATH}/active?${params.toString()}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch active survey campaigns',
    };
  }
}

/**
 * Get survey campaign by ID
 */
export async function getSurveyCampaign(id: string): Promise<ApiResponse<SurveyCampaign>> {
  try {
    const response = await apiClient.get(`${BASE_PATH}/${id}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch survey campaign',
    };
  }
}

/**
 * Get survey campaigns list
 */
export async function listSurveyCampaigns(options?: {
  supplierId?: string;
  status?: string;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<SurveyCampaign[]>> {
  try {
    const params = new URLSearchParams();

    if (options?.supplierId) {
      params.append('supplierId', options.supplierId);
    }
    if (options?.status) {
      params.append('status', options.status);
    }
    if (options?.isActive !== undefined) {
      params.append('isActive', String(options.isActive));
    }
    if (options?.isPublished !== undefined) {
      params.append('isPublished', String(options.isPublished));
    }
    if (options?.page !== undefined) {
      params.append('page', String(options.page));
    }
    if (options?.limit !== undefined) {
      params.append('limit', String(options.limit));
    }

    const queryString = params.toString();
    const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: 'Failed to list survey campaigns',
    };
  }
}

/**
 * Submit a survey response
 */
export async function submitSurveyResponse(
  campaignId: string,
  submissionData: SurveySubmissionData
): Promise<ApiResponse<void>> {
  try {
    const response = await apiClient.post(`${BASE_PATH}/${campaignId}/submit`, submissionData);
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: 'Failed to submit survey response',
    };
  }
}

/**
 * Get campaign statistics
 */
export async function getSurveyCampaignStatistics(
  campaignId: string
): Promise<ApiResponse<SurveyStatistics>> {
  try {
    const response = await apiClient.get(`${BASE_PATH}/${campaignId}/stats`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch campaign statistics',
    };
  }
}
