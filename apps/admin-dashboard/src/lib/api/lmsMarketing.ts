/**
 * LMS-Marketing API Client
 *
 * API client for Marketing LMS Extension
 * Phase R10: Supplier Publishing UI
 */

import { authClient } from '@o4o/auth-client';

const API_BASE = '/api/v1/lms-marketing';

// ===== Types =====

export interface TargetAudience {
  targets: ('seller' | 'consumer' | 'pharmacist' | 'all')[];
  regions?: string[];
  tags?: string[];
  sellerTypes?: string[];
}

// Product Content Types
export interface ProductContent {
  id: string;
  supplierId: string;
  title: string;
  description: string | null;
  bundleId: string | null;
  targeting: TargetAudience;
  isPublished: boolean;
  isActive: boolean;
  publishedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductContentDto {
  supplierId: string;
  title: string;
  description?: string;
  bundleId?: string;
  targeting?: TargetAudience;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductContentDto {
  title?: string;
  description?: string;
  bundleId?: string;
  targeting?: TargetAudience;
  metadata?: Record<string, unknown>;
}

// Quiz Campaign Types
export interface QuizQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  question: string;
  options: { id: string; text: string; imageUrl?: string }[];
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

export interface QuizCampaign {
  id: string;
  supplierId: string;
  title: string;
  description: string | null;
  bundleId: string | null;
  questions: QuizQuestion[];
  targeting: TargetAudience;
  rewards: QuizReward[];
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'archived';
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isPublished: boolean;
  passScorePercent: number;
  participationCount: number;
  completionCount: number;
  averageScore: number;
  publishedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuizCampaignDto {
  supplierId: string;
  title: string;
  description?: string;
  bundleId?: string;
  questions?: QuizQuestion[];
  targeting?: TargetAudience;
  rewards?: QuizReward[];
  startDate?: string;
  endDate?: string;
  passScorePercent?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateQuizCampaignDto {
  title?: string;
  description?: string;
  bundleId?: string;
  questions?: QuizQuestion[];
  targeting?: TargetAudience;
  rewards?: QuizReward[];
  startDate?: string;
  endDate?: string;
  passScorePercent?: number;
  metadata?: Record<string, unknown>;
}

// Survey Campaign Types
export interface SurveyQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'textarea' | 'rating' | 'scale' | 'date' | 'email' | 'phone';
  question: string;
  options?: { id: string; text: string; imageUrl?: string; value?: string | number }[];
  required: boolean;
  order: number;
}

export interface SurveyReward {
  type: 'points' | 'coupon' | 'badge' | 'none';
  value: string;
  description?: string;
}

export interface SurveyCampaign {
  id: string;
  supplierId: string;
  surveyId: string | null;
  title: string;
  description: string | null;
  bundleId: string | null;
  questions: SurveyQuestion[];
  targeting: TargetAudience;
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

export interface CreateSurveyCampaignDto {
  supplierId: string;
  surveyId?: string;
  title: string;
  description?: string;
  bundleId?: string;
  questions?: SurveyQuestion[];
  targeting?: TargetAudience;
  reward?: SurveyReward;
  startDate?: string;
  endDate?: string;
  allowAnonymous?: boolean;
  maxResponses?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateSurveyCampaignDto {
  title?: string;
  description?: string;
  surveyId?: string;
  bundleId?: string;
  questions?: SurveyQuestion[];
  targeting?: TargetAudience;
  reward?: SurveyReward;
  startDate?: string;
  endDate?: string;
  allowAnonymous?: boolean;
  maxResponses?: number;
  metadata?: Record<string, unknown>;
}

// Insights Types
export interface SupplierDashboardSummary {
  supplierId: string;
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalParticipants: number;
    totalCompletions: number;
    overallCompletionRate: number;
  };
  byType: {
    type: 'product' | 'quiz' | 'survey';
    total: number;
    active: number;
    draft: number;
    ended: number;
    totalParticipants: number;
    totalCompletions: number;
  }[];
  recentActivity: {
    id: string;
    type: 'product' | 'quiz' | 'survey';
    title: string;
    action: 'created' | 'published' | 'ended' | 'response';
    timestamp: string;
  }[];
}

// API Response Types
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// ===== Product Content API =====

export const productContentApi = {
  async list(supplierId?: string): Promise<ApiResponse<PaginatedResponse<ProductContent>>> {
    try {
      const url = supplierId
        ? `${API_BASE}/product?supplierId=${supplierId}`
        : `${API_BASE}/product`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list product contents:', error);
      return { success: false, error: 'Failed to list product contents' };
    }
  },

  async get(id: string): Promise<ApiResponse<ProductContent>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/product/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get product content:', error);
      return { success: false, error: 'Failed to get product content' };
    }
  },

  async create(dto: CreateProductContentDto): Promise<ApiResponse<ProductContent>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/product`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create product content:', error);
      return { success: false, error: 'Failed to create product content' };
    }
  },

  async update(id: string, dto: UpdateProductContentDto): Promise<ApiResponse<ProductContent>> {
    try {
      const response = await authClient.api.put(`${API_BASE}/product/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update product content:', error);
      return { success: false, error: 'Failed to update product content' };
    }
  },

