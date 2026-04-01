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

/** 다중 약품 입력 단위 아이템 */
export type MedicationItem = MedicationMeta;

/**
 * normalizeMedications
 *
 * metadata에서 medications 배열을 추출한다.
 * - 신규: metadata.medications (배열)
 * - 레거시: metadata.medication (단일 객체) → [medication]
 * - 둘 다 없으면 빈 배열
 */
export function normalizeMedications(metadata: unknown): MedicationItem[] {
  const meta = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, unknown>;

  // 신규 배열 구조 우선
  if (Array.isArray(meta.medications)) {
    return meta.medications.filter(
      (m: unknown) => m && typeof m === 'object',
    ) as MedicationItem[];
  }

  // 레거시 단일 객체
  if (meta.medication && typeof meta.medication === 'object' && !Array.isArray(meta.medication)) {
    return [meta.medication as MedicationItem];
  }

  return [];
}

export interface ExerciseMeta {
  type?: string;
  duration?: number;
  intensity?: string;
  timing?: string;
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
  /** @deprecated 레거시 단일 객체 — 표시용으로만 유지. 신규 코드는 medications 사용 */
  medication?: MedicationMeta;
  /** 정규화된 다중 약품 배열 (신규 + 레거시 모두 포함) */
  medications: MedicationItem[];
  exercise?: ExerciseMeta;
  symptoms?: SymptomsMeta;
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

  const medications = normalizeMedications(meta);

  return {
    mealTiming: meta.mealTiming as string | undefined,
    situation: meta.situation as string | undefined,
    state: meta.state as string | undefined,
    timeOfDay: meta.timeOfDay as string | undefined,
    meal: meta.meal as MealMeta | undefined,
    medication: medications[0] as MedicationMeta | undefined,
    medications,
    exercise: meta.exercise as ExerciseMeta | undefined,
    symptoms,
  };
}
