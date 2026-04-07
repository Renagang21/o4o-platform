/**
 * AnalysisTab - 당뇨인 분석 결과 (live)
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 *
 * API:
 *   GET /api/v1/care/analysis/:patientId → TIR/CV/Risk + insights
 *   GET /api/v1/care/kpi/:patientId → 트렌드 비교
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Loader2,
  Lightbulb,
  Heart,
  Weight,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  User,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { pharmacyApi, type CareInsightDto, type KpiComparisonDto, type CareLlmInsightDto, type HealthReadingDto, type CgmEventAnalysisDto, type CareGeneratedActionDto, type CarePersistedActionDto, type TimeBasedAnalysisDto } from '@/api/pharmacy';
import { Clock, Utensils, Footprints, BookOpen, Play, XCircle } from 'lucide-react';
import { usePatientDetail } from '../PatientDetailPage';
import { RISK_DISPLAY } from '@/constants/care-display';

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
  after_meal_1h: { color: '#f97316', label: '식후1h' },
  after_meal_2h: { color: '#ea580c', label: '식후2h' },
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

// ─── ChartEmptyState ───

function ChartEmptyState({ icon: Icon, message, sub }: { icon: React.ComponentType<{ className?: string }>; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="w-8 h-8 text-slate-300 mb-2" />
      <p className="text-sm text-slate-500">{message}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

// ─── BpChart — SVG 혈압 차트 (수축기/이완기 2선) ───

function BpChart({ systolicReadings, diastolicReadings }: {
  systolicReadings: HealthReadingDto[];
  diastolicReadings: HealthReadingDto[];
}) {
  // Pair systolic/diastolic by measuredAt (same timestamp = same measurement)
  const pairs = useMemo(() => {
    const sysMap = new Map<string, number>();
    systolicReadings.forEach((r) => {
      const v = r.valueNumeric != null ? Number(r.valueNumeric) : NaN;
      if (!isNaN(v)) sysMap.set(r.measuredAt, v);
    });
    const diaMap = new Map<string, number>();
    diastolicReadings.forEach((r) => {
      const v = r.valueNumeric != null ? Number(r.valueNumeric) : NaN;
      if (!isNaN(v)) diaMap.set(r.measuredAt, v);
    });

    // Union of all timestamps that have both values
    const allTimes = new Set([...sysMap.keys(), ...diaMap.keys()]);
    const result: { time: number; sys: number | null; dia: number | null }[] = [];
    allTimes.forEach((t) => {
      const sys = sysMap.get(t) ?? null;
      const dia = diaMap.get(t) ?? null;
      if (sys !== null || dia !== null) {
        result.push({ time: new Date(t).getTime(), sys, dia });
      }
    });
    return result.sort((a, b) => a.time - b.time);
  }, [systolicReadings, diastolicReadings]);

  if (pairs.length === 0) {
    return <ChartEmptyState icon={Heart} message="혈압 기록이 없습니다." sub="데이터 탭에서 먼저 입력해 주세요." />;
  }
  if (pairs.length < 2) {
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
  const PAD_BOTTOM = 44;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const allVals = pairs.flatMap((p) => [p.sys, p.dia].filter((v): v is number => v !== null));
  const minVal = Math.max(40, Math.min(...allVals) - 10);
  const maxVal = Math.min(220, Math.max(...allVals) + 10);
  const minTime = pairs[0].time;
  const maxTime = pairs[pairs.length - 1].time;
  const timeRange = maxTime - minTime || 1;

  const toX = (t: number) => PAD_LEFT + ((t - minTime) / timeRange) * chartW;
  const toY = (v: number) => PAD_TOP + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const sysPoints = pairs.filter((p) => p.sys !== null).map((p) => ({ x: toX(p.time), y: toY(p.sys!), val: p.sys! }));
  const diaPoints = pairs.filter((p) => p.dia !== null).map((p) => ({ x: toX(p.time), y: toY(p.dia!), val: p.dia! }));

  const sysPathD = sysPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const diaPathD = diaPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = minVal + ((maxVal - minVal) * i) / (yTicks - 1);
    return { v: Math.round(v), y: toY(v) };
  });

  // Normal BP band: 90-120 systolic (light green)
  const normalHigh = Math.min(120, maxVal);
  const normalLow = Math.max(90, minVal);
  const bandY1 = toY(normalHigh);
  const bandY2 = toY(normalLow);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Normal systolic band */}
      {normalHigh > minVal && normalLow < maxVal && (
        <rect x={PAD_LEFT} y={bandY1} width={chartW} height={Math.max(0, bandY2 - bandY1)} fill="#fce7f3" opacity={0.3} />
      )}

      {/* Grid */}
      {yLabels.map((tick) => (
        <g key={tick.v}>
          <line x1={PAD_LEFT} y1={tick.y} x2={PAD_LEFT + chartW} y2={tick.y} stroke="#e2e8f0" strokeWidth={0.5} />
          <text x={PAD_LEFT - 4} y={tick.y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{tick.v}</text>
        </g>
      ))}

      {/* Systolic line + dots */}
      <path d={sysPathD} fill="none" stroke="#e11d48" strokeWidth={1.5} strokeLinejoin="round" />
      {sysPoints.map((p, i) => (
        <circle key={`s${i}`} cx={p.x} cy={p.y} r={3} fill="#e11d48" stroke="white" strokeWidth={1} />
      ))}

      {/* Diastolic line + dots */}
      <path d={diaPathD} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
      {diaPoints.map((p, i) => (
        <circle key={`d${i}`} cx={p.x} cy={p.y} r={3} fill="#3b82f6" stroke="white" strokeWidth={1} />
      ))}

      {/* X-axis */}
      <text x={PAD_LEFT} y={PAD_TOP + chartH + 14} fontSize="8" fill="#94a3b8" textAnchor="start">
        {new Date(minTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>
      <text x={PAD_LEFT + chartW} y={PAD_TOP + chartH + 14} fontSize="8" fill="#94a3b8" textAnchor="end">
        {new Date(maxTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>

      {/* Legend */}
      <circle cx={PAD_LEFT + 4} cy={H - 9} r={3} fill="#e11d48" />
      <text x={PAD_LEFT + 10} y={H - 6} fontSize="8" fill="#64748b">수축기</text>
      <circle cx={PAD_LEFT + 55} cy={H - 9} r={3} fill="#3b82f6" />
      <text x={PAD_LEFT + 61} y={H - 6} fontSize="8" fill="#64748b">이완기</text>
    </svg>
  );
}

// ─── WeightChart — SVG 체중 차트 ───

function WeightChart({ readings }: { readings: HealthReadingDto[] }) {
  const sorted = useMemo(
    () =>
      [...readings]
        .filter((r) => r.valueNumeric != null && !isNaN(Number(r.valueNumeric)))
        .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()),
    [readings],
  );

  if (sorted.length === 0) {
    return <ChartEmptyState icon={Weight} message="체중 기록이 없습니다." sub="데이터 탭에서 먼저 입력해 주세요." />;
  }
  if (sorted.length < 2) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400">
        차트를 표시하려면 2개 이상의 기록이 필요합니다.
      </div>
    );
  }

  const W = 360;
  const H = 180;
  const PAD_LEFT = 40;
  const PAD_RIGHT = 12;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 28;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const values = sorted.map((r) => Number(r.valueNumeric));
  const times = sorted.map((r) => new Date(r.measuredAt).getTime());

  const minVal = Math.max(30, Math.min(...values) - 3);
  const maxVal = Math.min(200, Math.max(...values) + 3);
  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const timeRange = maxTime - minTime || 1;

  const toX = (t: number) => PAD_LEFT + ((t - minTime) / timeRange) * chartW;
  const toY = (v: number) => PAD_TOP + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const points = sorted.map((_r, i) => ({ x: toX(times[i]), y: toY(values[i]), val: values[i] }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = minVal + ((maxVal - minVal) * i) / (yTicks - 1);
    return { v: Math.round(v * 10) / 10, y: toY(v) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {yLabels.map((tick) => (
        <g key={tick.v}>
          <line x1={PAD_LEFT} y1={tick.y} x2={PAD_LEFT + chartW} y2={tick.y} stroke="#e2e8f0" strokeWidth={0.5} />
          <text x={PAD_LEFT - 4} y={tick.y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{tick.v}</text>
        </g>
      ))}

      {/* Area fill */}
      <path
        d={`${pathD} L${points[points.length - 1].x},${PAD_TOP + chartH} L${points[0].x},${PAD_TOP + chartH} Z`}
        fill="#818cf8"
        opacity={0.1}
      />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" stroke="white" strokeWidth={1} />
      ))}

      {/* X-axis */}
      <text x={PAD_LEFT} y={H - 4} fontSize="8" fill="#94a3b8" textAnchor="start">
        {new Date(minTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>
      <text x={PAD_LEFT + chartW} y={H - 4} fontSize="8" fill="#94a3b8" textAnchor="end">
        {new Date(maxTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </text>
    </svg>
  );
}

export default function AnalysisTab() {
  const { patient } = usePatientDetail();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<CareInsightDto | null>(null);
  const [kpi, setKpi] = useState<KpiComparisonDto | null>(null);
  const [llmInsight, setLlmInsight] = useState<CareLlmInsightDto | null>(null);
  const [readings, setReadings] = useState<HealthReadingDto[]>([]);
  const [bpSysReadings, setBpSysReadings] = useState<HealthReadingDto[]>([]);
  const [bpDiaReadings, setBpDiaReadings] = useState<HealthReadingDto[]>([]);
  const [weightReadings, setWeightReadings] = useState<HealthReadingDto[]>([]);
  const [eventAnalysis, setEventAnalysis] = useState<CgmEventAnalysisDto | null>(null);
  const [timeAnalysis, setTimeAnalysis] = useState<TimeBasedAnalysisDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    setLoading(true);

    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fromISO = from.toISOString();

    Promise.all([
      pharmacyApi.getCareAnalysis(patient.id).catch(() => null),
      pharmacyApi.getCareKpi(patient.id).catch(() => null),
      pharmacyApi.getCareLlmInsight(patient.id).catch(() => null),
      pharmacyApi.getHealthReadings(patient.id, { from: fromISO, metricType: 'glucose' }).catch(() => [] as HealthReadingDto[]),
      pharmacyApi.getHealthReadings(patient.id, { from: fromISO, metricType: 'blood_pressure_systolic' }).catch(() => [] as HealthReadingDto[]),
      pharmacyApi.getHealthReadings(patient.id, { from: fromISO, metricType: 'blood_pressure_diastolic' }).catch(() => [] as HealthReadingDto[]),
      pharmacyApi.getHealthReadings(patient.id, { from: fromISO, metricType: 'weight' }).catch(() => [] as HealthReadingDto[]),
      pharmacyApi.getCgmEventAnalysis(patient.id, 30).catch(() => null),
      pharmacyApi.getCareTimeBasedAnalysis(patient.id, 14).then(r => r?.data ?? null).catch(() => null),
    ]).then(([a, k, llm, glu, bpS, bpD, wt, ev, ta]) => {
      setAnalysis(a);
      setKpi(k);
      setLlmInsight(llm);
      setReadings(glu ?? []);
      setBpSysReadings(bpS ?? []);
      setBpDiaReadings(bpD ?? []);
      setWeightReadings(wt ?? []);
      setEventAnalysis(ev);
      setTimeAnalysis(ta);
    }).finally(() => setLoading(false));
  }, [patient?.id]);

  // ── Action handler (WO-O4O-CARE-ACTION-ENGINE-V2.2) ──
  const handleCareAction = useCallback((action: CareGeneratedActionDto | CarePersistedActionDto) => {
    if (!patient?.id) return;
    const actionType = 'actionType' in action ? action.actionType : action.type;
    switch (actionType) {
      case 'open_patient':
        navigate(`/care/patients/${patient.id}`);
        break;
      case 'create_coaching':
        navigate(`/care/patients/${patient.id}/coaching`, { state: { openForm: true } });
        break;
      case 'run_analysis':
        pharmacyApi.getCgmEventAnalysis(patient.id, 30).then(setEventAnalysis).catch(() => {});
        break;
      case 'resolve_alert':
        navigate(`/care/patients/${patient.id}`);
        break;
      case 'link_guideline':
        navigate(`/care/patients/${patient.id}/coaching`, { state: { openForm: true } });
        break;
    }
  }, [patient?.id, navigate]);

  // WO-O4O-CARE-ACTION-ENGINE-V2.2: Action lifecycle handlers
  const refreshTimeAnalysis = useCallback(() => {
    if (!patient?.id) return;
    pharmacyApi.getCareTimeBasedAnalysis(patient.id, 14).then(r => {
      if (r.success) setTimeAnalysis(r.data);
    }).catch(() => {});
  }, [patient?.id]);

  const handleActionStart = useCallback(async (actionId: string) => {
    try {
      await pharmacyApi.startCareAction(actionId);
      refreshTimeAnalysis();
    } catch { /* ignore */ }
  }, [refreshTimeAnalysis]);

  const handleActionComplete = useCallback(async (actionId: string) => {
    try {
      await pharmacyApi.completeCareAction(actionId);
      refreshTimeAnalysis();
    } catch { /* ignore */ }
  }, [refreshTimeAnalysis]);

  const handleActionDismiss = useCallback(async (actionId: string) => {
    try {
      await pharmacyApi.dismissCareAction(actionId);
      refreshTimeAnalysis();
    } catch { /* ignore */ }
  }, [refreshTimeAnalysis]);

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

    const postMealTimings = new Set(['after_meal', 'after_meal_1h', 'after_meal_2h']);
    const postMealReadings = readings.filter(
      (r) => postMealTimings.has((r.metadata as Record<string, string>)?.mealTiming),
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

  // ── BP stats ──
  const bpStats = useMemo(() => {
    const sysVals = bpSysReadings
      .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
      .filter((v) => !isNaN(v));
    const diaVals = bpDiaReadings
      .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
      .filter((v) => !isNaN(v));
    if (sysVals.length === 0 && diaVals.length === 0) return null;

    const sysAvg = sysVals.length > 0 ? Math.round(sysVals.reduce((a, b) => a + b, 0) / sysVals.length) : null;
    const diaAvg = diaVals.length > 0 ? Math.round(diaVals.reduce((a, b) => a + b, 0) / diaVals.length) : null;
    const allBpReadings = [...bpSysReadings, ...bpDiaReadings];
    const lastMeasured = allBpReadings.length > 0
      ? new Date(
          [...allBpReadings].sort(
            (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
          )[0].measuredAt,
        ).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
      : null;

    return { count: Math.max(sysVals.length, diaVals.length), sysAvg, diaAvg, lastMeasured };
  }, [bpSysReadings, bpDiaReadings]);

  // ── Weight stats ──
  const weightStats = useMemo(() => {
    const vals = weightReadings
      .map((r) => ({ val: r.valueNumeric != null ? Number(r.valueNumeric) : NaN, at: r.measuredAt }))
      .filter((v) => !isNaN(v.val))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    if (vals.length === 0) return null;

    const latest = vals[0].val;
    const change = vals.length >= 2 ? Math.round((latest - vals[vals.length - 1].val) * 10) / 10 : null;
    const lastMeasured = new Date(vals[0].at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

    return { count: vals.length, latest, change, lastMeasured };
  }, [weightReadings]);

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

      {/* 시간 기반 분석 — WO-O4O-CARE-TIME-BASED-ANALYSIS-V1 */}
      {timeAnalysis && (timeAnalysis.timeBuckets.length > 0 || timeAnalysis.mealTimingStats.length > 0) && (
        <TimeBasedAnalysisSection
          data={timeAnalysis}
          onActionExecute={handleCareAction}
          onActionStart={handleActionStart}
          onActionComplete={handleActionComplete}
          onActionDismiss={handleActionDismiss}
        />
      )}

      {/* 혈압 추이 차트 — WO-O4O-GLYCOPHARM-ANALYSIS-TAB-BP-WEIGHT-CHART-EXPANSION-V1 */}
      <div>
        <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" />
          혈압 추이 (최근 30일)
        </h4>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <BpChart systolicReadings={bpSysReadings} diastolicReadings={bpDiaReadings} />
        </div>

        {bpStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            <MiniStat label="평균 혈압" value={bpStats.sysAvg != null && bpStats.diaAvg != null ? `${bpStats.sysAvg}/${bpStats.diaAvg} mmHg` : '-'} />
            <MiniStat label="측정 횟수" value={`${bpStats.count}회`} />
            <MiniStat label="최근 측정" value={bpStats.lastMeasured || '-'} />
          </div>
        )}
      </div>

      {/* 체중 추이 차트 */}
      <div>
        <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
          <Weight className="w-4 h-4 text-indigo-500" />
          체중 추이 (최근 30일)
        </h4>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <WeightChart readings={weightReadings} />
        </div>

        {weightStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            <MiniStat label="최근 체중" value={`${weightStats.latest} kg`} />
            <MiniStat label="변화량" value={weightStats.change != null ? `${weightStats.change > 0 ? '+' : ''}${weightStats.change} kg` : '-'} />
            <MiniStat label="최근 측정" value={weightStats.lastMeasured || '-'} />
          </div>
        )}
      </div>

      {/* ── CGM-Event Analysis (WO-O4O-CARE-CGM-EVENT-INTEGRATION-V1) ── */}
      <CgmEventAnalysisSection data={eventAnalysis} onActionExecute={handleCareAction} />
    </div>
  );
}

// ── CGM-Event Analysis UI ──

const EVENT_ICONS: Record<string, string> = {
  meal: '\uD83C\uDF5A',
  exercise: '\uD83C\uDFC3',
  medication: '\uD83D\uDC8A',
  symptom: '\u26A0\uFE0F',
};

const EVENT_LABELS: Record<string, string> = {
  meal: '식사',
  exercise: '운동',
  medication: '복약',
  symptom: '증상',
};

const IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-100', text: 'text-red-700' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  low: { bg: 'bg-green-100', text: 'text-green-700' },
  effective: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  weak: { bg: 'bg-slate-100', text: 'text-slate-600' },
  hypoglycemia: { bg: 'bg-red-100', text: 'text-red-700' },
  hyperglycemia: { bg: 'bg-red-100', text: 'text-red-700' },
  normal: { bg: 'bg-green-100', text: 'text-green-700' },
};

const EVENT_BORDER: Record<string, string> = {
  meal: 'border-l-orange-400',
  exercise: 'border-l-emerald-400',
  medication: 'border-l-violet-400',
  symptom: 'border-l-amber-400',
};

function CgmEventAnalysisSection({ data, onActionExecute }: {
  data: CgmEventAnalysisDto | null;
  onActionExecute: (action: CareGeneratedActionDto) => void;
}) {
  if (!data) return null;

  const hasEvents = data.events.length > 0;
  const hasPatterns = data.patterns.length > 0;

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500" />
        CGM-Event \uBD84\uC11D (\uCD5C\uADFC 30\uC77C)
      </h4>

      {!hasEvents ? (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 text-center">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">\uB370\uC774\uD130 \uD0ED\uC5D0\uC11C \uC2DD\uC0AC/\uC6B4\uB3D9/\uBCF5\uC57D \uC815\uBCF4\uB97C \uD568\uAED8 \uAE30\uB85D\uD558\uBA74 \uBD84\uC11D\uC774 \uC2DC\uC791\uB429\uB2C8\uB2E4</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Patterns */}
          {hasPatterns && (
            <div className="flex flex-wrap gap-2">
              {data.patterns.map((p, i) => {
                const style = IMPACT_STYLES[p.classification] || IMPACT_STYLES.moderate;
                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {EVENT_ICONS[p.patternType]} {p.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Actions — WO-O4O-CARE-ACTION-ENGINE-V2 */}
          {data.actions && data.actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">권장 조치</p>
              {data.actions.map((action, i) => (
                <CareActionButton key={i} action={action} onExecute={onActionExecute} />
              ))}
            </div>
          )}

          {/* Cross-reading summary */}
          {data.crossReadingAnalysis && (data.crossReadingAnalysis.fastingAvg != null || data.crossReadingAnalysis.postMealAvg != null) && (
            <div className="grid grid-cols-3 gap-3">
              <MiniStat
                label="\uACF5\uBCF5 \uD3C9\uADE0"
                value={data.crossReadingAnalysis.fastingAvg != null ? `${data.crossReadingAnalysis.fastingAvg} mg/dL` : '-'}
              />
              <MiniStat
                label="\uC2DD\uD6C4 \uD3C9\uADE0"
                value={data.crossReadingAnalysis.postMealAvg != null ? `${data.crossReadingAnalysis.postMealAvg} mg/dL` : '-'}
              />
              <MiniStat
                label="\uC2DD\uD6C4 \uC0C1\uC2B9\uD3ED"
                value={data.crossReadingAnalysis.delta != null ? `${data.crossReadingAnalysis.delta > 0 ? '+' : ''}${data.crossReadingAnalysis.delta} mg/dL` : '-'}
              />
            </div>
          )}

          {/* Event summary */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>\uCD1D {data.summary.totalEvents}\uAC74</span>
            {Object.entries(data.summary.eventsByType).filter(([, c]) => c > 0).map(([t, c]) => (
              <span key={t}>{EVENT_ICONS[t]} {EVENT_LABELS[t]} {c}</span>
            ))}
            {data.summary.insufficientDataEvents > 0 && (
              <span className="text-amber-500">\uB370\uC774\uD130 \uBD80\uC871 {data.summary.insufficientDataEvents}\uAC74</span>
            )}
          </div>

          {/* Event cards */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {data.events.map((ev, i) => (
              <EventCard key={i} event={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event: ev }: { event: CgmEventAnalysisDto['events'][number] }) {
  const classification = ev.impact || ev.effect || ev.context || null;
  const style = classification ? (IMPACT_STYLES[classification] || IMPACT_STYLES.moderate) : null;
  const border = EVENT_BORDER[ev.eventType] || 'border-l-slate-300';
  const dateStr = new Date(ev.eventTime).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${border} p-3`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{EVENT_ICONS[ev.eventType]}</span>
          <span className="text-xs font-medium text-slate-700">{EVENT_LABELS[ev.eventType]}</span>
          <span className="text-xs text-slate-400">{dateStr}</span>
        </div>
        {style && classification && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
            {ev.label}
          </span>
        )}
      </div>
      <div className="text-xs text-slate-500">
        {ev.eventType === 'meal' && (
          <>
            {ev.baseline != null && <span>baseline {ev.baseline}</span>}
            {ev.peak != null && <span> → peak {ev.peak}</span>}
            {ev.delta != null && <span className="ml-1 font-medium">(delta {ev.delta > 0 ? '+' : ''}{ev.delta})</span>}
            {ev.detail?.type && <span className="ml-2 text-orange-500">{String(ev.detail.type)}</span>}
            {ev.detail?.amount && <span className="text-orange-400"> {String(ev.detail.amount)}</span>}
          </>
        )}
        {ev.eventType === 'exercise' && (
          <>
            {ev.baseline != null && <span>baseline {ev.baseline}</span>}
            {ev.minAfter != null && <span> → min {ev.minAfter}</span>}
            {ev.drop != null && <span className="ml-1 font-medium">(drop -{ev.drop})</span>}
            {ev.detail?.type && <span className="ml-2 text-emerald-500">{String(ev.detail.type)}</span>}
            {ev.detail?.duration && <span className="text-emerald-400"> {String(ev.detail.duration)}\uBD84</span>}
          </>
        )}
        {ev.eventType === 'medication' && (
          <>
            {ev.varianceBefore != null && ev.varianceAfter != null && (
              <span>\uBCC0\uB3D9\uC131 {ev.varianceBefore} → {ev.varianceAfter}</span>
            )}
            {ev.detail?.name && <span className="ml-2 text-violet-500">{String(ev.detail.name)}</span>}
            {ev.detail?.dose && <span className="text-violet-400"> {String(ev.detail.dose)}</span>}
          </>
        )}
        {ev.eventType === 'symptom' && (
          <>
            {ev.glucoseAtEvent != null && <span>\uD608\uB2F9 {ev.glucoseAtEvent} mg/dL</span>}
            {ev.detail?.items && Array.isArray(ev.detail.items) && (
              <span className="ml-2 text-amber-500">{(ev.detail.items as string[]).join(', ')}</span>
            )}
          </>
        )}
        {ev.label === '\uB370\uC774\uD130 \uBD80\uC871' && (
          <span className="text-amber-400">\uBD84\uC11D\uC5D0 \uD544\uC694\uD55C \uD608\uB2F9 \uB370\uC774\uD130\uAC00 \uBD80\uC871\uD569\uB2C8\uB2E4</span>
        )}
      </div>
    </div>
  );
}

// ── Care Action Button (WO-O4O-CARE-ACTION-ENGINE-V2) ──

const CARE_ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  open_patient: User,
  create_coaching: MessageSquare,
  run_analysis: BarChart3,
  resolve_alert: CheckCircle2,
  link_guideline: BookOpen,
};

const PRIORITY_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  HIGH: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700' },
  MEDIUM: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' },
  LOW: { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-600' },
};

// WO-O4O-CARE-ACTION-ENGINE-V2.2: 영속화된 Action 카드 (상태 배지 + 실행 버튼)

const STATUS_DISPLAY: Record<string, { label: string; cls: string }> = {
  suggested: { label: '추천', cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '진행 중', cls: 'bg-amber-100 text-amber-700' },
  completed: { label: '완료', cls: 'bg-green-100 text-green-700' },
  dismissed: { label: '보류', cls: 'bg-slate-100 text-slate-500' },
  expired: { label: '만료', cls: 'bg-slate-100 text-slate-400' },
};

function CareActionButton({
  action,
  onExecute,
}: {
  action: CareGeneratedActionDto;
  onExecute: (action: CareGeneratedActionDto) => void;
}) {
  const Icon = CARE_ACTION_ICONS[action.type] || BarChart3;
  const style = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.LOW;

  return (
    <button
      onClick={() => onExecute(action)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-colors hover:opacity-80 ${style.border} ${style.bg} ${style.text}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{action.label}</span>
        <p className="text-xs opacity-70 mt-0.5">{action.reason}</p>
      </div>
    </button>
  );
}

function CarePersistedActionCard({
  action,
  onExecute,
  onStart,
  onComplete,
  onDismiss,
}: {
  action: CarePersistedActionDto;
  onExecute: (action: CarePersistedActionDto) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = CARE_ACTION_ICONS[action.actionType] || BarChart3;
  const style = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.LOW;
  const statusDisplay = STATUS_DISPLAY[action.status] || STATUS_DISPLAY.suggested;
  const isFinished = action.status === 'completed' || action.status === 'dismissed' || action.status === 'expired';

  return (
    <div className={`w-full rounded-xl border text-left text-sm transition-colors ${isFinished ? 'opacity-60' : ''} ${style.border} ${style.bg}`}>
      <button
        onClick={() => onExecute(action)}
        className={`w-full flex items-center gap-3 px-4 py-3 hover:opacity-80 ${style.text}`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{action.title}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusDisplay.cls}`}>
              {statusDisplay.label}
            </span>
          </div>
          <p className="text-xs opacity-70 mt-0.5">{action.description}</p>
        </div>
      </button>
      {!isFinished && (
        <div className="flex items-center gap-1 px-4 pb-3 pt-0">
          {action.canStart && (
            <button
              onClick={() => onStart(action.id)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
            >
              <Play className="w-3 h-3" /> 시작
            </button>
          )}
          {action.canComplete && (
            <button
              onClick={() => onComplete(action.id)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> 완료
            </button>
          )}
          {action.canDismiss && (
            <button
              onClick={() => onDismiss(action.id)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded transition-colors"
            >
              <XCircle className="w-3 h-3" /> 보류
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Time-Based Analysis Section (WO-O4O-CARE-TIME-BASED-ANALYSIS-V1) ──

const BUCKET_LABELS: Record<string, string> = {
  morning: '아침 (05~10시)',
  afternoon: '점심 (10~15시)',
  evening: '저녁 (15~21시)',
  night: '야간 (21~05시)',
};

const BUCKET_COLORS: Record<string, string> = {
  morning: 'bg-amber-50 border-amber-200 text-amber-800',
  afternoon: 'bg-blue-50 border-blue-200 text-blue-800',
  evening: 'bg-orange-50 border-orange-200 text-orange-800',
  night: 'bg-indigo-50 border-indigo-200 text-indigo-800',
};

const MEAL_TIMING_DISPLAY: Record<string, string> = {
  fasting: '공복',
  before_meal: '식전',
  after_meal: '식후',
  after_meal_1h: '식후 1h',
  after_meal_2h: '식후 2h',
  bedtime: '취침 전',
  random: '수시',
};

function TimeBasedAnalysisSection({ data, onActionExecute, onActionStart, onActionComplete, onActionDismiss }: {
  data: TimeBasedAnalysisDto;
  onActionExecute: (action: CareGeneratedActionDto | CarePersistedActionDto) => void;
  onActionStart?: (id: string) => void;
  onActionComplete?: (id: string) => void;
  onActionDismiss?: (id: string) => void;
}) {
  const maxBucketAvg = Math.max(...data.timeBuckets.map(b => b.avg), 1);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-500" />
        시간 기반 분석 (최근 {data.days}일)
      </h4>

      {/* Time-of-day buckets */}
      {data.timeBuckets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.timeBuckets.map((b) => (
            <div key={b.bucket} className={`rounded-xl border p-3 ${BUCKET_COLORS[b.bucket] || 'bg-slate-50 border-slate-200 text-slate-800'}`}>
              <p className="text-[11px] font-medium opacity-70 mb-1">{BUCKET_LABELS[b.bucket] || b.bucket}</p>
              <p className="text-xl font-bold">{b.avg} <span className="text-xs font-normal opacity-60">mg/dL</span></p>
              <div className="mt-1.5 h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-current opacity-40"
                  style={{ width: `${Math.round((b.avg / maxBucketAvg) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] opacity-50">{b.count}회</span>
                {b.highCount > 0 && <span className="text-[10px] text-red-600 font-medium">고혈당 {b.highCount}</span>}
                {b.lowCount > 0 && <span className="text-[10px] text-blue-600 font-medium">저혈당 {b.lowCount}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Meal-timing stats + Exercise impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meal timing */}
        {data.mealTimingStats.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-orange-500" />
              측정 구분별 혈당
            </h5>
            <div className="space-y-2">
              {data.mealTimingStats.map((m) => (
                <div key={m.mealTiming} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{MEAL_TIMING_DISPLAY[m.mealTiming] || m.mealTiming}</span>
                  <span className="font-medium text-slate-800">
                    {m.avg} <span className="text-xs text-slate-400">mg/dL ({m.count}회)</span>
                  </span>
                </div>
              ))}
            </div>
            {/* Post-meal rise indicator */}
            {(() => {
              const fasting = data.mealTimingStats.find(m => m.mealTiming === 'fasting');
              const postMeal = data.mealTimingStats.find(m => ['after_meal', 'after_meal_1h', 'after_meal_2h'].includes(m.mealTiming));
              if (fasting && postMeal) {
                const rise = postMeal.avg - fasting.avg;
                return (
                  <div className={`mt-3 pt-2 border-t border-slate-100 text-xs ${rise > 50 ? 'text-red-600' : rise > 30 ? 'text-amber-600' : 'text-green-600'}`}>
                    식후 평균 상승: <span className="font-semibold">{rise > 0 ? '+' : ''}{rise} mg/dL</span>
                    {rise > 50 && ' (관리 필요)'}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Exercise + Trends */}
        <div className="space-y-4">
          {/* Exercise impact */}
          {data.exerciseImpact.count > 0 && data.exerciseImpact.avgWithExercise != null && data.exerciseImpact.overallAvg != null && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-emerald-500" />
                운동 영향
              </h5>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">운동 시 평균</p>
                  <p className="text-lg font-bold text-slate-800">{data.exerciseImpact.avgWithExercise} <span className="text-xs font-normal text-slate-400">mg/dL</span></p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">전체 평균</p>
                  <p className="text-lg font-bold text-slate-800">{data.exerciseImpact.overallAvg} <span className="text-xs font-normal text-slate-400">mg/dL</span></p>
                </div>
              </div>
              {(() => {
                const diff = data.exerciseImpact.avgWithExercise! - data.exerciseImpact.overallAvg!;
                return (
                  <p className={`text-xs mt-2 ${diff < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                    운동 시 {diff < 0 ? `${Math.abs(diff)} mg/dL 낮은 경향` : diff > 0 ? `${diff} mg/dL 높은 경향` : '차이 없음'}
                    <span className="text-slate-400 ml-1">({data.exerciseImpact.count}회 기록)</span>
                  </p>
                );
              })()}
            </div>
          )}

          {/* Trends */}
          {data.trends.countFull > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                추세 비교
              </h5>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-slate-400">3일</p>
                  <p className="text-lg font-bold text-slate-800">{data.trends.avg3d ?? '-'}</p>
                  <p className="text-[10px] text-slate-400">{data.trends.count3d}회</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">7일</p>
                  <p className="text-lg font-bold text-slate-800">{data.trends.avg7d ?? '-'}</p>
                  <p className="text-[10px] text-slate-400">{data.trends.count7d}회</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">{data.days}일</p>
                  <p className="text-lg font-bold text-slate-800">{data.trends.avgFull ?? '-'}</p>
                  <p className="text-[10px] text-slate-400">{data.trends.countFull}회</p>
                </div>
              </div>
              {data.trends.avg3d != null && data.trends.avg7d != null && (
                <p className={`text-xs mt-2 text-center ${
                  data.trends.avg3d < data.trends.avg7d ? 'text-green-600' : data.trends.avg3d > data.trends.avg7d ? 'text-red-600' : 'text-slate-500'
                }`}>
                  최근 3일 {data.trends.avg3d < data.trends.avg7d ? '개선 추세' : data.trends.avg3d > data.trends.avg7d ? '상승 추세' : '유지'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action cards — WO-O4O-CARE-ACTION-ENGINE-V2.2 */}
      {data.actions && data.actions.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-4">
          <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
            권장 조치
          </h5>
          <div className="space-y-2">
            {data.actions
              .filter((a) => !('status' in a) || (a as CarePersistedActionDto).status !== 'dismissed')
              .map((action, i) => (
                'id' in action && 'status' in action ? (
                  <CarePersistedActionCard
                    key={(action as CarePersistedActionDto).id}
                    action={action as CarePersistedActionDto}
                    onExecute={onActionExecute}
                    onStart={onActionStart || (() => {})}
                    onComplete={onActionComplete || (() => {})}
                    onDismiss={onActionDismiss || (() => {})}
                  />
                ) : (
                  <CareActionButton key={i} action={action as CareGeneratedActionDto} onExecute={onActionExecute} />
                )
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
