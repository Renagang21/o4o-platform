/**
 * Neture LMS Participation Engine - Type Definitions
 *
 * 이 파일은 Neture의 '참여형 콘텐츠 엔진' 개념을 정의한다.
 * Neture LMS는 교육 시스템이 아니라, 참여형 콘텐츠 실행 엔진이다.
 *
 * 핵심 원칙:
 * - 교육·퀴즈·설문은 동일한 실행 모델 사용
 * - 모든 참여 결과는 AI 분석을 전제로 구조화
 * - 점수/합격/자격 부여 없음
 * - 소비자 참여 없음 (B2B only)
 */

// ============================================
// 1. 콘텐츠 실행 타입 (고정 - 확장 금지)
// ============================================

/**
 * 참여형 콘텐츠 타입
 * - COURSE: 교육 (정보 전달, 이수 개념 없음)
 * - QUIZ: 정답 기반 (응답 수집, 점수 무시)
 * - SURVEY: 의견 수집
 * - MIXED: 교육 + 참여 조합
 */
export type ParticipationContentType = 'COURSE' | 'QUIZ' | 'SURVEY' | 'MIXED';

// ============================================
// 2. 질문(Question) 모델 - AI 분석용 메타 태그
// ============================================

/**
 * 질문 유형 (UI 독립적)
 */
export type QuestionType =
  | 'single'   // 단일 선택
  | 'multi'    // 다중 선택
  | 'text'     // 서술형
  | 'scale';   // 척도 (1-5, 1-10 등)

/**
 * AI 분석용 메타데이터
 * 질문의 의도를 AI가 파악할 수 있도록 구조화
 */
export interface AIAnalysisMetadata {
  /** 질문 의도 분류 */
  intentCategory: 'satisfaction' | 'preference' | 'behavior' | 'feedback' | 'knowledge';

  /** 분석 차원 */
  targetDimension: 'product' | 'service' | 'experience' | 'recommendation' | 'general';

  /** AI 분석 시 가중치 (0-1) */
  analysisWeight?: number;

  /** 응답값 → 의미 매핑 (선택형 질문용) */
  responseMapping?: Record<string, string>;

  /** 분석 시 그룹화 키 (예: 'product_satisfaction', 'service_usability') */
  analysisGroupKey?: string;
}

/**
 * 참여형 콘텐츠 질문
 */
export interface ParticipationQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  options?: QuestionOption[];
  isRequired: boolean;
  order: number;

  /** AI 분석용 메타데이터 (필수) */
  aiMetadata: AIAnalysisMetadata;

  /** 척도형 질문의 범위 */
  scaleRange?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  order: number;
}

// ============================================
// 3. 응답(Response) 모델 - 맥락(Context) 필수
// ============================================

/**
 * 참여 맥락 (최소 1개 필수)
 * AI 분석의 필터링/그룹화 기준
 */
export interface ParticipationContext {
  /** 서비스 ID (neture, yaksa, cosmetics 등) */
  serviceId?: string;

  /** 상품 ID */
  productId?: string;

  /** 카테고리 ID */
  categoryId?: string;

  /** 캠페인 ID */
  campaignId?: string;

  /** 참여자 역할 */
  participantRole: ParticipantRole;

  /** 참여 시점 */
  participatedAt: string;
}

/**
 * 참여자 역할 (B2B only)
 */
export type ParticipantRole = 'pharmacy' | 'general' | 'medical' | 'supplier';

/**
 * 개별 질문 응답
 */
export interface QuestionAnswer {
  questionId: string;
  value: string | string[] | number;
  answeredAt: string;
}

/**
 * 참여 응답 (전체)
 */
export interface ParticipationResponse {
  id: string;
  contentId: string;
  contentType: ParticipationContentType;

  /** 맥락 정보 (필수) */
  context: ParticipationContext;

  /** 응답 목록 */
  answers: QuestionAnswer[];

  /** 응답 상태 */
  status: 'in_progress' | 'completed' | 'abandoned';

  /** 소요 시간 (초) */
  timeSpent?: number;

  completedAt?: string;
  createdAt: string;
}

// ============================================
// 4. AI 분석 결과 타입 (고정 - 5가지만)
// ============================================

/**
 * AI 분석 결과 타입
 * - SUMMARY: 전체 응답 요약 (집계 + 경향)
 * - COMPARISON: 그룹 간 비교 (서비스/역할/상품)
 * - INSIGHT: 의미 있는 패턴/특징 발견
 * - ANOMALY: 특이 반응/이탈/편차
 * - RECOMMENDATION: 다음 액션 제안
 *
 * 금지: 예측, 점수화, 평가, 순위 생성
 */
export type AIAnalysisResultType =
  | 'SUMMARY'
  | 'COMPARISON'
  | 'INSIGHT'
  | 'ANOMALY'
  | 'RECOMMENDATION';

/**
 * AI 분석 범위
 */
