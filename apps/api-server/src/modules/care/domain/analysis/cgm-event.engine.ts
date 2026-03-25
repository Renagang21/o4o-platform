import {
  EVENT_WINDOWS,
} from './cgm-event.types.js';
import type {
  TimestampedGlucose,
  CgmEvent,
  CgmEventType,
  EventAnalysis,
  MealAnalysis,
  ExerciseAnalysis,
  MedicationAnalysis,
  SymptomAnalysis,
  DetectedPattern,
  CgmEventAnalysisResult,
} from './cgm-event.types.js';

/**
 * analyzeCgmEvents
 *
 * Pure function: (glucose readings, events) → CgmEventAnalysisResult.
 * No DB access, no side effects.
 *
 * WO-O4O-CARE-CGM-EVENT-INTEGRATION-V1
 */
export function analyzeCgmEvents(
  patientId: string,
  readings: TimestampedGlucose[],
  events: CgmEvent[],
  periodFrom: string,
  periodTo: string,
): CgmEventAnalysisResult {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const eventResults: EventAnalysis[] = [];
  let insufficientDataEvents = 0;

  for (const event of events) {
    const result = analyzeEvent(sorted, event);
    if (result) {
      eventResults.push(result);
      if (isInsufficient(result)) insufficientDataEvents++;
    }
  }

  const patterns = detectPatterns(eventResults);

  const eventsByType: Record<CgmEventType, number> = {
    meal: 0,
    exercise: 0,
    medication: 0,
    symptom: 0,
  };
  for (const ev of eventResults) eventsByType[ev.eventType]++;

  const crossReadingAnalysis = computeCrossReading(sorted, events);

  return {
    patientId,
    periodFrom,
    periodTo,
    events: eventResults,
    patterns,
    summary: {
      totalEvents: eventResults.length,
      eventsByType,
      insufficientDataEvents,
    },
    crossReadingAnalysis,
  };
}

// ── Internal helpers ──

function analyzeEvent(sorted: TimestampedGlucose[], event: CgmEvent): EventAnalysis | null {
  switch (event.eventType) {
    case 'meal':
      return analyzeMealEvent(sorted, event);
    case 'exercise':
      return analyzeExerciseEvent(sorted, event);
    case 'medication':
      return analyzeMedicationEvent(sorted, event);
    case 'symptom':
      return analyzeSymptomEvent(sorted, event);
    default:
      return null;
  }
}

// ── Window extraction ──

function getReadingsInWindow(
  sorted: TimestampedGlucose[],
  centerMs: number,
  beforeMs: number,
  afterMs: number,
): { before: number[]; after: number[] } {
  const before: number[] = [];
  const after: number[] = [];
  const windowStart = centerMs - beforeMs;
  const windowEnd = centerMs + afterMs;

  for (const r of sorted) {
    const t = new Date(r.timestamp).getTime();
    if (t < windowStart || t > windowEnd) continue;
    if (t <= centerMs) {
      before.push(r.glucose);
    } else {
      after.push(r.glucose);
    }
  }

  return { before, after };
}

// ── Meal analysis ──

function analyzeMealEvent(sorted: TimestampedGlucose[], event: CgmEvent): MealAnalysis {
  const w = EVENT_WINDOWS.meal;
  const centerMs = new Date(event.eventTime).getTime();
  const { before, after } = getReadingsInWindow(
    sorted,
    centerMs,
    w.beforeMin * 60000,
    w.afterMin * 60000,
  );

  const baseline = before.length > 0 ? avg(before) : null;
  const peak = after.length > 0 ? Math.max(...after) : null;
  const delta = baseline != null && peak != null ? round1(peak - baseline) : null;

  let impact: MealAnalysis['impact'] = null;
  if (delta != null) {
    impact = delta > 80 ? 'high' : delta >= 40 ? 'moderate' : 'low';
  }

  const label = impact === 'high' ? '급상승' : impact === 'moderate' ? '정상 상승' : impact === 'low' ? '안정' : '데이터 부족';

  return {
    eventType: 'meal',
    eventTime: event.eventTime,
    readingId: event.readingId,
    detail: event.detail,
    baseline: baseline != null ? round1(baseline) : null,
    peak: peak != null ? round1(peak) : null,
    delta,
    impact,
    beforeCount: before.length,
    afterCount: after.length,
    label,
  };
}

// ── Exercise analysis ──

