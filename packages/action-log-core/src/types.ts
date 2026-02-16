/**
 * Action Log Core — Types
 *
 * WO-PLATFORM-ACTION-LOG-CORE-V1
 *
 * Hub Trigger 실행 기록의 표준 타입.
 */

/** 실행 원천 */
export type ActionSource = 'ai' | 'manual' | 'platform';

/** 실행 결과 */
export type ActionStatus = 'success' | 'failed';

/** 로그 기록 입력 */
export interface ActionLogEntry {
  serviceKey: string;
  userId: string;
  organizationId?: string;
  actionKey: string;
  source: ActionSource;
  status: ActionStatus;
  durationMs?: number;
  errorMessage?: string;
  meta?: Record<string, any>;
}

/** DB 저장 시 반환 타입 */
export interface ActionLogRecord extends ActionLogEntry {
  id: string;
  createdAt: Date;
}
