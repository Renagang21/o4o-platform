import type { BpReading, WeightReading } from '../provider/health-metric.provider.js';

/**
 * Multi-Metric Analysis Engine — Pure Functions
 *
 * WO-O4O-CARE-MULTI-METRIC-ANALYSIS-V1
 *
 * No DB access, no side effects.
 * Analyses blood pressure, weight, and computes metabolic risk.
 */

// ── Result Types ──

export interface BpAnalysisResult {
  avgSystolic: number;
  avgDiastolic: number;
  bpCategory: 'normal' | 'elevated' | 'high_stage1' | 'high_stage2';
  readingCount: number;
}

export interface WeightAnalysisResult {
  latestWeight: number;
  weightChange: number | null; // kg difference vs period start
  bmi: number | null;          // null when height unavailable
  readingCount: number;
}

export interface MetabolicRiskResult {
  metabolicRiskLevel: 'low' | 'moderate' | 'high';
  metabolicScore: number; // 0–100
  riskFactors: string[];
}

// ── Blood Pressure Analysis ──

/**
 * AHA Blood Pressure Categories:
 *   Normal:      SYS < 120 AND DIA < 80
 *   Elevated:    SYS 120–129 AND DIA < 80
 *   High Stage1: SYS 130–139 OR DIA 80–89
 *   High Stage2: SYS ≥ 140 OR DIA ≥ 90
 */
function classifyBp(
  avgSys: number,
  avgDia: number,
): BpAnalysisResult['bpCategory'] {
  if (avgSys >= 140 || avgDia >= 90) return 'high_stage2';
  if (avgSys >= 130 || avgDia >= 80) return 'high_stage1';
  if (avgSys >= 120 && avgDia < 80) return 'elevated';
  return 'normal';
}

export function analyzeBp(readings: BpReading[]): BpAnalysisResult {
  if (readings.length === 0) {
    return { avgSystolic: 0, avgDiastolic: 0, bpCategory: 'normal', readingCount: 0 };
  }

  const n = readings.length;
  const sumSys = readings.reduce((s, r) => s + r.systolic, 0);
  const sumDia = readings.reduce((s, r) => s + r.diastolic, 0);
  const avgSystolic = Math.round(sumSys / n);
  const avgDiastolic = Math.round(sumDia / n);

  return {
    avgSystolic,
    avgDiastolic,
    bpCategory: classifyBp(avgSystolic, avgDiastolic),
    readingCount: n,
  };
}

// ── Weight Analysis ──

export function analyzeWeight(readings: WeightReading[]): WeightAnalysisResult {
  if (readings.length === 0) {
    return { latestWeight: 0, weightChange: null, bmi: null, readingCount: 0 };
  }

  const sorted = [...readings].sort(
    (a, b) => a.timestamp.localeCompare(b.timestamp),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const weightChange =
    sorted.length >= 2
      ? Math.round((last.weight - first.weight) * 10) / 10
      : null;

  return {
    latestWeight: last.weight,
    weightChange,
    bmi: null, // height not available in health_readings
    readingCount: readings.length,
  };
}

// ── Metabolic Risk Assessment ──

const GLUCOSE_RISK_SCORES: Record<string, number> = {
  low: 0,
  moderate: 25,
  high: 45,
};

const BP_CATEGORY_SCORES: Record<string, number> = {
  normal: 0,
  elevated: 10,
  high_stage1: 25,
  high_stage2: 40,
};

export function assessMetabolicRisk(
  glucoseRisk: 'low' | 'moderate' | 'high',
  bp: BpAnalysisResult | null,
  weight: WeightAnalysisResult | null,
): MetabolicRiskResult {
  const riskFactors: string[] = [];
  let score = 0;

  // Glucose contribution (max 45)
  score += GLUCOSE_RISK_SCORES[glucoseRisk] ?? 0;
  if (glucoseRisk === 'high') {
    riskFactors.push('혈당 고위험 (TIR < 50%)');
  } else if (glucoseRisk === 'moderate') {
    riskFactors.push('혈당 주의 (TIR 50–69%)');
  }

  // BP contribution (max 40)
  if (bp && bp.readingCount > 0) {
    score += BP_CATEGORY_SCORES[bp.bpCategory] ?? 0;
    if (bp.bpCategory === 'high_stage2') {
      riskFactors.push(`고혈압 2단계 (평균 ${bp.avgSystolic}/${bp.avgDiastolic} mmHg)`);
    } else if (bp.bpCategory === 'high_stage1') {
      riskFactors.push(`고혈압 1단계 (평균 ${bp.avgSystolic}/${bp.avgDiastolic} mmHg)`);
    } else if (bp.bpCategory === 'elevated') {
      riskFactors.push(`혈압 상승 (평균 ${bp.avgSystolic}/${bp.avgDiastolic} mmHg)`);
    }
  }

  // Weight contribution (max 15)
  if (weight && weight.readingCount >= 2 && weight.weightChange != null) {
    const absChange = Math.abs(weight.weightChange);
    if (absChange >= 3) {
      score += 15;
      riskFactors.push(
        weight.weightChange > 0
          ? `체중 증가 (+${weight.weightChange}kg)`
          : `체중 감소 (${weight.weightChange}kg)`,
      );
    } else if (absChange >= 1.5) {
      score += 8;
      riskFactors.push(
        weight.weightChange > 0
          ? `체중 소폭 증가 (+${weight.weightChange}kg)`
          : `체중 소폭 감소 (${weight.weightChange}kg)`,
      );
    }
  }

  // Clamp score to 0–100
  score = Math.min(100, Math.max(0, score));

  const metabolicRiskLevel: MetabolicRiskResult['metabolicRiskLevel'] =
    score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'low';

  return { metabolicRiskLevel, metabolicScore: score, riskFactors };
}
