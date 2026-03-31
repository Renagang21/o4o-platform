/**
 * Time-Based Analysis → Action Mapper (순수 함수)
 *
 * WO-O4O-CARE-ACTION-ENGINE-V2.1
 *
 * 시간대별 혈당 분석 결과를 규칙 기반으로 약사 행동 제안(Action)에 매핑한다.
 * DB 접근 없음. AI 생성 없음. 최대 3개 Action, 중복 제거, 우선순위 정렬.
 */

import type {
  CareGeneratedAction,
  CareActionType,
  CareActionPriority,
} from './cgm-event.types.js';

const MAX_ACTIONS = 3;

const PRIORITY_ORDER: Record<CareActionPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export interface TimeAnalysisInput {
  timeBuckets: Array<{
    bucket: string;
    count: number;
    avg: number;
    highCount: number;
    lowCount: number;
  }>;
  mealTimingStats: Array<{
    mealTiming: string;
    count: number;
    avg: number;
  }>;
  exerciseImpact: {
    count: number;
    avgWithExercise: number | null;
    overallAvg: number | null;
  };
  trends: {
    avg3d: number | null;
    count3d: number;
    avg7d: number | null;
    count7d: number;
    avgFull: number | null;
    countFull: number;
  };
}

const BUCKET_LABELS: Record<string, string> = {
  morning: '아침',
  afternoon: '점심',
  evening: '저녁',
  night: '야간',
};

export function mapTimeAnalysisToActions(data: TimeAnalysisInput): CareGeneratedAction[] {
  const candidates: CareGeneratedAction[] = [];

  applyTimeBucketRules(data.timeBuckets, candidates);
  applyMealTimingRules(data.mealTimingStats, candidates);
  applyExerciseRules(data.exerciseImpact, candidates);
  applyTrendRules(data.trends, candidates);

  // Deduplicate: keep highest priority per action type
  const byType = new Map<CareActionType, CareGeneratedAction>();
  for (const action of candidates) {
    const existing = byType.get(action.type);
    if (!existing || PRIORITY_ORDER[action.priority] < PRIORITY_ORDER[existing.priority]) {
      byType.set(action.type, action);
    }
  }

  return Array.from(byType.values())
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, MAX_ACTIONS);
}

// ── Time-of-day bucket rules ──

function applyTimeBucketRules(
  buckets: TimeAnalysisInput['timeBuckets'],
  out: CareGeneratedAction[],
): void {
  for (const b of buckets) {
    const label = BUCKET_LABELS[b.bucket] || b.bucket;

    // 특정 시간대 평균 > 180 → 고혈당 코칭 필요
    if (b.avg > 180) {
      out.push({
        type: 'create_coaching',
        priority: 'HIGH',
        label: `${label} 혈당 관리 코칭 권장`,
        reason: `${label} 시간대 평균 혈당이 ${b.avg} mg/dL로 높습니다`,
      });
    }

    // 특정 시간대 평균 > 140 → 가이드 연결
    if (b.avg > 140 && b.avg <= 180) {
      out.push({
        type: 'link_guideline',
        priority: 'MEDIUM',
        label: `${label} 시간대 식단 가이드`,
        reason: `${label} 평균 ${b.avg} mg/dL — 식단 조절로 개선 가능`,
      });
    }

    // 고혈당 이벤트 3회 이상 → 알림
    if (b.highCount >= 3) {
      out.push({
        type: 'resolve_alert',
        priority: 'HIGH',
        label: `${label} 고혈당 반복 확인`,
        reason: `${label} 시간대 고혈당(>180) ${b.highCount}회 발생`,
      });
    }

    // 저혈당 이벤트 2회 이상 → 긴급
    if (b.lowCount >= 2) {
      out.push({
        type: 'resolve_alert',
        priority: 'HIGH',
        label: `${label} 저혈당 반복 확인`,
        reason: `${label} 시간대 저혈당(<70) ${b.lowCount}회 발생 — 긴급 확인 필요`,
      });
    }
  }
}

