/**
 * 건강 기록 메타데이터 추출 유틸
 * WO-O4O-CARE-COMMON-CONSTANTS-AND-UTILS-CONSOLIDATION-V1
 *
 * health_readings.metadata JSONB에서 타입 안전하게 추출
 */

export interface MealMeta {
  type?: string;
  style?: string;
  amount?: string;
}

export interface MedicationMeta {
  name?: string;
  dose?: string;
  taken?: boolean;
  takenAt?: string;
  timing?: string;
  note?: string;
}

export interface ExerciseMeta {
  type?: string;
  duration?: number;
  intensity?: string;
  timing?: string;
  exercisedAt?: string;
}

export interface SymptomsMeta {
  items: string[];
  severity?: string;
  duration?: number;
}

export interface ExtractedMetadata {
  mealTiming?: string;
  situation?: string;
  state?: string;
  timeOfDay?: string;
  meal?: MealMeta;
  medication?: MedicationMeta;
  exercise?: ExerciseMeta;
  symptoms?: SymptomsMeta;
  symptomAt?: string;
}

/**
 * metadata JSONB → typed object
 * symptoms는 backward compat 처리 (string[] | { items, severity, duration })
 */
export function extractMetadata(metadata: unknown): ExtractedMetadata {
  const meta = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, unknown>;

  // Normalize symptoms: string[] (legacy) → { items, severity?, duration? }
  let symptoms: SymptomsMeta | undefined;
  const sympRaw = meta.symptoms;
  if (Array.isArray(sympRaw)) {
    symptoms = { items: sympRaw as string[] };
  } else if (sympRaw && typeof sympRaw === 'object') {
    const so = sympRaw as { items?: string[]; severity?: string; duration?: number };
    if (so.items && so.items.length > 0) {
      symptoms = { items: so.items, severity: so.severity, duration: so.duration };
    }
  }

  return {
    mealTiming: meta.mealTiming as string | undefined,
    situation: meta.situation as string | undefined,
    state: meta.state as string | undefined,
    timeOfDay: meta.timeOfDay as string | undefined,
    meal: meta.meal as MealMeta | undefined,
    medication: meta.medication as MedicationMeta | undefined,
    exercise: meta.exercise as ExerciseMeta | undefined,
    symptoms,
    symptomAt: meta.symptomAt as string | undefined,
  };
}