function analyzeExerciseEvent(sorted: TimestampedGlucose[], event: CgmEvent): ExerciseAnalysis {
  const w = EVENT_WINDOWS.exercise;
  const centerMs = new Date(event.eventTime).getTime();
  const { before, after } = getReadingsInWindow(
    sorted,
    centerMs,
    w.beforeMin * 60000,
    w.afterMin * 60000,
  );

  const baseline = before.length > 0 ? avg(before) : null;
  const minAfter = after.length > 0 ? Math.min(...after) : null;
  const drop = baseline != null && minAfter != null ? round1(baseline - minAfter) : null;

  let effect: ExerciseAnalysis['effect'] = null;
  if (drop != null) {
    effect = drop > 40 ? 'high' : drop >= 20 ? 'moderate' : 'low';
  }

  const label = effect === 'high' ? '큰 효과' : effect === 'moderate' ? '보통 효과' : effect === 'low' ? '적은 효과' : '데이터 부족';

  return {
    eventType: 'exercise',
    eventTime: event.eventTime,
    readingId: event.readingId,
    detail: event.detail,
    baseline: baseline != null ? round1(baseline) : null,
    minAfter: minAfter != null ? round1(minAfter) : null,
    drop,
    effect,
    beforeCount: before.length,
    afterCount: after.length,
    label,
  };
}

// ── Medication analysis ──

function analyzeMedicationEvent(sorted: TimestampedGlucose[], event: CgmEvent): MedicationAnalysis {
  const w = EVENT_WINDOWS.medication;
  const centerMs = new Date(event.eventTime).getTime();
  // medication: beforeMin=0, but we look at 4h before for variance comparison
  const before: number[] = [];
  const after: number[] = [];
  const windowBefore = centerMs - 4 * 3600000; // 4h before for baseline variance
  const windowAfter = centerMs + w.afterMin * 60000;

  for (const r of sorted) {
    const t = new Date(r.timestamp).getTime();
    if (t >= windowBefore && t <= centerMs) {
      before.push(r.glucose);
    } else if (t > centerMs && t <= windowAfter) {
      after.push(r.glucose);
    }
  }

  const varianceBefore = before.length >= 2 ? round1(variance(before)) : null;
  const varianceAfter = after.length >= 2 ? round1(variance(after)) : null;

  let effect: MedicationAnalysis['effect'] = null;
  if (varianceBefore != null && varianceAfter != null) {
    effect = varianceAfter < varianceBefore ? 'effective' : 'weak';
  }

  const label = effect === 'effective' ? '효과적' : effect === 'weak' ? '약한 효과' : '데이터 부족';

  return {
    eventType: 'medication',
    eventTime: event.eventTime,
    readingId: event.readingId,
    detail: event.detail,
    varianceBefore,
    varianceAfter,
    effect,
    beforeCount: before.length,
    afterCount: after.length,
    label,
  };
}

// ── Symptom analysis ──

function analyzeSymptomEvent(sorted: TimestampedGlucose[], event: CgmEvent): SymptomAnalysis {
  const w = EVENT_WINDOWS.symptom;
  const centerMs = new Date(event.eventTime).getTime();
  const windowStart = centerMs - w.beforeMin * 60000;
  const windowEnd = centerMs + w.afterMin * 60000;

  // Find nearest glucose reading within ±15min
  let nearest: number | null = null;
  let nearestDist = Infinity;
  let nearCount = 0;

  for (const r of sorted) {
    const t = new Date(r.timestamp).getTime();
    if (t < windowStart || t > windowEnd) continue;
    nearCount++;
    const dist = Math.abs(t - centerMs);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = r.glucose;
    }
  }

  let context: SymptomAnalysis['context'] = null;
  if (nearest != null) {
    context = nearest < 70 ? 'hypoglycemia' : nearest > 250 ? 'hyperglycemia' : 'normal';
  }

  const label =
    context === 'hypoglycemia'
      ? '저혈당'
      : context === 'hyperglycemia'
        ? '고혈당'
        : context === 'normal'
          ? '정상 범위'
          : '데이터 부족';

  return {
    eventType: 'symptom',
    eventTime: event.eventTime,
    readingId: event.readingId,
    detail: event.detail,
    glucoseAtEvent: nearest != null ? round1(nearest) : null,
    context,
    nearCount,
    label,
  };
}

// ── Pattern detection ──

const PATTERN_LABELS: Record<string, Record<string, string>> = {
  meal: { high: '식후 급상승 반복', moderate: '식후 정상 상승 반복', low: '식후 안정 반복' },
  exercise: { high: '운동 시 혈당 감소 효과 큼', moderate: '운동 시 보통 효과', low: '운동 효과 적음' },
  medication: { effective: '약 복용 후 혈당 안정 효과적', weak: '약 복용 효과 약함' },
  symptom: { hypoglycemia: '저혈당 반복 발생', hyperglycemia: '고혈당 반복 발생' },
};

