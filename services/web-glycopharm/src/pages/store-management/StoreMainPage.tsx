/**
 * StoreMainPage — AI Copilot Dashboard
 *
 * WO-O4O-STORE-COPILOT-DASHBOARD-V1
 *
 * 8-block Copilot 구조:
 * 1. 매장 KPI 요약 (orders/revenue)
 * 2. AI 요약 (LLM 인사이트)
 * 3. 매장 활동 (today actions)
 * 4. 상품 성과 (product snapshots)
 * 5. AI 매장 분석 (LLM issues)
 * 6. 상품 AI 분석 (product insight)
 * 7. AI 추천 상품 (recommendations)
 * 8. 추천 행동 (AI actions + nav)
 */

import { useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Settings,
  Loader2,
  AlertCircle,
  LogIn,
  ArrowLeft,
  ArrowRight,
  Tv,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Activity,
  BarChart3,
  Zap,
  Truck,
  Tag,
  FileText,
  DollarSign,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import type {
  StoreAiSummaryData,
  ProductAiInsightData,
  RecommendedProductData,
  KpiSummaryData,
  TodayActions,
  ProductSnapshotData,
} from '@/api/pharmacy';
import { logStoreAction } from '@/utils/store-action-log';

// ─── 주요 바로가기 (KPA StoreHomePage 3×2 그리드 패턴) ────
const QUICK_ACTIONS = [
  { label: 'B2B 주문', icon: Truck, desc: '공급사 상품 주문 확인', path: '/store/b2b-order', color: '#059669' },
  { label: 'Market Trial', icon: Tag, desc: '마켓트라이얼 관리', path: '/store/market-trial', color: '#0d9488' },
  { label: '상품 관리', icon: Package, desc: '상품 목록 및 등록', path: '/store/products', color: '#7c3aed' },
  { label: '사이니지', icon: Tv, desc: '디지털 디스플레이 관리', path: '/store/signage', color: '#2563eb' },
  { label: '콘텐츠', icon: FileText, desc: '콘텐츠 가져오기', path: '/store/content', color: '#ec4899' },
  { label: '설정', icon: Settings, desc: '약국 설정 관리', path: '/store/settings', color: '#64748b' },
];

// ─── Block 8: Quick Link 정의 ───────────────────────────
const QUICK_LINKS = [
  { label: '상품 관리', icon: Package, path: '/store/products' },
  { label: '주문 확인', icon: ShoppingCart, path: '/store/orders' },
  { label: '콘텐츠 관리', icon: Tv, path: '/store/content' },
  { label: '매장 설정', icon: Settings, path: '/store/settings' },
];

/** Action 텍스트에서 네비게이션 경로 추론 */
function inferActionPath(label: string): string | null {
  const lower = label.toLowerCase();
  if (lower.includes('상품') || lower.includes('product')) return '/store/products';
  if (lower.includes('주문') || lower.includes('order')) return '/store/orders';
  if (lower.includes('콘텐츠') || lower.includes('content')) return '/store/content';
  if (lower.includes('설정') || lower.includes('setting')) return '/store/settings';
  return null;
}

export default function StoreMainPage() {
  const navigate = useNavigate();

  // Block 1: KPI
  const [kpiSummary, setKpiSummary] = useState<KpiSummaryData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  // Block 2+5: AI Summary
  const [llmSummary, setLlmSummary] = useState<StoreAiSummaryData | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  // Block 3: Today Actions
  const [todayActions, setTodayActions] = useState<TodayActions | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  // Block 4: Product Snapshots
  const [productSnapshots, setProductSnapshots] = useState<ProductSnapshotData[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  // Block 6: Product AI Insight
  const [productInsight, setProductInsight] = useState<ProductAiInsightData | null>(null);
  const [productInsightLoading, setProductInsightLoading] = useState(false);
  // Block 7: Recommendations
  const [recommendations, setRecommendations] = useState<RecommendedProductData[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  // Global
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Primary await — KPI Summary (doubles as auth check)
      setKpiLoading(true);
      const kpiRes = await pharmacyApi.getKpiSummary();
      if (kpiRes.success && kpiRes.data) {
        setKpiSummary(kpiRes.data);
      }
      setKpiLoading(false);

      // Parallel fire-and-forget calls
      // Block 2+5: LLM 매장 요약
      setLlmLoading(true);
      pharmacyApi.getStoreAiSummary()
        .then((res) => { if (res.success && res.data) setLlmSummary(res.data); })
        .catch(() => {})
        .finally(() => setLlmLoading(false));

      // Block 3: 매장 활동
      setActivityLoading(true);
      pharmacyApi.getTodayActions()
        .then((res) => { if (res.success && res.data) setTodayActions(res.data); })
        .catch(() => {})
        .finally(() => setActivityLoading(false));

      // Block 4: 상품 성과
      setSnapshotsLoading(true);
      pharmacyApi.getProductSnapshots()
        .then((res) => { if (res.success && res.data) setProductSnapshots(res.data); })
        .catch(() => {})
        .finally(() => setSnapshotsLoading(false));

      // Block 6: 상품 AI 인사이트
      setProductInsightLoading(true);
      pharmacyApi.getProductAiInsight()
        .then((res) => { if (res.success && res.data) setProductInsight(res.data); })
        .catch(() => {})
        .finally(() => setProductInsightLoading(false));

      // Block 7: AI 추천 상품
      setRecommendationsLoading(true);
      pharmacyApi.getStoreProductRecommendations()
        .then((res) => { if (res.success && res.data) setRecommendations(res.data.products); })
        .catch(() => {})
        .finally(() => setRecommendationsLoading(false));
    } catch (err: any) {
      console.error('Copilot dashboard load error:', err);
      setKpiLoading(false);
      if (err.status === 401) {
        setRequiresLogin(true);
      } else {
        const errorMessage = typeof err.message === 'string'
          ? err.message
          : (err.message?.message || '데이터를 불러오는데 실패했습니다.');
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && kpiSummary) {
        fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, kpiSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-slate-500 mb-6">매장 코파일럿을 이용하시려면 먼저 로그인해 주세요.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              이전 화면으로
            </button>
            <NavLink
              to="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
            >
              <LogIn className="w-5 h-5" />
              로그인하기
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">오류가 발생했습니다</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  // Revenue growth calculation
  const revenueGrowth = kpiSummary && kpiSummary.lastMonthRevenue > 0
    ? Math.round((kpiSummary.monthRevenue - kpiSummary.lastMonthRevenue) / kpiSummary.lastMonthRevenue * 100)
    : 0;

  // Aggregate AI actions for Block 8
  const allActions = [
    ...(llmSummary?.actions || []).map((a) => ({ ...a, source: 'store' as const })),
    ...(productInsight?.actions || []).map((a) => ({ ...a, source: 'product' as const })),
  ];

  return (
    <div className="space-y-5">
      {/* ── 페이지 헤더 ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">내 약국 홈</h1>
          <p className="text-sm text-slate-500 mt-0.5">약국 운영 현황을 한눈에 파악합니다</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* ========================================= */}
      {/* Block 1: 매장 KPI — 4칸 아이콘 그리드      */}
      {/* KPA StoreHomePage 패턴 참고               */}
      {/* ========================================= */}
      {kpiSummary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <ShoppingCart className="w-5 h-5 mx-auto mb-2" style={{ color: '#059669' }} />
            <p className="text-2xl font-bold text-slate-800">{kpiSummary.todayOrders}</p>
            <p className="text-xs text-slate-500 mt-0.5">오늘 주문</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <Activity className="w-5 h-5 mx-auto mb-2" style={{ color: '#2563eb' }} />
            <p className="text-2xl font-bold text-slate-800">{kpiSummary.weekOrders}</p>
            <p className="text-xs text-slate-500 mt-0.5">이번주 주문</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-2" style={{ color: '#7c3aed' }} />
            <p className="text-xl font-bold text-slate-800">
              {(kpiSummary.monthRevenue / 10000).toFixed(0)}
              <span className="text-sm font-normal text-slate-500 ml-0.5">만원</span>
            </p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <p className="text-xs text-slate-500">이번달 매출</p>
              {revenueGrowth !== 0 && (
                <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${
                  revenueGrowth > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}%
                </span>
              )}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-2" style={{ color: '#f59e0b' }} />
            <p className="text-xl font-bold text-slate-800">
              {(kpiSummary.avgOrderValue / 1000).toFixed(0)}
              <span className="text-sm font-normal text-slate-500 ml-0.5">천원</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">평균 주문가</p>
          </div>
        </div>
      ) : kpiLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-6 bg-white rounded-xl border border-slate-200">
          KPI 데이터를 불러올 수 없습니다.
        </p>
      )}

      {/* ========================================= */}
      {/* 주요 바로가기 — 3×2 그리드                 */}
      {/* KPA StoreHomePage 주요 바로가기 패턴 참고   */}
      {/* ========================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">주요 바로가기</h2>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                className="flex flex-col items-center p-4 bg-slate-50 border border-slate-100 rounded-xl text-center hover:border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <Icon className="w-6 h-6 mb-2" style={{ color: item.color }} />
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ========================================= */}
      {/* Block 2: AI 요약                          */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-800">AI 요약</h2>
            {llmSummary && (
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">AI</span>
            )}
          </div>
          {llmLoading && <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />}
          {!llmSummary && !llmLoading && (
            <button
              onClick={() => {
                setLlmLoading(true);
                pharmacyApi.createStoreAiSnapshot()
                  .then(() => pharmacyApi.getStoreAiSummary())
                  .then((res) => { if (res.success && res.data) setLlmSummary(res.data); })
                  .catch(() => {})
                  .finally(() => setLlmLoading(false));
              }}
              className="px-3 py-1.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-lg hover:bg-primary-100 transition-colors"
            >
              AI 분석 요청
            </button>
          )}
        </div>

        {llmSummary ? (
          <div className="bg-primary-50 rounded-xl p-4">
            <p className="text-sm text-primary-800">{llmSummary.summary}</p>
            <p className="text-xs text-primary-500 mt-2">
              {llmSummary.model} · {new Date(llmSummary.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
        ) : !llmLoading ? (
          <p className="text-sm text-slate-500">AI 분석을 요청하면 매장 운영 요약이 표시됩니다.</p>
        ) : null}
      </div>

      {/* ========================================= */}
      {/* Block 3: 매장 활동                        */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">매장 활동</h2>
          </div>
          {activityLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>

        {todayActions ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '오늘 주문', value: todayActions.todayOrders, highlight: false },
              { label: '대기 주문', value: todayActions.pendingOrders, highlight: todayActions.pendingOrders > 0 },
              { label: '접수 대기', value: todayActions.pendingReceiveOrders, highlight: todayActions.pendingReceiveOrders > 0 },
              { label: '고객 요청', value: todayActions.pendingRequests, highlight: todayActions.pendingRequests > 0 },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-3 rounded-xl ${
                  item.highlight ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
                }`}
              >
                <p className={`text-xl font-bold ${item.highlight ? 'text-amber-700' : 'text-slate-800'}`}>
                  {item.value}
                </p>
                <p className={`text-xs ${item.highlight ? 'text-amber-600' : 'text-slate-500'}`}>{item.label}</p>
              </div>
            ))}
          </div>
        ) : !activityLoading ? (
          <p className="text-sm text-slate-500 text-center py-4">활동 데이터를 불러올 수 없습니다.</p>
        ) : null}
      </div>

      {/* ========================================= */}
      {/* Block 4: 상품 성과                        */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">상품 성과</h2>
            {productSnapshots.length > 0 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                TOP {Math.min(productSnapshots.length, 5)}
              </span>
            )}
          </div>
          {snapshotsLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
          {productSnapshots.length === 0 && !snapshotsLoading && (
            <button
              onClick={() => {
                setSnapshotsLoading(true);
                pharmacyApi.createProductAiSnapshot()
                  .then(() => pharmacyApi.getProductSnapshots())
                  .then((res) => { if (res.success && res.data) setProductSnapshots(res.data); })
                  .catch(() => {})
                  .finally(() => setSnapshotsLoading(false));
              }}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              상품 스냅샷 생성
            </button>
          )}
        </div>

        {productSnapshots.length > 0 ? (
          <div className="space-y-2">
            {productSnapshots.slice(0, 5).map((snap, idx) => (
              <div key={snap.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg">
                <span className="w-6 h-6 bg-slate-200 text-slate-600 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{snap.productName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">주문 {snap.orders}건</span>
                    <span className="text-xs text-slate-500">매출 {Number(snap.revenue).toLocaleString()}원</span>
                    <span className="text-xs text-slate-500">QR {snap.qrScans}회</span>
                    {Number(snap.conversionRate) > 0 && (
                      <span className="text-xs text-emerald-600">전환 {Number(snap.conversionRate).toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !snapshotsLoading ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl">
            <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">상품 스냅샷을 생성하면 성과 데이터가 표시됩니다.</p>
          </div>
        ) : null}
      </div>

      {/* ========================================= */}
      {/* Block 5: AI 매장 분석 (Issues)            */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-800">AI 매장 분석</h2>
          </div>
        </div>

        {llmSummary && llmSummary.issues.length > 0 ? (
          <div className="space-y-2">
            {llmSummary.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                  issue.severity === 'high'
                    ? 'bg-red-50 text-red-800'
                    : issue.severity === 'medium'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-blue-50 text-blue-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {llmSummary ? '발견된 이슈가 없습니다.' : 'AI 요약을 먼저 생성해주세요.'}
          </p>
        )}
      </div>

      {/* ========================================= */}
      {/* Block 6: 상품 AI 분석                     */}
      {/* WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1        */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">상품 AI 분석</h2>
            {productInsight && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">AI</span>
            )}
          </div>
          {productInsightLoading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
          {!productInsight && !productInsightLoading && (
            <button
              onClick={() => {
                setProductInsightLoading(true);
                pharmacyApi.createProductAiSnapshot()
                  .then(() => pharmacyApi.getProductAiInsight())
                  .then((res) => { if (res.success && res.data) setProductInsight(res.data); })
                  .catch(() => {})
                  .finally(() => setProductInsightLoading(false));
              }}
              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors"
            >
              상품 AI 분석 요청
            </button>
          )}
        </div>

        {productInsight ? (
          <>
            <div className="bg-indigo-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-indigo-800">{productInsight.summary}</p>
              <p className="text-xs text-indigo-500 mt-2">
                {productInsight.model} · {new Date(productInsight.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>

            {productInsight.productHighlights.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium text-slate-600">주목할 상품</h3>
                {productInsight.productHighlights.map((ph, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                    <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{ph.productName}</p>
                      <p className="text-xs text-slate-600">{ph.highlight}</p>
                      {ph.metric && <p className="text-xs text-indigo-600 mt-0.5">{ph.metric}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {productInsight.issues.length > 0 && (
              <div className="space-y-2 mb-4">
                {productInsight.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                      issue.severity === 'high'
                        ? 'bg-red-50 text-red-800'
                        : issue.severity === 'medium'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      {issue.productName && <span className="font-medium">{issue.productName}: </span>}
                      <span>{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {productInsight.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {productInsight.actions.map((action, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1.5 text-sm rounded-full cursor-pointer transition-colors ${
                      action.priority === 'high'
                        ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title={action.reason}
                  >
                    {action.label}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : !productInsightLoading ? (
          <p className="text-sm text-slate-500">상품별 QR 스캔, 주문, 전환율을 AI가 분석합니다.</p>
        ) : null}
      </div>

      {/* ========================================= */}
      {/* Block 7: AI 추천 상품                     */}
      {/* WO-O4O-AI-PRODUCT-RECOMMENDATION-V1       */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-800">AI 추천 상품</h2>
            {recommendations.length > 0 && (
              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                {recommendations.length}건
              </span>
            )}
          </div>
          {recommendationsLoading && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
        </div>

        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="flex items-start gap-3 px-4 py-3 bg-violet-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{rec.marketingName}</p>
                    {rec.score > 0 && (
                      <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded bg-violet-200 text-violet-800">
                        {Math.round(rec.score * 100)}%
                      </span>
                    )}
                  </div>
                  {rec.categoryName && (
                    <p className="text-xs text-slate-500 mt-0.5">{rec.categoryName}{rec.brandName ? ` · ${rec.brandName}` : ''}</p>
                  )}
                  <p className="text-xs text-violet-600 mt-1">{rec.reason}</p>
                  {rec.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs rounded-md bg-violet-100 text-violet-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !recommendationsLoading ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl">
            <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">상품 AI 태그를 먼저 생성하면 추천 상품이 표시됩니다.</p>
          </div>
        ) : null}
      </div>

      {/* ========================================= */}
      {/* Block 8: 추천 행동                        */}
      {/* ========================================= */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-800">추천 행동</h2>
            {allActions.length > 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                {allActions.length}건
              </span>
            )}
          </div>
        </div>

        {/* AI-suggested actions */}
        {allActions.length > 0 && (
          <div className="space-y-2 mb-4">
            {allActions.map((action, idx) => {
              const path = inferActionPath(action.label);
              const content = (
                <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${
                  path ? 'hover:bg-emerald-50 cursor-pointer' : 'bg-slate-50'
                } transition-colors`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{action.label}</p>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        action.priority === 'high'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {action.priority === 'high' ? '중요' : '일반'}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        action.source === 'store' ? 'bg-primary-50 text-primary-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {action.source === 'store' ? '매장' : '상품'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{action.reason}</p>
                  </div>
                  {path && <ArrowRight className="w-4 h-4 text-slate-300 mt-1 flex-shrink-0" />}
                </div>
              );

              return path ? (
                <NavLink
                  key={idx}
                  to={path}
                  onClick={() => logStoreAction('copilot_action')}
                >
                  {content}
                </NavLink>
              ) : (
                <div key={idx}>{content}</div>
              );
            })}
          </div>
        )}

        {/* Quick links */}
        <div className={allActions.length > 0 ? 'border-t border-slate-100 pt-4' : ''}>
          <p className="text-xs text-slate-400 mb-3">빠른 이동</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QUICK_LINKS.map((link) => {
              const LinkIcon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => logStoreAction('copilot_quick_link')}
                  className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-colors group"
                >
                  <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                  <span className="text-sm font-medium">{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
