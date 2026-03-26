/**
 * Action Queue — Shared Types
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * Neture 검증 패턴 일반화. 모든 서비스가 동일한 타입으로 Action Queue를 구성한다.
 */

export type ActionPriority = 'high' | 'medium' | 'low';
export type ActionSource = 'SYSTEM' | 'AI';
export type ActionExecutionType = 'EXECUTE' | 'NAVIGATE';

/** 단일 Action Queue 항목 (frontend 반환용) */
export interface ActionQueueItem {
  id: string;
  source: ActionSource;
  type: string;
  title: string;
  description: string;
  priority: ActionPriority;
  count: number;
  oldestAt: string | null;
  confidence?: number;
  actionUrl: string;
  actionLabel: string;
  actionType: ActionExecutionType;
  actionApi?: string;
  actionMethod?: string;
}

/** Action Queue 응답 요약 */
export interface ActionQueueSummary {
  total: number;
  high: number;
  today: number;
  aiCount: number;
}

/** Action Queue 전체 응답 */
export interface ActionQueueResponse {
  summary: ActionQueueSummary;
  items: ActionQueueItem[];
}

/**
 * 서비스가 제공하는 Action 정의.
 * Factory가 query를 실행하고, priority를 계산하고, ActionQueueItem으로 변환한다.
 */
export interface ActionDefinition {
  id: string;
  type: string;
  title: string;
  description: string;
  /** SQL: SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest FROM ... */
  query: string;
  queryParams?: any[];
  actionUrl: string;
  actionLabel: string;
  actionType: ActionExecutionType;
  actionApi?: string;
  actionMethod?: string;
  /** true면 count 무관하게 항상 high */
  alwaysHigh?: boolean;
  /** high 전환 임계값 (기본 5) */
  highThreshold?: number;
}

/** AI Rule 기반 Action (서비스별 규칙 생성기 출력) */
export interface AiRuleAction {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: ActionPriority;
  confidence: number;
  actionUrl: string;
  actionLabel: string;
  actionType: ActionExecutionType;
  actionApi?: string;
  actionMethod?: string;
}

/** 일괄 실행 핸들러 */
export type ExecuteHandler = (userId: string) => Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}>;

/** 서비스별 Action Queue 전체 설정 */
export interface ServiceActionConfig {
  serviceKey: string;
  definitions: ActionDefinition[];
  executeHandlers: Record<string, ExecuteHandler>;
  aiRuleGenerator?: (counts: Record<string, number>) => AiRuleAction[];
}
