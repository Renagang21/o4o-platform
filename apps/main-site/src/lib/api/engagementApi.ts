/**
 * Engagement API Client
 *
 * LMS Core Engagement Logging API 클라이언트
 */

import { authClient } from '@o4o/auth-client';

const apiClient = authClient.api;
const BASE_PATH = '/api/v1/lms/engagement';

// ============================================
// Types
// ============================================

export type EngagementEventType =
  | 'view'
  | 'click'
  | 'reaction'
  | 'quiz-submit'
  | 'survey-submit'
  | 'acknowledge'
  | 'complete';

export interface EngagementMetadata {
  // View event
  referrer?: string;
  pageTitle?: string;
  duration?: number;

  // Click event
  elementId?: string;
  elementType?: string;
  href?: string;

  // Reaction event
  reactionType?: string;

  // Quiz submit event
  quizId?: string;
  score?: number;
  passed?: boolean;
  answers?: any[];

  // Survey submit event
  surveyId?: string;
  responseId?: string;

  // Acknowledge event
  acknowledgedAt?: string;

  // Complete event
  completedAt?: string;
  timeSpent?: number;

  // Custom data
  [key: string]: any;
}

export interface EngagementLog {
  id: string;
  userId: string;
  bundleId?: string;
  lessonId?: string;
  event: EngagementEventType;
  metadata: EngagementMetadata;
  createdAt: string;
}

export interface BundleStats {
  bundleId: string;
  viewCount: number;
  uniqueViewers: number;
  clickCount: number;
  reactionCount: number;
  quizSubmitCount: number;
  surveySubmitCount: number;
  acknowledgeCount: number;
  completeCount: number;
}

export interface UserEngagementSummary {
  userId: string;
  totalViews: number;
  totalClicks: number;
  totalReactions: number;
  quizzesCompleted: number;
  surveysCompleted: number;
  bundlesAcknowledged: number;
  bundlesCompleted: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Engagement Logging API
// ============================================

export const engagementApi = {
  // Log generic event
  logEvent: async (
    event: EngagementEventType,
    options: {
      bundleId?: string;
      lessonId?: string;
      metadata?: EngagementMetadata;
    }
  ): Promise<ApiResponse<EngagementLog>> => {
    const response = await apiClient.post(`${BASE_PATH}/log`, {
      event,
      ...options,
    });
    return response.data;
  },

  // Log view event
  logView: async (
    bundleId: string,
    metadata?: EngagementMetadata
  ): Promise<ApiResponse<EngagementLog>> => {
    const response = await apiClient.post(`${BASE_PATH}/log/view`, {
      bundleId,
      metadata,
    });
    return response.data;
  },

  // Log click event
  logClick: async (
    bundleId: string,
    elementId?: string,
    metadata?: EngagementMetadata
  ): Promise<ApiResponse<EngagementLog>> => {
    const response = await apiClient.post(`${BASE_PATH}/log/click`, {
      bundleId,
      elementId,
      metadata,
    });
    return response.data;
  },

  // Log reaction event
  logReaction: async (
    bundleId: string,
    reactionType: string,
    metadata?: EngagementMetadata
  ): Promise<ApiResponse<EngagementLog>> => {
    const response = await apiClient.post(`${BASE_PATH}/log/reaction`, {
      bundleId,
      reactionType,
      metadata,
    });
    return response.data;
  },

  // Log quiz submission
  logQuizSubmit: async (
    bundleId: string | undefined,
    quizId: string,
    score: number,
    passed: boolean,
    answers?: any[]
  ): Promise<ApiResponse<EngagementLog>> => {
    const response = await apiClient.post(`${BASE_PATH}/log/quiz-submit`, {
      bundleId,
      quizId,
      score,
      passed,
      answers,
    });
    return response.data;
  },

  // Log survey submission
  logSurveySubmit: async (
    bundleId: string | undefined,
    surveyId: string,
    responseId: string
  ): Promise<ApiResponse<EngagementLog>> => {
    const response = await apiClient.post(`${BASE_PATH}/log/survey-submit`, {
      bundleId,
      surveyId,
      responseId,
    });
    return response.data;
  },

  // Log acknowledge event
  logAcknowledge: async (
    bundleId: string,
    metadata?: EngagementMetadata
  ): Promise<ApiResponse<EngagementLog>> => {
    const response = await apiClient.post(`${BASE_PATH}/log/acknowledge`, {
      bundleId,
      metadata,
    });
    return response.data;
  },

  // Log complete event
  logComplete: async (
    bundleId: string,
    lessonId?: string,
    metadata?: EngagementMetadata
  ): Promise<ApiResponse<EngagementLog>> => {
    const response = await apiClient.post(`${BASE_PATH}/log/complete`, {
      bundleId,
      lessonId,
      metadata,
    });
    return response.data;
  },

  // Get logs by user
  getLogsByUser: async (
    userId: string,
    options?: { event?: EngagementEventType; limit?: number; offset?: number }
  ): Promise<ApiResponse<EngagementLog[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/logs/user/${userId}`, {
      params: options,
    });
    return response.data;
  },

  // Get logs by bundle
  getLogsByBundle: async (
    bundleId: string,
    options?: { event?: EngagementEventType; limit?: number; offset?: number }
  ): Promise<ApiResponse<EngagementLog[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/logs/bundle/${bundleId}`, {
      params: options,
    });
    return response.data;
  },

  // Get bundle stats
  getBundleStats: async (bundleId: string): Promise<ApiResponse<BundleStats>> => {
    const response = await apiClient.get(`${BASE_PATH}/stats/bundle/${bundleId}`);
    return response.data;
  },

  // Get user engagement summary
  getUserSummary: async (userId: string): Promise<ApiResponse<UserEngagementSummary>> => {
    const response = await apiClient.get(`${BASE_PATH}/stats/user/${userId}`);
    return response.data;
  },

  // Check if user has viewed
  hasUserViewed: async (bundleId: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.get(`${BASE_PATH}/check/viewed`, {
      params: { bundleId },
    });
    return response.data;
  },

  // Check if user has completed
  hasUserCompleted: async (bundleId: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.get(`${BASE_PATH}/check/completed`, {
      params: { bundleId },
    });
    return response.data;
  },
};

// Default export
export default engagementApi;
