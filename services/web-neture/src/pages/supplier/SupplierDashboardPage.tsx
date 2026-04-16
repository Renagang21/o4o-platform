/**
 * SupplierDashboardPage — 공급자 AI Copilot Dashboard
 *
 * WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1
 *
 * 8-Block Copilot:
 *  1. 공급자 KPI (slate)
 *  2. AI 공급자 요약 (indigo)
 *  3. 상품 성과 (slate)
 *  4. 매장 확산 (slate)
 *  5. AI 상품 분석 (indigo)
 *  6. 인기 상품 (slate)
 *  7. 성장 상품 (emerald)
 *  8. 추천 전략 (violet)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  supplierCopilotApi,
  type SupplierKpiSummary,
  type ProductPerformanceItem,
  type DistributionItem,
  type TrendingProductItem,
  type SupplierAiInsight,
  supplierKpaEventOfferApi,
  type SupplierEventOfferStats,
} from '../../lib/api';

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [kpi, setKpi] = useState<SupplierKpiSummary | null>(null);
  const [aiInsight, setAiInsight] = useState<SupplierAiInsight | null>(null);
  const [performance, setPerformance] = useState<ProductPerformanceItem[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [trending, setTrending] = useState<TrendingProductItem[]>([]);
  const [eventOfferStats, setEventOfferStats] = useState<SupplierEventOfferStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Primary await — auth check
      const kpiData = await supplierCopilotApi.getKpi();
      setKpi(kpiData);
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        setError('공급자 권한이 필요합니다.');
        setLoading(false);
        return;
      }
      setError('데이터를 불러오는데 실패했습니다.');
      setLoading(false);
      return;
    }

    // Fire-and-forget parallel loads
    supplierCopilotApi.getAiInsight()
      .then(d => setAiInsight(d))
      .catch(() => {});

    supplierCopilotApi.getProductPerformance()
      .then(d => setPerformance(d))
      .catch(() => {});

    supplierCopilotApi.getDistribution()
      .then(d => setDistribution(d))
      .catch(() => {});

    supplierCopilotApi.getTrendingProducts()
      .then(d => setTrending(d))
      .catch(() => {});

    // Event Offer stats (KPA) — 실패해도 대시보드 영향 없음
    supplierKpaEventOfferApi.getStats()
      .then(d => setEventOfferStats(d))
      .catch(() => {});

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-500 text-lg mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const riskColor = aiInsight?.insight?.riskLevel === 'high' ? 'text-red-600 bg-red-50'
    : aiInsight?.insight?.riskLevel === 'medium' ? 'text-amber-600 bg-amber-50'
    : 'text-emerald-600 bg-emerald-50';

  const topByRevenue = performance.slice(0, 5);
  const topByOrders = [...performance].sort((a, b) => b.orders - a.orders).slice(0, 5);

  // AI actions split: Block 5 gets first 3, Block 8 gets all
  const aiActions = aiInsight?.insight?.recommendedActions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공급자 AI Copilot</h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.name || '공급자'}님의 상품 성과와 매장 확산 현황을 AI가 분석합니다.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
        >
          {loading ? '로딩...' : '새로고침'}
        </button>
      </div>

      {/* Block 1: 공급자 KPI (slate) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">공급자 KPI</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="등록 상품" value={kpi?.registeredProducts ?? 0} />
            <KpiCard label="판매 중" value={kpi?.activeProducts ?? 0} accent />
            <KpiCard label="매장 진열" value={kpi?.storeListings ?? 0} />
            <KpiCard label="최근 7일 주문" value={kpi?.recentOrders ?? 0} accent />
          </div>
        )}
      </div>

      {/* Block 1.5: 이벤트/특가 현황 (amber) — WO-EVENT-OFFER-SUPPLIER-DASHBOARD-STATS-INTEGRATION-V1 */}
      {eventOfferStats !== null && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-amber-900">이벤트/특가 현황 (KPA)</h2>
            <span className="text-xs text-amber-500">KPA 약사회 이벤트 기준</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <EventKpiCard label="전체 이벤트" value={eventOfferStats.totalOffers} />
            <EventKpiCard label="노출중" value={eventOfferStats.activeOffers} accent />
            <EventKpiCard label="이벤트 주문" value={eventOfferStats.totalOrders} />
            <EventKpiCard
              label="이벤트 매출"
              value={eventOfferStats.totalRevenue}
              format="currency"
            />
          </div>
          {eventOfferStats.totalOffers === 0 && (
            <p className="text-xs text-amber-500 mt-4 text-center">
              KPA 이벤트 제안 이력이 없습니다. KPA 사이트에서 이벤트를 제안해보세요.
            </p>
          )}
        </div>
      )}

      {/* Block 2: AI 공급자 요약 (indigo) */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-indigo-900">AI 공급자 요약</h2>
          {aiInsight?.insight?.riskLevel && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskColor}`}>
              {aiInsight.insight.riskLevel === 'high' ? '주의' : aiInsight.insight.riskLevel === 'medium' ? '보통' : '양호'}
            </span>
          )}
        </div>
        {aiInsight ? (
          <>
            <p className="text-sm text-indigo-800 leading-relaxed">{aiInsight.insight.summary}</p>
            <p className="text-xs text-indigo-400 mt-3">
              {aiInsight.meta.provider}/{aiInsight.meta.model} &middot; {aiInsight.meta.durationMs}ms
            </p>
          </>
        ) : (
          <p className="text-sm text-indigo-400">AI 분석을 불러오는 중...</p>
        )}
      </div>

      {/* Block 3 + 4: 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Block 3: 상품 성과 (slate) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">상품 성과 (매출 TOP 5)</h2>
          {topByRevenue.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">상품 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {topByRevenue.map((item, idx) => (
                <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-400">
                      주문 {item.orders}건 &middot; QR {item.qrScans}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {item.revenue.toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block 4: 매장 확산 (slate) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">매장 확산</h2>
          {distribution.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">매장 진열 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {distribution.slice(0, 5).map(item => (
                <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {item.storeCount}개 매장
                  </span>
                  {item.newStores > 0 && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      +{item.newStores} new
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Block 5: AI 상품 분석 (indigo) */}
      {aiActions.length > 0 && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
          <h2 className="text-base font-semibold text-indigo-900 mb-4">AI 상품 분석</h2>
          <div className="space-y-2">
            {aiActions.slice(0, 3).map((action, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
                <span className="text-indigo-400 text-xs font-bold mt-0.5">{idx + 1}</span>
                <p className="text-sm text-indigo-800">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block 6 + 7: 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Block 6: 인기 상품 (slate) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">인기 상품 (주문 TOP 5)</h2>
          {topByOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">주문 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {topByOrders.map((item, idx) => (
                <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-400">
                      매출 {item.revenue.toLocaleString()}원
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {item.orders}건
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block 7: 성장 상품 (emerald) */}
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
          <h2 className="text-base font-semibold text-emerald-900 mb-4">성장 상품</h2>
          {trending.length === 0 ? (
            <p className="text-sm text-emerald-400 py-8 text-center">성장 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {trending.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-800 truncate">{item.productName}</p>
                    <p className="text-xs text-emerald-500">
                      이번주 {item.currentOrders}건 / 지난주 {item.previousOrders}건
                    </p>
                  </div>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                    item.growthRate > 0
                      ? 'text-emerald-700 bg-emerald-100'
                      : item.growthRate < 0
                      ? 'text-red-600 bg-red-50'
                      : 'text-slate-500 bg-slate-100'
                  }`}>
                    {item.growthRate > 0 ? '+' : ''}{item.growthRate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Block 8: 추천 전략 (violet) */}
      <div className="bg-violet-50 rounded-xl border border-violet-200 p-6">
        <h2 className="text-base font-semibold text-violet-900 mb-4">추천 전략</h2>
        {aiActions.length > 0 ? (
          <div className="space-y-2 mb-5">
            {aiActions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-white/60 rounded-lg cursor-pointer hover:bg-white/80 transition-colors"
                onClick={() => inferActionPath(action, navigate)}
              >
                <span className="text-violet-400 text-xs font-bold mt-0.5">{idx + 1}</span>
                <p className="text-sm text-violet-800">{action}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-violet-400 mb-5">AI 추천을 불러오는 중...</p>
        )}
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium hover:bg-violet-200 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components & helpers ----

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${accent ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-700'}`}>
      <p className={`text-xs font-medium mb-1 ${accent ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function EventKpiCard({
  label,
  value,
  accent,
  format,
}: {
  label: string;
  value: number;
  accent?: boolean;
  format?: 'currency';
}) {
  const display = format === 'currency'
    ? `${value.toLocaleString('ko-KR')}원`
    : value.toLocaleString();
  return (
    <div className={`rounded-lg p-4 ${accent ? 'bg-amber-700 text-white' : 'bg-amber-100/60 text-amber-900'}`}>
      <p className={`text-xs font-medium mb-1 ${accent ? 'text-amber-200' : 'text-amber-600'}`}>{label}</p>
      <p className="text-xl font-bold">{display}</p>
    </div>
  );
}

const QUICK_LINKS = [
  { label: '상품 관리', path: '/supplier/products' },
  { label: '주문 관리', path: '/supplier/orders' },
  { label: '라이브러리', path: '/supplier/library' },
  { label: '판매자 신청', path: '/supplier/requests' },
  { label: '정산 현황', path: '/supplier/orders' },
  { label: '프로필 관리', path: '/supplier/profile' },
];

function inferActionPath(action: string, navigate: (path: string) => void) {
  const lower = action.toLowerCase();
  if (lower.includes('상품') || lower.includes('제품') || lower.includes('product')) {
    navigate('/supplier/products');
  } else if (lower.includes('주문') || lower.includes('order')) {
    navigate('/supplier/orders');
  } else if (lower.includes('라이브러리') || lower.includes('콘텐츠') || lower.includes('content')) {
    navigate('/supplier/library');
  } else if (lower.includes('판매자') || lower.includes('seller') || lower.includes('신청')) {
    navigate('/supplier/requests');
  } else if (lower.includes('프로필') || lower.includes('profile')) {
    navigate('/supplier/profile');
  }
}
