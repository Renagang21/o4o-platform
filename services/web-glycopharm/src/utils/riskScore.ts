/**
 * Risk Score Calculator — 당뇨인 혈당 위험도 계산
 * WO-GLYCOPHARM-PATIENT-RISK-SCORE-V1
 *
 * 기준:
 *   평균 혈당 > 180         → HIGH
 *   평균 혈당 140~180       → MEDIUM
 *   평균 혈당 < 140         → LOW
 *   최근 7일 저혈당(<70) 2회↑ → HIGH (override)
 */

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskResult {
  level: RiskLevel;
  avgGlucose: number | null;
  latestGlucose: number | null;
  hypoCount: number;
  readingCount: number;
}

export const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bgColor: string; dotColor: string; sortOrder: number }
> = {
  HIGH: {
    label: '고위험',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    dotColor: 'bg-red-500',
    sortOrder: 0,
  },
  MEDIUM: {
    label: '주의',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    dotColor: 'bg-amber-500',
    sortOrder: 1,
  },
  LOW: {
    label: '정상',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    dotColor: 'bg-emerald-500',
    sortOrder: 2,
  },
};

export const NO_DATA_CONFIG = {
  label: '미분석',
  color: 'text-slate-500',
  bgColor: 'bg-slate-50',
  dotColor: 'bg-slate-300',
  sortOrder: 3,
};

export function calculateRisk(
  readings: { valueNumeric: string | number | null; measuredAt: string }[],
): RiskResult {
  const values = readings
    .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
    .filter((v) => !isNaN(v));

  if (values.length === 0) {
    return { level: 'LOW', avgGlucose: null, latestGlucose: null, hypoCount: 0, readingCount: 0 };
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // 최근 7일 저혈당 횟수
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLowCount = readings.filter((r) => {
    const v = r.valueNumeric != null ? Number(r.valueNumeric) : NaN;
    return !isNaN(v) && v < 70 && new Date(r.measuredAt) >= sevenDaysAgo;
  }).length;

  // 최신 혈당
  const sorted = [...readings].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );
  const latestVal = sorted[0]?.valueNumeric != null ? Number(sorted[0].valueNumeric) : null;

  let level: RiskLevel = 'LOW';
  if (recentLowCount >= 2) level = 'HIGH';
  else if (avg > 180) level = 'HIGH';
  else if (avg > 140) level = 'MEDIUM';

  return {
    level,
    avgGlucose: Math.round(avg),
    latestGlucose: latestVal != null ? Math.round(latestVal) : null,
    hypoCount: recentLowCount,
    readingCount: values.length,
  };
}
