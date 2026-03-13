/**
 * PharmacistPatientDetailPage — 약사 환자 상세
 * WO-GLYCOPHARM-PHARMACIST-PATIENT-DETAIL-SCREEN-V1
 *
 * 환자 기본 정보 + 혈당 상태 + 최근 기록 + 기능 버튼.
 * 기존 pharmacyApi 100% 재사용.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Activity,
  BarChart3,
  MessageSquarePlus,
  FileText,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import type {
  CoachingSession,
  HealthReadingDto,
} from '@/api/pharmacy';
import { calculateRisk, RISK_CONFIG } from '@/utils/riskScore';

// ─── Helpers ───

const MEAL_LABELS: Record<string, string> = {
  fasting: '공복',
  before_meal: '식전',
  after_meal: '식후',
  bedtime: '취침 전',
  random: '기타',
};

interface GlucoseStats {
  average: number;
  fastingAvg: number;
  fastingCount: number;
  postMealAvg: number;
  postMealCount: number;
  hypoCount: number;
  count: number;
  lastDate: string | null;
}

function computeStats(readings: HealthReadingDto[]): GlucoseStats | null {
  const values = readings
    .map((r) => (r.valueNumeric != null ? Number(r.valueNumeric) : NaN))
    .filter((v) => !isNaN(v));
  if (values.length === 0) return null;

  const average = values.reduce((a, b) => a + b, 0) / values.length;

  const fasting = readings
    .filter((r) => (r.metadata as Record<string, string>)?.mealTiming === 'fasting')
    .map((r) => Number(r.valueNumeric))
    .filter((v) => !isNaN(v));
  const fastingAvg = fasting.length > 0 ? fasting.reduce((a, b) => a + b, 0) / fasting.length : 0;

  const postMeal = readings
    .filter((r) => (r.metadata as Record<string, string>)?.mealTiming === 'after_meal')
    .map((r) => Number(r.valueNumeric))
    .filter((v) => !isNaN(v));
  const postMealAvg = postMeal.length > 0 ? postMeal.reduce((a, b) => a + b, 0) / postMeal.length : 0;

  const sorted = [...readings].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );

  return {
    average,
    fastingAvg,
    fastingCount: fasting.length,
    postMealAvg,
    postMealCount: postMeal.length,
    hypoCount: values.filter((v) => v < 70).length,
    count: values.length,
    lastDate: sorted[0]?.measuredAt || null,
  };
}

// ─── Main Component ───

export default function PharmacistPatientDetailPage() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();

  const [patientName, setPatientName] = useState('');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [readings, setReadings] = useState<HealthReadingDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [customerRes, sessionsRes, readingsRes] = await Promise.all([
        pharmacyApi.getCustomerDetail(patientId).catch(() => null),
        pharmacyApi.getCoachingSessions(patientId).catch(() => []),
        pharmacyApi.getHealthReadings(patientId, { metricType: 'glucose' }).catch(() => []),
      ]);

      if (customerRes && 'data' in customerRes && customerRes.data) {
        const d = customerRes.data as { name?: string; createdAt?: string };
        setPatientName(d.name || '환자');
        setCreatedAt(d.createdAt || null);
      } else if (customerRes && 'name' in customerRes) {
        const d = customerRes as { name?: string; createdAt?: string };
        setPatientName(d.name || '환자');
        setCreatedAt(d.createdAt || null);
      }

      setSessions(Array.isArray(sessionsRes) ? sessionsRes : []);
      setReadings(Array.isArray(readingsRes) ? readingsRes : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => computeStats(readings), [readings]);

  const recentReadings = useMemo(
    () =>
      [...readings]
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        .slice(0, 10),
    [readings],
  );

  // WO-GLYCOPHARM-PATIENT-RISK-SCORE-V1: client-side risk calculation
  const riskResult = useMemo(() => calculateRisk(readings), [readings]);
  const riskCfg = riskResult.readingCount > 0
    ? RISK_CONFIG[riskResult.level]
    : null;

  if (!patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">환자 정보가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/pharmacist/patients')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          환자 목록
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            {/* Section 1: Patient Info */}
            <section className="mb-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold text-slate-800">{patientName}</h1>
                      {riskCfg && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskCfg.bgColor} ${riskCfg.color}`}>
                          {riskCfg.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {createdAt
                        ? `관리 시작: ${new Date(createdAt).toLocaleDateString('ko-KR')}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-slate-800 tabular-nums">
                      {stats?.count ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">총 기록</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-slate-800 tabular-nums">
                      {sessions.length}
                    </p>
                    <p className="text-xs text-slate-400">코칭</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2">
                    <p className="text-xs text-slate-600">
                      {stats?.lastDate
                        ? new Date(stats.lastDate).toLocaleDateString('ko-KR')
                        : '-'}
                    </p>
                    <p className="text-xs text-slate-400">최근 기록</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Glucose Status */}
            {stats && (
              <section className="mb-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    최근 혈당 상태
                  </h3>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <StatCell
                      label="평균"
                      value={stats.average.toFixed(0)}
                      color={stats.average >= 180 ? 'text-red-600' : stats.average >= 140 ? 'text-amber-600' : 'text-slate-800'}
                    />
                    <StatCell
                      label="공복"
                      value={stats.fastingCount > 0 ? stats.fastingAvg.toFixed(0) : '-'}
                      color={stats.fastingCount > 0 && stats.fastingAvg >= 130 ? 'text-red-600' : 'text-slate-800'}
                    />
                    <StatCell
                      label="식후"
                      value={stats.postMealCount > 0 ? stats.postMealAvg.toFixed(0) : '-'}
                      color={stats.postMealCount > 0 && stats.postMealAvg >= 180 ? 'text-red-600' : 'text-slate-800'}
                    />
                    <StatCell
                      label="저혈당"
                      value={`${stats.hypoCount}`}
                      color={stats.hypoCount >= 3 ? 'text-violet-600' : 'text-slate-800'}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Section 3: Action Buttons */}
            <section className="mb-4 space-y-2">
              <ActionButton
                icon={<BarChart3 className="w-5 h-5 text-emerald-600" />}
                label="데이터 분석 보기"
                description="혈당 추이와 통계 확인"
                onClick={() => navigate(`/care/patients/${patientId}/analysis`)}
              />
              <ActionButton
                icon={<MessageSquarePlus className="w-5 h-5 text-blue-600" />}
                label="코칭 작성"
                description="환자에게 코칭 메시지 전달"
                onClick={() => navigate(`/pharmacist/coaching/${patientId}`)}
              />
              <ActionButton
                icon={<FileText className="w-5 h-5 text-violet-600" />}
                label="코칭 기록 보기"
                description={sessions.length > 0 ? `${sessions.length}건의 코칭 기록` : '코칭 기록 없음'}
                onClick={() => navigate(`/pharmacist/coaching/${patientId}`)}
              />
              <ActionButton
                icon={<Calendar className="w-5 h-5 text-orange-600" />}
                label="예약 관리"
                description="환자 상담 예약 확인 및 관리"
                onClick={() => navigate('/pharmacist/appointments')}
              />
            </section>

            {/* Section 4: Recent Readings */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                최근 혈당 기록 ({recentReadings.length}건)
              </h3>

              {recentReadings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                  <p className="text-sm text-slate-400">혈당 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentReadings.map((r) => {
                    const val = r.valueNumeric != null ? Number(r.valueNumeric) : null;
                    const mealTiming = (r.metadata as Record<string, string>)?.mealTiming || '';
                    const isOutOfRange = val != null && (val < 70 || val > 180);

                    return (
                      <div
                        key={r.id}
                        className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm text-slate-600">
                            {new Date(r.measuredAt).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {MEAL_LABELS[mealTiming] || mealTiming || '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold tabular-nums ${isOutOfRange ? 'text-red-600' : 'text-slate-800'}`}>
                            {val != null ? val.toFixed(0) : '-'}
                          </p>
                          <p className="text-xs text-slate-400">{r.unit}</p>
                        </div>
                      </div>
                    );
                  })}
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

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </button>
  );
}