function detectPatterns(results: EventAnalysis[]): DetectedPattern[] {
  const groups = new Map<string, { type: CgmEventType; classification: string; ids: string[] }>();

  for (const r of results) {
    const classification = getClassification(r);
    if (!classification) continue;
    const key = `${r.eventType}:${classification}`;
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(r.readingId);
    } else {
      groups.set(key, { type: r.eventType, classification, ids: [r.readingId] });
    }
  }

  const patterns: DetectedPattern[] = [];
  for (const g of groups.values()) {
    if (g.ids.length >= 3) {
      const labelBase = PATTERN_LABELS[g.type]?.[g.classification] || `${g.type} ${g.classification}`;
      patterns.push({
        patternType: g.type,
        classification: g.classification,
        count: g.ids.length,
        label: `${labelBase} (${g.ids.length}회)`,
      });
    }
  }

  return patterns;
}

function getClassification(r: EventAnalysis): string | null {
  switch (r.eventType) {
    case 'meal':
      return r.impact;
    case 'exercise':
      return r.effect;
    case 'medication':
      return r.effect;
    case 'symptom':
      return r.context === 'normal' ? null : r.context; // normal은 패턴에서 제외
    default:
      return null;
  }
}

// ── Cross-reading analysis ──

const POST_MEAL_TIMINGS = new Set(['after_meal', 'after_meal_1h', 'after_meal_2h']);

function computeCrossReading(
  sorted: TimestampedGlucose[],
  events: CgmEvent[],
): CgmEventAnalysisResult['crossReadingAnalysis'] {
  // Build a set of readingIds that are meal events to identify mealTiming
  // We need to look at all readings to find fasting vs post-meal based on their own metadata
  // Since we only have glucose values here, we use the events' detail to infer mealTiming from the reading
  // Alternative: extract mealTiming from metadata in provider and pass along

  // For cross-reading, we look at ALL glucose readings and their associated events
  // A reading is "fasting" if it has an event with detail containing mealTiming=fasting
  // This is a simplified approach; ideally the provider would tag readings with mealTiming

  // Use events to build readingId → mealTiming map (from meal events' detail)
  // But events only include readings with meal/exercise/medication/symptoms metadata
  // The mealTiming is on the reading itself, not in the meal sub-object

  // For v1: we cannot access mealTiming from pure glucose data alone
  // We rely on events passed to us. Meal events have detail with type/style/amount
  // We mark meal-event readings as "post-meal" and non-event readings as potential "fasting"
  // This is imprecise but a reasonable v1 heuristic

  if (sorted.length < 2) return null;

  const mealReadingIds = new Set<string>();
  for (const ev of events) {
    if (ev.eventType === 'meal') mealReadingIds.add(ev.readingId);
  }

  // Without reading metadata, we approximate:
  // - Readings associated with meal events → post-meal
  // - All other readings → potential fasting (rough approximation)
  // In practice, the real mealTiming should come from the provider
  // For now, we just use a simple average of all readings as the baseline
  const allValues = sorted.map((r) => r.glucose);
  const globalAvg = avg(allValues);

  // Post-meal readings: match by event time (within 5 minutes)
  const mealEventTimes = events
    .filter((e) => e.eventType === 'meal')
    .map((e) => new Date(e.eventTime).getTime());

  const postMealValues: number[] = [];
  const nonMealValues: number[] = [];

  for (const r of sorted) {
    const t = new Date(r.timestamp).getTime();
    const isMealTime = mealEventTimes.some((mt) => Math.abs(t - mt) < 5 * 60000);
    if (isMealTime) {
      postMealValues.push(r.glucose);
    } else {
      nonMealValues.push(r.glucose);
    }
  }

  const fastingAvg = nonMealValues.length > 0 ? round1(avg(nonMealValues)) : null;
  const postMealAvg = postMealValues.length > 0 ? round1(avg(postMealValues)) : null;
  const delta = fastingAvg != null && postMealAvg != null ? round1(postMealAvg - fastingAvg) : null;

  return { fastingAvg, postMealAvg, delta };
}

// ── Utility ──

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[]): number {
  const m = avg(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function isInsufficient(result: EventAnalysis): boolean {
  switch (result.eventType) {
    case 'meal':
      return result.beforeCount === 0 && result.afterCount === 0;
    case 'exercise':
      return result.beforeCount === 0 && result.afterCount === 0;
    case 'medication':
      return result.beforeCount === 0 && result.afterCount === 0;
    case 'symptom':
      return result.nearCount === 0;
    default:
      return false;
  }
}
