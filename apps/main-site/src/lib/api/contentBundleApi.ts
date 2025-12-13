/**
 * ContentBundle API Client
 *
 * LMS Core ContentBundle 및 Quiz/Survey API 클라이언트
 */

import { authClient } from '@o4o/auth-client';

const apiClient = authClient.api;
const BASE_PATH = '/api/v1/lms';

// ============================================
// Types
// ============================================

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  answer?: string | string[];
  points?: number;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  isPublished: boolean;
  publishedAt?: string;
  bundleId?: string;
  courseId?: string;
  passingScore: number;
  timeLimit?: number;
  maxAttempts?: number;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  status: 'in_progress' | 'completed' | 'timed_out';
  score?: number;
  earnedPoints: number;
  totalPoints: number;
  passed?: boolean;
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  attemptNumber: number;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  points?: number;
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  order: number;
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  type: 'single' | 'multi' | 'text' | 'rating' | 'scale' | 'date' | 'number';
  question: string;
  description?: string;
  options: QuestionOption[];
  order: number;
  isRequired: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  maxLength?: number;
  conditionalDisplay?: {
    questionId: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: string;
  };
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  isPublished: boolean;
  publishedAt?: string;
  bundleId?: string;
  startAt?: string;
  endAt?: string;
  allowAnonymous: boolean;
  allowMultipleResponses: boolean;
  maxResponses?: number;
  responseCount: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  questions?: SurveyQuestion[];
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId?: string;
  answers: QuestionAnswer[];
  status: 'in_progress' | 'completed';
  completedAt?: string;
  timeSpent?: number;
  isAnonymous: boolean;
}

export interface QuestionAnswer {
  questionId: string;
  value: string | string[] | number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Quiz API
// ============================================

export const quizApi = {
  // Get quiz by ID
  getQuiz: async (quizId: string): Promise<ApiResponse<Quiz>> => {
    const response = await apiClient.get(`${BASE_PATH}/quizzes/${quizId}`);
    return response.data;
  },

  // Get quizzes by bundle
  getQuizzesByBundle: async (bundleId: string): Promise<ApiResponse<Quiz[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/quizzes/bundle/${bundleId}`);
    return response.data;
  },

  // Start quiz attempt
  startAttempt: async (quizId: string): Promise<ApiResponse<QuizAttempt>> => {
    const response = await apiClient.post(`${BASE_PATH}/quizzes/${quizId}/attempts`);
    return response.data;
  },

  // Submit quiz answer
  submitAnswer: async (
    attemptId: string,
    questionId: string,
    answer: string | string[]
  ): Promise<ApiResponse<QuizAnswer>> => {
    const response = await apiClient.post(`${BASE_PATH}/quizzes/attempts/${attemptId}/answers`, {
      questionId,
      answer,
    });
    return response.data;
  },

  // Complete quiz attempt
  completeAttempt: async (attemptId: string): Promise<ApiResponse<QuizAttempt>> => {
    const response = await apiClient.post(`${BASE_PATH}/quizzes/attempts/${attemptId}/complete`);
    return response.data;
  },

  // Get user's attempts for a quiz
  getUserAttempts: async (quizId: string): Promise<ApiResponse<QuizAttempt[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/quizzes/${quizId}/attempts/me`);
    return response.data;
  },
};

// ============================================
// Survey API
// ============================================

export const surveyApi = {
  // Get survey by ID
  getSurvey: async (surveyId: string): Promise<ApiResponse<Survey>> => {
    const response = await apiClient.get(`${BASE_PATH}/surveys/${surveyId}`);
    return response.data;
  },

  // Get surveys by bundle
  getSurveysByBundle: async (bundleId: string): Promise<ApiResponse<Survey[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/surveys/bundle/${bundleId}`);
    return response.data;
  },

  // Get survey questions
  getQuestions: async (surveyId: string): Promise<ApiResponse<SurveyQuestion[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/surveys/${surveyId}/questions`);
    return response.data;
  },

  // Start survey response
  startResponse: async (surveyId: string): Promise<ApiResponse<SurveyResponse>> => {
    const response = await apiClient.post(`${BASE_PATH}/surveys/${surveyId}/responses`);
    return response.data;
  },

  // Submit survey answer
  submitAnswer: async (
    responseId: string,
    questionId: string,
    value: string | string[] | number
  ): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`${BASE_PATH}/surveys/responses/${responseId}/answers`, {
      questionId,
      value,
    });
    return response.data;
  },

  // Complete survey response
  completeResponse: async (responseId: string): Promise<ApiResponse<SurveyResponse>> => {
    const response = await apiClient.post(`${BASE_PATH}/surveys/responses/${responseId}/complete`);
    return response.data;
  },

  // Check if user has responded
  hasUserResponded: async (surveyId: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.get(`${BASE_PATH}/surveys/${surveyId}/responses/check`);
    return response.data;
  },
};

// Default export
export default {
  quiz: quizApi,
  survey: surveyApi,
};
