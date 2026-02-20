import type { CgmReading } from './cgm.provider.js';

export interface AnalysisResult {
  tir: number;   // 0–100 (integer %)
  cv: number;    // 0–100 (integer %)
  riskLevel: 'low' | 'moderate' | 'high';
}

/**
 * analyzeReadings
 *
 * Pure function: CgmReading[] → AnalysisResult.
 * No DB access, no side effects.
 *
 * - TIR: percentage of readings in 70–180 mg/dL range
 * - CV:  coefficient of variation = (stddev / mean) × 100
 * - Risk: TIR ≥ 70 → low, 50–69 → moderate, < 50 → high
 */
export function analyzeReadings(readings: CgmReading[]): AnalysisResult {
  if (readings.length === 0) {
    return { tir: 0, cv: 0, riskLevel: 'high' };
  }

  const values = readings.map((r) => r.glucose);
  const n = values.length;

  // TIR: Time in Range (70–180 mg/dL)
  const inRange = values.filter((g) => g >= 70 && g <= 180).length;
  const tir = Math.round((inRange / n) * 100);

  // CV: Coefficient of Variation
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, g) => sum + (g - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? Math.round((stddev / mean) * 100) : 0;

  // Risk level
  const riskLevel: AnalysisResult['riskLevel'] =
    tir >= 70 ? 'low' :
    tir >= 50 ? 'moderate' : 'high';

  return { tir, cv, riskLevel };
}
