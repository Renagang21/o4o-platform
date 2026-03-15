/**
 * NetureOperatorDashboard — Operator AI Copilot Dashboard
 *
 * WO-O4O-OPERATOR-COPILOT-DASHBOARD-V1
 *
 * 9-Block Copilot:
 *  1. 플랫폼 KPI (slate)
 *  2. AI 플랫폼 요약 (indigo)
 *  3. 신규 매장 (slate)
 *  4. 공급자 활동 (slate)
 *  5. 상품 승인 대기 (slate)
 *  6. 가입 승인 Copilot (amber) — WO-O4O-NETURE-OPERATOR-COPILOT-REGISTRATION-V1
 *  7. 플랫폼 트렌드 (emerald)
 *  8. 위험 알림 (red/amber)
 *  9. 운영 액션 (violet)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  operatorCopilotApi,
  operatorRegistrationApi,
  type OperatorKpiSummary,
  type RecentStoreItem,
  type SupplierActivityItem,
  type PendingProductItem,
  type PlatformTrends,
  type AlertItem,
  type OperatorAiSummary,
  type RegistrationCopilotData,
} from '../../lib/api';

export default function NetureOperatorDashboard() {
  const navigate = useNavigate();

  const [kpi, setKpi] = useState<OperatorKpiSummary | null>(null);
  const [aiSummary, setAiSummary] = useState<OperatorAiSummary | null>(null);
  const [stores, setStores] = useState<RecentStoreItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierActivityItem[]>([]);
  const [products, setProducts] = useState<PendingProductItem[]>([]);
  const [trends, setTrends] = useState<PlatformTrends | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [regCopilot, setRegCopilot] = useState<RegistrationCopilotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const kpiData = await operatorCopilotApi.getKpi();
      setKpi(kpiData);
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        setError('운영자 권한이 필요합니다.');
        setLoading(false);
        return;
      }
      setError('데이터를 불러오는데 실패했습니다.');
      setLoading(false);
      return;
    }

    // Fire-and-forget parallel loads
    operatorCopilotApi.getAiSummary()
      .then(d => setAiSummary(d))
      .catch(() => {});

    operatorCopilotApi.getRecentStores()
      .then(d => setStores(d))
      .catch(() => {});

    operatorCopilotApi.getSupplierActivity()
      .then(d => setSuppliers(d))
      .catch(() => {});

    operatorCopilotApi.getPendingProducts()
      .then(d => setProducts(d))
      .catch(() => {});

    operatorCopilotApi.getTrends()
      .then(d => setTrends(d))
      .catch(() => {});

    operatorCopilotApi.getAlerts()
      .then(d => setAlerts(d))
      .catch(() => {});

    operatorRegistrationApi.getCopilotSummary()
      .then(d => setRegCopilot(d))
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

  const riskColor = aiSummary?.insight?.riskLevel === 'high' ? 'text-red-600 bg-red-50'
    : aiSummary?.insight?.riskLevel === 'medium' ? 'text-amber-600 bg-amber-50'
    : 'text-emerald-600 bg-emerald-50';

  const aiActions = aiSummary?.insight?.recommendedActions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operator AI Copilot</h1>
          <p className="text-sm text-slate-500 mt-1">
            플랫폼 전체 상태를 AI가 분석하고, 운영 인사이트를 제공합니다.
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

      {/* Block 1: 플랫폼 KPI (slate) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">플랫폼 KPI</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="총 매장" value={kpi?.totalStores ?? 0} />
            <KpiCard label="총 공급자" value={kpi?.totalSuppliers ?? 0} accent />
            <KpiCard label="등록 상품" value={kpi?.totalProducts ?? 0} />
            <KpiCard label="최근 7일 주문" value={kpi?.recentOrders ?? 0} accent />
          </div>
        )}
      </div>

      {/* Block 2: AI 플랫폼 요약 (indigo) */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-indigo-900">AI 플랫폼 요약</h2>
          {aiSummary?.insight?.riskLevel && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskColor}`}>
              {aiSummary.insight.riskLevel === 'high' ? '주의' : aiSummary.insight.riskLevel === 'medium' ? '보통' : '양호'}
            </span>
          )}
        </div>
        {aiSummary ? (
          <>
            <p className="text-sm text-indigo-800 leading-relaxed">{aiSummary.insight.summary}</p>
            <p className="text-xs text-indigo-400 mt-3">
              {aiSummary.meta.provider}/{aiSummary.meta.model} &middot; {aiSummary.meta.durationMs}ms
            </p>
          </>
        ) : (
          <p className="text-sm text-indigo-400">AI 분석을 불러오는 중...</p>
        )}
      </div>

      {/* Block 3 + 4: 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Block 3: 신규 매장 (slate) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">신규 매장</h2>
          {stores.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">최근 매장 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {stores.map(store => (
                <div key={store.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{store.name}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(store.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block 4: 공급자 활동 (slate) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">공급자 활동</h2>
          {suppliers.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">최근 공급자 활동이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {suppliers.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-400">{item.supplierName}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Block 5: 상품 승인 대기 (slate) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">상품 승인 대기</h2>
        {products.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">승인 대기 상품이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {products.slice(0, 5).map(item => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                  <p className="text-xs text-slate-400">{item.supplierName}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {formatDate(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block 6: 가입 승인 Copilot (amber) */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-amber-900">가입 승인 Copilot</h2>
            {regCopilot && regCopilot.pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">
                {regCopilot.pendingCount}건 대기
              </span>
            )}
          </div>
          <Link
            to="/workspace/operator/registrations"
            className="text-xs text-amber-700 hover:text-amber-900 font-medium"
          >
            전체 보기 &rarr;
          </Link>
        </div>
        {!regCopilot ? (
          <p className="text-sm text-amber-400 py-8 text-center">가입 신청 데이터를 불러오는 중...</p>
        ) : regCopilot.pendingCount === 0 ? (
          <p className="text-sm text-amber-600 py-8 text-center">대기 중인 가입 신청이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {regCopilot.high.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-600 mb-2">HIGH PRIORITY</p>
                <div className="space-y-2">
                  {regCopilot.high.slice(0, 3).map(item => (
                    <RegistrationRow key={item.id} item={item} priority="high" />
                  ))}
                </div>
              </div>
            )}
            {regCopilot.medium.length > 0 && (
              <div>
                <p className="text-xs font-bold text-amber-700 mb-2">MEDIUM</p>
                <div className="space-y-2">
                  {regCopilot.medium.slice(0, 3).map(item => (
                    <RegistrationRow key={item.id} item={item} priority="medium" />
                  ))}
                </div>
              </div>
            )}
            {regCopilot.low.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">LOW</p>
                <div className="space-y-2">
                  {regCopilot.low.slice(0, 2).map(item => (
                    <RegistrationRow key={item.id} item={item} priority="low" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Block 7 + 8: 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Block 6: 플랫폼 트렌드 (emerald) */}
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
          <h2 className="text-base font-semibold text-emerald-900 mb-4">플랫폼 트렌드</h2>
          {trends ? (
            <div className="space-y-3">
              <TrendRow
                label="주문 변동"
                current={trends.currentOrders}
                previous={trends.previousOrders}
                growth={trends.orderGrowth}
                unit="건"
              />
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-emerald-800">이번 주 신규 매장</p>
                </div>
                <span className="text-sm font-bold text-emerald-700">{trends.newStores}개</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-emerald-800">이번 주 신규 공급자</p>
                </div>
                <span className="text-sm font-bold text-emerald-700">{trends.newSuppliers}개</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-emerald-400 py-8 text-center">트렌드 데이터를 불러오는 중...</p>
          )}
        </div>

        {/* Block 7: 위험 알림 (red/amber) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">위험 알림</h2>
          {alerts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-emerald-600 font-medium">모든 지표가 정상입니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${
                    alert.severity === 'high' ? 'bg-red-50 hover:bg-red-100'
                    : alert.severity === 'medium' ? 'bg-amber-50 hover:bg-amber-100'
                    : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                  onClick={() => alert.link && navigate(alert.link)}
                >
                  <span className={`text-xs font-bold mt-0.5 ${
                    alert.severity === 'high' ? 'text-red-500'
                    : alert.severity === 'medium' ? 'text-amber-500'
                    : 'text-slate-400'
                  }`}>
                    {alert.severity === 'high' ? '!!' : alert.severity === 'medium' ? '!' : '-'}
                  </span>
                  <p className={`text-sm ${
                    alert.severity === 'high' ? 'text-red-800'
                    : alert.severity === 'medium' ? 'text-amber-800'
                    : 'text-slate-600'
                  }`}>
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Block 8: 운영 액션 (violet) */}
      <div className="bg-violet-50 rounded-xl border border-violet-200 p-6">
        <h2 className="text-base font-semibold text-violet-900 mb-4">운영 액션</h2>
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

function TrendRow({ label, current, previous, growth, unit }: {
  label: string; current: number; previous: number; growth: number; unit: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
      <div className="flex-1">
        <p className="text-sm text-emerald-800">{label}</p>
        <p className="text-xs text-emerald-500">이번주 {current}{unit} / 지난주 {previous}{unit}</p>
      </div>
      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
        growth > 0 ? 'text-emerald-700 bg-emerald-100'
        : growth < 0 ? 'text-red-600 bg-red-50'
        : 'text-slate-500 bg-slate-100'
      }`}>
        {growth > 0 ? '+' : ''}{growth}%
      </span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const ROLE_LABELS: Record<string, string> = {
  supplier: '공급자',
  partner: '파트너',
  seller: '판매자',
  user: '사용자',
};

