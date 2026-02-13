/**
 * Operator Signal Threshold Config
 *
 * WO-OPERATOR-SIGNAL-THRESHOLD-CONFIG-V1
 * Signal 판정 기준(임계값)을 외부화하여 서비스별로 조정 가능하게 한다.
 */

/** 단일 영역 임계값 규칙 */
export interface ThresholdRule {
  /** 이 값 이하면 warning */
  warning: number;
  /** 이 값 이하면 alert */
  alert: number;
}

/** 서비스별 Threshold 설정 (전 영역) */
export interface OperatorThresholdConfig {
  forum?: ThresholdRule;
  content?: ThresholdRule;
  signage?: ThresholdRule;
  store?: ThresholdRule;
  partner?: ThresholdRule;
  order?: ThresholdRule;
}

/** 기본 임계값 — 현재 동작과 동일 (0 기준 판정) */
export const DEFAULT_THRESHOLD: ThresholdRule = { warning: 0, alert: 0 };
