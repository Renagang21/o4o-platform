/**
 * AI API — GlycoPharm
 * WO-O4O-GLYCOPHARM-LMS-PHASE2-LEARNER-FRONTEND-V1
 *
 * Mirrors K-Cosmetics aiApi shape for LMS lesson player AI features.
 */

import { api } from '@/lib/apiClient';

export type AiAnalyzeKind = 'quiz' | 'assignment';

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

  feedbackAssignment: async (payload: AssignmentAnalyzePayload): Promise<ApiResponse<AiAnalyzeResult>> => {
    const { data } = await api.post<ApiResponse<AiAnalyzeResult>>('/ai/analyze', { type: 'assignment', payload });
    return data;
  },
};
