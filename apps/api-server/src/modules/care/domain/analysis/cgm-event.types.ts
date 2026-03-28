/**
 * CGM-Event Integration Types
 *
 * WO-O4O-CARE-CGM-EVENT-INTEGRATION-V1
 *
 * CGM 데이터를 이벤트(식사/운동/복약/증상) 기준으로 분석하여
 * "변화 → 원인 → 의미"를 생성하는 규칙 기반 분석 엔진 타입 정의.
 */

// ── 이벤트 타입 ──

export type CgmEventType = 'meal' | 'exercise' | 'medication' | 'symptom';

export const EVENT_WINDOWS: Record<CgmEventType, { beforeMin: number; afterMin: number }> = {
  meal: { beforeMin: 30, afterMin: 120 }, // -30분 ~ +2시간
  exercise: { beforeMin: 30, afterMin: 120 },
  medication: { beforeMin: 0, afterMin: 240 }, // 0 ~ +4시간
  symptom: { beforeMin: 15, afterMin: 15 }, // ±15분
};

// ── 입력 ──

export interface TimestampedGlucose {
  timestamp: string; // ISO 8601
  glucose: number; // mg/dL
}

export interface CgmEvent {
  eventType: CgmEventType;
  eventTime: string; // ISO 8601 (= measuredAt)
  readingId: string;
  detail: Record<string, unknown>;
}

// ── 이벤트별 분석 결과 (Discriminated Union) ──

export interface MealAnalysis {
  eventType: 'meal';
  eventTime: string;
  readingId: string;
  detail: Record<string, unknown>;
  baseline: number | null; // 이전 평균
  peak: number | null; // 이후 최대
  delta: number | null; // peak - baseline
  impact: 'high' | 'moderate' | 'low' | null;
  beforeCount: number;
  afterCount: number;
  label: string;
}

export interface ExerciseAnalysis {
  eventType: 'exercise';
  eventTime: string;
  readingId: string;
  detail: Record<string, unknown>;
  baseline: number | null; // 이전 평균
  minAfter: number | null; // 이후 최소
  drop: number | null; // baseline - min
  effect: 'high' | 'moderate' | 'low' | null;
  beforeCount: number;
  afterCount: number;
  label: string;
}

export interface MedicationAnalysis {
  eventType: 'medication';
  eventTime: string;
  readingId: string;
  detail: Record<string, unknown>;
  varianceBefore: number | null;
  varianceAfter: number | null;
  effect: 'effective' | 'weak' | null;
  beforeCount: number;
  afterCount: number;
  label: string;
}

export interface SymptomAnalysis {
  eventType: 'symptom';
  eventTime: string;
  readingId: string;
  detail: Record<string, unknown>;
  glucoseAtEvent: number | null;
  context: 'hypoglycemia' | 'hyperglycemia' | 'normal' | null;
  nearCount: number;
  label: string;
}

export type EventAnalysis = MealAnalysis | ExerciseAnalysis | MedicationAnalysis | SymptomAnalysis;

// ── 패턴 감지 ──

export interface DetectedPattern {
  patternType: CgmEventType;
  classification: string; // e.g. 'high', 'effective'
  count: number;
  label: string; // "식후 급상승 반복 (3회)"
}

// ── 최종 결과 ──

export interface CgmEventAnalysisResult {
  patientId: string;
  periodFrom: string;
  periodTo: string;
  events: EventAnalysis[];
  patterns: DetectedPattern[];
  summary: {
    totalEvents: number;
    eventsByType: Record<CgmEventType, number>;
    insufficientDataEvents: number;
  };
  crossReadingAnalysis: {
    fastingAvg: number | null;
    postMealAvg: number | null;
    delta: number | null;
  } | null;
}

// ── Action Engine V2 (WO-O4O-CARE-ACTION-ENGINE-V2) ──

export type CareActionType = 'open_patient' | 'create_coaching' | 'run_analysis' | 'resolve_alert' | 'link_guideline';
export type CareActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CareGeneratedAction {
  type: CareActionType;
  priority: CareActionPriority;
  reason: string;
  label: string;
}