  async publish(id: string): Promise<ApiResponse<ProductContent>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/product/${id}/publish`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to publish product content:', error);
      return { success: false, error: 'Failed to publish product content' };
    }
  },

  async unpublish(id: string): Promise<ApiResponse<ProductContent>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/product/${id}/deactivate`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to unpublish product content:', error);
      return { success: false, error: 'Failed to unpublish product content' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/product/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete product content:', error);
      return { success: false, error: 'Failed to delete product content' };
    }
  },
};

// ===== Quiz Campaign API =====

export const quizCampaignApi = {
  async list(supplierId?: string): Promise<ApiResponse<PaginatedResponse<QuizCampaign>>> {
    try {
      const url = supplierId
        ? `${API_BASE}/quiz-campaign/supplier/${supplierId}`
        : `${API_BASE}/quiz-campaign`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list quiz campaigns:', error);
      return { success: false, error: 'Failed to list quiz campaigns' };
    }
  },

  async get(id: string): Promise<ApiResponse<QuizCampaign>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/quiz-campaign/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get quiz campaign:', error);
      return { success: false, error: 'Failed to get quiz campaign' };
    }
  },

  async create(dto: CreateQuizCampaignDto): Promise<ApiResponse<QuizCampaign>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/quiz-campaign`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create quiz campaign:', error);
      return { success: false, error: 'Failed to create quiz campaign' };
    }
  },

  async update(id: string, dto: UpdateQuizCampaignDto): Promise<ApiResponse<QuizCampaign>> {
    try {
      const response = await authClient.api.put(`${API_BASE}/quiz-campaign/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update quiz campaign:', error);
      return { success: false, error: 'Failed to update quiz campaign' };
    }
  },

  async publish(id: string): Promise<ApiResponse<QuizCampaign>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/quiz-campaign/${id}/publish`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to publish quiz campaign:', error);
      return { success: false, error: 'Failed to publish quiz campaign' };
    }
  },

  async unpublish(id: string): Promise<ApiResponse<QuizCampaign>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/quiz-campaign/${id}/unpublish`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to unpublish quiz campaign:', error);
      return { success: false, error: 'Failed to unpublish quiz campaign' };
    }
  },

  async end(id: string): Promise<ApiResponse<QuizCampaign>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/quiz-campaign/${id}/end`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to end quiz campaign:', error);
      return { success: false, error: 'Failed to end quiz campaign' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/quiz-campaign/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete quiz campaign:', error);
      return { success: false, error: 'Failed to delete quiz campaign' };
    }
  },
};

// ===== Survey Campaign API =====

export const surveyCampaignApi = {
  async list(supplierId?: string): Promise<ApiResponse<PaginatedResponse<SurveyCampaign>>> {
    try {
      const url = supplierId
        ? `${API_BASE}/survey-campaign/supplier/${supplierId}`
        : `${API_BASE}/survey-campaign`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list survey campaigns:', error);
      return { success: false, error: 'Failed to list survey campaigns' };
    }
  },

  async get(id: string): Promise<ApiResponse<SurveyCampaign>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/survey-campaign/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get survey campaign:', error);
      return { success: false, error: 'Failed to get survey campaign' };
    }
  },

  async create(dto: CreateSurveyCampaignDto): Promise<ApiResponse<SurveyCampaign>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/survey-campaign`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create survey campaign:', error);
      return { success: false, error: 'Failed to create survey campaign' };
    }
  },

  async update(id: string, dto: UpdateSurveyCampaignDto): Promise<ApiResponse<SurveyCampaign>> {
    try {
      const response = await authClient.api.put(`${API_BASE}/survey-campaign/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update survey campaign:', error);
      return { success: false, error: 'Failed to update survey campaign' };
    }
  },

  async publish(id: string): Promise<ApiResponse<SurveyCampaign>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/survey-campaign/${id}/publish`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to publish survey campaign:', error);
      return { success: false, error: 'Failed to publish survey campaign' };
    }
  },

  async unpublish(id: string): Promise<ApiResponse<SurveyCampaign>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/survey-campaign/${id}/unpublish`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to unpublish survey campaign:', error);
      return { success: false, error: 'Failed to unpublish survey campaign' };
    }
  },

  async end(id: string): Promise<ApiResponse<SurveyCampaign>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/survey-campaign/${id}/end`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to end survey campaign:', error);
      return { success: false, error: 'Failed to end survey campaign' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/survey-campaign/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete survey campaign:', error);
      return { success: false, error: 'Failed to delete survey campaign' };
    }
  },

  async getStats(id: string): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/survey-campaign/${id}/stats`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get survey campaign stats:', error);
      return { success: false, error: 'Failed to get survey campaign stats' };
    }
  },
};

// ===== Insights API =====

export const insightsApi = {
  async getDashboard(supplierId: string): Promise<ApiResponse<SupplierDashboardSummary>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/insights/dashboard/${supplierId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get dashboard:', error);
      return { success: false, error: 'Failed to get dashboard' };
    }
  },

  async getPerformance(supplierId: string, options?: { type?: string; status?: string }): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.status) params.append('status', options.status);
      const url = `${API_BASE}/insights/performance/${supplierId}${params.toString() ? `?${params}` : ''}`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get performance:', error);
      return { success: false, error: 'Failed to get performance' };
    }
  },

  async getTrends(supplierId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/insights/trends/${supplierId}?period=${period}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get trends:', error);
      return { success: false, error: 'Failed to get trends' };
    }
  },

  async exportData(supplierId: string, format: 'json' | 'csv' = 'csv'): Promise<ApiResponse<Blob>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/insights/export/${supplierId}?format=${format}`, {
        responseType: 'blob',
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to export data:', error);
      return { success: false, error: 'Failed to export data' };
    }
  },
};

