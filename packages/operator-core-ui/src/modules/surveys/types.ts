/**
 * @o4o/operator-core-ui — Surveys module (types)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
 *
 * Operator 의 "설문조사 관리 / 설문 만들기" 공통 화면 타입.
 * KPA-Society 와 K-Cosmetics 에 동일 View 가 복제돼 있던 것을 하나로 합친다.
 * 서비스 wrapper 는 `client`(자체 api client + serviceKey) + `config`(경로/accent/policy key) 만 주입한다.
 *
 * API·DB 계약은 변경하지 않는다 — 각 서비스의 기존 client 를 그대로 감싼다.
 */

export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';

export type SurveyQuestionType = 'single' | 'multi' | 'text';

export interface OperatorSurveyItem {
  id: string;
  title: string;
  description?: string;
  status: SurveyStatus | string;
  responseCount: number;
  maxResponses?: number | null;
  rewardEnabled: boolean;
  rewardAmount: number;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
}

export interface OperatorSurveyListParams {
  page: number;
  limit: number;
}

export interface OperatorSurveyListResult {
  items: OperatorSurveyItem[];
  total: number;
}

export interface OperatorSurveyCreatePayload {
  title: string;
  description?: string;
  questions: Array<{
    type: SurveyQuestionType;
    question: string;
    order: number;
    isRequired: boolean;
    options?: Array<{ label: string; value: string; order: number }>;
  }>;
  startAt: string | null;
  endAt: string | null;
  rewardEnabled: boolean;
  rewardAmount: number;
  visibility: string;
}

/**
 * 서비스별 transport 차이(직접 body 반환 vs axios `.data` 래핑)를 wrapper 가 흡수한다.
 * 공통 화면은 정규화된 결과만 본다.
 */
export interface OperatorSurveysClient {
  list(params: OperatorSurveyListParams): Promise<OperatorSurveyListResult>;
  updateStatus(id: string, status: SurveyStatus): Promise<void>;
  remove(id: string): Promise<void>;
  create(payload: OperatorSurveyCreatePayload): Promise<void>;
}

/**
 * 서비스 고유 accent. operator-core-ui 는 서비스 tailwind content 글롭에 없으므로
 * 클래스는 반드시 서비스 wrapper 소스에서 literal 문자열로 전달한다.
 */
export interface OperatorSurveysAccent {
  /** 헤더 아이콘 색 (예: 'text-slate-600' | 'text-pink-600') */
  headerIcon: string;
  /** 주 버튼 (예: 'bg-emerald-600 hover:bg-emerald-700' | 'bg-pink-600 hover:bg-pink-700') */
  primaryButton: string;
  /** 보상 포인트 텍스트 (예: 'text-emerald-700' | 'text-pink-700') */
  rewardText: string;
  /** '진행중' 상태 뱃지 (예: 'bg-green-50 text-green-700' | 'bg-pink-50 text-pink-700') */
  activeBadge: string;
  /** 입력 focus ring (예: 'focus:ring-emerald-500' | 'focus:ring-pink-500') */
  focusRing: string;
  /** 보상 섹션 배경 (예: 'bg-emerald-50' | 'bg-pink-50') */
  sectionBg: string;
  /** 체크박스 accent (예: 'accent-emerald-600' | 'accent-pink-600') */
  checkboxAccent: string;
  /** 인라인 링크 버튼 (예: 'text-emerald-600' | 'text-pink-600') */
  linkText: string;
}

export interface OperatorSurveysConfig {
  /** defineActionPolicy 키 (예: 'kpa:surveys' | 'cosmetics:surveys') */
  actionPolicyKey: string;
  /** 목록 경로 (기본 '/operator/surveys') */
  listPath?: string;
  /** 생성 경로 (기본 '/operator/surveys/new') */
  createPath?: string;
  accent: OperatorSurveysAccent;
}

export interface OperatorSurveyListPageProps {
  client: OperatorSurveysClient;
  config: OperatorSurveysConfig;
}

export interface OperatorSurveyCreatePageProps {
  client: OperatorSurveysClient;
  config: OperatorSurveysConfig;
}
