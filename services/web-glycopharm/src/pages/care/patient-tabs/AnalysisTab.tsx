/**
 * AnalysisTab - 당뇨인 분석 결과 (live)
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 *
 * API:
 *   GET /api/v1/care/analysis/:patientId → TIR/CV/Risk + insights
 *   GET /api/v1/care/kpi/:patientId → 트렌드 비교
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lightbulb,
  Heart,
  Weight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { pharmacyApi, type CareInsightDto, type KpiComparisonDto, type CareLlmInsightDto, type HealthReadingDto } from '@/api/pharmacy';
import { usePatientDetail } from '../PatientDetailPage';

const RISK_DISPLAY = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700', Icon: AlertTriangle },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700', Icon: AlertCircle },
  low: { label: '양호', cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
} as const;

const TREND_DISPLAY = {
  improving: { label: '개선 중', cls: 'text-green-600', Icon: TrendingUp },
  stable: { label: '유지', cls: 'text-slate-500', Icon: Minus },
  worsening: { label: '악화', cls: 'text-red-600', Icon: TrendingDown },
} as const;

const BP_CATEGORY_DISPLAY: Record<string, { label: string; cls: string }> = {
  normal: { label: '정상', cls: 'bg-green-100 text-green-700' },
  elevated: { label: '상승', cls: 'bg-amber-100 text-amber-700' },
  high_stage1: { label: '고혈압 1단계', cls: 'bg-orange-100 text-orange-700' },
  high_stage2: { label: '고혈압 2단계', cls: 'bg-red-100 text-red-700' },
};

// ─── Chart constants (from AnalysisPage) ───

const TIR_LOW = 70;
const TIR_HIGH = 180;

const MEAL_COLORS: Record<string, { color: string; label: string }> = {
  fasting: { color: '#7c3aed', label: '공복' },
  before_meal: { color: '#2563eb', label: '식전' },
  after_meal: { color: '#f97316', label: '식후' },
  bedtime: { color: '#6366f1', label: '취침전' },
  random: { color: '#64748b', label: '수시' },
};

// ─── GlucoseChartWithMeal — SVG 혈당 차트 + mealTiming 색분리 ───

function GlucoseChartWithMeal({ readings }: { readings: HealthReadingDto[] }) {
  const sorted = useMemo(
    () =>
      [...readings]
        .filter((r) => r.valueNumeric != null && !isNaN(Number(r.valueNumeric)))
        .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()),
    [readings],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">혈당 기록이 없습니다.</p>
        <p className="text-xs text-slate-400 mt-1">데이터 탭에서 먼저 입력해 주세요.</p>
      </div>
    );
  }

  if (sorted.length < 2) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400">
        차트를 표시하려면 2개 이상의 기록이 필요합니다.
      </div>
    );
  }

  const W = 360;
  const H = 200;
  const PAD_LEFT = 40;
  const PAD_RIGHT = 12;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 44; // Extra space for legend
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const values = sorted.map((r) => Number(r.valueNumeric));
  const times = sorted.map((r) => new Date(r.measuredAt).getTime());

  const minVal = Math.max(40, Math.min(...values) - 20);
  const maxVal = Math.min(400, Math.max(...values) + 20);
  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const timeRange = maxTime - minTime || 1;

  const toX = (t: number) => PAD_LEFT + ((t - minTime) / timeRange) * chartW;
  const toY = (v: number) => PAD_TOP + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const points = sorted.map((_r, i) => ({
    x: toX(times[i]),
    y: toY(values[i]),
    val: values[i],
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = minVal + ((maxVal - minVal) * i) / (yTicks - 1);
    return { v: Math.round(v), y: toY(v) };
  });

  const tirY1 = toY(Math.min(TIR_HIGH, maxVal));
  const tirY2 = toY(Math.max(TIR_LOW, minVal));

  // Determine which mealTiming values are present for the legend
  const presentTimings = new Set<string>();
  let hasOutOfRange = false;
  sorted.forEach((r, i) => {
    const inRange = values[i] >= TIR_LOW && values[i] <= TIR_HIGH;
    if (!inRange) hasOutOfRange = true;
    const mt = (r.metadata as Record<string, string>)?.mealTiming;
    if (mt && MEAL_COLORS[mt]) presentTimings.add(mt);
  });

  const legendItems = [
    ...Array.from(presentTimings).map((mt) => ({
      color: MEAL_COLORS[mt].color,
      label: MEAL_COLORS[mt].label,
    })),
    ...(hasOutOfRange ? [{ color: '#ef4444', label: '범위 초과' }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* TIR band */}
      <rect x={PAD_LEFT} y={tirY1} width={chartW} height={Math.max(0, tirY2 - tirY1)} fill="#dcfce7" opacity={0.5} />

      {/* Grid + Y-axis labels */}
      {yLabels.map((tick) => (
        <g key={tick.v}>
          <line x1={PAD_LEFT} y1={tick.y} x2={PAD_LEFT + chartW} y2={tick.y} stroke="#e2e8f0" strokeWidth={0.5} />
          <text x={PAD_LEFT - 4} y={tick.y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{tick.v}</text>
        </g>
      ))}

      {/* TIR boundary labels */}
      {TIR_HIGH <= maxVal && (
        <text x={PAD_LEFT + chartW + 2} y={tirY1 + 8} fontSize="7" fill="#16a34a" opacity={0.7}>180</text>
      )}
      {TIR_LOW >= minVal && (
        <text x={PAD_LEFT + chartW + 2} y={tirY2 - 2} fontSize="7" fill="#16a34a" opacity={0.7}>70</text>
      )}

      {/* Line */}
      <path d={pathD} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeLinejoin="round" opacity={0.5} />

      {/* Data points with mealTiming colors */}
      {points.map((p, i) => {
        const inRange = p.val >= TIR_LOW && p.val <= TIR_HIGH;
        const meta = sorted[i].metadata as Record<string, string>;
        const mealTiming = meta?.mealTiming;
        const dotColor = !inRange
          ? '#ef4444'
          : (mealTiming && MEAL_COLORS[mealTiming]?.color) || '#2563eb';
        return (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={dotColor} stroke="white" strokeWidth={1} />
        );
      })}

      {/* X-axis date labels */}
      <text x={PAD_LEFT} y={PAD_TOP + chartH + 14} fontSize="8" fill="#94a3b8" textAnchor="start">
        {new Date(minTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>
      <text x={PAD_LEFT + chartW} y={PAD_TOP + chartH + 14} fontSize="8" fill="#94a3b8" textAnchor="end">
        {new Date(maxTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>

      {/* Legend */}
      {legendItems.length > 0 && (() => {
        const legendY = H - 6;
        const itemWidth = chartW / Math.max(legendItems.length, 1);
        return legendItems.map((item, i) => (
          <g key={item.label}>
            <circle cx={PAD_LEFT + i * itemWidth + 4} cy={legendY - 3} r={3} fill={item.color} />
            <text x={PAD_LEFT + i * itemWidth + 10} y={legendY} fontSize="8" fill="#64748b">{item.label}</text>
          </g>
        ));
      })()}
    </svg>
  );
}

// ─── MiniStat ───

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-100 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-700 tabular-nums">{value}</p>
    </div>
  );
}

export default function AnalysisTab() {
  const { patient } = usePatientDetail();
  const [analysis, setAnalysis] = useState<CareInsightDto | null>(null);
  const [kpi, setKpi] = useState<KpiComparisonDto | null>(null);
  const [llmInsight, setLlmInsight] = useState<CareLlmInsightDto | null>(null);
  const [readings, setReadings] = useState<HealthReadingDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    setLoading(true);

    const from = new Date();
    from.setDate(from.getDate() - 30);

    Promise.all([
      pharmacyApi.getCareAnalysis(patient.id).catch(() => null),
      pharmacyApi.getCareKpi(patient.id).catch(() => null),
      pharmacyApi.getCareLlmInsight(patient.id).catch(() => null),
      pharmacyApi.getHealthReadings(patient.id, { from: from.toISOString(), metricType: 'glucose' }).catch(() => [] as HealthReadingDto[]),
    ]).then(([a, k, llm, r]) => {
      setAnalysis(a);
      setKpi(k);
      setLlmInsight(llm);
      setReadings(r ?? []);
    }).finally(() => setLoading(false));
  }, [patient?.id]);

  // ── Glucose stats for mini cards ──
  const glucoseStats = useMemo(() => {
    const values = readings
      .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
      .filter((v) => !isNaN(v));
    if (values.length === 0) return null;

    const fastingReadings = readings.filter(
      (r) => (r.metadata as Record<string, string>)?.mealTiming === 'fasting',
    );
    const fastingValues = fastingReadings
      .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
      .filter((v) => !isNaN(v));
    const fastingAvg = fastingValues.length > 0
      ? Math.round(fastingValues.reduce((a, b) => a + b, 0) / fastingValues.length)
      : null;

    const postMealReadings = readings.filter(
      (r) => (r.metadata as Record<string, string>)?.mealTiming === 'after_meal',
    );
    const postMealValues = postMealReadings
      .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
      .filter((v) => !isNaN(v));
    const postMealAvg = postMealValues.length > 0
      ? Math.round(postMealValues.reduce((a, b) => a + b, 0) / postMealValues.length)
      : null;

    const lastMeasured = readings.length > 0
      ? new Date(
          [...readings].sort(
            (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
          )[0].measuredAt,
        ).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
      : null;

    return { count: values.length, fastingAvg, postMealAvg, lastMeasured };
  }, [readings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[200px]">
        <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500 font-medium">분석 데이터 없음</p>
        <p className="text-xs text-slate-400 mt-1">건강 데이터를 먼저 입력해 주세요.</p>
      </div>
    );
  }

  const riskKey = analysis.riskLevel in RISK_DISPLAY ? analysis.riskLevel : 'low';
  const risk = RISK_DISPLAY[riskKey as keyof typeof RISK_DISPLAY];
  const trend = kpi?.riskTrend && kpi.riskTrend in TREND_DISPLAY
    ? TREND_DISPLAY[kpi.riskTrend as keyof typeof TREND_DISPLAY]
    : null;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">분석 결과</h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TIR */}
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <Activity className="w-5 h-5 text-blue-500" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">TIR (Time in Range)</p>
            <p className="text-2xl font-bold text-slate-800">{analysis.tir}%</p>
            {kpi?.tirChange != null && (
              <p className={`text-xs ${kpi.tirChange > 0 ? 'text-green-600' : kpi.tirChange < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {kpi.tirChange > 0 ? '+' : ''}{kpi.tirChange}% vs 이전
              </p>
            )}
          </div>
        </div>

        {/* CV */}
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">CV (변동계수)</p>
            <p className="text-2xl font-bold text-slate-800">{analysis.cv}%</p>
            {kpi?.cvChange != null && (
              <p className={`text-xs ${kpi.cvChange < 0 ? 'text-green-600' : kpi.cvChange > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {kpi.cvChange > 0 ? '+' : ''}{kpi.cvChange}% vs 이전
              </p>
            )}
          </div>
        </div>

        {/* Risk Level */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${risk.cls}`}>
          <risk.Icon className="w-5 h-5" />
          <div className="flex-1">
            <p className="text-xs opacity-70">위험도</p>
            <p className="text-2xl font-bold">{risk.label}</p>
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trend.cls}`}>
                <trend.Icon className="w-3 h-3" />
                {trend.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            분석 인사이트
          </h4>
          <div className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100"
              >
                <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-amber-800">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LLM Insight — WO-O4O-CARE-LLM-INSIGHT-V1 */}
      {llmInsight?.pharmacyInsight && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            AI 분석 해석
          </h4>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-line">
              {llmInsight.pharmacyInsight}
            </p>
            {llmInsight.createdAt && (
              <p className="text-xs text-blue-400 mt-3">
                {new Date(llmInsight.createdAt).toLocaleString('ko-KR')} | {llmInsight.model}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Multi-Metric Analysis — WO-O4O-CARE-MULTI-METRIC-ANALYSIS-V1 */}
      {analysis.multiMetric && (
        <>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">복합 지표 분석</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Blood Pressure */}
            {analysis.multiMetric.bp && analysis.multiMetric.bp.readingCount > 0 && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Heart className="w-5 h-5 text-rose-500" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">혈압 (평균)</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {analysis.multiMetric.bp.avgSystolic}/{analysis.multiMetric.bp.avgDiastolic}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const cat = BP_CATEGORY_DISPLAY[analysis.multiMetric.bp!.bpCategory] || BP_CATEGORY_DISPLAY.normal;
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${cat.cls}`}>
                          {cat.label}
                        </span>
                      );
                    })()}
                    <span className="text-xs text-slate-400">{analysis.multiMetric.bp.readingCount}회 측정</span>
                  </div>
                </div>
              </div>
            )}

            {/* Weight */}
            {analysis.multiMetric.weight && analysis.multiMetric.weight.readingCount > 0 && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Weight className="w-5 h-5 text-indigo-500" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">체중</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {analysis.multiMetric.weight.latestWeight}kg
                  </p>
                  {analysis.multiMetric.weight.weightChange != null && (
                    <p className={`text-xs ${analysis.multiMetric.weight.weightChange > 0 ? 'text-red-600' : analysis.multiMetric.weight.weightChange < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                      {analysis.multiMetric.weight.weightChange > 0 ? '+' : ''}{analysis.multiMetric.weight.weightChange}kg 변화
                    </p>
                  )}
                  <span className="text-xs text-slate-400">{analysis.multiMetric.weight.readingCount}회 측정</span>
                </div>
              </div>
            )}

            {/* Metabolic Risk */}
            {(() => {
              const mr = analysis.multiMetric!.metabolicRisk;
              const mrRisk = RISK_DISPLAY[mr.metabolicRiskLevel as keyof typeof RISK_DISPLAY] || RISK_DISPLAY.low;
              return (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${mrRisk.cls}`}>
                  <ShieldAlert className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-xs opacity-70">대사 위험도</p>
                    <p className="text-2xl font-bold">{mrRisk.label}</p>
                    <p className="text-xs opacity-70">점수: {mr.metabolicScore}/100</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Metabolic Risk Factors */}
          {analysis.multiMetric.metabolicRisk.riskFactors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                대사 위험 요인
              </h4>
              <div className="space-y-2">
                {analysis.multiMetric.metabolicRisk.riskFactors.map((factor, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-rose-50 rounded-lg border border-rose-100"
                  >
                    <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-rose-800">{factor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 혈당 추이 차트 — WO-O4O-GLYCOPHARM-ANALYSIS-TAB-CHART-EXPANSION-V1 */}
      <div>
        <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          혈당 추이 (최근 30일)
        </h4>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <GlucoseChartWithMeal readings={readings} />
        </div>

        {/* 혈당 요약 */}
        {glucoseStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <MiniStat label="측정 횟수" value={`${glucoseStats.count}회`} />
            <MiniStat label="최근 측정" value={glucoseStats.lastMeasured || '-'} />
            <MiniStat label="공복 평균" value={glucoseStats.fastingAvg != null ? `${glucoseStats.fastingAvg} mg/dL` : '-'} />
            <MiniStat label="식후 평균" value={glucoseStats.postMealAvg != null ? `${glucoseStats.postMealAvg} mg/dL` : '-'} />
          </div>
        )}
      </div>
    </div>
  );
}
