/**
 * AI API 서비스 (WO-O4O-LMS-AI-MINIMAL-V1)
 *
 * Phase 1: on-demand 분석만 — 저장/히스토리/개인화 없음.
 */

import { apiClient } from './client';
import type { ApiResponse } from '../types';

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

export const aiApi = {
  analyzeQuiz: (payload: QuizAnalyzePayload) =>
    apiClient.post<ApiResponse<AiAnalyzeResult>>('/ai/analyze', { type: 'quiz', payload }),

  summarizeLive: (payload: LiveAnalyzePayload) =>
    apiClient.post<ApiResponse<AiAnalyzeResult>>('/ai/analyze', { type: 'live', payload }),

  feedbackAssignment: (payload: AssignmentAnalyzePayload) =>
    apiClient.post<ApiResponse<AiAnalyzeResult>>('/ai/analyze', { type: 'assignment', payload }),
};