// ── Meal-timing rules ──

function applyMealTimingRules(
  stats: TimeAnalysisInput['mealTimingStats'],
  out: CareGeneratedAction[],
): void {
  const fasting = stats.find(m => m.mealTiming === 'fasting');
  const postMeal = stats.find(m =>
    ['after_meal', 'after_meal_1h', 'after_meal_2h'].includes(m.mealTiming),
  );

  if (fasting && postMeal) {
    const rise = postMeal.avg - fasting.avg;

    // 식후 상승 > 50 → 코칭 필요
    if (rise > 50) {
      out.push({
        type: 'create_coaching',
        priority: 'HIGH',
        label: '식후 혈당 관리 코칭 권장',
        reason: `식후 평균 상승 +${rise} mg/dL — 식사 조절 코칭 필요`,
      });
    }
    // 식후 상승 > 30 → 가이드 연결
    else if (rise > 30) {
      out.push({
        type: 'link_guideline',
        priority: 'MEDIUM',
        label: '식사 관리 가이드',
        reason: `식후 평균 상승 +${rise} mg/dL — 식단 가이드 참고 권장`,
      });
    }
  }

  // 공복 혈당 > 130 → 확인 필요
  if (fasting && fasting.avg > 130) {
    out.push({
      type: 'open_patient',
      priority: 'MEDIUM',
      label: '공복 혈당 상세 확인',
      reason: `공복 평균 ${fasting.avg} mg/dL — 약물/생활습관 점검 권장`,
    });
  }
}

// ── Exercise rules ──

function applyExerciseRules(
  impact: TimeAnalysisInput['exerciseImpact'],
  out: CareGeneratedAction[],
): void {
  if (impact.count < 3 || impact.avgWithExercise == null || impact.overallAvg == null) return;

  const diff = impact.avgWithExercise - impact.overallAvg;

  // 운동 효과 없음 (운동 시 혈당이 전체 평균과 비슷하거나 높음)
  if (diff >= 0) {
    out.push({
      type: 'link_guideline',
      priority: 'MEDIUM',
      label: '운동 효과 점검 가이드',
      reason: `운동 시 혈당 감소 효과가 미미합니다 (차이 ${diff > 0 ? '+' : ''}${diff} mg/dL)`,
    });
  }

  // 운동 효과 좋음 → 유지 코칭
  if (diff <= -15) {
    out.push({
      type: 'create_coaching',
      priority: 'LOW',
      label: '운동 유지 격려 코칭',
      reason: `운동 시 혈당 ${Math.abs(diff)} mg/dL 감소 — 좋은 효과, 유지 권장`,
    });
  }
}

// ── Trend rules ──

function applyTrendRules(
  trends: TimeAnalysisInput['trends'],
  out: CareGeneratedAction[],
): void {
  if (trends.avg3d == null || trends.avg7d == null) return;

  const shortTermChange = trends.avg3d - trends.avg7d;

  // 최근 3일이 7일 대비 15 이상 상승 → 악화 추세
  if (shortTermChange >= 15) {
    out.push({
      type: 'create_coaching',
      priority: 'HIGH',
      label: '혈당 상승 추세 코칭 필요',
      reason: `최근 3일 평균이 7일 대비 +${shortTermChange} mg/dL 상승 — 즉시 개입 권장`,
    });
  }

  // 최근 3일이 7일 대비 10~14 상승 → 주의
  if (shortTermChange >= 10 && shortTermChange < 15) {
    out.push({
      type: 'open_patient',
      priority: 'MEDIUM',
      label: '혈당 추세 상세 확인',
      reason: `최근 3일 평균이 7일 대비 +${shortTermChange} mg/dL 상승 추세`,
    });
  }

  // 개선 추세 → 격려
  if (shortTermChange <= -10) {
    out.push({
      type: 'create_coaching',
      priority: 'LOW',
      label: '혈당 개선 격려 코칭',
      reason: `최근 3일 평균이 7일 대비 ${shortTermChange} mg/dL 감소 — 개선 중`,
    });
  }
}
