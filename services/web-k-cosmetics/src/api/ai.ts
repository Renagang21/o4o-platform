/**
 * AI API — K-Cosmetics
 * WO-O4O-LMS-AI-MINIMAL-V1
 *
 * Mirrors KPA aiApi shape. Phase 1: on-demand only.
 */

import { api } from '../lib/apiClient';

export type AiAnalyzeKind = 'quiz' | 'live' | 'assignment';

export interface AiAnalyzeResult {
  summary: string;
  insights: string[];
  recommendations: string[];
}

export interface QuizAnalyzePayload {
  lessonId?: string;
  questions: Array<{
    id: string;
    question: string;
    type?: 'single' | 'multi' | 'text';
    options?: string[];
    correctAnswer?: string | string[];
  }>;
  userAnswers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect?: boolean;
  }>;
  score?: number;
  passingScore?: number;
}

export interface LiveAnalyzePayload {
  lessonId?: string;
  title: string;
  description?: string;
  notes?: string;
  transcript?: string;
}

export interface AssignmentAnalyzePayload {
  lessonId?: string;
  instructions?: string;
  submissionContent: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const aiApi = {
  analyzeQuiz: async (payload: QuizAnalyzePayload): Promise<ApiResponse<AiAnalyzeResult>> => {
    const { data } = await api.post<ApiResponse<AiAnalyzeResult>>('/ai/analyze', { type: 'quiz', payload });
    return data;
  },

  summarizeLive: async (payload: LiveAnalyzePayload): Promise<ApiResponse<AiAnalyzeResult>> => {
    const { data } = await api.post<ApiResponse<AiAnalyzeResult>>('/ai/analyze', { type: 'live', payload });
    return data;
  },

  feedbackAssignment: async (payload: AssignmentAnalyzePayload): Promise<ApiResponse<AiAnalyzeResult>> => {
    const { data } = await api.post<ApiResponse<AiAnalyzeResult>>('/ai/analyze', { type: 'assignment', payload });
    return data;
  },
};
