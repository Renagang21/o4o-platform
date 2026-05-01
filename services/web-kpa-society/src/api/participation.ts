/**
 * Participation API Service (KPA-side wrapper around O4O Survey Core API)
 *
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 *
 * KPA Frontend 4개 페이지(Create/List/Respond/Result)는 이전부터 ParticipationSet/
 * ParticipationQuestion/ParticipationResponse 도메인을 사용해 왔다.
 * 이번 단계에서 백엔드는 O4O 공통 Survey Core (`/api/v1/surveys/*`)로 통일되며,
 * 본 파일은 (1) Core Survey API를 호출하고 (2) ParticipationSet ↔ Survey 어댑터를 적용해
 * 기존 KPA 페이지 시그니처를 그대로 유지한다.
 */

import { coreApiClient } from './client';
import {
  ParticipationStatus,
  QuestionType as ParticipationQuestionType,
  ParticipationScopeType,
  AnonymityType,
  type ParticipationSet,
  type ParticipationQuestion,
  type ParticipationResponse,
  type ParticipationResult,
  type QuestionResponse,
  type QuestionResult,
} from '../pages/participation/types';
import type { ApiResponse, PaginatedResponse } from '../types';

// ─── Core 타입 (백엔드 응답 형태) ─────────────────────────────────────────────

type CoreSurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
type CoreQuestionType = 'single' | 'multi' | 'text' | 'rating' | 'scale' | 'date' | 'number';

