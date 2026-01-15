/**
 * AI Core - Request/Response Contract
 *
 * AI 요청/응답의 표준 형식을 정의합니다.
 * 모든 AI 관련 서비스는 이 계약을 준수해야 합니다.
 *
 * @package @o4o/ai-core
 * @workorder WO-AI-CORE-APP-SCAFFOLD-V0
 */

// ============================================================
// AI 요청 계약 (Request Contract)
// ============================================================

/**
 * AI 요청의 기본 형식
 */
export interface AiRequestContract {
  /** 요청 식별자 */
  requestId: string;

  /** 요청 타입 */
  type: AiRequestType;

  /** 요청 컨텍스트 */
  context: AiRequestContext;

  /** 요청 본문 */
  payload: unknown;

  /** 요청 메타데이터 */
  metadata: AiRequestMetadata;
}

/**
 * AI 요청 타입
 */
export type AiRequestType =
  | 'summary'      // 요약 요청
  | 'analysis'     // 분석 요청
  | 'suggestion'   // 제안 요청
  | 'query';       // 질의 요청

/**
 * AI 요청 컨텍스트
 */
export interface AiRequestContext {
  /** 서비스 식별자 */
  serviceId: string;

  /** 사용자 식별자 (익명 가능) */
  userId?: string;

  /** 컨텍스트 라벨 (UI 표시용) */
  contextLabel?: string;
}

/**
 * AI 요청 메타데이터
 */
export interface AiRequestMetadata {
  /** 요청 시간 */
  timestamp: Date;

  /** 요청 출처 */
  source: 'web' | 'mobile' | 'api';

  /** 클라이언트 버전 */
  clientVersion?: string;
}

// ============================================================
// AI 응답 계약 (Response Contract)
// ============================================================

/**
 * AI 응답의 기본 형식
 */
export interface AiResponseContract<T = unknown> {
  /** 응답 식별자 (요청 ID와 매핑) */
  requestId: string;

  /** 응답 상태 */
  status: AiResponseStatus;

  /** 응답 데이터 */
  data?: T;

  /** 에러 정보 (실패 시) */
  error?: AiErrorContract;

  /** 응답 메타데이터 */
  metadata: AiResponseMetadata;
}

/**
 * AI 응답 상태
 */
export type AiResponseStatus =
  | 'success'
  | 'partial'   // 부분 성공
  | 'error'
  | 'timeout';

/**
 * AI 에러 계약
 */
export interface AiErrorContract {
  /** 에러 코드 */
  code: string;

  /** 에러 메시지 */
  message: string;

  /** 상세 정보 */
  details?: unknown;

  /** 재시도 가능 여부 */
  retryable: boolean;
}

/**
 * AI 응답 메타데이터
 */
export interface AiResponseMetadata {
  /** 처리 시간 (ms) */
  processingTime: number;

  /** 응답 시간 */
  timestamp: Date;

  /** 모델 정보 (선택적) */
  model?: string;
}

// ============================================================
// Placeholder: 향후 확장 예정
// ============================================================

/**
 * TODO: 향후 구현 예정 항목
 *
 * - Streaming 응답 계약
 * - 배치 요청 계약
 * - 피드백 계약
 */
