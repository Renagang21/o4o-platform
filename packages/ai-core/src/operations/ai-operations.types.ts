/**
 * AI Operations Types - Guardrails & Monitoring
 *
 * AI 운영 가드레일 및 모니터링 타입 정의
 *
 * @package @o4o/ai-core
 * @workorder WO-AI-OPERATIONS-GUARDRAILS-V1
 */

// ============================================================
// 운영 상태 타입 (Operations Status Types)
// ============================================================

/**
 * AI 운영 상태
 */
export type AiOperationalStatus = 'normal' | 'warning' | 'unstable';

/**
 * 경고 레벨
 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/**
 * 경고 타입
 */
export type AlertType =
  | 'usage_threshold'      // 사용량 임계치 도달
  | 'anomaly_detected'     // 비정상 패턴 감지
  | 'error_spike'          // 에러 급증
  | 'timeout_spike';       // 타임아웃 급증

// ============================================================
// 사용량 경고 타입 (Usage Warning Types)
// ============================================================

/**
 * 사용량 임계치 설정
 */
export interface UsageThresholds {
  /** 경고 임계치 (%) - 기본 80% */
  warningPercent: number;
  /** 주의 임계치 (%) - 기본 100% */
  alertPercent: number;
}

/**
 * 일일 사용량 상태
 */
export interface DailyUsageStatus {
  /** 오늘 날짜 */
  date: string;
  /** 현재 사용량 */
  currentUsage: number;
  /** 일일 한도 */
  dailyLimit: number;
  /** 사용률 (%) */
  usagePercent: number;
  /** 상태 */
  status: AiOperationalStatus;
  /** 경고 메시지 (있는 경우) */
  warningMessage?: string;
}

// ============================================================
// 비정상 패턴 감지 타입 (Anomaly Detection Types)
// ============================================================

/**
 * 비정상 패턴 타입
 */
export type AnomalyType =
  | 'rapid_fire'           // 짧은 시간 내 다수 요청
  | 'session_flood'        // 단일 세션 과다 사용
  | 'user_burst'           // 단일 사용자 급증
  | 'page_concentration';  // 특정 페이지 집중

/**
 * 비정상 패턴 감지 기록
 */
export interface AnomalyRecord {
  /** 고유 ID */
  id: string;
  /** 감지 시각 */
  timestamp: Date;
  /** 패턴 타입 */
  type: AnomalyType;
  /** 관련 사용자 ID (있는 경우) */
  userId?: string;
  /** 관련 세션 ID (있는 경우) */
  sessionId?: string;
  /** 관련 페이지 (있는 경우) */
  pageUrl?: string;
  /** 상세 정보 */
  details: {
    requestCount: number;
    timeWindowMs: number;
    threshold: number;
  };
  /** 해결 여부 */
  resolved: boolean;
}

// ============================================================
// 에러/장애 지표 타입 (Error Metrics Types)
// ============================================================

/**
 * 에러 지표
 */
export interface ErrorMetrics {
  /** 전체 호출 수 */
  totalCalls: number;
  /** 성공 수 */
  successCount: number;
  /** 타임아웃 수 */
  timeoutCount: number;
  /** API 에러 수 */
  apiErrorCount: number;
  /** 기타 에러 수 */
  otherErrorCount: number;
  /** 에러율 (%) */
  errorRate: number;
  /** 타임아웃율 (%) */
  timeoutRate: number;
}

/**
 * 일자별 에러 지표
 */
export interface DailyErrorMetrics extends ErrorMetrics {
  /** 날짜 */
  date: string;
}

// ============================================================
// Circuit Breaker 타입 (Light Circuit Breaker Types)
// ============================================================

/**
 * Circuit Breaker 상태
 */
export type CircuitBreakerState = 'closed' | 'half_open' | 'open';

/**
 * Circuit Breaker 설정
 */
export interface CircuitBreakerConfig {
  /** 에러율 임계치 (%) - 기본 50% */
  errorThreshold: number;
  /** 타임아웃 연속 횟수 임계치 - 기본 5 */
  consecutiveTimeoutThreshold: number;
  /** 반개방 대기 시간 (ms) - 기본 30000 */
  halfOpenWaitMs: number;
  /** 반개방 상태에서 허용할 요청 수 - 기본 3 */
  halfOpenAllowedRequests: number;
}

/**
 * Circuit Breaker 상태 정보
 */
export interface CircuitBreakerStatus {
  /** 현재 상태 */
  state: CircuitBreakerState;
  /** 상태 변경 시각 */
  stateChangedAt: Date;
  /** 최근 에러율 */
  recentErrorRate: number;
  /** 연속 타임아웃 수 */
  consecutiveTimeouts: number;
  /** 반개방 상태에서 처리된 요청 수 */
  halfOpenRequestCount: number;
  /** 사용자 표시 메시지 */
  userMessage?: string;
}

// ============================================================
// 운영 대시보드 타입 (Operations Dashboard Types)
// ============================================================

/**
 * 운영 경고 항목
 */
export interface OperationsAlert {
  /** 고유 ID */
  id: string;
  /** 생성 시각 */
  timestamp: Date;
  /** 경고 타입 */
  type: AlertType;
  /** 경고 레벨 */
  level: AlertLevel;
  /** 제목 */
  title: string;
  /** 상세 메시지 */
  message: string;
  /** 확인 여부 */
  acknowledged: boolean;
}

/**
 * 오늘의 운영 상태 요약
 */
export interface TodayOperationsSummary {
  /** 날짜 */
  date: string;
  /** 전체 상태 */
  overallStatus: AiOperationalStatus;
  /** 사용량 상태 */
  usageStatus: DailyUsageStatus;
  /** 에러 지표 */
  errorMetrics: ErrorMetrics;
  /** Circuit Breaker 상태 */
  circuitBreaker: CircuitBreakerStatus;
  /** 활성 경고 수 */
  activeAlertCount: number;
  /** 비정상 패턴 감지 수 */
  anomalyCount: number;
}

/**
 * 운영 대시보드 데이터
 */
export interface OperationsDashboardData {
  /** 오늘 요약 */
  today: TodayOperationsSummary;
  /** 최근 경고 목록 */
  recentAlerts: OperationsAlert[];
  /** 최근 비정상 패턴 */
  recentAnomalies: AnomalyRecord[];
  /** 일자별 에러 추이 (최근 7일) */
  errorTrend: DailyErrorMetrics[];
}

// ============================================================
// 기본값 상수 (Default Constants)
// ============================================================

/**
 * 기본 사용량 임계치
 */
export const DEFAULT_USAGE_THRESHOLDS: UsageThresholds = {
  warningPercent: 80,
  alertPercent: 100,
};

/**
 * 기본 Circuit Breaker 설정
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  errorThreshold: 50,
  consecutiveTimeoutThreshold: 5,
  halfOpenWaitMs: 30000,
  halfOpenAllowedRequests: 3,
};

/**
 * 비정상 패턴 감지 기본 설정
 */
export const DEFAULT_ANOMALY_THRESHOLDS = {
  /** Rapid fire: 10초 내 10회 이상 */
  rapidFire: { windowMs: 10000, threshold: 10 },
  /** Session flood: 1분 내 30회 이상 */
  sessionFlood: { windowMs: 60000, threshold: 30 },
  /** User burst: 5분 내 50회 이상 */
  userBurst: { windowMs: 300000, threshold: 50 },
} as const;
