/**
 * Pharmacy-Hub 설문(Survey) API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#97) · §6 (#24)
 *
 * backend = 공통 `/api/v1/surveys` (WO-O4O-SURVEY-CORE-PHASE1-V1).
 * 신규 table·endpoint·migration 0 — KPA/GlycoPharm/K-Cosmetics 와 **같은 계약**이며
 * 서비스 경계는 `serviceKey='pharmacy-hub'` 로만 건다(목록 질의에 항상 주입한다).
 * 생성 시 `ownerType='service_operator'` · `visibility='members_only'` 기본값도
 * 3서비스와 동일하다 — PH 전용 분기 없음.
 *
 * 상세(GET /surveys/:id)의 실제 응답은 `{ survey, questions }` 이므로 여기서 한 번만
 * 평탄화해 화면은 정규화된 SurveyDetail 만 본다.
 */
import { api } from '../apiClient';

const SERVICE_KEY = 'pharmacy-hub';

export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
export type SurveyQuestionType = 'single' | 'multi' | 'text' | 'rating' | 'scale';

export interface SurveyItem {
  id: string;
  title: string;
  description?: string;
  status: SurveyStatus;
  responseCount: number;
  maxResponses?: number | null;
  serviceKey: string;
  visibility: string;
  rewardEnabled: boolean;
  rewardAmount: number;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  question: string;
  description?: string;
  options?: Array<{ id?: string; label: string; value: string; order: number }>;
  order: number;
  isRequired: boolean;
}

export interface SurveyDetail extends SurveyItem {
  questions: SurveyQuestion[];
}

export interface CreateSurveyPayload {
  title: string;
  description?: string;
  questions: Array<{
    type: SurveyQuestionType;
    question: string;
    description?: string;
    options?: Array<{ label: string; value: string; order: number }>;
    order?: number;
    isRequired?: boolean;
  }>;
  startAt?: string | null;
  endAt?: string | null;
  allowAnonymous?: boolean;
  rewardEnabled?: boolean;
  rewardAmount?: number;
  visibility?: string;
}

export interface SurveyAnswer {
  questionId: string;
  value: string | string[];
}

export interface SurveyMyResponse {
  id: string;
  surveyId: string;
  answers: Array<{ questionId: string; value: unknown; answeredAt?: string }>;
  completedAt?: string | null;
}

/** 목록 — serviceKey 는 호출부가 생략할 수 없다(서비스 경계). */
export async function listSurveys(params: {
  page?: number;
  limit?: number;
  status?: SurveyStatus;
  /** 'for-me' = 회원이 응답 가능한 active 설문만 */
  audience?: 'for-me' | 'mine';
} = {}): Promise<{ items: SurveyItem[]; total: number }> {
  const res = await api.get('/surveys', {
    params: { serviceKey: SERVICE_KEY, ...params },
  });
  return { items: (res.data?.data ?? []) as SurveyItem[], total: res.data?.total ?? 0 };
}

/** 상세 — `{survey, questions}` 를 평탄화한다. */
export async function getSurvey(id: string): Promise<SurveyDetail> {
  const res = await api.get(`/surveys/${encodeURIComponent(id)}`);
  const body = res.data?.data;
  if (!body?.survey) throw new Error(res.data?.error || '설문을 불러오지 못했습니다.');
  return { ...(body.survey as SurveyItem), questions: (body.questions ?? []) as SurveyQuestion[] };
}

/** 생성 (운영자). */
export async function createSurvey(payload: CreateSurveyPayload): Promise<SurveyItem> {
  const res = await api.post('/surveys', {
    ...payload,
    serviceKey: SERVICE_KEY,
    ownerType: 'service_operator',
    visibility: payload.visibility ?? 'members_only',
  });
  const survey = res.data?.data?.survey ?? res.data?.data;
  if (!survey) throw new Error(res.data?.error || '설문 생성에 실패했습니다.');
  return survey as SurveyItem;
}

/** 수정/상태 변경 (작성자 또는 admin — backend requireSurveyOwner). */
export async function updateSurvey(
  id: string,
  payload: Partial<CreateSurveyPayload> & { status?: SurveyStatus },
): Promise<void> {
  await api.patch(`/surveys/${encodeURIComponent(id)}`, payload);
}

/** 삭제 (작성자 또는 admin). */
export async function deleteSurvey(id: string): Promise<void> {
  await api.delete(`/surveys/${encodeURIComponent(id)}`);
}

/** 내 응답 조회 — 미응답이면 null. */
export async function getMySurveyResponse(id: string): Promise<SurveyMyResponse | null> {
  try {
    const res = await api.get(`/surveys/${encodeURIComponent(id)}/my-response`);
    return (res.data?.data?.response ?? null) as SurveyMyResponse | null;
  } catch {
    return null;
  }
}

/** 응답 제출 — 기명 응답만 사용한다(회원 커뮤니티 설문). 중복 응답은 409. */
export async function submitSurveyResponse(id: string, answers: SurveyAnswer[]): Promise<void> {
  await api.post(`/surveys/${encodeURIComponent(id)}/responses`, { answers });
}
