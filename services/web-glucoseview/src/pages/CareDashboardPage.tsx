/**
 * CareDashboardPage - 환자 행동 Care Home
 *
 * WO-O4O-GLUCOSEVIEW-HOME-BEHAVIOR-UI-V1
 *
 * 환자를 선택하면 5개 섹션 표시:
 *   ① 오늘 혈당 (KPI + 오늘 readings)
 *   ② 오늘 행동 (Behavior Panel)
 *   ③ 최근 기록 (Health Readings)
 *   ④ AI 분석 요약
 *   ⑤ 케어 코칭
 *
 * API:
 *   - listCustomers → 환자 목록
 *   - getCareKpi → TIR/CV
 *   - getCareAnalysis → Risk/Insights
 *   - getCoachingSessions → 코칭 목록
 *   - getHealthReadings → 건강 기록
 *   - postHealthReading → 혈당 기록
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import type {
  Customer,
  CareInsightDto,
  KpiComparisonDto,
  CoachingSession,
  HealthReadingDto,
} from '../services/api';

// ── Constants ──

const METRIC_OPTIONS = [
  { value: 'glucose', label: '혈당', unit: 'mg/dL' },
  { value: 'blood_pressure_systolic', label: '수축기 혈압', unit: 'mmHg' },
  { value: 'blood_pressure_diastolic', label: '이완기 혈압', unit: 'mmHg' },
  { value: 'weight', label: '체중', unit: 'kg' },
] as const;

const METRIC_LABEL: Record<string, string> = {
  glucose: '혈당',
  blood_pressure_systolic: '수축기 혈압',
  blood_pressure_diastolic: '이완기 혈압',
  weight: '체중',
};

const RISK_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700' },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700' },
  low: { label: '양호', cls: 'bg-green-100 text-green-700' },
};

// ── Helpers ──

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function defaultMeasuredAt() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

// ── Component ──

export default function CareDashboardPage() {
  // Patient list
  const [patients, setPatients] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Patient data
  const [analysis, setAnalysis] = useState<CareInsightDto | null>(null);
  const [kpi, setKpi] = useState<KpiComparisonDto | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [readings, setReadings] = useState<HealthReadingDto[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recording modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordMetric, setRecordMetric] = useState('glucose');
  const [recordValue, setRecordValue] = useState('');
  const [recordDate, setRecordDate] = useState(defaultMeasuredAt);
  const [saving, setSaving] = useState(false);

  // Load patient list
  useEffect(() => {
    (async () => {
      try {
        const result = await api.listCustomers({ limit: 200 });
        setPatients(result.data);
      } catch {
        setError('환자 목록을 불러오지 못했습니다.');
      } finally {
        setLoadingPatients(false);
      }
    })();
  }, []);

  // Load all data for selected patient
  const loadPatientData = useCallback(async (patientId: string) => {
    setLoadingData(true);
    setError(null);
    setAnalysis(null);
    setKpi(null);
    setSessions([]);
    setReadings([]);
    try {
      const [analysisData, kpiData, sessionsData, readingsData] = await Promise.all([
        api.getCareAnalysis(patientId).catch(() => null),
        api.getCareKpi(patientId).catch(() => null),
        api.getCoachingSessions(patientId).catch(() => []),
        api.getHealthReadings(patientId).catch(() => []),
      ]);
      setAnalysis(analysisData);
      setKpi(kpiData);
      setSessions(sessionsData);
      setReadings(readingsData);
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  const handleSelectPatient = (id: string) => {
    setSelectedId(id);
    loadPatientData(id);
  };

  // Save health reading
  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !recordValue || saving) return;

    const metric = METRIC_OPTIONS.find(m => m.value === recordMetric);
    setSaving(true);
    try {
      await api.postHealthReading({
        patientId: selectedId,
        metricType: recordMetric,
        valueNumeric: Number(recordValue),
        unit: metric?.unit || 'mg/dL',
        measuredAt: new Date(recordDate).toISOString(),
      });
      setShowRecordModal(false);
      setRecordValue('');
      setRecordDate(defaultMeasuredAt());
      // Refresh readings
      const updated = await api.getHealthReadings(selectedId).catch(() => []);
      setReadings(updated);
    } catch {
      setError('기록 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Derived: today's glucose readings
  const todayGlucose = useMemo(() => {
    return readings.filter(r => r.metricType === 'glucose' && isToday(r.measuredAt));
  }, [readings]);

  // Derived: behavior actions
  const behaviorActions = useMemo(() => {
    const items: Array<{ label: string; cls: string }> = [];

    if (todayGlucose.length === 0) {
      items.push({
        label: '오늘 혈당이 아직 기록되지 않았습니다. 혈당을 측정해 주세요.',
        cls: 'bg-amber-50 border-amber-200 text-amber-700',
      });
    }

    if (kpi?.latestTir != null && kpi.latestTir < 70) {
      items.push({
        label: 'TIR이 목표(70%) 미만입니다. 식후 혈당을 확인해 보세요.',
        cls: 'bg-red-50 border-red-200 text-red-700',
      });
    }

    if (sessions.length > 0) {
      items.push({
        label: `최근 코칭: ${sessions[0].summary.slice(0, 40)}${sessions[0].summary.length > 40 ? '...' : ''}`,
        cls: 'bg-blue-50 border-blue-200 text-blue-700',
      });
    }

    if (items.length === 0) {
      items.push({
        label: '잘 하고 있습니다! 꾸준히 기록을 이어가세요.',
        cls: 'bg-green-50 border-green-200 text-green-700',
      });
    }

    return items;
  }, [todayGlucose, kpi, sessions]);

  const selectedPatient = patients.find(p => p.id === selectedId);

  // ── Loading state ──
  if (loadingPatients) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No patients ──
  if (patients.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h1 className="text-xl font-bold text-slate-900">Care Home</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-slate-500 mb-4">등록된 환자가 없습니다.</p>
          <a
            href="/patients"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            환자 등록하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-xl font-bold text-slate-900">Care Home</h1>
          <p className="text-sm text-slate-500 mt-1">환자를 선택하여 건강 상태와 행동을 확인합니다.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Patient Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">환자 선택</label>
          <select
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedId ?? ''}
            onChange={(e) => e.target.value && handleSelectPatient(e.target.value)}
          >
            <option value="">-- 환자를 선택하세요 --</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.phone ? ` (${p.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loadingData && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">데이터 로딩 중...</p>
          </div>
        )}

        {/* Prompt */}
        {!selectedId && !loadingData && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            환자를 선택하면 건강 상태가 표시됩니다.
          </div>
        )}

        {/* ─── Patient Data Sections ─── */}
        {selectedId && !loadingData && (
          <>
            {/* ① 오늘 혈당 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">오늘 혈당</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">오늘 측정</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {todayGlucose.length > 0
                      ? `${todayGlucose[0].valueNumeric}`
                      : '--'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {todayGlucose.length > 0
                      ? `${formatTime(todayGlucose[0].measuredAt)} · mg/dL`
                      : 'mg/dL'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">오늘 기록 수</p>
                  <p className="text-2xl font-bold text-slate-900">{todayGlucose.length}건</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">TIR</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {kpi?.latestTir != null ? `${kpi.latestTir}%` : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">CV</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {kpi?.latestCv != null ? `${kpi.latestCv}%` : '--'}
                  </p>
                </div>
              </div>
            </div>

            {/* ② 오늘 행동 (Behavior Panel) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">오늘 행동</h2>
                <button
                  onClick={() => {
                    setRecordDate(defaultMeasuredAt());
                    setShowRecordModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  혈당 기록하기
                </button>
              </div>
              <div className="space-y-2">
                {behaviorActions.map((action, i) => (
                  <div
                    key={i}
                    className={`px-4 py-3 rounded-lg border text-sm ${action.cls}`}
                  >
                    {action.label}
                  </div>
                ))}
              </div>
            </div>

            {/* ③ 최근 기록 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">최근 기록</h2>
              {readings.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  아직 건강 데이터가 없습니다. 위 버튼으로 첫 기록을 남겨 보세요.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-xs font-medium text-slate-400 uppercase py-2 pr-4">날짜</th>
                        <th className="text-left text-xs font-medium text-slate-400 uppercase py-2 pr-4">항목</th>
                        <th className="text-right text-xs font-medium text-slate-400 uppercase py-2 pr-4">값</th>
                        <th className="text-left text-xs font-medium text-slate-400 uppercase py-2">단위</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {readings.slice(0, 10).map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 pr-4 text-sm text-slate-600">
                            {formatDate(r.measuredAt)} {formatTime(r.measuredAt)}
                          </td>
                          <td className="py-2.5 pr-4 text-sm text-slate-700">
                            {METRIC_LABEL[r.metricType] || r.metricType}
                          </td>
                          <td className="py-2.5 pr-4 text-sm text-slate-900 font-medium text-right">
                            {r.valueNumeric ?? '-'}
                          </td>
                          <td className="py-2.5 text-sm text-slate-400">{r.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ④ AI 분석 요약 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">AI 분석 요약</h2>
              {analysis ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">위험도:</span>
                    {(() => {
                      const badge = RISK_BADGE[analysis.riskLevel];
                      return badge ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      );
                    })()}
                  </div>

                  {kpi && kpi.riskTrend && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">추세:</span>
                      <span className={`text-sm font-medium ${
                        kpi.riskTrend === 'improving' ? 'text-green-600'
                          : kpi.riskTrend === 'worsening' ? 'text-red-600'
                          : 'text-slate-600'
                      }`}>
                        {kpi.riskTrend === 'improving' ? '개선' : kpi.riskTrend === 'worsening' ? '악화' : '유지'}
                      </span>
                    </div>
                  )}

                  {analysis.insights.length > 0 && (
                    <ul className="space-y-2">
                      {analysis.insights.slice(0, 3).map((insight, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          <span className="text-sm text-slate-700">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  분석 데이터가 없습니다. 혈당 데이터를 입력하면 분석이 시작됩니다.
                </p>
              )}
            </div>

            {/* ④-2 복합 지표 분석 (Multi-Metric) — WO-O4O-CARE-MULTI-METRIC-ANALYSIS-V1 */}
            {analysis?.multiMetric && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">복합 지표 분석</h2>
                <div className="space-y-4">
                  {/* Blood Pressure */}
                  {analysis.multiMetric.bp && analysis.multiMetric.bp.readingCount > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">혈압 (평균):</span>
                      <span className="text-sm font-medium text-slate-800">
                        {analysis.multiMetric.bp.avgSystolic}/{analysis.multiMetric.bp.avgDiastolic} mmHg
                      </span>
                      {(() => {
                        const cats: Record<string, { label: string; cls: string }> = {
                          normal: { label: '정상', cls: 'bg-green-100 text-green-700' },
                          elevated: { label: '상승', cls: 'bg-amber-100 text-amber-700' },
                          high_stage1: { label: '고혈압 1단계', cls: 'bg-orange-100 text-orange-700' },
                          high_stage2: { label: '고혈압 2단계', cls: 'bg-red-100 text-red-700' },
                        };
                        const cat = cats[analysis.multiMetric!.bp!.bpCategory] || cats.normal;
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${cat.cls}`}>
                            {cat.label}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Weight */}
                  {analysis.multiMetric.weight && analysis.multiMetric.weight.readingCount > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">체중:</span>
                      <span className="text-sm font-medium text-slate-800">
                        {analysis.multiMetric.weight.latestWeight}kg
                      </span>
                      {analysis.multiMetric.weight.weightChange != null && (
                        <span className={`text-xs font-medium ${analysis.multiMetric.weight.weightChange > 0 ? 'text-red-600' : analysis.multiMetric.weight.weightChange < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                          {analysis.multiMetric.weight.weightChange > 0 ? '+' : ''}{analysis.multiMetric.weight.weightChange}kg
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metabolic Risk */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">대사 위험도:</span>
                    {(() => {
                      const mr = analysis.multiMetric!.metabolicRisk;
                      const badge = RISK_BADGE[mr.metabolicRiskLevel] || RISK_BADGE.low;
                      return (
                        <>
                          <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-slate-400">({mr.metabolicScore}점)</span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Risk Factors */}
                  {analysis.multiMetric.metabolicRisk.riskFactors.length > 0 && (
                    <ul className="space-y-1.5 mt-2">
                      {analysis.multiMetric.metabolicRisk.riskFactors.map((factor, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          <span className="text-sm text-slate-700">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ⑤ 케어 코칭 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">케어 코칭</h2>
              {sessions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  아직 코칭 기록이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 3).map((s) => (
                    <div key={s.id} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">{formatDate(s.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-1">
                        <span className="font-medium text-slate-600">요약:</span> {s.summary}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-600">행동 계획:</span> {s.actionPlan}
                      </p>
                    </div>
                  ))}
                  {sessions.length > 3 && (
                    <p className="text-xs text-slate-400 text-center">
                      외 {sessions.length - 3}건의 코칭 기록
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── 혈당 기록 모달 ─── */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              건강 데이터 기록
              {selectedPatient && (
                <span className="text-sm font-normal text-slate-400 ml-2">{selectedPatient.name}</span>
              )}
            </h3>

            <form onSubmit={handleSaveReading} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">측정 항목</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={recordMetric}
                  onChange={(e) => setRecordMetric(e.target.value)}
                >
                  {METRIC_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label} ({m.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  측정값 ({METRIC_OPTIONS.find(m => m.value === recordMetric)?.unit || ''})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={recordValue}
                  onChange={(e) => setRecordValue(e.target.value)}
                  placeholder="예: 120"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">측정 일시</label>
                <input
                  type="datetime-local"
                  required
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecordModal(false);
                    setRecordValue('');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving || !recordValue}
                  className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
