/**
 * Glucose 계산 유틸리티
 *
 * diabetes-core에서 흡수한 통계/계산 함수들
 * - 해석용 유틸리티만 포함
 * - 관리/코칭/추천 로직 제외
 *
 * @package @o4o/pharmacy-ai-insight
 */

// ========================================
// 기본 통계 함수
// ========================================

/**
 * 중앙값 계산
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 표준편차 계산
 */
export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length === 0) return 0;
  const avg = mean ?? values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * 변동계수 (CV) 계산
 */
export function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const stdDev = calculateStdDev(values, mean);
  return (stdDev / mean) * 100;
}

// ========================================
// TIR (Time in Range) 계산
// ========================================

export interface TirConfig {
  lowThreshold: number;      // 70 mg/dL
  highThreshold: number;     // 180 mg/dL
  severeLowThreshold?: number;   // 54 mg/dL
  severeHighThreshold?: number;  // 250 mg/dL
}

export interface TirResult {
  inRangePercent: number;
  belowRangePercent: number;
  aboveRangePercent: number;
  severeBelowPercent?: number;
  severeAbovePercent?: number;
}

const DEFAULT_TIR_CONFIG: TirConfig = {
  lowThreshold: 70,
  highThreshold: 180,
  severeLowThreshold: 54,
  severeHighThreshold: 250,
};

/**
 * TIR (Time in Range) 계산
 */
export function calculateTIR(values: number[], config: TirConfig = DEFAULT_TIR_CONFIG): TirResult {
  if (values.length === 0) {
    return {
      inRangePercent: 0,
      belowRangePercent: 0,
      aboveRangePercent: 0,
    };
  }

  let inRange = 0;
  let below = 0;
  let above = 0;
  let severeBelow = 0;
  let severeAbove = 0;

  for (const value of values) {
    if (config.severeLowThreshold && value < config.severeLowThreshold) {
      severeBelow++;
      below++;
    } else if (value < config.lowThreshold) {
      below++;
    } else if (config.severeHighThreshold && value > config.severeHighThreshold) {
      severeAbove++;
      above++;
    } else if (value > config.highThreshold) {
      above++;
    } else {
      inRange++;
    }
  }

  const total = values.length;
  return {
    inRangePercent: (inRange / total) * 100,
    belowRangePercent: (below / total) * 100,
    aboveRangePercent: (above / total) * 100,
    severeBelowPercent: config.severeLowThreshold ? (severeBelow / total) * 100 : undefined,
    severeAbovePercent: config.severeHighThreshold ? (severeAbove / total) * 100 : undefined,
  };
}

// ========================================
// 변동성 분석
// ========================================

/**
 * 혈당 변동성 수준 판단
 */
export function getVariabilityLevel(cv: number): 'low' | 'moderate' | 'high' {
  if (cv <= 24) return 'low';
  if (cv <= 36) return 'moderate';
  return 'high';
}

/**
 * 변동성 설명 텍스트 (확정 결론 없음)
 */
export function getVariabilityDescription(cv: number): string {
  const level = getVariabilityLevel(cv);
  switch (level) {
    case 'low':
      return '혈당 변동이 안정적인 편으로 보입니다.';
    case 'moderate':
      return '혈당 변동이 일반적인 수준으로 관찰됩니다.';
    case 'high':
      return '혈당 변동 폭이 큰 편으로 관찰됩니다.';
  }
}

// ========================================
// 시간대 분석
// ========================================

export type TimeSlot = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export interface TimeSlotInfo {
  slot: TimeSlot;
  label: string;
  startHour: number;
  endHour: number;
}

export const TIME_SLOTS: TimeSlotInfo[] = [
  { slot: 'dawn', label: '새벽', startHour: 4, endHour: 6 },
  { slot: 'morning', label: '아침', startHour: 6, endHour: 9 },
  { slot: 'midday', label: '오전', startHour: 9, endHour: 12 },
  { slot: 'afternoon', label: '오후', startHour: 12, endHour: 18 },
  { slot: 'evening', label: '저녁', startHour: 18, endHour: 22 },
  { slot: 'night', label: '야간', startHour: 22, endHour: 4 },
];

/**
 * 시간을 TimeSlot으로 변환
 */
export function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 4 && hour < 6) return 'dawn';
  if (hour >= 6 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 12) return 'midday';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * TimeSlot 정보 가져오기
 */
export function getTimeSlotInfo(slot: TimeSlot): TimeSlotInfo {
  return TIME_SLOTS.find((s) => s.slot === slot) || TIME_SLOTS[0];
}

// ========================================
// 패턴 해석 (설명만, 추천 없음)
// ========================================

export type PatternType =
  | 'stable'
  | 'post_meal_rise'
  | 'dawn_phenomenon'
  | 'high_variability'
  | 'below_range_tendency'
  | 'above_range_tendency'
  | 'unknown';

/**
 * 패턴 설명 텍스트 (확정 결론 없음)
 */
export function getPatternDescription(patternType: PatternType): string {
  const descriptions: Record<PatternType, string> = {
    stable: '혈당이 비교적 안정적인 패턴으로 관찰됩니다.',
    post_meal_rise: '식후 혈당 상승 경향이 관찰됩니다.',
    dawn_phenomenon: '새벽 시간대 혈당 상승 경향이 관찰됩니다.',
    high_variability: '혈당 변동 폭이 큰 경향이 관찰됩니다.',
    below_range_tendency: '목표 범위 이하로 떨어지는 경향이 관찰됩니다.',
    above_range_tendency: '목표 범위를 초과하는 경향이 관찰됩니다.',
    unknown: '특정 패턴이 명확하지 않습니다.',
  };
  return descriptions[patternType];
}

/**
 * 신뢰도 계산 (해석용)
 */
export function calculateConfidence(
  occurrences: number,
  total: number
): { level: 'low' | 'medium' | 'high'; score: number } {
  if (total === 0) return { level: 'low', score: 0 };
  const ratio = occurrences / total;
  const score = Math.min(ratio * 100 + occurrences * 5, 100);

  if (score >= 80 || occurrences >= 7) return { level: 'high', score };
  if (score >= 50 || occurrences >= 4) return { level: 'medium', score };
  return { level: 'low', score };
}

// ========================================
// 요약 문장 생성 (안전한 표현)
// ========================================

/**
 * 혈당 요약 문장 생성
 */
export function generateGlucoseSummary(metrics: {
  avgGlucose?: number;
  timeInRange?: number;
  variability?: number;
}): string {
  const parts: string[] = [];

  if (metrics.avgGlucose !== undefined) {
    parts.push(`평균 혈당 ${Math.round(metrics.avgGlucose)}mg/dL`);
  }

  if (metrics.timeInRange !== undefined) {
    parts.push(`목표 범위 유지율 ${Math.round(metrics.timeInRange)}%`);
  }

  if (metrics.variability !== undefined) {
    const level = getVariabilityLevel(metrics.variability);
    const levelText = level === 'low' ? '안정적' : level === 'moderate' ? '보통' : '변동 큼';
    parts.push(`변동성 ${levelText}`);
  }

  if (parts.length === 0) {
    return '분석에 필요한 데이터가 충분하지 않습니다.';
  }

  return parts.join(', ') + '으로 관찰됩니다.';
}