interface CoreSurvey {
  id: string;
  title: string;
  description?: string;
  status: CoreSurveyStatus;
  isPublished: boolean;
  startAt?: string | null;
  endAt?: string | null;
  allowAnonymous: boolean;
  allowMultipleResponses: boolean;
  maxResponses?: number | null;
  responseCount: number;
  serviceKey: string;
  ownerType: string;
  ownerId?: string | null;
  organizationId?: string | null;
  visibility: string;
  targetFilter: Record<string, any>;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CoreQuestion {
  id: string;
  surveyId: string;
  type: CoreQuestionType;
  question: string;
  description?: string;
  options: Array<{ id: string; label: string; value: string; order: number }>;
  order: number;
  isRequired: boolean;
}

interface CoreResponse {
  id: string;
  surveyId: string;
  userId?: string | null;
  answers: Array<{ questionId: string; value: any; answeredAt?: string }>;
  status: 'in_progress' | 'completed' | 'abandoned';
  completedAt?: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

interface CoreSurveyDetail {
  survey: CoreSurvey;
  questions: CoreQuestion[];
}

// ─── 어댑터 ─────────────────────────────────────────────────────────────────

const STATUS_K2C: Record<ParticipationStatus, CoreSurveyStatus> = {
  [ParticipationStatus.DRAFT]: 'draft',
  [ParticipationStatus.ACTIVE]: 'active',
  [ParticipationStatus.CLOSED]: 'closed',
};

const STATUS_C2K: Record<CoreSurveyStatus, ParticipationStatus> = {
  draft: ParticipationStatus.DRAFT,
  active: ParticipationStatus.ACTIVE,
  closed: ParticipationStatus.CLOSED,
  archived: ParticipationStatus.CLOSED,  // archived는 KPA에 없음 → CLOSED로 매핑
};

const QTYPE_K2C: Record<ParticipationQuestionType, CoreQuestionType> = {
  [ParticipationQuestionType.SINGLE_CHOICE]: 'single',
  [ParticipationQuestionType.MULTIPLE_CHOICE]: 'multi',
  [ParticipationQuestionType.FREE_TEXT]: 'text',
  [ParticipationQuestionType.QUIZ]: 'single',  // QUIZ → single (Phase 1: Quiz 별도 구현 X)
};

const QTYPE_C2K: Record<CoreQuestionType, ParticipationQuestionType> = {
  single: ParticipationQuestionType.SINGLE_CHOICE,
  multi: ParticipationQuestionType.MULTIPLE_CHOICE,
  text: ParticipationQuestionType.FREE_TEXT,
  rating: ParticipationQuestionType.SINGLE_CHOICE,
  scale: ParticipationQuestionType.SINGLE_CHOICE,
  date: ParticipationQuestionType.FREE_TEXT,
  number: ParticipationQuestionType.FREE_TEXT,
};

function mapCoreQuestionToKpa(q: CoreQuestion): ParticipationQuestion {
  return {
    id: q.id,
    title: q.question,
    description: q.description,
    type: QTYPE_C2K[q.type] ?? ParticipationQuestionType.FREE_TEXT,
    options: (q.options ?? []).map((opt) => ({
      id: opt.id,
      text: opt.label,
      order: opt.order,
    })),
    isRequired: q.isRequired,
    order: q.order,
  };
}

function mapKpaQuestionToCore(q: ParticipationQuestion) {
  return {
    type: QTYPE_K2C[q.type],
    question: q.title,
    description: q.description,
    options: (q.options ?? []).map((opt) => ({
      id: opt.id,
      label: opt.text,
      value: opt.text,
      order: opt.order,
    })),
    order: q.order,
    isRequired: q.isRequired,
  };
}

function mapCoreSurveyToKpa(detail: CoreSurveyDetail): ParticipationSet {
  const { survey, questions } = detail;
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    status: STATUS_C2K[survey.status],
    questions: (questions ?? []).map(mapCoreQuestionToKpa),
    scope: {
      // Phase 1: scope는 PUBLIC 고정 노출 (UI는 hideScopeField로 숨김)
      scopeType: ParticipationScopeType.PUBLIC,
      anonymity: survey.allowAnonymous ? AnonymityType.ANONYMOUS : AnonymityType.IDENTIFIED,
      allowModification: false,
      startAt: survey.startAt ? new Date(survey.startAt) : undefined,
      endAt: survey.endAt ? new Date(survey.endAt) : undefined,
    },
    createdBy: survey.createdBy ?? '',
    createdAt: new Date(survey.createdAt),
    updatedAt: new Date(survey.updatedAt),
  };
}

function mapCoreSurveyListItemToKpa(survey: CoreSurvey): ParticipationSet {
  return mapCoreSurveyToKpa({ survey, questions: [] });
}

// ─── API ────────────────────────────────────────────────────────────────────

interface CoreListResponse {
  success: boolean;
  data: CoreSurvey[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CoreOk<T> {
  success: boolean;
  data: T;
}

export const participationApi = {
  /** 목록 조회 — KPA-Society 컨텍스트로 호출 */
  getParticipationSets: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<ParticipationSet>> => {
    const res = await coreApiClient.get<CoreListResponse>('/surveys', {
      ...(params ?? {}),
      serviceKey: 'kpa-society',
    } as any);
    return {
      data: (res.data ?? []).map(mapCoreSurveyListItemToKpa),
      total: res.total,
      page: res.page,
      limit: res.limit,
      totalPages: res.totalPages,
    };
  },

  /** 상세 조회 (질문 포함) */
  getParticipationSet: async (id: string): Promise<ApiResponse<ParticipationSet>> => {
    const res = await coreApiClient.get<CoreOk<CoreSurveyDetail>>(`/surveys/${id}`);
    return { success: res.success, data: mapCoreSurveyToKpa(res.data) };
  },

  /** 생성 — KPA scope 고정 (Phase 1) */
  createParticipationSet: async (
    payload: Omit<ParticipationSet, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  ): Promise<ApiResponse<ParticipationSet>> => {
    const body = {
      title: payload.title,
      description: payload.description,
      questions: (payload.questions ?? []).map(mapKpaQuestionToCore),
      startAt: payload.scope?.startAt,
      endAt: payload.scope?.endAt,
      allowAnonymous: payload.scope?.anonymity === AnonymityType.ANONYMOUS,
      allowMultipleResponses: payload.scope?.allowModification ?? false,
      serviceKey: 'kpa-society',
      ownerType: 'community_member',  // Phase 1
      visibility: 'members_only',     // Phase 1: KPA 회원
    };
    const res = await coreApiClient.post<CoreOk<CoreSurvey>>('/surveys', body);
    return { success: res.success, data: mapCoreSurveyListItemToKpa(res.data) };
  },

  /** 수정 */
  updateParticipationSet: async (
    id: string,
    payload: Partial<ParticipationSet>,
  ): Promise<ApiResponse<ParticipationSet>> => {
    const body: any = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.status !== undefined) body.status = STATUS_K2C[payload.status];
    if (payload.questions !== undefined) body.questions = payload.questions.map(mapKpaQuestionToCore);
    if (payload.scope) {
      if (payload.scope.startAt !== undefined) body.startAt = payload.scope.startAt;
      if (payload.scope.endAt !== undefined) body.endAt = payload.scope.endAt;
      if (payload.scope.anonymity !== undefined) body.allowAnonymous = payload.scope.anonymity === AnonymityType.ANONYMOUS;
      if (payload.scope.allowModification !== undefined) body.allowMultipleResponses = payload.scope.allowModification;
    }
    const res = await coreApiClient.patch<CoreOk<CoreSurvey>>(`/surveys/${id}`, body);
    return { success: res.success, data: mapCoreSurveyListItemToKpa(res.data) };
  },

  /** 삭제 */
  deleteParticipationSet: async (id: string): Promise<ApiResponse<void>> => {
    const res = await coreApiClient.delete<{ success: boolean }>(`/surveys/${id}`);
    return { success: res.success, data: undefined as any };
  },

  /** 응답 제출 */
  submitResponse: async (
    participationSetId: string,
    answers: ParticipationResponse['answers'],
  ): Promise<ApiResponse<ParticipationResponse>> => {
    // 익명 응답이면 클라이언트가 토큰 생성. localStorage에 보관해 중복 방지.
    const tokenKey = `survey:anon:${participationSetId}`;
    let anonymousToken: string | undefined = localStorage.getItem(tokenKey) ?? undefined;
    if (!anonymousToken) {
      anonymousToken = crypto.randomUUID ? crypto.randomUUID() : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(tokenKey, anonymousToken);
    }

    const body = {
      answers: (answers ?? []).map((a: QuestionResponse) => ({
        questionId: a.questionId,
        value: a.selectedOptionIds && a.selectedOptionIds.length > 0
          ? (a.selectedOptionIds.length === 1 ? a.selectedOptionIds[0] : a.selectedOptionIds)
          : a.textAnswer,
      })),
      anonymousToken,
    };
    const res = await coreApiClient.post<CoreOk<CoreResponse>>(
      `/surveys/${participationSetId}/responses`,
      body,
    );
    return {
      success: res.success,
      data: {
        id: res.data.id,
        participationSetId: res.data.surveyId,
        respondentId: res.data.userId ?? undefined,
        answers: (res.data.answers ?? []).map((a) => ({
          questionId: a.questionId,
          textAnswer: typeof a.value === 'string' ? a.value : undefined,
          selectedOptionIds: Array.isArray(a.value) ? a.value.map(String) : (a.value && typeof a.value !== 'object' ? [String(a.value)] : undefined),
        })),
        isSubmitted: res.data.status === 'completed',
        submittedAt: res.data.completedAt ? new Date(res.data.completedAt) : undefined,
        createdAt: new Date(res.data.createdAt),
      },
    };
  },

  /** 내 응답 조회 */
  getMyResponse: async (participationSetId: string): Promise<ParticipationResponse | null> => {
    try {
      const tokenKey = `survey:anon:${participationSetId}`;
      const anonymousToken = localStorage.getItem(tokenKey) ?? undefined;
      const params = anonymousToken ? { anonymousToken } : undefined;
      const res = await coreApiClient.get<CoreOk<CoreResponse | null>>(
        `/surveys/${participationSetId}/my-response`,
        params as any,
      );
      const r = res.data;
      if (!r) return null;
      return {
        id: r.id,
        participationSetId: r.surveyId,
        respondentId: r.userId ?? undefined,
        answers: (r.answers ?? []).map((a) => ({
          questionId: a.questionId,
          textAnswer: typeof a.value === 'string' ? a.value : undefined,
          selectedOptionIds: Array.isArray(a.value) ? a.value.map(String) : (a.value && typeof a.value !== 'object' ? [String(a.value)] : undefined),
        })),
        isSubmitted: r.status === 'completed',
        submittedAt: r.completedAt ? new Date(r.completedAt) : undefined,
        createdAt: new Date(r.createdAt),
      };
    } catch {
      return null;
    }
  },

  /** 결과 조회 */
  getResults: async (participationSetId: string): Promise<ApiResponse<ParticipationResult>> => {
    interface CoreAggResult {
      surveyId: string;
      responseCount: number;
      questions: Array<{
        questionId: string;
        questionTitle: string;
        questionType: CoreQuestionType;
        totalAnswers: number;
        optionCounts?: Record<string, number>;
        textAnswers?: string[];
        scaleStats?: { average: number; min: number; max: number };
      }>;
    }
    const res = await coreApiClient.get<CoreOk<CoreAggResult>>(
      `/surveys/${participationSetId}/results`,
    );
    const data = res.data;

    const questionResults: QuestionResult[] = data.questions.map((q) => {
      const total = q.totalAnswers;
      const optionResults = q.optionCounts
        ? Object.entries(q.optionCounts).map(([optionId, count]) => ({
            optionId,
            optionText: optionId,  // Phase 1: 옵션 라벨은 별도 매핑 필요 시 확장
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          }))
        : undefined;
      return {
        questionId: q.questionId,
        questionTitle: q.questionTitle,
        questionType: QTYPE_C2K[q.questionType] ?? ParticipationQuestionType.FREE_TEXT,
        totalResponses: total,
        optionResults,
        textResponses: q.textAnswers,
      };
    });

    return {
      success: res.success,
      data: {
        participationSetId: data.surveyId,
        totalRespondents: data.responseCount,
        questionResults,
        lastUpdated: new Date(),
      },
    };
  },

  /** 상태 변경 */
  updateStatus: async (id: string, status: ParticipationStatus): Promise<ApiResponse<ParticipationSet>> => {
    const res = await coreApiClient.patch<CoreOk<CoreSurvey>>(`/surveys/${id}`, {
      status: STATUS_K2C[status],
    });
    return { success: res.success, data: mapCoreSurveyListItemToKpa(res.data) };
  },
};