// ===== Onboarding Types =====

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export interface OnboardingChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

export interface SupplierProfile {
  id: string;
  supplierId: string;
  brandName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  categories: string[];
  productTypes: string[];
  region: string | null;
  onboardingStatus: OnboardingStatus;
  onboardingChecklist: OnboardingChecklistItem[];
  onboardingCompletedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSupplierProfileDto {
  supplierId: string;
  brandName?: string;
  contactEmail?: string;
  contactPhone?: string;
  categories?: string[];
  productTypes?: string[];
  region?: string;
  metadata?: Record<string, unknown>;
}

export interface OnboardingChecklistResponse {
  items: OnboardingChecklistItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  status: OnboardingStatus;
}

// ===== Onboarding API =====

export const onboardingApi = {
  async getProfile(supplierId: string): Promise<ApiResponse<SupplierProfile>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/onboarding/profile?supplierId=${supplierId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get supplier profile:', error);
      return { success: false, error: 'Failed to get supplier profile' };
    }
  },

  async updateProfile(dto: UpdateSupplierProfileDto): Promise<ApiResponse<SupplierProfile>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/onboarding/profile`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update supplier profile:', error);
      return { success: false, error: 'Failed to update supplier profile' };
    }
  },

  async getChecklist(supplierId: string): Promise<ApiResponse<OnboardingChecklistResponse>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/onboarding/checklist?supplierId=${supplierId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get onboarding checklist:', error);
      return { success: false, error: 'Failed to get onboarding checklist' };
    }
  },

  async markComplete(supplierId: string): Promise<ApiResponse<SupplierProfile>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/onboarding/complete`, { supplierId });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
      return { success: false, error: 'Failed to mark onboarding complete' };
    }
  },

  async trackDashboardView(supplierId: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.post(`${API_BASE}/onboarding/track-dashboard`, { supplierId });
      return { success: true };
    } catch (error) {
      console.error('Failed to track dashboard view:', error);
      return { success: false, error: 'Failed to track dashboard view' };
    }
  },
};

// ===== Automation Types =====

export type AutomationRuleType =
  | 'auto_publish_scheduled'
  | 'auto_end_expired'
  | 'auto_pause_low_engagement'
  | 'auto_boost_high_performing';

export interface AutomationSettings {
  autoPublishScheduled: boolean;
  autoEndExpired: boolean;
  autoPauseLowEngagement: boolean;
  lowEngagementThreshold: number;
  autoPauseDaysWithoutEngagement: number;
  autoBoostHighPerforming: boolean;
  highPerformingThreshold: number;
}

export interface AutomationLogEntry {
  timestamp: string;
  ruleType: AutomationRuleType;
  campaignType: 'quiz' | 'survey';
  campaignId: string;
  campaignTitle: string;
  action: string;
  success: boolean;
  error?: string;
}

export interface AutomationRunResult {
  ruleType: AutomationRuleType;
  processed: number;
  successful: number;
  failed: number;
  logs: AutomationLogEntry[];
}

// ===== Automation API =====

export const automationApi = {
  async getSettings(): Promise<ApiResponse<AutomationSettings>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/automation/settings`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get automation settings:', error);
      return { success: false, error: 'Failed to get automation settings' };
    }
  },

  async updateSettings(settings: Partial<AutomationSettings>): Promise<ApiResponse<AutomationSettings>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/automation/settings`, settings);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update automation settings:', error);
      return { success: false, error: 'Failed to update automation settings' };
    }
  },

  async getLogs(options?: { limit?: number; ruleType?: AutomationRuleType }): Promise<ApiResponse<AutomationLogEntry[]>> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.ruleType) params.append('ruleType', options.ruleType);
      const url = `${API_BASE}/automation/logs${params.toString() ? `?${params}` : ''}`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get automation logs:', error);
      return { success: false, error: 'Failed to get automation logs' };
    }
  },

  async clearLogs(): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/automation/logs`);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear automation logs:', error);
      return { success: false, error: 'Failed to clear automation logs' };
    }
  },

  async runAutomation(): Promise<ApiResponse<{ results: AutomationRunResult[]; totalProcessed: number; totalSuccessful: number; totalFailed: number }>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/automation/run`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to run automation:', error);
      return { success: false, error: 'Failed to run automation' };
    }
  },
};
