/**
 * AI API — Pharmacy-Hub
 *
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §12·§13
 *
 * 공통 LessonPlayerView 의 퀴즈 오답 분석 / 과제 피드백 패널이 요구하는 port 메서드용.
 * 백엔드는 service-neutral 공통 endpoint `POST /api/v1/ai/analyze` 하나뿐이며
 * (WO-O4O-LMS-AI-MINIMAL-V1), PH 전용 AI endpoint 는 만들지 않는다.
 */

import { api } from '../lib/apiClient';

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
