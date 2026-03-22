/**
 * AiUsageDashboardPage — WO-O4O-AI-USAGE-DASHBOARD-V1
 *
 * AI 사용량 대시보드: KPI 카드 + Scope별 + Model별 + 최근 로그
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Zap,
  DollarSign,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Shield,
} from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/apiClient';

type Period = '7d' | '30d' | '90d';

interface Summary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgDurationMs: number;
  errorRate: number;
  successCount: number;
  errorCount: number;
  days: number;
}

interface ScopeRow {
  scope: string;
  requests: number;
  tokens: number;
  cost: number;
  latency: number;
  errors: number;
}

interface ModelRow {
  provider: string;
  model: string;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

interface RecentLog {
  id: string;
  scope: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costEstimated: number | null;
  durationMs: number;
  status: string;
  errorMessage: string | null;
  createdAt: string | null;
}

interface QuotaStatus {
  id: number;
  layer: string;
  layerKey: string;
  limitType: string;
  period: string;
  limitValue: number;
  warningThreshold: number;
  currentValue: number;
  usagePercent: number;
  status: 'ok' | 'warning' | 'exceeded';
}

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };
const AI_ADMIN_BASE = `${API_BASE_URL}/api/ai/admin`;

export default function AiUsageDashboardPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byScope, setByScope] = useState<ScopeRow[]>([]);
  const [byModel, setByModel] = useState<ModelRow[]>([]);
  const [recent, setRecent] = useState<RecentLog[]>([]);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const days = PERIOD_DAYS[period];
    try {
      const [sumRes, scopeRes, modelRes, recentRes, quotaRes] = await Promise.all([
        api.get(`${AI_ADMIN_BASE}/analytics/summary?days=${days}`),
        api.get(`${AI_ADMIN_BASE}/analytics/by-scope?days=${days}`),
        api.get(`${AI_ADMIN_BASE}/analytics/by-model?days=${days}`),
        api.get(`${AI_ADMIN_BASE}/analytics/recent?limit=30`),
        api.get(`${AI_ADMIN_BASE}/quotas/status`).catch(() => ({ data: { success: false } })),
      ]);
      if (sumRes.data?.success) setSummary(sumRes.data.data);
      if (scopeRes.data?.success) setByScope(scopeRes.data.data);
      if (modelRes.data?.success) setByModel(modelRes.data.data);
      if (recentRes.data?.success) setRecent(recentRes.data.data);
      if (quotaRes.data?.success) setQuotaStatus(quotaRes.data.data);
    } catch (err) {
      console.error('[AiUsageDashboard] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 사용량 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">모든 AI 호출의 사용량, 비용, 성능을 추적합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard icon={<Activity className="w-5 h-5" />} label="총 요청" value={summary.totalRequests.toLocaleString()} color="blue" />
          <KpiCard icon={<Zap className="w-5 h-5" />} label="총 토큰" value={formatTokens(summary.totalTokens)} color="purple" />
          <KpiCard icon={<DollarSign className="w-5 h-5" />} label="예상 비용" value={`$${summary.totalCost.toFixed(4)}`} color="green" />
          <KpiCard icon={<Clock className="w-5 h-5" />} label="평균 지연" value={`${summary.avgDurationMs.toLocaleString()}ms`} color="yellow" />
          <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="에러율" value={`${summary.errorRate}%`} color={summary.errorRate > 10 ? 'red' : 'gray'} />
        </div>
      )}

      {/* Quota Status */}
      {quotaStatus.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Quota 현황</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Layer</th>
                  <th className="px-4 py-2 text-left font-medium">Key</th>
                  <th className="px-4 py-2 text-left font-medium">유형</th>
                  <th className="px-4 py-2 text-left font-medium">기간</th>
                  <th className="px-4 py-2 text-right font-medium">현재 / 제한</th>
                  <th className="px-4 py-2 text-right font-medium">사용률</th>
                  <th className="px-4 py-2 text-center font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotaStatus.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        q.layer === 'global' ? 'bg-gray-100 text-gray-700' :
                        q.layer === 'service' ? 'bg-blue-100 text-blue-700' :
                        q.layer === 'scope' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{q.layer}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{q.layerKey}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{q.limitType}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{q.period === 'daily' ? '일간' : '월간'}</td>
                    <td className="px-4 py-2 text-right text-xs">
                      <span className="text-gray-700">{formatQuotaValue(q.limitType, q.currentValue)}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-gray-500">{formatQuotaValue(q.limitType, q.limitValue)}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              q.status === 'exceeded' ? 'bg-red-500' :
                              q.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(q.usagePercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">{q.usagePercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        q.status === 'exceeded' ? 'bg-red-100 text-red-700' :
                        q.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>{q.status === 'exceeded' ? '초과' : q.status === 'warning' ? '경고' : '정상'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Scope */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Scope별 사용량</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Scope</th>
                  <th className="px-4 py-2 text-right font-medium">요청</th>
                  <th className="px-4 py-2 text-right font-medium">토큰</th>
                  <th className="px-4 py-2 text-right font-medium">비용</th>
                  <th className="px-4 py-2 text-right font-medium">지연</th>
                  <th className="px-4 py-2 text-right font-medium">에러</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byScope.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">데이터 없음</td></tr>
                ) : byScope.map((r) => (
                  <tr key={r.scope} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{r.scope}</td>
                    <td className="px-4 py-2 text-right">{r.requests}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{formatTokens(r.tokens)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">${r.cost.toFixed(4)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{r.latency}ms</td>
                    <td className="px-4 py-2 text-right">
                      {r.errors > 0 ? <span className="text-red-600 font-medium">{r.errors}</span> : <span className="text-gray-300">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Model */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Provider / Model별</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Provider</th>
                  <th className="px-4 py-2 text-left font-medium">Model</th>
                  <th className="px-4 py-2 text-right font-medium">요청</th>
                  <th className="px-4 py-2 text-right font-medium">토큰</th>
                  <th className="px-4 py-2 text-right font-medium">비용</th>
                  <th className="px-4 py-2 text-right font-medium">에러</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byModel.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">데이터 없음</td></tr>
                ) : byModel.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        r.provider === 'gemini' ? 'bg-blue-100 text-blue-700' :
                        r.provider === 'openai' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>{r.provider}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{r.model}</td>
                    <td className="px-4 py-2 text-right">{r.requests}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{formatTokens(r.tokens)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">${r.cost.toFixed(4)}</td>
                    <td className="px-4 py-2 text-right">
                      {r.errors > 0 ? <span className="text-red-600 font-medium">{r.errors}</span> : <span className="text-gray-300">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">최근 AI 호출 로그</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-left font-medium">Scope</th>
                <th className="px-3 py-2 text-left font-medium">Provider</th>
                <th className="px-3 py-2 text-left font-medium">Model</th>
                <th className="px-3 py-2 text-right font-medium">토큰</th>
                <th className="px-3 py-2 text-right font-medium">비용</th>
                <th className="px-3 py-2 text-right font-medium">지연</th>
                <th className="px-3 py-2 text-left font-medium">시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">로그 없음</td></tr>
              ) : recent.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    {r.status === 'success'
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <XCircle className="w-4 h-4 text-red-500" />}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{r.scope || '-'}</td>
                  <td className="px-3 py-2 text-xs">{r.provider}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.model}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{(r.totalTokens || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">
                    {r.costEstimated != null ? `$${r.costEstimated.toFixed(4)}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{r.durationMs ? `${r.durationMs}ms` : '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Components ──

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colors[color] || colors.gray}`}>{icon}</div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatQuotaValue(limitType: string, value: number): string {
  if (limitType === 'cost') return `$${value.toFixed(2)}`;
  if (limitType === 'tokens') return formatTokens(value);
  return value.toLocaleString();
}