function RegistrationRow({ item, priority }: {
  item: { id: string; name: string; role: string; companyName?: string; businessNumber?: string; licenseNumber?: string; createdAt: string };
  priority: 'high' | 'medium' | 'low';
}) {
  const bgColor = priority === 'high' ? 'bg-red-50' : priority === 'medium' ? 'bg-amber-100/50' : 'bg-white/60';
  const detail = item.companyName || item.licenseNumber || item.businessNumber || '';
  return (
    <Link
      to="/workspace/operator/registrations"
      className={`flex items-center gap-3 p-3 ${bgColor} rounded-lg hover:opacity-80 transition-opacity`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {item.name} <span className="text-xs text-slate-500">({ROLE_LABELS[item.role] || item.role})</span>
        </p>
        {detail && <p className="text-xs text-slate-500 truncate">{detail}</p>}
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(item.createdAt)}</span>
    </Link>
  );
}

const QUICK_LINKS = [
  { label: '가입 승인', path: '/workspace/operator/registrations' },
  { label: '공급 현황', path: '/workspace/operator/supply' },
  { label: '포럼 관리', path: '/workspace/operator/forum-management' },
  { label: 'AI 리포트', path: '/workspace/operator/ai-report' },
];

function inferActionPath(action: string, nav: (path: string) => void) {
  const lower = action.toLowerCase();
  if (lower.includes('승인') || lower.includes('가입')) nav('/workspace/operator/registrations');
  else if (lower.includes('매장') || lower.includes('store')) nav('/workspace/operator/supply');
  else if (lower.includes('공급자') || lower.includes('supplier')) nav('/workspace/operator/supply');
  else if (lower.includes('상품') || lower.includes('product')) nav('/workspace/operator/supply');
  else if (lower.includes('주문') || lower.includes('order')) nav('/workspace/operator/supply');
}
