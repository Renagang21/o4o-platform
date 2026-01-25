/**
 * Participation App Types
 * WO-KPA-PARTICIPATION-APP-V1
 *
 * 핵심 원칙:
 * - 사람을 평가하지 않는다
 * - 단지 묻고, 모으고, 보여줄 뿐이다
 * - 점수/등급/랭킹 개념 없음
 */

// =============================================================================
// A. 질문 구조 (Question Builder)
// =============================================================================

/**
 * 질문 유형
 */
export enum QuestionType {
  /** 단일 선택형 */
  SINGLE_CHOICE = 'single_choice',
  /** 복수 선택형 */
  MULTIPLE_CHOICE = 'multiple_choice',
  /** 자유 응답형 */
  FREE_TEXT = 'free_text',
  /** 퀴즈형 (정답 여부 포함 가능, 점수 없음) */
  QUIZ = 'quiz',
}

/**
 * 질문 옵션 (선택형 질문용)
 */
export interface QuestionOption {
  id: string;
  text: string;
  /** 퀴즈형에서 정답 여부 (점수 계산 없음, 표시용) */
  isCorrect?: boolean;
  order: number;
}

/**
 * 질문
 */
export interface ParticipationQuestion {
  id: string;
  /** 질문 제목 */
  title: string;
  /** 질문 설명 (선택) */
  description?: string;
  /** 질문 유형 */
  type: QuestionType;
  /** 응답 옵션 (선택형/퀴즈형) */
  options?: QuestionOption[];
  /** 응답 필수 여부 */
  isRequired: boolean;
  /** 순서 */
  order: number;
}

// =============================================================================
// B. 참여 범위 설정 (Participation Scope)
// =============================================================================

/**
 * 참여 범위 유형
 */
export enum ParticipationScopeType {
  /** 전체 공개 */
  PUBLIC = 'public',
  /** 약사 전용 */
  PHARMACIST_ONLY = 'pharmacist_only',
  /** 약국 단위 */
  PHARMACY_UNIT = 'pharmacy_unit',
  /** 조직/그룹 단위 */
  ORGANIZATION = 'organization',
}

/**
 * 응답 익명 설정
 */
export enum AnonymityType {
  /** 익명 */
  ANONYMOUS = 'anonymous',
  /** 기명 */
  IDENTIFIED = 'identified',
}

/**
 * 참여 설정
 */
export interface ParticipationScope {
  /** 참여 범위 */
  scopeType: ParticipationScopeType;
  /** 특정 조직 ID (조직 단위일 때) */
  organizationId?: string;
  /** 특정 약국 ID (약국 단위일 때) */
  pharmacyId?: string;
  /** 익명/기명 설정 */
  anonymity: AnonymityType;
  /** 응답 수정 허용 여부 */
  allowModification: boolean;
  /** 시작 일시 */
  startAt?: Date;
  /** 종료 일시 */
  endAt?: Date;
}

// =============================================================================
// C. 설문/퀴즈 (Participation Set)
// =============================================================================

/**
 * 설문/퀴즈 상태
 */
export enum ParticipationStatus {
  /** 초안 */
  DRAFT = 'draft',
  /** 진행 중 */
  ACTIVE = 'active',
  /** 종료됨 */
  CLOSED = 'closed',
}

/**
 * 설문/퀴즈 세트
 */
export interface ParticipationSet {
  id: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description?: string;
  /** 질문 목록 */
  questions: ParticipationQuestion[];
  /** 참여 범위 설정 */
  scope: ParticipationScope;
  /** 상태 */
  status: ParticipationStatus;
  /** 작성자 ID */
  createdBy: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

// =============================================================================
// D. 응답 (Response)
// =============================================================================

/**
 * 개별 질문 응답
 */
export interface QuestionResponse {
  questionId: string;
  /** 선택한 옵션 ID들 (선택형) */
  selectedOptionIds?: string[];
  /** 자유 응답 텍스트 */
  textAnswer?: string;
}

/**
 * 참여 응답
 */
export interface ParticipationResponse {
  id: string;
  /** 설문/퀴즈 ID */
  participationSetId: string;
  /** 응답자 ID (익명일 경우 null) */
  respondentId?: string;
  /** 질문별 응답 */
  answers: QuestionResponse[];
  /** 제출 완료 여부 */
  isSubmitted: boolean;
  /** 제출일 */
  submittedAt?: Date;
  /** 생성일 */
  createdAt: Date;
}

// =============================================================================
// E. 결과 집계 (Result - 보여주기만, 평가 없음)
// =============================================================================

/**
 * 옵션별 응답 집계
 */
export interface OptionResult {
  optionId: string;
  optionText: string;
  /** 응답 수 */
  count: number;
  /** 비율 (0-100) */
  percentage: number;
}

/**
 * 질문별 결과
 */
export interface QuestionResult {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  /** 총 응답 수 */
  totalResponses: number;
  /** 옵션별 결과 (선택형) */
  optionResults?: OptionResult[];
  /** 자유 응답 목록 (자유 응답형) */
  textAnswers?: string[];
}

/**
 * 전체 결과
 */
export interface ParticipationResult {
  participationSetId: string;
  /** 총 응답자 수 */
  totalRespondents: number;
  /** 질문별 결과 */
  questionResults: QuestionResult[];
  /** 마지막 업데이트 */
  lastUpdated: Date;
}

// =============================================================================
// F. UI 관련 타입
// =============================================================================

/**
 * 질문 유형 레이블
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.SINGLE_CHOICE]: '단일 선택',
  [QuestionType.MULTIPLE_CHOICE]: '복수 선택',
  [QuestionType.FREE_TEXT]: '자유 응답',
  [QuestionType.QUIZ]: '퀴즈',
};

/**
 * 참여 범위 레이블
 */
export const SCOPE_TYPE_LABELS: Record<ParticipationScopeType, string> = {
  [ParticipationScopeType.PUBLIC]: '전체 공개',
  [ParticipationScopeType.PHARMACIST_ONLY]: '약사 전용',
  [ParticipationScopeType.PHARMACY_UNIT]: '약국 단위',
  [ParticipationScopeType.ORGANIZATION]: '조직/그룹',
};

/**
 * 상태 레이블
 */
export const STATUS_LABELS: Record<ParticipationStatus, string> = {
  [ParticipationStatus.DRAFT]: '초안',
  [ParticipationStatus.ACTIVE]: '진행 중',
  [ParticipationStatus.CLOSED]: '종료됨',
};
