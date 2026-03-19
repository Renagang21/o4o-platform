/**
 * CareDashboardPage - 당뇨인 행동 Care Home
 *
 * WO-O4O-GLUCOSEVIEW-HOME-BEHAVIOR-UI-V1
 *
 * 당뇨인를 선택하면 5개 섹션 표시:
 *   ① 오늘 건강 (glucose + BP + weight KPI)
 *   ② 데이터 입력 (3-button quick entry)
 *   ③ 최근 기록 (Health Readings)
 *   ④ AI 건강 인사이트 (LLM + risk + insights)
 *   ⑤ 약사 코칭
 *
 * API:
 *   - listCustomers → 당뇨인 목록
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
  CareLlmInsightDto,
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
  const [llmInsight, setLlmInsight] = useState<CareLlmInsightDto | null>(null);
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
        setError('당뇨인 목록을 불러오지 못했습니다.');
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
    setLlmInsight(null);
    try {
      const [analysisData, kpiData, sessionsData, readingsData, llmData] = await Promise.all([
        api.getCareAnalysis(patientId).catch(() => null),
        api.getCareKpi(patientId).catch(() => null),
        api.getCoachingSessions(patientId).catch(() => []),
        api.getHealthReadings(patientId).catch(() => []),
        api.getCareLlmInsight(patientId).catch(() => null),
      ]);
      setAnalysis(analysisData);
      setKpi(kpiData);
      setSessions(sessionsData);
      setReadings(readingsData);
      setLlmInsight(llmData);
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
          <p className="text-slate-500 mb-4">등록된 당뇨인가 없습니다.</p>
          <a
            href="/patients"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            당뇨인 등록하기
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
          <p className="text-sm text-slate-500 mt-1">당뇨인를 선택하여 건강 상태와 행동을 확인합니다.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Patient Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">당뇨인 선택</label>
          <select
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedId ?? ''}
            onChange={(e) => e.target.value && handleSelectPatient(e.target.value)}
          >
            <option value="">-- 당뇨인를 선택하세요 --</option>
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
            당뇨인를 선택하면 건강 상태가 표시됩니다.
          </div>
        )}

        {/* ─── Patient Data Sections ─── */}
        {selectedId && !loadingData && (
          <>
            {/* ① 오늘 건강 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">오늘 건강</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">오늘 혈당</p>
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
                <div>
                  <p className="text-xs text-slate-400 mb-1">혈압</p>
                  {analysis?.multiMetric?.bp && analysis.multiMetric.bp.readingCount > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-slate-900">
                        {analysis.multiMetric.bp.avgSystolic}/{analysis.multiMetric.bp.avgDiastolic}
                      </p>
                      <p className="text-xs text-slate-400">
                        mmHg · {
                          { normal: '정상', elevated: '상승', high_stage1: '고혈압1', high_stage2: '고혈압2' }[analysis.multiMetric.bp.bpCategory] || '정상'
                        }
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-slate-300">--</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">체중</p>
                  {analysis?.multiMetric?.weight && analysis.multiMetric.weight.readingCount > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-slate-900">
                        {analysis.multiMetric.weight.latestWeight}
                        <span className="text-sm font-normal text-slate-400 ml-0.5">kg</span>
                      </p>
                      {analysis.multiMetric.weight.weightChange != null && (
                        <p className={`text-xs font-medium ${analysis.multiMetric.weight.weightChange > 0 ? 'text-red-500' : analysis.multiMetric.weight.weightChange < 0 ? 'text-green-500' : 'text-slate-400'}`}>
                          {analysis.multiMetric.weight.weightChange > 0 ? '+' : ''}{analysis.multiMetric.weight.weightChange}kg
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-slate-300">--</p>
                  )}
                </div>
              </div>
            </div>

            {/* ② 데이터 입력 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">데이터 입력</h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setRecordMetric('glucose');
                    setRecordDate(defaultMeasuredAt());
                    setShowRecordModal(true);
                  }}
                  className="flex flex-col items-center gap-2 px-4 py-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <span className="text-xl">🩸</span>
                  <span className="text-sm font-medium text-blue-700">혈당 입력</span>
                </button>
                <button
                  onClick={() => {
                    setRecordMetric('blood_pressure_systolic');
                    setRecordDate(defaultMeasuredAt());
                    setShowRecordModal(true);
                  }}
                  className="flex flex-col items-center gap-2 px-4 py-4 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  <span className="text-xl">💓</span>
                  <span className="text-sm font-medium text-rose-700">혈압 입력</span>
                </button>
                <button
                  onClick={() => {
                    setRecordMetric('weight');
                    setRecordDate(defaultMeasuredAt());
                    setShowRecordModal(true);
                  }}
                  className="flex flex-col items-center gap-2 px-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <span className="text-xl">⚖️</span>
                  <span className="text-sm font-medium text-emerald-700">체중 입력</span>
                </button>
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

            {/* ④ AI 건강 인사이트 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">AI 건강 인사이트</h2>

              {/* LLM 맞춤 안내 */}
              {llmInsight?.patientMessage && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-line">
                    {llmInsight.patientMessage}
                  </p>
                  {llmInsight.createdAt && (
                    <p className="text-xs text-blue-400 mt-2">
                      {new Date(llmInsight.createdAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              )}

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
                    {kpi?.riskTrend && (
                      <span className={`text-sm font-medium ${
                        kpi.riskTrend === 'improving' ? 'text-green-600'
                          : kpi.riskTrend === 'worsening' ? 'text-red-600'
                          : 'text-slate-600'
                      }`}>
                        {kpi.riskTrend === 'improving' ? '개선' : kpi.riskTrend === 'worsening' ? '악화' : '유지'}
                      </span>
                    )}
                  </div>

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

            {/* ⑤ 약사 코칭 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">약사 코칭</h2>
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
