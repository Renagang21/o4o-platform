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
import { Activity, ArrowRight } from 'lucide-react';
import { useAuth, getAccessToken } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { publicApi, type HomePreviewData } from '@/api/public';
import { pharmacyApi, type CareDashboardSummary, type PharmacyCustomer } from '@/api/pharmacy';
import {
  PatientSummaryCards,
  PharmacyNewsPreview,
  RiskPatientsSection,
  PatientActivitySection,
  AnalysisSummarySection,
  BannerSection,
  PartnerSlider,
} from '@/components/dashboard';
import type { RiskPatient, ActivityItem } from '@/components/dashboard';

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
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const [homeResult, summaryResult, customersResult] = await Promise.all([
        publicApi.getHomePreview(token),
        isAuthenticated
          ? pharmacyApi.getCareDashboardSummary().catch(() => null)
          : Promise.resolve(null),
        isAuthenticated
          ? pharmacyApi.getCustomers({ pageSize: 100 }).catch(() => null)
          : Promise.resolve(null),
      ]);
      setData(homeResult);
      setSummary(summaryResult);
      if (customersResult?.success && customersResult.data) {
        setCustomers(customersResult.data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFeatureClick = (targetPath: string) => {
    if (isAuthenticated) {
      navigate(targetPath);
    } else {
      setOnLoginSuccess(() => navigate(targetPath));
      openLoginModal();
    }
  };

  // Derive risk patients from snapshots + customer names
  const riskPatients = useMemo<RiskPatient[]>(() => {
    if (!summary?.recentSnapshots) return [];
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    return summary.recentSnapshots
      .filter((s) => s.riskLevel === 'high' || s.riskLevel === 'moderate')
      .map((s) => {
        const customer = customerMap.get(s.patientId);
        return {
          patientId: s.patientId,
          patientName: customer?.name || '환자',
          phone: customer?.phone,
          riskLevel: s.riskLevel as 'high' | 'moderate',
          lastAnalysisDate: s.createdAt,
        };
      });
  }, [summary, customers]);

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

          {/* Block 3: Risk Patients */}
          <RiskPatientsSection
            patients={riskPatients}
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

          {/* Block 6: Banner */}
          <BannerSection />

          {/* Block 7: Partner Slider */}
          <PartnerSlider />
        </>
      )}
    </div>
  );
}
