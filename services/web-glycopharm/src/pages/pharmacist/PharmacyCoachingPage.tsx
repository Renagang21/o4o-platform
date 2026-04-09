/**
 * PharmacyCoachingPage — 약사 코칭 화면 (약사 뷰)
 * WO-GLYCOPHARM-PHARMACIST-COACHING-SCREEN-V1
 * WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-C1:
 *   file/component PharmacistCoachingPage → PharmacyCoachingPage 표준화.
 *   (pharmacist-facing coaching editor)
 *   상위 디렉토리명 pages/pharmacist/ 는 별도 WO 에서 정리 예정.
 *
 * 당뇨인 분석 결과 + 문제 유형 + 코칭 입력/기록을 하나의 화면에 표시.
 * 기존 care 백엔드 API 100% 재사용 (새 엔드포인트 없음).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Activity,
  CheckCircle,
  AlertCircle,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import type {
  CareInsightDto,
  CoachingSession,
  CoachingDraftDto,
  HealthReadingDto,
} from '@/api/pharmacy';

// ─── Constants ───

const COACHING_TEMPLATES = [
  {
    label: '탄수화물 조절',
    summary: '식사 탄수화물 조절 안내',
    actionPlan: '매 끼니 탄수화물 양을 주먹 1개 정도로 제한하세요. 백미 대신 잡곡밥, 흰 빵 대신 통곡물 빵을 선택하면 식후 혈당 급상승을 줄일 수 있습니다.',
  },
  {
    label: '식후 산책',
    summary: '식후 걷기 운동 안내',
    actionPlan: '식후 10~15분 가벼운 걷기를 시작해 보세요. 식후 혈당을 낮추는 데 효과적이며, 매일 꾸준히 실천하는 것이 중요합니다.',
  },
  {
    label: '야간 간식 조절',
    summary: '야간 간식 조절 안내',
    actionPlan: '저녁 식사 후 간식을 줄이고, 취침 전 3시간 내 음식 섭취를 피하세요. 야간 혈당 상승과 공복 고혈당 예방에 도움이 됩니다.',
  },
  {
    label: '운동 습관',
    summary: '규칙적 운동 안내',
    actionPlan: '매일 같은 시간에 30분 이상 걷기 또는 유산소 운동을 하세요. 규칙적인 운동은 인슐린 감수성을 높이고 혈당 조절에 도움이 됩니다.',
  },
];

// ─── Problem type classification ───

interface ProblemType {
  key: string;
  label: string;
  color: string;
  bgColor: string;
}

const PROBLEM_TYPES: Record<string, ProblemType> = {
  fasting_high: { key: 'fasting_high', label: '공복 고혈당형', color: 'text-red-700', bgColor: 'bg-red-50' },
  postmeal_high: { key: 'postmeal_high', label: '식후 고혈당형', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  hypoglycemia: { key: 'hypoglycemia', label: '저혈당 반복형', color: 'text-violet-700', bgColor: 'bg-violet-50' },
  variable: { key: 'variable', label: '혈당 변동형', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  normal: { key: 'normal', label: '정상', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
};

function classifyProblems(readings: HealthReadingDto[]): ProblemType[] {
  const values = readings
    .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return [];

  // Fasting values
  const fastingValues = readings
    .filter((r) => (r.metadata as Record<string, string>)?.mealTiming === 'fasting')
    .map((r) => Number(r.valueNumeric))
    .filter((v) => !isNaN(v));

  const fastingAvg = fastingValues.length > 0
    ? fastingValues.reduce((a, b) => a + b, 0) / fastingValues.length
    : 0;

  // Post-meal values
  const postMealValues = readings
    .filter((r) => (r.metadata as Record<string, string>)?.mealTiming === 'after_meal')
    .map((r) => Number(r.valueNumeric))
    .filter((v) => !isNaN(v));

  const postMealAvg = postMealValues.length > 0
    ? postMealValues.reduce((a, b) => a + b, 0) / postMealValues.length
    : 0;

  // Hypoglycemia count
  const hypoCount = values.filter((v) => v < 70).length;

  // CV
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const cv = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  const problems: ProblemType[] = [];
  if (fastingValues.length > 0 && fastingAvg >= 130) problems.push(PROBLEM_TYPES.fasting_high);
  if (postMealValues.length > 0 && postMealAvg >= 180) problems.push(PROBLEM_TYPES.postmeal_high);
  if (hypoCount >= 3) problems.push(PROBLEM_TYPES.hypoglycemia);
  if (cv >= 36) problems.push(PROBLEM_TYPES.variable);
  if (problems.length === 0) problems.push(PROBLEM_TYPES.normal);

  return problems;
}

// ─── Reading stats for patient info card ───

interface ReadingStats {
  average: number;
  count: number;
  lastDate: string | null;
  fastingAvg: number;
  fastingCount: number;
  postMealAvg: number;
  postMealCount: number;
  hypoCount: number;
  tir: number;
  cv: number;
}

function computeReadingStats(readings: HealthReadingDto[]): ReadingStats | null {
  const values = readings
    .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  const variance = values.reduce((acc, v) => acc + (v - average) ** 2, 0) / values.length;
  const cv = average > 0 ? (Math.sqrt(variance) / average) * 100 : 0;

  const inRange = values.filter((v) => v >= 70 && v <= 180).length;
  const tir = (inRange / values.length) * 100;

  const fastingValues = readings
    .filter((r) => (r.metadata as Record<string, string>)?.mealTiming === 'fasting')
    .map((r) => Number(r.valueNumeric))
    .filter((v) => !isNaN(v));
  const fastingAvg = fastingValues.length > 0
    ? fastingValues.reduce((a, b) => a + b, 0) / fastingValues.length
    : 0;

  const postMealValues = readings
    .filter((r) => (r.metadata as Record<string, string>)?.mealTiming === 'after_meal')
    .map((r) => Number(r.valueNumeric))
    .filter((v) => !isNaN(v));
  const postMealAvg = postMealValues.length > 0
    ? postMealValues.reduce((a, b) => a + b, 0) / postMealValues.length
    : 0;

  const sorted = [...readings].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );

  return {
    average,
    count: values.length,
    lastDate: sorted[0]?.measuredAt || null,
    fastingAvg,
    fastingCount: fastingValues.length,
    postMealAvg,
    postMealCount: postMealValues.length,
    hypoCount: values.filter((v) => v < 70).length,
    tir,
    cv,
  };
}

// ─── Main Component ───

export default function PharmacyCoachingPage() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();

  // Data states
  const [patientName, setPatientName] = useState('');
  const [analysis, setAnalysis] = useState<CareInsightDto | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [draft, setDraft] = useState<CoachingDraftDto | null>(null);
  const [readings, setReadings] = useState<HealthReadingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [summary, setSummary] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Draft action states
  const [approvingDraft, setApprovingDraft] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);

  const loadData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');

    try {
      const [customerRes, analysisRes, sessionsRes, draftRes, readingsRes] = await Promise.all([
        pharmacyApi.getCustomerDetail(patientId).catch(() => null),
        pharmacyApi.getCareAnalysis(patientId).catch(() => null),
        pharmacyApi.getCoachingSessions(patientId).catch(() => []),
        pharmacyApi.getCoachingDraft(patientId).catch(() => null),
        pharmacyApi.getHealthReadings(patientId, { metricType: 'glucose' }).catch(() => []),
      ]);

      // Extract patient name from customer detail
      if (customerRes && 'data' in customerRes && customerRes.data) {
        setPatientName((customerRes.data as { name?: string }).name || '당뇨인');
      } else if (customerRes && 'name' in customerRes) {
        setPatientName((customerRes as { name?: string }).name || '당뇨인');
      }

      setAnalysis(analysisRes);
      setSessions(Array.isArray(sessionsRes) ? sessionsRes : []);
      setDraft(draftRes && typeof draftRes === 'object' && 'status' in draftRes && draftRes.status === 'draft' ? draftRes : null);
      setReadings(Array.isArray(readingsRes) ? readingsRes : []);
    } catch {
      setError('데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => computeReadingStats(readings), [readings]);
  const problems = useMemo(() => classifyProblems(readings), [readings]);

  // ─── Coaching actions ───

  const handleSaveCoaching = async () => {
    if (!patientId || !summary.trim()) return;
    setSaving(true);
    setSaved(false);

    try {
      await pharmacyApi.createCoachingSession({
        patientId,
        summary: summary.trim(),
        actionPlan: actionPlan.trim(),
      });
      setSaved(true);
      setSummary('');
      setActionPlan('');
      setShowForm(false);
      setTimeout(() => setSaved(false), 2500);
      // Refresh sessions
      const newSessions = await pharmacyApi.getCoachingSessions(patientId).catch(() => []);
      setSessions(Array.isArray(newSessions) ? newSessions : []);
    } catch {
      setError('코칭 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!draft || !patientId) return;
    setApprovingDraft(true);

    try {
      await pharmacyApi.approveCoachingDraft(draft.id, {
        summary: 'AI 코칭 초안 승인',
        actionPlan: draft.draftMessage,
      });
      setDraft(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      const newSessions = await pharmacyApi.getCoachingSessions(patientId).catch(() => []);
      setSessions(Array.isArray(newSessions) ? newSessions : []);
    } catch {
      setError('AI 초안 승인에 실패했습니다.');
    } finally {
      setApprovingDraft(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!draft) return;
    setDiscardingDraft(true);

    try {
      await pharmacyApi.discardCoachingDraft(draft.id);
      setDraft(null);
    } catch {
      setError('AI 초안 폐기에 실패했습니다.');
    } finally {
      setDiscardingDraft(false);
    }
  };

  const applyTemplate = (tpl: typeof COACHING_TEMPLATES[0]) => {
    setSummary(tpl.summary);
    setActionPlan(tpl.actionPlan);
    setShowForm(true);
  };

  // ─── Render ───

  if (!patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">당뇨인 정보가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <MessageSquarePlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">코칭 관리</h1>
            {patientName && (
              <p className="text-sm text-slate-500">{patientName}</p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {saved && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            코칭이 저장되었습니다.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            {/* Section 1: Patient Info */}
            <section className="mb-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{patientName || '당뇨인'}</p>
                    <p className="text-xs text-slate-400">
                      {stats?.lastDate
                        ? `최근 입력: ${new Date(stats.lastDate).toLocaleDateString('ko-KR')}`
                        : '기록 없음'}
                    </p>
                  </div>
                </div>
                {stats ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-slate-800 tabular-nums">
                        {stats.average.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-400">평균 (mg/dL)</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-slate-800 tabular-nums">{stats.count}</p>
                      <p className="text-xs text-slate-400">기록 수</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-slate-800 tabular-nums">
                        {sessions.length}
                      </p>
                      <p className="text-xs text-slate-400">코칭 횟수</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-2">혈당 기록이 없습니다.</p>
                )}
              </div>
            </section>

            {/* Section 2: Analysis Summary */}
            {stats && (
              <section className="mb-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    분석 요약
                    {analysis && (
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        analysis.riskLevel === 'high'
                          ? 'bg-red-50 text-red-600'
                          : analysis.riskLevel === 'moderate'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {analysis.riskLevel === 'high' ? '고위험' : analysis.riskLevel === 'moderate' ? '주의' : '양호'}
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <AnalysisStat
                      label="공복"
                      value={stats.fastingCount > 0 ? stats.fastingAvg.toFixed(0) : '-'}
                      color={stats.fastingCount > 0 && stats.fastingAvg >= 130 ? 'text-red-600' : 'text-slate-800'}
                    />
                    <AnalysisStat
                      label="식후"
                      value={stats.postMealCount > 0 ? stats.postMealAvg.toFixed(0) : '-'}
                      color={stats.postMealCount > 0 && stats.postMealAvg >= 180 ? 'text-red-600' : 'text-slate-800'}
                    />
                    <AnalysisStat
                      label="TIR"
                      value={`${stats.tir.toFixed(0)}%`}
                      color={stats.tir < 70 ? 'text-amber-600' : 'text-emerald-600'}
                    />
                    <AnalysisStat
                      label="저혈당"
                      value={`${stats.hypoCount}`}
                      color={stats.hypoCount >= 3 ? 'text-violet-600' : 'text-slate-800'}
                    />
                    <AnalysisStat
                      label="CV"
                      value={`${stats.cv.toFixed(0)}%`}
                      color={stats.cv >= 36 ? 'text-amber-600' : 'text-slate-800'}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Section 3: Problem Types */}
            {problems.length > 0 && (
              <section className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {problems.map((p) => (
                    <span
                      key={p.key}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${p.bgColor} ${p.color}`}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Section 4a: AI Draft */}
            {draft && (
              <section className="mb-4">
                <div className="bg-violet-50 rounded-2xl border border-violet-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <h3 className="text-sm font-semibold text-violet-700">AI 코칭 초안</h3>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap mb-4 leading-relaxed">
                    {draft.draftMessage}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApproveDraft}
                      disabled={approvingDraft}
                      className="flex-1 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {approvingDraft ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          승인 및 전송
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDiscardDraft}
                      disabled={discardingDraft}
                      className="px-4 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      폐기
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Section 4b: Templates */}
            <section className="mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                코칭 템플릿
              </h3>
              <div className="flex flex-wrap gap-2">
                {COACHING_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => applyTemplate(tpl)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSummary('');
                    setActionPlan('');
                    setShowForm(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  직접 작성
                </button>
              </div>
            </section>

            {/* Section 4c: Manual Coaching Form */}
            {showForm && (
              <section className="mb-4">
                <div className="bg-white rounded-2xl border border-blue-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <MessageSquarePlus className="w-4 h-4 text-blue-600" />
                      코칭 작성
                    </h3>
                    <button
                      onClick={() => setShowForm(false)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        코칭 메시지
                      </label>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="당뇨인에게 전달할 코칭 요약..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        실행 계획
                      </label>
                      <textarea
                        value={actionPlan}
                        onChange={(e) => setActionPlan(e.target.value)}
                        placeholder="구체적인 행동 가이드..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveCoaching}
                      disabled={saving || !summary.trim()}
                      className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          저장
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Section 5: Coaching History */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                코칭 기록 ({sessions.length}건)
              </h3>

              {sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center">
                  <FileText className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">코칭 기록이 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    위 템플릿을 선택하거나 직접 작성해 보세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">
                          {new Date(s.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mb-1">{s.summary}</p>
                      {s.actionPlan && (
                        <p className="text-xs text-slate-500 leading-relaxed">{s.actionPlan}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───

function AnalysisStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="py-1">
      <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  );
}
