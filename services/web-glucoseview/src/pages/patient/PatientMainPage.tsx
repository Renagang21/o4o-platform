/**
 * PatientMainPage — 당뇨인 대시보드
 * WO-GLUCOSEVIEW-PATIENT-MOBILE-UX-V1
 *
 * 모바일 중심 대시보드:
 * - 빠른 혈당 입력 CTA
 * - 오늘 혈당 요약
 * - 최근 기록
 * - 약사 코칭 메시지
 * - 퀵 메뉴 (2×2)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Plus,
  ChevronRight,
  Building2,
  Calendar,
  BookOpen,
  Sparkles,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Lightbulb,
  LogOut,
} from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { GlucoseReading, PatientCoachingRecord, MyLinkStatus, AiInsight } from '@/api/patient';
import { extractMetadata } from '@/utils/extract-metadata';

import { MEAL_TIMING_LABELS } from '@/constants/meal-timing';

const QUICK_MENU = [
  { label: '약국 연결', path: '/patient/select-pharmacy', icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' },
  { label: '상담 예약', path: '/patient/appointments', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: '케어 가이드', path: '/patient/care-guideline', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
] as const;

export default function PatientMainPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [latestCoaching, setLatestCoaching] = useState<PatientCoachingRecord | null>(null);
  const [linkStatus, setLinkStatus] = useState<MyLinkStatus | null>(null);
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [readingsRes, coachingRes, statusRes, insightRes] = await Promise.all([
          patientApi.getGlucoseReadings({ metricType: 'glucose' }),
          patientApi.getMyCoaching(),
          patientApi.getMyLinkStatus().catch(() => ({ data: { linked: false } as MyLinkStatus })),
          patientApi.getAiInsight().catch(() => ({ success: false, data: undefined })),
        ]);

        if (readingsRes.success && readingsRes.data) {
          setReadings(Array.isArray(readingsRes.data) ? readingsRes.data : []);
        }
        if (coachingRes.success && coachingRes.data) {
          const list = Array.isArray(coachingRes.data) ? coachingRes.data : [];
          setLatestCoaching(list.length > 0 ? list[0] : null);
        }
        setLinkStatus(statusRes?.data || { linked: false });
        if (insightRes.success && insightRes.data) {
          setAiInsight(insightRes.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 오늘 기록 필터
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayReadings = readings.filter(
    (r) => new Date(r.measuredAt) >= todayStart,
  );
  const latestReading = readings.length > 0 ? readings[0] : null;

  const formatDate = () => {
    const d = new Date();
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="bg-white px-4 py-6">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <button
                onClick={() => navigate('/patient/profile')}
                className="text-lg font-bold text-slate-800 hover:text-teal-600 transition-colors cursor-pointer"
              >
                {(user?.lastName && user?.firstName) ? `${user.lastName}${user.firstName}` : user?.name || user?.email || '당뇨인'}님
              </button>
              <p className="text-xs text-slate-400">{formatDate()}</p>
            </div>
          </div>
        </div>

        {/* Quick Glucose Input CTA */}
        <button
          onClick={() => navigate('/patient/glucose-input')}
          className="w-full py-4 bg-teal-600 text-white text-lg font-semibold rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 mb-6 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          데이터 기록하기
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pharmacy Link Status Card */}
            {linkStatus?.linked ? (
              <section className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800 truncate">
                    {linkStatus.pharmacyName}
                  </p>
                  <p className="text-xs text-emerald-600">연결됨</p>
                </div>
                <button
                  onClick={() => navigate('/patient/pharmacist-coaching')}
                  className="text-xs text-emerald-600 font-medium flex items-center gap-0.5 flex-shrink-0"
                >
                  코칭
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </section>
            ) : linkStatus?.pendingRequest ? (
              <section className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 truncate">
                    {linkStatus.pendingRequest.pharmacyName}
                  </p>
                  <p className="text-xs text-amber-600">승인 대기 중</p>
                </div>
              </section>
            ) : (
              <section
                onClick={() => navigate('/patient/select-pharmacy')}
                className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">약국 연결하기</p>
                  <p className="text-xs text-slate-400">전문 약사 코칭을 받을 수 있습니다</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </section>
            )}

            {/* Today's Glucose Card */}
            <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 mb-3">오늘의 혈당</h2>
              {todayReadings.length > 0 ? (
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-slate-800 tabular-nums">
                      {latestReading?.valueNumeric != null
                        ? Number(latestReading.valueNumeric).toFixed(0)
                        : '-'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">mg/dL</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">
                      {MEAL_TIMING_LABELS[(latestReading?.metadata as Record<string, string>)?.mealTiming] || ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      오늘 {todayReadings.length}회 기록
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400">오늘 아직 기록이 없습니다</p>
                  <p className="text-xs text-slate-300 mt-1">위 버튼을 눌러 혈당을 기록하세요</p>
                </div>
              )}
            </section>

            {/* Recent Records Card */}
            <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-500">최근 기록</h2>
                <button
                  onClick={() => navigate('/patient/data-analysis')}
                  className="text-xs text-teal-600 font-medium flex items-center gap-0.5"
                >
                  분석 보기
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {readings.length > 0 ? (
                <div className="space-y-2">
                  {readings.slice(0, 5).map((r) => {
                    const meta = extractMetadata(r.metadata);
                    const hasExtra = !!(meta.medication?.name || meta.exercise?.type || (meta.symptoms && meta.symptoms.items.length > 0));
                    return (
                      <div
                        key={r.id}
                        className="flex items-start justify-between py-2 border-b border-slate-100 last:border-b-0 gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400">
                            {new Date(r.measuredAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-xs text-slate-300">
                            {MEAL_TIMING_LABELS[meta.mealTiming || ''] || ''}
                          </p>
                          {hasExtra && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {meta.medication?.name && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600">
                                  투약 {meta.medication.name}
                                </span>
                              )}
                              {meta.exercise?.type && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-50 text-green-600">
                                  운동 {meta.exercise.type}
                                </span>
                              )}
                              {meta.symptoms && meta.symptoms.items.length > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-700">
                                  증상 {meta.symptoms.items.length}건
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-lg font-bold text-slate-800 tabular-nums flex-shrink-0">
                          {r.valueNumeric != null ? Number(r.valueNumeric).toFixed(0) : '-'}
                          <span className="text-xs font-normal text-slate-400 ml-0.5">mg/dL</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">아직 기록이 없습니다</p>
              )}
            </section>

            {/* AI Insight Card */}
            <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-violet-600">AI 인사이트</h2>
              </div>
              {aiInsight?.summary ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {aiInsight.summary}
                  </p>
                  {aiInsight.warning && (
                    <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">{aiInsight.warning}</p>
                    </div>
                  )}
                  {aiInsight.tip && (
                    <div className="flex items-start gap-2 bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
                      <Lightbulb className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-700">{aiInsight.tip}</p>
                    </div>
                  )}
                  {aiInsight.generatedAt && (
                    <p className="text-[10px] text-violet-400 text-right">
                      {new Date(aiInsight.generatedAt).toLocaleString('ko-KR', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })} 기준
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-violet-400">
                  데이터가 충분하면 AI 인사이트가 제공됩니다.
                </p>
              )}
            </section>

            {/* Pharmacist Coaching Card */}
            <section className="rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-violet-500" />
                  <h2 className="text-sm font-semibold text-slate-500">약사 코칭</h2>
                </div>
                {latestCoaching && (
                  <button
                    onClick={() => navigate('/patient/pharmacist-coaching')}
                    className="text-xs text-violet-600 font-medium flex items-center gap-0.5"
                  >
                    자세히 보기
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {latestCoaching ? (
                <div>
                  <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                    {latestCoaching.summary}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {latestCoaching.pharmacistName || '약사'} ·{' '}
                    {new Date(latestCoaching.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-2">
                  아직 약사 코칭이 없습니다
                </p>
              )}
            </section>

            {/* Quick Menu */}
            <section>
              <div className="grid grid-cols-3 gap-3">
                {QUICK_MENU.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Logout */}
            <div className="text-center pt-4">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
