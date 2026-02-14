import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Customer, CareInsightDto, KpiComparisonDto, CoachingSession } from '../services/api';

export default function InsightsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CareInsightDto | null>(null);
  const [kpi, setKpi] = useState<KpiComparisonDto | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coaching modal state
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [coachingSummary, setCoachingSummary] = useState('');
  const [coachingActionPlan, setCoachingActionPlan] = useState('');
  const [savingCoaching, setSavingCoaching] = useState(false);

  // Load patient list for selector
  useEffect(() => {
    (async () => {
      try {
        const result = await api.listCustomers({ limit: 200 });
        setPatients(result.data);
      } catch {
        setError('고객 목록을 불러오지 못했습니다.');
      } finally {
        setLoadingPatients(false);
      }
    })();
  }, []);

  // Load analysis + KPI + sessions when patient selected
  const loadAnalysis = useCallback(async (patientId: string) => {
    setLoadingAnalysis(true);
    setError(null);
    setAnalysis(null);
    setKpi(null);
    setSessions([]);
    try {
      const [analysisData, kpiData, sessionsData] = await Promise.all([
        api.getCareAnalysis(patientId),
        api.getCareKpi(patientId).catch(() => null),
        api.getCoachingSessions(patientId).catch(() => []),
      ]);
      setAnalysis(analysisData);
      setKpi(kpiData);
      setSessions(sessionsData);
    } catch {
      setError('분석 데이터를 불러오지 못했습니다.');
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const handleSelectPatient = (id: string) => {
    setSelectedId(id);
    loadAnalysis(id);
  };

  const handleSaveCoaching = async () => {
    if (!selectedId || !user?.id || !coachingSummary.trim() || !coachingActionPlan.trim()) return;
    setSavingCoaching(true);
    try {
      await api.createCoachingSession({
        patientId: selectedId,
        pharmacistId: user.id,
        summary: coachingSummary.trim(),
        actionPlan: coachingActionPlan.trim(),
      });
      setShowCoachingModal(false);
      setCoachingSummary('');
      setCoachingActionPlan('');
      // Reload sessions
      const updated = await api.getCoachingSessions(selectedId).catch(() => []);
      setSessions(updated);
    } catch {
      setError('상담 기록 저장에 실패했습니다.');
    } finally {
      setSavingCoaching(false);
    }
  };

  const riskLabel = (level: CareInsightDto['riskLevel']) => {
    switch (level) {
      case 'high': return { text: '고위험', color: 'bg-red-100 text-red-700' };
      case 'moderate': return { text: '주의', color: 'bg-amber-100 text-amber-700' };
      case 'low': return { text: '양호', color: 'bg-green-100 text-green-700' };
    }
  };

  const trendLabel = (trend: KpiComparisonDto['riskTrend']) => {
    switch (trend) {
      case 'improving': return { text: '개선', color: 'text-green-600' };
      case 'worsening': return { text: '악화', color: 'text-red-600' };
      case 'stable': return { text: '유지', color: 'text-slate-600' };
      default: return null;
    }
  };

  const changeIndicator = (change: number | null) => {
    if (change === null) return null;
    if (change > 0) return { text: `+${change}`, color: 'text-green-600' };
    if (change < 0) return { text: `${change}`, color: 'text-red-600' };
    return { text: '0', color: 'text-slate-500' };
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // No patients registered yet
  if (!loadingPatients && patients.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-semibold text-slate-900">분석 현황</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">등록된 고객이 없습니다</h2>
            <p className="text-slate-500 mb-8">고객을 먼저 등록한 후 분석 기능을 이용해 주세요.</p>
            <Link
              to="/patients"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              고객 관리로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold text-slate-900">분석 현황</h1>
          <p className="text-slate-500 mt-1">고객을 선택하여 혈당 분석 인사이트를 확인합니다.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Patient selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">고객 선택</label>
          {loadingPatients ? (
            <p className="text-slate-400 text-sm">목록 로딩 중...</p>
          ) : (
            <select
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedId ?? ''}
              onChange={(e) => e.target.value && handleSelectPatient(e.target.value)}
            >
              <option value="">-- 고객을 선택하세요 --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.phone ? ` (${p.phone})` : ''}</option>
              ))}
            </select>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loadingAnalysis && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">분석 중...</p>
          </div>
        )}

        {/* Analysis result */}
        {analysis && !loadingAnalysis && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm text-slate-500 mb-1">Time in Range</p>
                <p className="text-3xl font-bold text-slate-900">{analysis.tir}%</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm text-slate-500 mb-1">CV (변동계수)</p>
                <p className="text-3xl font-bold text-slate-900">{analysis.cv}%</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm text-slate-500 mb-1">위험도</p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${riskLabel(analysis.riskLevel).color}`}>
                  {riskLabel(analysis.riskLevel).text}
                </span>
              </div>
            </div>

            {/* KPI Comparison */}
            {kpi && kpi.tirChange !== null && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">이전 대비 변화</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">TIR 변화</p>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const c = changeIndicator(kpi.tirChange);
                        return c ? <span className={c.color}>{c.text}%</span> : '-';
                      })()}
                    </p>
                    {kpi.previousTir !== null && (
                      <p className="text-xs text-slate-400 mt-1">이전: {kpi.previousTir}%</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">CV 변화</p>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const c = changeIndicator(kpi.cvChange);
                        return c ? <span className={c.color}>{c.text}%</span> : '-';
                      })()}
                    </p>
                    {kpi.previousCv !== null && (
                      <p className="text-xs text-slate-400 mt-1">이전: {kpi.previousCv}%</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">위험도 추세</p>
                    {(() => {
                      const t = trendLabel(kpi.riskTrend);
                      return t ? (
                        <p className={`text-2xl font-bold ${t.color}`}>{t.text}</p>
                      ) : (
                        <p className="text-2xl font-bold text-slate-300">-</p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Insights list */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">인사이트</h3>
              <ul className="space-y-3">
                {analysis.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-slate-700">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coaching section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">상담 기록</h3>
                <button
                  onClick={() => setShowCoachingModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  상담 기록하기
                </button>
              </div>

              {sessions.length === 0 ? (
                <p className="text-slate-400 text-sm">아직 상담 기록이 없습니다.</p>
              ) : (
                <ul className="space-y-4">
                  {sessions.map((s) => (
                    <li key={s.id} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">{formatDate(s.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-1">
                        <span className="font-medium text-slate-600">요약:</span> {s.summary}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-600">행동 계획:</span> {s.actionPlan}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Prompt to select if nothing selected */}
        {!selectedId && !loadingPatients && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            고객을 선택하면 분석 결과가 표시됩니다.
          </div>
        )}
      </div>

      {/* Coaching Modal */}
      {showCoachingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">상담 기록</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">상담 요약</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="상담 내용을 요약해 주세요"
                  value={coachingSummary}
                  onChange={(e) => setCoachingSummary(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">권장 행동</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="권장하는 행동 계획을 입력해 주세요"
                  value={coachingActionPlan}
                  onChange={(e) => setCoachingActionPlan(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCoachingModal(false);
                  setCoachingSummary('');
                  setCoachingActionPlan('');
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                disabled={savingCoaching}
              >
                취소
              </button>
              <button
                onClick={handleSaveCoaching}
                disabled={savingCoaching || !coachingSummary.trim() || !coachingActionPlan.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingCoaching ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