export interface AIAnalysisScope {
  serviceId?: string;
  productId?: string;
  categoryId?: string;
  campaignId?: string;
  participantRoles?: ParticipantRole[];
  dateRange?: {
    from: string;
    to: string;
  };
}

/**
 * AI 분석 결과 (UI 소비 기준)
 * UI는 이 구조를 그대로 소비하며, AI 결과를 재해석하지 않는다.
 */
export interface AIAnalysisResult {
  /** 결과 ID */
  id: string;

  /** 결과 타입 */
  type: AIAnalysisResultType;

  /** 결과 제목 */
  title: string;

  /** 분석 범위 */
  scope: AIAnalysisScope;

  /** 핵심 발견 (3~5개) */
  keyFindings: string[];

  /** 근거 요약 (숫자/비율/패턴) */
  evidence: AIAnalysisEvidence[];

  /** 해석 시 주의점 */
  caution?: string;

  /** 다음 액션 제안 */
  suggestion?: string;

  /** 생성 시점 */
  generatedAt: string;
}

/**
 * AI 분석 근거
 */
export interface AIAnalysisEvidence {
  /** 근거 유형 */
  type: 'percentage' | 'count' | 'comparison' | 'trend' | 'pattern';

  /** 근거 설명 */
  description: string;

  /** 수치 (있는 경우) */
  value?: number;

  /** 단위 */
  unit?: string;

  /** 비교 대상 (있는 경우) */
  comparedTo?: string;
}

// ============================================
// 5. AI 입력 데이터 구성 (3개 블록)
// ============================================

/**
 * AI 입력: Context Block
 */
export interface AIInputContextBlock {
  serviceId?: string;
  productId?: string;
  categoryId?: string;
  campaignId?: string;
  participantRoles: ParticipantRole[];
  dateRange: {
    from: string;
    to: string;
  };
  totalResponses: number;
}

/**
 * AI 입력: Content Block
 */
export interface AIInputContentBlock {
  contentType: ParticipationContentType;
  contentTitle: string;
  contentPurpose: string;
  questions: Array<{
    id: string;
    question: string;
    type: QuestionType;
    intentCategory: string;
    targetDimension: string;
  }>;
}

/**
 * AI 입력: Response Block (요약/집계 형태만)
 * 원문 전체 전달 금지
 */
export interface AIInputResponseBlock {
  /** 질문별 응답 분포 */
  distributions: Array<{
    questionId: string;
    /** 선택형: 선택지별 비율 */
    optionRatios?: Record<string, number>;
    /** 척도형: 평균, 분포 */
    scaleStats?: {
      average: number;
      distribution: Record<number, number>;
    };
    /** 서술형: 요약된 키워드/테마 */
    textSummary?: string[];
  }>;

  /** 역할별 응답 수 */
  responsesByRole: Record<ParticipantRole, number>;

  /** 완료율 */
  completionRate: number;

  /** 평균 소요 시간 */
  averageTimeSpent: number;
}

/**
 * AI 분석 요청 (전체 입력)
 */
export interface AIAnalysisRequest {
  context: AIInputContextBlock;
  content: AIInputContentBlock;
  responses: AIInputResponseBlock;

  /** 요청하는 분석 타입 */
  requestedTypes: AIAnalysisResultType[];
}

// ============================================
// 6. 허용 질문 유형 (구조화된 질문만)
// ============================================

/**
 * AI에게 던질 수 있는 질문 템플릿
 * 자유 질문이 아닌 구조화된 질문만 허용
 */
export type AIQuestionTemplate =
  | { type: 'SERVICE_REACTION'; serviceId: string }
  | { type: 'ROLE_COMPARISON'; roles: ParticipantRole[] }
  | { type: 'PRODUCT_IMPACT'; productId: string }
  | { type: 'QUESTION_EFFECTIVENESS'; contentId: string }
  | { type: 'NEXT_ACTION'; scope: AIAnalysisScope };

/**
 * 허용 질문 설명
 * - SERVICE_REACTION: "이 서비스에서 어떤 반응이 주로 나타났는가?"
 * - ROLE_COMPARISON: "약국과 일반 사업자의 반응 차이는 무엇인가?"
 * - PRODUCT_IMPACT: "이 콘텐츠가 연결된 상품에 어떤 영향을 보였는가?"
 * - QUESTION_EFFECTIVENESS: "반응이 좋은 질문과 그렇지 않은 질문의 차이는?"
 * - NEXT_ACTION: "다음에 시도해볼 만한 콘텐츠는 무엇인가?"
 *
 * 금지 질문:
 * - "누가 맞았는가"
 * - "점수가 몇 점인가"
 * - "성과가 좋은 사람은 누구인가"
 */

// ============================================
// 7. 책임 경계 명시
// ============================================

/**
 * AI 분석 책임 경계
 *
 * AI는:
 * - 판단하지 않는다
 * - 추천할 뿐 강제하지 않는다
 *
 * AI 결과의 해석 책임:
 * - 공급자/운영자
 *
 * Neture는:
 * - 요약·전달만 수행
 */
