/**
 * Care Record Mapper — 건강 기록 테이블용 정규화 유틸
 * WO-O4O-CARE-RECORDS-TABLE-V1
 *
 * HealthReadingDto → CareRecordRow 변환
 */

import type { HealthReadingDto } from '../services/api';
import {
  extractMetadata,
  type MedicationMeta,
  type ExerciseMeta,
  type SymptomsMeta,
} from './extract-metadata';
import { MEAL_TIMING_LABELS } from '../constants/meal-timing';

export interface CareRecordRow {
  id: string;
  /** 혈당 측정 시간 (measuredAt) */
  eventTime: Date;
  /** DB 등록 시간 (createdAt) */
  recordedAt: Date;
  glucoseValue: number | null;
  unit: string;
  mealTiming: string | null;
  mealTimingLabel: string;
  medication: MedicationMeta | undefined;
  /** 투약 시간 — medication.takenAt */
  medicationTime: Date | null;
  exercise: ExerciseMeta | undefined;
  /** 운동 시간 — exercise.exercisedAt */
  exerciseTime: Date | null;
  symptoms: SymptomsMeta | undefined;
  /** 증상 발생 시간 — metadata.symptomAt */
  symptomTime: Date | null;
  sourceType: string;
  sourceLabel: string;
  tags: string[];
  raw: HealthReadingDto;
}

const SOURCE_LABELS: Record<string, string> = {
  patient_self: '환자 입력',
  manual: '약국 입력',
};

export function getSourceLabel(sourceType: string): string {
  return SOURCE_LABELS[sourceType] || sourceType;
}

/** datetime-local 또는 ISO string → Date | null */
function parseOptionalDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function mapReadingToRow(reading: HealthReadingDto): CareRecordRow {
  const meta = extractMetadata(reading.metadata);
  const glucoseValue =
    reading.valueNumeric != null ? parseFloat(reading.valueNumeric) : null;

  const tags: string[] = [];
  if (meta.medication?.name) tags.push(meta.medication.name);
  if (meta.medication?.dose) tags.push(meta.medication.dose);
  if (meta.exercise?.type) tags.push(meta.exercise.type);
  if (meta.symptoms?.items) {
    tags.push(...meta.symptoms.items);
  }
  if (meta.mealTiming) {
    tags.push(MEAL_TIMING_LABELS[meta.mealTiming] || meta.mealTiming);
  }
  if (glucoseValue != null) {
    tags.push(String(Math.round(glucoseValue)));
  }

  return {
    id: reading.id,
    eventTime: new Date(reading.measuredAt),
    recordedAt: new Date(reading.createdAt),
    glucoseValue,
    unit: reading.unit || 'mg/dL',
    mealTiming: meta.mealTiming || null,
    mealTimingLabel: meta.mealTiming
      ? MEAL_TIMING_LABELS[meta.mealTiming] || meta.mealTiming
      : '',
    medication: meta.medication,
    medicationTime: parseOptionalDate(meta.medication?.takenAt),
    exercise: meta.exercise,
    exerciseTime: parseOptionalDate(meta.exercise?.exercisedAt),
    symptoms: meta.symptoms,
    symptomTime: parseOptionalDate(meta.symptomAt),
    sourceType: reading.sourceType,
    sourceLabel: getSourceLabel(reading.sourceType),
    tags,
    raw: reading,
  };
}

export function mapReadingsToRows(readings: HealthReadingDto[]): CareRecordRow[] {
  return readings.map(mapReadingToRow);
}
