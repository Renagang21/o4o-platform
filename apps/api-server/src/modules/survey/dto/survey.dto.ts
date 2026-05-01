/**
 * Survey DTO
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 */

import {
  SurveyStatus,
  SurveyOwnerType,
  SurveyVisibility,
  QuestionType,
  type QuestionOption,
} from '@o4o/lms-core';

export interface CreateSurveyQuestionInput {
  type: QuestionType;
  question: string;
  description?: string;
  options?: QuestionOption[];
  order?: number;
  isRequired?: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  maxLength?: number;
}

export interface CreateSurveyDto {
  title: string;
  description?: string;
  questions: CreateSurveyQuestionInput[];
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  allowAnonymous?: boolean;
  allowMultipleResponses?: boolean;
  maxResponses?: number;

  // O4O 공통 분류
  serviceKey?: string;
  ownerType?: SurveyOwnerType;
  ownerId?: string;
  organizationId?: string;
  visibility?: SurveyVisibility;
  targetFilter?: Record<string, any>;
}

export interface UpdateSurveyDto {
  title?: string;
  description?: string;
  status?: SurveyStatus;
  questions?: CreateSurveyQuestionInput[];
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  allowAnonymous?: boolean;
  allowMultipleResponses?: boolean;
  maxResponses?: number;
  visibility?: SurveyVisibility;
  targetFilter?: Record<string, any>;
}

export interface SurveyListQuery {
  serviceKey?: string;
  ownerType?: SurveyOwnerType;
  ownerId?: string;
  status?: SurveyStatus;
  visibility?: SurveyVisibility;
  page?: number;
  limit?: number;
  /** 'for-me': 응답자 시점에서 자신이 볼 수 있는 설문만 */
  audience?: 'for-me' | 'mine';
}

export interface QuestionAnswerInput {
  questionId: string;
  value: any;
}

export interface SubmitResponseDto {
  answers: QuestionAnswerInput[];
  /** 익명 응답 시 클라이언트 생성 토큰 (sessionStorage 등). 기명 응답은 미사용. */
  anonymousToken?: string;
}
