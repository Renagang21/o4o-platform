/**
 * DataAnalysisPage — 혈당 데이터 분석
 * WO-GLYCOPHARM-DATA-ANALYSIS-SCREEN-V1
 *
 * - 기간 선택 (7/14/30일)
 * - KPI 요약 카드: 평균 혈당, 공복 평균, 식후 평균, Time in Range
 * - 변동성: 최대, 최소, 범위, 표준편차
 * - 위험 수준 분류 (양호/주의/위험)
 * - SVG 라인 차트
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { GlucoseReading } from '@/api/patient';

// ─── Constants ───

const PERIOD_OPTIONS = [
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
];

const TIR_LOW = 70;
const TIR_HIGH = 180;

// ─── Stat helpers ───

interface GlucoseStats {
  count: number;
  average: number;
  fastingAvg: number;
  postMealAvg: number;
  max: number;
  min: number;
  range: number;
  stdDev: number;
  tirPercent: number; // Time in Range (70-180)
  fastingCount: number;
  postMealCount: number;
}

function computeStats(readings: GlucoseReading[]): GlucoseStats | null {
  const values = readings
    .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  const variance = values.reduce((acc, v) => acc + (v - average) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const inRange = values.filter((v) => v >= TIR_LOW && v <= TIR_HIGH).length;
  const tirPercent = (inRange / values.length) * 100;

  // Fasting readings
  const fastingReadings = readings.filter(
    (r) => (r.metadata as Record<string, string>)?.mealTiming === 'fasting',
  );
  const fastingValues = fastingReadings
    .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
    .filter((v) => !isNaN(v));
  const fastingAvg = fastingValues.length > 0
    ? fastingValues.reduce((a, b) => a + b, 0) / fastingValues.length
    : 0;

  // Post-meal readings
  const postMealReadings = readings.filter(
    (r) => (r.metadata as Record<string, string>)?.mealTiming === 'after_meal',
  );
  const postMealValues = postMealReadings
    .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
    .filter((v) => !isNaN(v));
  const postMealAvg = postMealValues.length > 0
    ? postMealValues.reduce((a, b) => a + b, 0) / postMealValues.length
    : 0;

  return {
    count: values.length,
    average,
    fastingAvg,
    postMealAvg,
    max,
    min,
    range: max - min,
    stdDev,
    tirPercent,
    fastingCount: fastingValues.length,
    postMealCount: postMealValues.length,
  };
}

type RiskLevel = 'low' | 'caution' | 'high';

function getRiskLevel(stats: GlucoseStats): RiskLevel {
  // Average ≥ 180 or fasting avg ≥ 130 → high
  if (stats.average >= 180 || (stats.fastingCount > 0 && stats.fastingAvg >= 130)) return 'high';
  // Average ≥ 140 or fasting avg ≥ 110 → caution
  if (stats.average >= 140 || (stats.fastingCount > 0 && stats.fastingAvg >= 110)) return 'caution';
  return 'low';
}

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; borderColor: string; Icon: typeof CheckCircle }> = {
  low: { label: '양호', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', Icon: CheckCircle },
  caution: { label: '주의', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', Icon: AlertTriangle },
  high: { label: '위험', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', Icon: AlertCircle },
};

// ─── SVG Line Chart ───

function GlucoseChart({ readings }: { readings: GlucoseReading[] }) {
  const sorted = useMemo(
    () =>
      [...readings]
        .filter((r) => r.valueNumeric != null && !isNaN(Number(r.valueNumeric)))
        .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()),
    [readings],
  );

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
  const PAD_BOTTOM = 28;
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

  // Y-axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = minVal + ((maxVal - minVal) * i) / (yTicks - 1);
    return { v: Math.round(v), y: toY(v) };
  });

  // TIR band
  const tirY1 = toY(Math.min(TIR_HIGH, maxVal));
  const tirY2 = toY(Math.max(TIR_LOW, minVal));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* TIR band */}
      <rect
        x={PAD_LEFT}
        y={tirY1}
        width={chartW}
        height={Math.max(0, tirY2 - tirY1)}
        fill="#dcfce7"
        opacity={0.5}
      />

      {/* Grid lines + Y labels */}
      {yLabels.map((tick) => (
        <g key={tick.v}>
          <line
            x1={PAD_LEFT}
            y1={tick.y}
            x2={PAD_LEFT + chartW}
            y2={tick.y}
            stroke="#e2e8f0"
            strokeWidth={0.5}
          />
          <text x={PAD_LEFT - 4} y={tick.y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {tick.v}
          </text>
        </g>
      ))}

      {/* TIR labels */}
      {TIR_HIGH <= maxVal && (
        <text x={PAD_LEFT + chartW + 2} y={tirY1 + 8} fontSize="7" fill="#16a34a" opacity={0.7}>
          180
        </text>
      )}
      {TIR_LOW >= minVal && (
        <text x={PAD_LEFT + chartW + 2} y={tirY2 - 2} fontSize="7" fill="#16a34a" opacity={0.7}>
          70
        </text>
      )}

      {/* Line */}
      <path d={pathD} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => {
        const inRange = p.val >= TIR_LOW && p.val <= TIR_HIGH;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={inRange ? '#2563eb' : '#ef4444'}
            stroke="white"
            strokeWidth={1}
          />
        );
      })}

      {/* X axis - first and last date */}
      <text x={PAD_LEFT} y={H - 4} fontSize="8" fill="#94a3b8" textAnchor="start">
        {new Date(minTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>
      <text x={PAD_LEFT + chartW} y={H - 4} fontSize="8" fill="#94a3b8" textAnchor="end">
        {new Date(maxTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>
    </svg>
  );
}

// ─── Main Component ───

export default function DataAnalysisPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(7);
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReadings = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - period);
      const res = await patientApi.getGlucoseReadings({
        metricType: 'glucose',
        from: from.toISOString(),
      });
      if (res.success && res.data) {
        setReadings(Array.isArray(res.data) ? res.data : []);
      } else {
        setReadings([]);
      }
    } catch {
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const stats = useMemo(() => computeStats(readings), [readings]);
  const risk = useMemo(() => (stats ? getRiskLevel(stats) : null), [stats]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/patient')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">데이터 분석</h1>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
                period === opt.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : !stats ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 font-medium">데이터가 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">
              혈당 데이터를 입력하면 분석 결과가 표시됩니다.
            </p>
            <button
              onClick={() => navigate('/patient/glucose-input')}
              className="mt-4 px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              혈당 입력하기
            </button>
          </div>
        ) : (
          <>
            {/* Risk Level Badge */}
            {risk && (() => {
              const cfg = RISK_CONFIG[risk];
              const { Icon } = cfg;
              return (
                <div className={`mb-4 p-3 rounded-xl border ${cfg.bgColor} ${cfg.borderColor} flex items-center gap-2`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                  <div>
                    <span className={`text-sm font-semibold ${cfg.color}`}>
                      위험 수준: {cfg.label}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      최근 {period}일 평균 혈당 {stats.average.toFixed(0)} mg/dL 기준
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <KpiCard
                label="평균 혈당"
                value={`${stats.average.toFixed(0)}`}
                unit="mg/dL"
                icon={<Activity className="w-4 h-4 text-blue-600" />}
                subtext={`${stats.count}회 측정`}
              />
              <KpiCard
                label="목표 범위"
                value={`${stats.tirPercent.toFixed(0)}`}
                unit="%"
                icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
                subtext={`${TIR_LOW}-${TIR_HIGH} mg/dL`}
              />
              <KpiCard
                label="공복 평균"
                value={stats.fastingCount > 0 ? `${stats.fastingAvg.toFixed(0)}` : '-'}
                unit={stats.fastingCount > 0 ? 'mg/dL' : ''}
                icon={<TrendingDown className="w-4 h-4 text-violet-600" />}
                subtext={stats.fastingCount > 0 ? `${stats.fastingCount}회` : '데이터 없음'}
              />
              <KpiCard
                label="식후 평균"
                value={stats.postMealCount > 0 ? `${stats.postMealAvg.toFixed(0)}` : '-'}
                unit={stats.postMealCount > 0 ? 'mg/dL' : ''}
                icon={<TrendingUp className="w-4 h-4 text-orange-600" />}
                subtext={stats.postMealCount > 0 ? `${stats.postMealCount}회` : '데이터 없음'}
              />
            </div>

            {/* Variability Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">혈당 변동성</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <StatItem label="최고" value={stats.max.toFixed(0)} color="text-red-600" />
                <StatItem label="최저" value={stats.min.toFixed(0)} color="text-blue-600" />
                <StatItem label="범위" value={stats.range.toFixed(0)} color="text-slate-800" />
                <StatItem label="표준편차" value={stats.stdDev.toFixed(1)} color="text-slate-800" />
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">혈당 추이</h3>
              <GlucoseChart readings={readings} />
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-200 inline-block" />
                  목표 범위 ({TIR_LOW}-{TIR_HIGH})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  범위 밖
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───

function KpiCard({
  label,
  value,
  unit,
  icon,
  subtext,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  subtext: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800 tabular-nums leading-none">
        {value}
        {unit && <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>}
      </p>
      <p className="text-xs text-slate-400 mt-1">{subtext}</p>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
