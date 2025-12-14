/**
 * Quiz Campaign API Client
 *
 * API client for interacting with marketing quiz campaigns.
 */

import { authClient } from '@o4o/auth-client';

const apiClient = authClient.api;
const BASE_PATH = '/api/v1/lms-marketing/quiz-campaign';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

export interface QuizOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  question: string;
  options: QuizOption[];
  correctAnswers: string[];
  points: number;
  explanation?: string;
  order: number;
}

export interface QuizReward {
  type: 'points' | 'coupon' | 'badge' | 'certificate';
  value: string;
  minScorePercent: number;
  description?: string;
}

export interface QuizCampaignTargeting {
  targets: ('seller' | 'consumer' | 'pharmacist' | 'all')[];
  regions?: string[];
  tags?: string[];
  sellerTypes?: string[];
}

export interface QuizCampaign {
  id: string;
  supplierId: string;
  title: string;
  description: string | null;
  bundleId: string | null;
  questions: QuizQuestion[];
  targeting: QuizCampaignTargeting;
  rewards: QuizReward[];
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'archived';
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isPublished: boolean;
  timeLimitSeconds: number | null;
  maxAttempts: number | null;
  passScorePercent: number;
  showCorrectAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  participationCount: number;
  completionCount: number;
  averageScore: number;
  publishedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttemptData {
  userId: string;
  answers: Record<string, string[]>;
  score: number;
  totalPoints: number;
  passed: boolean;
  timeSpentSeconds?: number;
}

export interface QuizStatistics {
  participationCount: number;
  completionCount: number;
  averageScore: number;
  completionRate: number;
}

/**
 * Get all quiz campaigns targeted for the current user
 */
export async function getTargetedQuizCampaigns(
  role: 'seller' | 'consumer' | 'pharmacist' | 'all',
  options?: {
    region?: string;
    sellerType?: string;
    tags?: string[];
  }
): Promise<ApiResponse<QuizCampaign[]>> {
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

    const response = await apiClient.get(`${BASE_PATH}/targeted?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[quizCampaignApi] getTargetedQuizCampaigns error:', error);
    return {
      success: false,
      error: 'Failed to fetch targeted quiz campaigns',
    };
  }
}

/**
 * Get quiz campaign by ID
 */
export async function getQuizCampaign(id: string): Promise<ApiResponse<QuizCampaign>> {
  try {
    const response = await apiClient.get(`${BASE_PATH}/${id}`);
    return response.data;
  } catch (error) {
    console.error('[quizCampaignApi] getQuizCampaign error:', error);
    return {
      success: false,
      error: 'Failed to fetch quiz campaign',
    };
  }
}

/**
 * Get quiz campaigns list
 */
export async function listQuizCampaigns(options?: {
  supplierId?: string;
  status?: string;
  isActive?: boolean;
  isPublished?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<QuizCampaign[]>> {
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
    if (options?.limit !== undefined) {
      params.append('limit', String(options.limit));
    }
    if (options?.offset !== undefined) {
      params.append('offset', String(options.offset));
    }

    const queryString = params.toString();
    const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('[quizCampaignApi] listQuizCampaigns error:', error);
    return {
      success: false,
      error: 'Failed to list quiz campaigns',
    };
  }
}

/**
 * Record a quiz attempt
 */
export async function recordQuizAttempt(
  campaignId: string,
  attemptData: QuizAttemptData
): Promise<ApiResponse<void>> {
  try {
    const response = await apiClient.post(`${BASE_PATH}/${campaignId}/attempt`, attemptData);
    return response.data;
  } catch (error) {
    console.error('[quizCampaignApi] recordQuizAttempt error:', error);
    return {
      success: false,
      error: 'Failed to record quiz attempt',
    };
  }
}

/**
 * Get campaign statistics
 */
export async function getQuizCampaignStatistics(
  campaignId: string
): Promise<ApiResponse<QuizStatistics>> {
  try {
    const response = await apiClient.get(`${BASE_PATH}/${campaignId}/statistics`);
    return response.data;
  } catch (error) {
    console.error('[quizCampaignApi] getQuizCampaignStatistics error:', error);
    return {
      success: false,
      error: 'Failed to fetch campaign statistics',
    };
  }
}
