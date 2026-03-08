/**
 * HomeLivePage — GlycoPharm Care Dashboard
 *
 * WO-O4O-GLYCOPHARM-HOME-DASHBOARD-REFORM-V1
 *
 * 7-Block 구조:
 * 1. Hero — GlycoPharm Care 메시지 + CTA
 * 2. PatientSummaryCards + PharmacyNewsPreview — KPI 요약 + 뉴스
 * 3. RiskPatientsSection — 주의 환자 (클릭→PatientDetail)
 * 4. PatientActivitySection — 최근 활동 피드
 * 5. AnalysisSummarySection — 약국 전체 분석 요약
 * 6. BannerSection — 광고 배너 플레이스홀더
 * 7. PartnerSlider — 파트너 로고
 *
 * 로그인 여부 무관 동일 화면. 인증 시 pharmacy-scoped 데이터.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, AlertTriangle, Star, Bell, Check, CheckCircle2 } from 'lucide-react';
import { useAuth, getAccessToken } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { publicApi, type HomePreviewData } from '@/api/public';
import { pharmacyApi, type CareDashboardSummary, type PharmacyCustomer, type RiskPatientsResponse, type TodayPriorityPatientDto, type CareAlertDto, type CareLlmInsightDto } from '@/api/pharmacy';
import {
  PatientSummaryCards,
  PharmacyNewsPreview,
  RiskPatientsSection,
  PatientActivitySection,
  AnalysisSummarySection,
  BannerSection,
  PartnerSlider,
} from '@/components/dashboard';
import type { ActivityItem } from '@/components/dashboard';

// ============================================================================
// Hero Section
// ============================================================================

function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { openLoginModal } = useLoginModal();

  return (
    <section className="relative overflow-hidden">
      <div className="h-[280px] md:h-[320px] bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 mb-4">
              <Activity className="w-3.5 h-3.5" />
              <span>혈당관리 전문 플랫폼</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              약국 중심{'\n'}환자 케어 대시보드
            </h1>
            <p className="text-lg text-white/80 mb-6">
              환자 상태 파악부터 맞춤 코칭까지
              <br className="hidden md:block" />
              한눈에 관리하는 케어 워크스페이스
            </p>
            {!isAuthenticated && (
              <button
                onClick={openLoginModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-colors shadow-lg"
              >
                시작하기
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const emptyData: HomePreviewData = {
  care: { totalPatients: 0, highRiskCount: 0, recentCoaching: 0, recentAnalysis: 0, avgTimeInRange: 0, recentChanges: [] },
  store: { monthlyOrders: 0, pendingRequests: 0, activeProducts: 0, monthlyRevenue: 0 },
};

export default function HomeLivePage() {
  const { isAuthenticated } = useAuth();
  const { openLoginModal, setOnLoginSuccess } = useLoginModal();
  const navigate = useNavigate();
  const [data, setData] = useState<HomePreviewData>(emptyData);
  const [summary, setSummary] = useState<CareDashboardSummary | null>(null);
  const [customers, setCustomers] = useState<PharmacyCustomer[]>([]);
  const [riskData, setRiskData] = useState<RiskPatientsResponse | null>(null);
  const [todayPriority, setTodayPriority] = useState<TodayPriorityPatientDto[]>([]);
  const [alerts, setAlerts] = useState<CareAlertDto[]>([]);
  const [aiInsight, setAiInsight] = useState<CareLlmInsightDto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const [homeResult, summaryResult, customersResult, riskResult, todayPriorityResult, alertsResult] = await Promise.all([
        publicApi.getHomePreview(token),
        isAuthenticated
          ? pharmacyApi.getCareDashboardSummary().catch(() => null)
          : Promise.resolve(null),
        isAuthenticated
          ? pharmacyApi.getCustomers({ pageSize: 100 }).catch(() => null)
          : Promise.resolve(null),
        isAuthenticated
          ? pharmacyApi.getRiskPatients().catch(() => null)
          : Promise.resolve(null),
        isAuthenticated
          ? pharmacyApi.getTodayPriorityPatients().catch(() => [] as TodayPriorityPatientDto[])
          : Promise.resolve([] as TodayPriorityPatientDto[]),
        isAuthenticated
          ? pharmacyApi.getCareAlerts().catch(() => [] as CareAlertDto[])
          : Promise.resolve([] as CareAlertDto[]),
      ]);
      setData(homeResult);
      setSummary(summaryResult);
      if (customersResult?.success && customersResult.data) {
        setCustomers(customersResult.data.items || []);
      }
      setRiskData(riskResult);
      setTodayPriority(todayPriorityResult);
      setAlerts(alertsResult);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch AI insight for the top priority patient
  useEffect(() => {
    if (todayPriority.length > 0 && isAuthenticated) {
      pharmacyApi.getCareLlmInsight(todayPriority[0].patientId)
        .then(setAiInsight)
        .catch(() => setAiInsight(null));
    }
  }, [todayPriority, isAuthenticated]);

  const handleFeatureClick = (targetPath: string) => {
    if (isAuthenticated) {
      navigate(targetPath);
    } else {
      setOnLoginSuccess(() => navigate(targetPath));
      openLoginModal();
    }
  };

  const handleAckAlert = async (alertId: string) => {
    await pharmacyApi.acknowledgeCareAlert(alertId);
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status: 'acknowledged' as const } : a));
  };

  const handleResolveAlert = async (alertId: string) => {
    await pharmacyApi.resolveCareAlert(alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  // Derive activity items from snapshots
  const activities = useMemo<ActivityItem[]>(() => {
    if (!summary?.recentSnapshots) return [];
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    return summary.recentSnapshots.slice(0, 5).map((s, i) => {
      const name = customerMap.get(s.patientId)?.name || '환자';
      const riskLabel = s.riskLevel === 'high' ? '고위험' : s.riskLevel === 'moderate' ? '주의' : '양호';
      return {
        id: `snap-${i}`,
        type: 'reading' as const,
        patientName: name,
        description: `${name}님 분석 완료 (${riskLabel})`,
        timestamp: s.createdAt,
      };
    });
  }, [summary, customers]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Block 1: Hero */}
      <HeroSection isAuthenticated={isAuthenticated} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          {/* Block 2: PatientSummaryCards + PharmacyNewsPreview */}
          <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <PatientSummaryCards
                  totalPatients={data.care.totalPatients}
                  totalPatientsStatus={data.care.totalPatientsStatus}
                  todayReadings={data.care.recentAnalysis}
                  todayReadingsStatus={data.care.recentAnalysisStatus}
                  cautionPatients={data.care.highRiskCount}
                  cautionPatientsStatus={data.care.highRiskCountStatus}
                  carePatients={data.care.recentCoaching}
                  carePatientsStatus={data.care.recentCoachingStatus}
                />
              </div>
              <div>
                <PharmacyNewsPreview />
              </div>
            </div>
          </section>

          {/* Today's Priority Patients — WO-O4O-CARE-TODAY-PRIORITY-PATIENTS-V1 */}
          {todayPriority.length > 0 && (
            <section className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-slate-800">오늘 먼저 봐야 할 환자</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {todayPriority.map((p) => {
                  const riskBadge =
                    p.riskLevel === 'high'
                      ? 'bg-red-100 text-red-700'
                      : p.riskLevel === 'moderate'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700';
                  const riskLabel =
                    p.riskLevel === 'high' ? '고위험' : p.riskLevel === 'moderate' ? '주의' : '양호';
                  const scoreColor =
                    p.priorityScore >= 40
                      ? 'bg-red-100 text-red-700'
                      : p.priorityScore >= 20
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700';

                  return (
                    <div
                      key={p.patientId}
                      onClick={() => handleFeatureClick(`/care/patients/${p.patientId}`)}
                      className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] font-medium">
                              {p.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {p.name}
                          </span>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${scoreColor}`}>
                          {p.priorityScore}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${riskBadge}`}>
                          {riskLabel}
                        </span>
                        {p.alertCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {p.alertCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Active Alerts — WO-O4O-CARE-ALERT-ENGINE-V1 */}
          {alerts.length > 0 && (
            <section className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-slate-800">활성 알림</h2>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {alerts.length}
                </span>
              </div>
              <div className="space-y-2">
                {alerts.map((alert) => {
                  const severityStyle =
                    alert.severity === 'critical'
                      ? 'border-red-200 bg-red-50'
                      : alert.severity === 'warning'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-blue-200 bg-blue-50';
                  const severityBadge =
                    alert.severity === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : alert.severity === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700';
                  const severityLabel =
                    alert.severity === 'critical' ? '긴급' : alert.severity === 'warning' ? '주의' : '정보';

                  return (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between rounded-xl border p-3 ${severityStyle}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${severityBadge}`}>
                          {severityLabel}
                        </span>
                        <span className="text-sm text-slate-700 truncate">{alert.message}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {alert.status === 'open' && (
                          <button
                            onClick={() => handleAckAlert(alert.id)}
                            className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 hover:text-slate-700 transition-colors"
                            title="확인"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 hover:text-green-600 transition-colors"
                          title="해결"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Block 3: Risk Patients (WO-O4O-CARE-RISK-PATIENT-DETECTION-V1) */}
          <RiskPatientsSection
            highRisk={riskData?.highRisk}
            caution={riskData?.caution}
            onPatientClick={(id) => handleFeatureClick(`/care/patients/${id}`)}
          />

          {/* Block 4: Patient Activity */}
          <PatientActivitySection activities={activities} />

          {/* Block 5: Analysis Summary */}
          <AnalysisSummarySection
            avgTimeInRange={data.care.avgTimeInRange ?? 0}
            avgTimeInRangeStatus={data.care.avgTimeInRangeStatus}
            highRiskCount={summary?.highRiskCount ?? data.care.highRiskCount}
            moderateRiskCount={summary?.moderateRiskCount ?? 0}
            lowRiskCount={summary?.lowRiskCount ?? 0}
            totalPatients={data.care.totalPatients}
          />

          {/* AI Insight — WO-O4O-CARE-LLM-INSIGHT-V1 */}
          {aiInsight?.pharmacyInsight && todayPriority.length > 0 && (
            <section className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-indigo-900">AI 인사이트</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  {aiInsight.pharmacyInsight}
                </p>
                <button
                  onClick={() => handleFeatureClick(`/care/patients/${todayPriority[0].patientId}`)}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {todayPriority[0].name}님 상세 보기
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>
          )}

          {/* Block 6: Banner */}
          <BannerSection />

          {/* Block 7: Partner Slider */}
          <PartnerSlider />
        </>
      )}
    </div>
  );
}
