/**
 * AnalysisPage — 당뇨인 혈당 분석 (빠른 판단 화면)
 * WO-O4O-GLYCOPHARM-CARE-ANALYSIS-PAGE-V1
 *
 * "3초 안에 당뇨인 상태 판단"
 *
 * API:
 *   GET /care/health-readings/:patientId → 혈당 데이터
 *   GET /care/analysis/:patientId       → TIR/CV/Risk/Insights
 *   GET /care/llm-insight/:patientId    → AI 해석
 *
 * 패턴 재사용:
 *   DataAnalysisPage.tsx → computeStats, GlucoseChart, KpiCard
 *   AnalysisTab.tsx      → backend analysis + LLM insight 호출
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Lightbulb,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import {
  pharmacyApi,
  type PharmacyCustomer,
  type HealthReadingDto,
  type CareInsightDto,
  type CareLlmInsightDto,
} from '@/api/pharmacy';
import CareSubNav from './CareSubNav';
import { getPatientDisplayName } from '@/utils/patient-display';

// ─── Constants ───

const PERIOD_OPTIONS = [
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
];

const TIR_LOW = 70;
const TIR_HIGH = 180;

// ─── Stat helpers (from DataAnalysisPage) ───

interface GlucoseStats {
  count: number;
  average: number;
  fastingAvg: number;
  postMealAvg: number;
  max: number;
  min: number;
  range: number;
  stdDev: number;
  tirPercent: number;
  fastingCount: number;
  postMealCount: number;
}

function computeStats(readings: HealthReadingDto[]): GlucoseStats | null {
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

  const fastingReadings = readings.filter(
    (r) => (r.metadata as Record<string, string>)?.mealTiming === 'fasting',
  );
  const fastingValues = fastingReadings
    .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
    .filter((v) => !isNaN(v));
  const fastingAvg = fastingValues.length > 0
    ? fastingValues.reduce((a, b) => a + b, 0) / fastingValues.length
    : 0;

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
  if (stats.average >= 180 || (stats.fastingCount > 0 && stats.fastingAvg >= 130)) return 'high';
  if (stats.average >= 140 || (stats.fastingCount > 0 && stats.fastingAvg >= 110)) return 'caution';
  return 'low';
}

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; borderColor: string; Icon: typeof CheckCircle }> = {
  low: { label: '양호', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', Icon: CheckCircle },
  caution: { label: '주의', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', Icon: AlertTriangle },
  high: { label: '위험', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', Icon: AlertCircle },
};

// ─── SVG Line Chart (from DataAnalysisPage) ───

function GlucoseChart({ readings }: { readings: HealthReadingDto[] }) {
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

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = minVal + ((maxVal - minVal) * i) / (yTicks - 1);
    return { v: Math.round(v), y: toY(v) };
  });

  const tirY1 = toY(Math.min(TIR_HIGH, maxVal));
  const tirY2 = toY(Math.max(TIR_LOW, minVal));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <rect x={PAD_LEFT} y={tirY1} width={chartW} height={Math.max(0, tirY2 - tirY1)} fill="#dcfce7" opacity={0.5} />
      {yLabels.map((tick) => (
        <g key={tick.v}>
          <line x1={PAD_LEFT} y1={tick.y} x2={PAD_LEFT + chartW} y2={tick.y} stroke="#e2e8f0" strokeWidth={0.5} />
          <text x={PAD_LEFT - 4} y={tick.y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{tick.v}</text>
        </g>
      ))}
      {TIR_HIGH <= maxVal && (
        <text x={PAD_LEFT + chartW + 2} y={tirY1 + 8} fontSize="7" fill="#16a34a" opacity={0.7}>180</text>
      )}
      {TIR_LOW >= minVal && (
        <text x={PAD_LEFT + chartW + 2} y={tirY2 - 2} fontSize="7" fill="#16a34a" opacity={0.7}>70</text>
      )}
      <path d={pathD} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => {
        const inRange = p.val >= TIR_LOW && p.val <= TIR_HIGH;
        return (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={inRange ? '#2563eb' : '#ef4444'} stroke="white" strokeWidth={1} />
        );
      })}
      <text x={PAD_LEFT} y={H - 4} fontSize="8" fill="#94a3b8" textAnchor="start">
        {new Date(minTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>
      <text x={PAD_LEFT + chartW} y={H - 4} fontSize="8" fill="#94a3b8" textAnchor="end">
        {new Date(maxTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>
    </svg>
  );
}

// ─── Sub-components ───

function KpiCard({ label, value, unit, icon, subtext }: {
  label: string; value: string; unit: string; icon: React.ReactNode; subtext: string;
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

// ─── Main Component ───

export default function AnalysisPage() {
  const navigate = useNavigate();

  // Patients
  const [patients, setPatients] = useState<PharmacyCustomer[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Period
  const [period, setPeriod] = useState(7);

  // Data
  const [readings, setReadings] = useState<HealthReadingDto[]>([]);
  const [analysis, setAnalysis] = useState<CareInsightDto | null>(null);
  const [llmInsight, setLlmInsight] = useState<CareLlmInsightDto | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Load patients
  useEffect(() => {
    setPatientsLoading(true);
    pharmacyApi.getCustomers({ pageSize: 200 })
      .then((res) => {
        const items = (res as { data?: { items?: PharmacyCustomer[] } })?.data?.items
          || (res as { items?: PharmacyCustomer[] })?.items
          || [];
        setPatients(items);
      })
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, []);

  // Load analysis data when patient or period changes
  const loadData = useCallback(async () => {
    if (!selectedPatientId) return;
    setDataLoading(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - period);

      const [readingsData, analysisData, llmData] = await Promise.all([
        pharmacyApi.getHealthReadings(selectedPatientId, {
          from: from.toISOString(),
          metricType: 'glucose',
        }).catch(() => []),
        pharmacyApi.getCareAnalysis(selectedPatientId).catch(() => null),
        pharmacyApi.getCareLlmInsight(selectedPatientId).catch(() => null),
      ]);

      setReadings(Array.isArray(readingsData) ? readingsData : []);
      setAnalysis(analysisData);
      setLlmInsight(llmData);
    } catch {
      setReadings([]);
      setAnalysis(null);
      setLlmInsight(null);
    } finally {
      setDataLoading(false);
    }
  }, [selectedPatientId, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Computed stats
  const stats = useMemo(() => computeStats(readings), [readings]);
  const risk = useMemo(() => (stats ? getRiskLevel(stats) : null), [stats]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <CareSubNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header + Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h1 className="text-lg font-bold text-slate-800">당뇨인 분석</h1>
          </div>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={patientsLoading}
          >
            <option value="">당뇨인 선택</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{getPatientDisplayName(p.name)}</option>
            ))}
          </select>
        </div>

        {/* No patient selected */}
        {!selectedPatientId ? (
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[300px]">
            <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 font-medium">당뇨인를 선택하세요</p>
            <p className="text-xs text-slate-400 mt-1">당뇨인의 혈당 데이터를 분석합니다.</p>
          </div>
        ) : dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Period Selector */}
            <div className="flex gap-2">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                    period === opt.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {selectedPatient && (
                <span className="ml-auto text-sm text-slate-400 self-center">
                  {getPatientDisplayName(selectedPatient.name)}
                </span>
              )}
            </div>

            {!stats ? (
              /* No data */
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[200px]">
                <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-medium">데이터가 없습니다</p>
                <p className="text-xs text-slate-400 mt-1">
                  최근 {period}일간 혈당 기록이 없습니다.
                </p>
              </div>
            ) : (
              <>
                {/* Risk Level Badge */}
                {risk && (() => {
                  const cfg = RISK_CONFIG[risk];
                  const { Icon } = cfg;
                  return (
                    <div className={`p-3 rounded-xl border ${cfg.bgColor} ${cfg.borderColor} flex items-center gap-2`}>
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

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard
                    label="평균 혈당"
                    value={stats.average.toFixed(0)}
                    unit="mg/dL"
                    icon={<Activity className="w-4 h-4 text-blue-600" />}
                    subtext={`${stats.count}회 측정`}
                  />
                  <KpiCard
                    label="목표 범위"
                    value={stats.tirPercent.toFixed(0)}
                    unit="%"
                    icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
                    subtext={`${TIR_LOW}-${TIR_HIGH} mg/dL`}
                  />
                  <KpiCard
                    label="공복 평균"
                    value={stats.fastingCount > 0 ? stats.fastingAvg.toFixed(0) : '-'}
                    unit={stats.fastingCount > 0 ? 'mg/dL' : ''}
                    icon={<TrendingDown className="w-4 h-4 text-violet-600" />}
                    subtext={stats.fastingCount > 0 ? `${stats.fastingCount}회` : '데이터 없음'}
                  />
                  <KpiCard
                    label="식후 평균"
                    value={stats.postMealCount > 0 ? stats.postMealAvg.toFixed(0) : '-'}
                    unit={stats.postMealCount > 0 ? 'mg/dL' : ''}
                    icon={<TrendingUp className="w-4 h-4 text-orange-600" />}
                    subtext={stats.postMealCount > 0 ? `${stats.postMealCount}회` : '데이터 없음'}
                  />
                </div>

                {/* Glucose Chart */}
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

                {/* Insights (rule-based) */}
                {analysis && analysis.insights && analysis.insights.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      이상 패턴
                    </h3>
                    <div className="space-y-2">
                      {analysis.insights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm text-amber-800">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LLM Insight */}
                {llmInsight?.pharmacyInsight && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      AI 분석 해석
                    </h3>
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

                {/* Action: Navigate to Coaching */}
                <div className="flex justify-end">
                  <button
                    onClick={() => navigate('/care/coaching')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    코칭 작성하기
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
