/**
 * HomeLivePage — GlycoPharm 홈 (Live Preview)
 *
 * WO-HOME-LIVE-PREVIEW-V1
 *
 * 5-Block 구조:
 * 1. Hero — GlycoPharm Care 메시지 + CTA
 * 2. Care Snapshot — 4 KPI 카드
 * 3. Recent Changes — 익명 TIR/CV 변화 (3건)
 * 4. Store Snapshot — 4 KPI 카드
 * 5. Feature Cards — 기능 접근 (로그인 유도 포함)
 *
 * 로그인 여부 무관 동일 화면. 인증 시 pharmacy-scoped 데이터.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Users,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Store,
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { useAuth, getAccessToken } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { publicApi, type HomePreviewData, type MetricStatus } from '@/api/public';

// ============================================================================
// Hero Section
// ============================================================================

function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { openLoginModal } = useLoginModal();

  return (
    <section className="relative overflow-hidden">
      <div className="h-[320px] md:h-[360px] bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 mb-4">
              <Activity className="w-3.5 h-3.5" />
              <span>혈당관리 전문 플랫폼</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              약국 중심{'\n'}환자 데이터 관리
            </h1>
            <p className="text-lg text-white/80 mb-6">
              환자 등록부터 CGM 데이터 분석, 맞춤 코칭까지
              <br className="hidden md:block" />
              O4O 기반 약국 경쟁력 강화 플랫폼
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
// KPI Card
// ============================================================================

function KpiCard({ icon: Icon, label, value, unit, status }: {
  icon: typeof Users;
  label: string;
  value: number;
  unit?: string;
  status?: MetricStatus;
}) {
  const isTableMissing = status === 'TABLE_MISSING';
  const isZero = status === 'ZERO';
  const formatted = unit === '원'
    ? value.toLocaleString()
    : String(value);

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border ${
      isTableMissing ? 'border-dashed border-slate-300' : 'border-slate-100'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isTableMissing ? 'bg-slate-100' : 'bg-primary-50'
        }`}>
          <Icon className={`w-5 h-5 ${isTableMissing ? 'text-slate-400' : 'text-primary-600'}`} />
        </div>
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        {isTableMissing && (
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">준비 중</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        {isTableMissing ? (
          <span className="text-lg text-slate-300">--</span>
        ) : (
          <span className={`text-2xl font-bold ${isZero ? 'text-slate-300' : 'text-slate-800'}`}>{formatted}</span>
        )}
        {unit && !isTableMissing && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {isZero && !isTableMissing && (
        <p className="text-[10px] text-slate-400 mt-1">데이터 없음</p>
      )}
    </div>
  );
}

// ============================================================================
// Care Snapshot Section
// ============================================================================

function CareSnapshotSection({ care }: { care: HomePreviewData['care'] }) {
  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800">Care 운영 현황</h2>
        <p className="text-xs text-slate-500 mt-1">환자 관리 및 분석 현황</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="총 환자 수" value={care.totalPatients} unit="명" status={care.totalPatientsStatus} />
        <KpiCard icon={AlertTriangle} label="고위험 환자" value={care.highRiskCount} unit="명" status={care.highRiskCountStatus} />
        <KpiCard icon={MessageSquare} label="최근 7일 상담" value={care.recentCoaching} unit="건" status={care.recentCoachingStatus} />
        <KpiCard icon={BarChart3} label="최근 분석 완료" value={care.recentAnalysis} unit="건" status={care.recentAnalysisStatus} />
      </div>
    </section>
  );
}

// ============================================================================
// CGM Analysis Card Section
// ============================================================================

function CgmAnalysisSection({
  care,
  onNavigate,
}: {
  care: HomePreviewData['care'];
  onNavigate: (path: string) => void;
}) {
  const avgTir = care.avgTimeInRange ?? 0;
  const tirStatus = care.avgTimeInRangeStatus;
  const isTableMissing = tirStatus === 'TABLE_MISSING';

  // TIR quality color
  const tirColor = isTableMissing
    ? 'text-slate-300'
    : avgTir >= 70
      ? 'text-emerald-600'
      : avgTir >= 50
        ? 'text-amber-600'
        : avgTir > 0
          ? 'text-red-600'
          : 'text-slate-300';

  return (
    <section className="pb-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-6 border border-primary-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-600" />
              CGM 데이터 분석
            </h3>
            <p className="text-xs text-slate-500 mt-1">연속혈당측정 기반 환자 분석 현황</p>
          </div>
          <button
            onClick={() => onNavigate('/care/analysis')}
            className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
          >
            분석 보기
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* 최근 7일 분석 환자 수 */}
          <div className="bg-white/70 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">최근 7일 분석</p>
            {isTableMissing ? (
              <p className="text-lg text-slate-300">--</p>
            ) : (
              <p className={`text-xl font-bold ${care.recentAnalysis > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                {care.recentAnalysis}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
              </p>
            )}
          </div>

          {/* 평균 Time-in-Range */}
          <div className="bg-white/70 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">평균 TIR</p>
            {isTableMissing ? (
              <p className="text-lg text-slate-300">--</p>
            ) : (
              <p className={`text-xl font-bold ${tirColor}`}>
                {avgTir > 0 ? `${avgTir}` : '0'}<span className="text-sm font-normal text-slate-400 ml-1">%</span>
              </p>
            )}
          </div>

          {/* 고위험 패턴 감지 */}
          <div className="bg-white/70 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">고위험 패턴</p>
            {isTableMissing ? (
              <p className="text-lg text-slate-300">--</p>
            ) : (
              <p className={`text-xl font-bold ${care.highRiskCount > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                {care.highRiskCount}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Recent Changes Section
// ============================================================================

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
  if (trend === 'worsening') return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function trendLabel(trend: string): string {
  if (trend === 'improving') return '개선';
  if (trend === 'worsening') return '악화';
  return '유지';
}

function trendColor(trend: string): string {
  if (trend === 'improving') return 'text-emerald-600 bg-emerald-50';
  if (trend === 'worsening') return 'text-red-600 bg-red-50';
  return 'text-slate-600 bg-slate-50';
}

function RecentChangesSection({ changes }: { changes: HomePreviewData['care']['recentChanges'] }) {
  if (changes.length === 0) return null;

  return (
    <section className="pb-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">최근 환자 변화</h3>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {changes.map((change, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
            <TrendIcon trend={change.riskTrend} />
            <div className="flex-1">
              {change.tirChange !== undefined && (
                <p className="text-sm text-slate-700">
                  TIR <span className="font-semibold">{change.tirChange > 0 ? '+' : ''}{change.tirChange}%</span>
                </p>
              )}
              {change.cvChange !== undefined && (
                <p className="text-xs text-slate-500">
                  CV {change.cvChange > 0 ? '+' : ''}{change.cvChange}%
                </p>
              )}
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${trendColor(change.riskTrend)}`}>
              {trendLabel(change.riskTrend)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Store Snapshot Section
// ============================================================================

function StoreSnapshotSection({ store }: { store: HomePreviewData['store'] }) {
  return (
    <section className="py-10 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800">약국 운영 현황</h2>
          <p className="text-xs text-slate-500 mt-1">매장 운영 및 매출 현황</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={ShoppingCart} label="이번달 주문" value={store.monthlyOrders} unit="건" status={store.monthlyOrdersStatus} />
          <KpiCard icon={Package} label="승인 대기" value={store.pendingRequests} unit="건" status={store.pendingRequestsStatus} />
          <KpiCard icon={Store} label="활성 상품" value={store.activeProducts} unit="개" status={store.activeProductsStatus} />
          <KpiCard icon={TrendingUp} label="이번달 매출" value={store.monthlyRevenue} unit="원" status={store.monthlyRevenueStatus} />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Feature Cards Section
// ============================================================================

const featureCards = [
  { label: '환자 관리', icon: Users, path: '/care/patients', description: '환자 등록·관리, CGM 데이터 분석' },
  { label: '분석', icon: BarChart3, path: '/care/analysis', description: 'TIR, CV, 리스크 평가' },
  { label: '상담', icon: MessageSquare, path: '/care/coaching', description: '맞춤 코칭·상담 기록' },
  { label: '약국 관리', icon: Store, path: '/store', description: '상품, 주문, 매출 관리' },
];

function FeatureCardsSection({ onFeatureClick }: { onFeatureClick: (path: string) => void }) {
  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800">주요 기능</h2>
        <p className="text-xs text-slate-500 mt-1">클릭하여 바로 이용하세요</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.path}
              onClick={() => onFeatureClick(card.path)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-primary-200 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                <Icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1 text-sm">{card.label}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
            </button>
          );
        })}
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
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const result = await publicApi.getHomePreview(token);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드 + 인증 상태 변경 시 재로드
  useEffect(() => {
    loadData();
  }, [loadData, isAuthenticated]);

  const handleFeatureClick = (targetPath: string) => {
    if (isAuthenticated) {
      navigate(targetPath);
    } else {
      setOnLoginSuccess(() => navigate(targetPath));
      openLoginModal();
    }
  };

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
          {/* Block 2: Care Snapshot */}
          <CareSnapshotSection care={data.care} />

          {/* Block 2.5: CGM Analysis Card */}
          <CgmAnalysisSection care={data.care} onNavigate={handleFeatureClick} />

          {/* Block 3: Recent Changes */}
          <RecentChangesSection changes={data.care.recentChanges} />

          {/* Block 4: Store Snapshot */}
          <StoreSnapshotSection store={data.store} />
        </>
      )}

      {/* Block 5: Feature Cards (항상 표시) */}
      <FeatureCardsSection onFeatureClick={handleFeatureClick} />
    </div>
  );
}
