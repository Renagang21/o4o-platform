/**
 * AI Core - Log Types & Standards
 *
 * AI 호출 로그 및 설명 가능성(Explainability) 기준을 정의합니다.
 *
 * @package @o4o/ai-core
 * @workorder WO-AI-CORE-APP-SCAFFOLD-V0
 */

// ============================================================
// AI 로그 타입 정의 (Log Types)
// ============================================================

/**
 * AI 호출 로그 엔트리
 */
export interface AiLogEntry {
  /** 로그 ID */
  id: string;

  /** 요청 ID (계약과 연결) */
  requestId: string;

  /** 로그 타입 */
  type: AiLogType;

  /** 서비스 ID */
  serviceId: string;

  /** 사용자 ID (익명 가능) */
  userId?: string;

  /** 로그 시간 */
  timestamp: Date;

  /** 로그 상세 */
  details: AiLogDetails;

  /** 설명 가능성 메타데이터 */
  explainability?: AiExplainability;
}

/**
 * AI 로그 타입
 */
export type AiLogType =
  | 'request'      // 요청 로그
  | 'response'     // 응답 로그
  | 'error'        // 에러 로그
  | 'feedback'     // 사용자 피드백
  | 'audit';       // 감사 로그

/**
 * AI 로그 상세
 */
export interface AiLogDetails {
  /** AI 기능 타입 */
  feature: string;

  /** 입력 요약 (민감 정보 제외) */
  inputSummary?: string;

  /** 출력 요약 */
  outputSummary?: string;

  /** 처리 시간 (ms) */
  processingTime?: number;

  /** 에러 정보 */
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================
// 설명 가능성 (Explainability)
// ============================================================

/**
 * AI 설명 가능성 메타데이터
 *
 * AI 결과가 어떻게 도출되었는지 설명하기 위한 정보
 */
export interface AiExplainability {
  /** 설명 가능 여부 */
  explainable: boolean;

  /** 신뢰도 점수 (0-1) */
  confidenceScore?: number;

  /** 결정 근거 */
  reasoning?: string[];

  /** 참조된 데이터 소스 */
  dataSources?: string[];

  /** 사용된 모델/알고리즘 */
  modelInfo?: string;
}

// ============================================================
// 감사 로그 (Audit Log)
// ============================================================

/**
 * AI 감사 로그
 *
 * 규정 준수 및 추적을 위한 감사 정보
 */
export interface AiAuditLog extends AiLogEntry {
  type: 'audit';

  /** 감사 액션 */
  action: AiAuditAction;

  /** 변경 전 상태 */
  before?: unknown;

  /** 변경 후 상태 */
  after?: unknown;

  /** 감사자 정보 */
  auditor?: string;
}

/**
 * AI 감사 액션 타입
 */
export type AiAuditAction =
  | 'policy_change'     // 정책 변경
  | 'feature_enable'    // 기능 활성화
  | 'feature_disable'   // 기능 비활성화
  | 'access_grant'      // 접근 권한 부여
  | 'access_revoke';    // 접근 권한 회수

// ============================================================
// 사용자 피드백 (Feedback)
// ============================================================

/**
 * AI 응답에 대한 사용자 피드백
 */
export interface AiFeedbackLog extends AiLogEntry {
  type: 'feedback';

  /** 피드백 타입 */
  feedbackType: AiFeedbackType;

  /** 피드백 점수 (1-5) */
  rating?: number;

  /** 피드백 코멘트 */
  comment?: string;
}

/**
 * AI 피드백 타입
 */
export type AiFeedbackType =
  | 'helpful'       // 도움이 됨
  | 'not_helpful'   // 도움이 안 됨
  | 'incorrect'     // 잘못된 정보
  | 'inappropriate' // 부적절한 내용
  | 'other';        // 기타

// ============================================================
// Placeholder: 향후 확장 예정
// ============================================================

/**
 * TODO: 향후 구현 예정 항목
 *
 * - 로그 집계/분석 인터페이스
 * - 로그 보존 정책
 * - 개인정보 익명화 규칙
 * - 실시간 모니터링 이벤트
 */
