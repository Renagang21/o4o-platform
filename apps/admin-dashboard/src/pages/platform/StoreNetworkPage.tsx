/**
 * Store Network Dashboard Page
 *
 * WO-O4O-STORE-NETWORK-DASHBOARD-V1
 * WO-O4O-STORE-NETWORK-AI-HYBRID-V1 (Block 5: AI Insights)
 *
 * Platform admin view aggregating KPI data across all store services.
 * Blocks: Network KPI Cards, Service Comparison, Top Stores, AI Insights
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  Building2,
  Trophy,
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import PageHeader from '@/components/common/PageHeader';

// ==================== Types ====================

interface ServiceBreakdown {
  serviceType: string;
  storeCount: number;
  monthlyRevenue: number;
  monthlyOrders: number;
}

interface NetworkSummary {
  totalStores: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  serviceBreakdown: ServiceBreakdown[];
}

interface TopStore {
  storeId: string;
  storeName: string;
  serviceType: string;
  monthlyRevenue: number;
  monthlyOrders: number;
}

type InsightLevel = 'positive' | 'warning' | 'info';

interface NetworkInsight {
  level: InsightLevel;
  message: string;
}

interface NetworkInsightsResult {
  level: InsightLevel;
  messages: string[];
  insights: NetworkInsight[];
  metrics: {
    growthRate: number | null;
    orderGrowthRate: number | null;
    concentrationIndex: number | null;
  };
}

// ==================== Helpers ====================

const SERVICE_LABELS: Record<string, string> = {
  cosmetics: 'K-Cosmetics',
  glycopharm: 'GlycoPharm',
};

const SERVICE_COLORS: Record<string, string> = {
  cosmetics: 'bg-pink-100 text-pink-800',
  glycopharm: 'bg-blue-100 text-blue-800',
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `₩${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `₩${(value / 1_000).toFixed(0)}K`;
  }
  return `₩${value.toLocaleString()}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatPct(ratio: number | null): string {
  if (ratio === null) return 'N/A';
  const sign = ratio >= 0 ? '+' : '';
  return `${sign}${(ratio * 100).toFixed(1)}%`;
}

const LEVEL_STYLES: Record<InsightLevel, { bg: string; border: string; icon: typeof CheckCircle }> = {
  positive: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info },
};

const LEVEL_ICON_COLORS: Record<InsightLevel, string> = {
  positive: 'text-green-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

// ==================== Component ====================

export default function StoreNetworkPage() {
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [topStores, setTopStores] = useState<TopStore[]>([]);
  const [insights, setInsights] = useState<NetworkInsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, topStoresRes, insightsRes] = await Promise.all([
        authClient.api.get<{ success: boolean; data: NetworkSummary }>(
          '/v1/admin/store-network/summary',
        ),
        authClient.api.get<{ success: boolean; data: TopStore[] }>(
          '/v1/admin/store-network/top-stores?limit=10',
        ),
        authClient.api.get<{ success: boolean; data: NetworkInsightsResult }>(
          '/v1/admin/store-network/insights',
        ),
      ]);

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
      if (topStoresRes.data.success) {
        setTopStores(topStoresRes.data.data);
      }
      if (insightsRes.data.success) {
        setInsights(insightsRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch store network data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !summary) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-lg font-medium">Failed to load store network data</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const maxRevenue = summary
    ? Math.max(...summary.serviceBreakdown.map((s) => s.monthlyRevenue), 1)
    : 1;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Store Network"
        subtitle="Cross-service store KPI overview"
        actions={[
          {
            id: 'refresh',
            label: 'Refresh',
            icon: <RefreshCw className="w-4 h-4" />,
            onClick: fetchData,
            variant: 'secondary',
          },
        ]}
      />

      {/* Block 1: Network KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            icon={<Store className="w-5 h-5 text-indigo-600" />}
            label="Total Stores"
            value={formatNumber(summary.totalStores)}
            bgColor="bg-indigo-50"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            label="Monthly Revenue"
            value={formatCurrency(summary.monthlyRevenue)}
            bgColor="bg-green-50"
            subtext={insights?.metrics.growthRate !== null && insights?.metrics.growthRate !== undefined
              ? `MoM: ${formatPct(insights.metrics.growthRate)}`
              : undefined}
          />
          <KpiCard
            icon={<ShoppingCart className="w-5 h-5 text-amber-600" />}
            label="Monthly Orders"
            value={formatNumber(summary.monthlyOrders)}
            bgColor="bg-amber-50"
            subtext={insights?.metrics.orderGrowthRate !== null && insights?.metrics.orderGrowthRate !== undefined
              ? `MoM: ${formatPct(insights.metrics.orderGrowthRate)}`
              : undefined}
          />
        </div>
      )}

      {/* Block 5: Network AI Insights */}
      {insights && insights.insights.length > 0 && (
        <InsightsBlock insights={insights} />
      )}

      {/* Block 2: Service Comparison */}
      {summary && summary.serviceBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Service Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.serviceBreakdown.map((svc) => (
              <div
                key={svc.serviceType}
                className="border border-gray-100 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${SERVICE_COLORS[svc.serviceType] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {SERVICE_LABELS[svc.serviceType] || svc.serviceType}
                  </span>
                  <span className="text-sm text-gray-500">
                    {svc.storeCount} stores
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Revenue</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(svc.monthlyRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Orders</p>
                    <p className="font-semibold text-gray-900">
                      {formatNumber(svc.monthlyOrders)}
                    </p>
                  </div>
                </div>
                {/* Revenue bar */}
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${svc.serviceType === 'cosmetics' ? 'bg-pink-400' : 'bg-blue-400'}`}
                    style={{
                      width: `${Math.max((svc.monthlyRevenue / maxRevenue) * 100, 2)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block 3: Top Stores Table */}
      {topStores.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top Stores by Monthly Revenue
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-3 pr-4 font-medium w-10">#</th>
                  <th className="py-3 pr-4 font-medium">Store</th>
                  <th className="py-3 pr-4 font-medium">Service</th>
                  <th className="py-3 pr-4 font-medium text-right">Revenue</th>
                  <th className="py-3 font-medium text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {topStores.map((store, idx) => (
                  <tr
                    key={store.storeId}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-4 text-gray-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {store.storeName}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${SERVICE_COLORS[store.serviceType] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {SERVICE_LABELS[store.serviceType] || store.serviceType}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-gray-900">
                      {formatCurrency(store.monthlyRevenue)}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {formatNumber(store.monthlyOrders)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {summary && summary.totalStores === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No active stores</p>
          <p className="text-sm mt-1">Store data will appear once stores are approved.</p>
        </div>
      )}
    </div>
  );
}

// ==================== Sub-components ====================

function KpiCard({
  icon,
  label,
  value,
  bgColor,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`${bgColor} p-2.5 rounded-lg`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightsBlock({ insights }: { insights: NetworkInsightsResult }) {
  const style = LEVEL_STYLES[insights.level];

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-6`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5" />
        Network Insights
      </h2>

      {/* Metric pills */}
      <div className="flex flex-wrap gap-3 mb-4">
        {insights.metrics.growthRate !== null && (
          <MetricPill
            label="Revenue Growth"
            value={formatPct(insights.metrics.growthRate)}
            positive={insights.metrics.growthRate >= 0}
          />
        )}
        {insights.metrics.orderGrowthRate !== null && (
          <MetricPill
            label="Order Growth"
            value={formatPct(insights.metrics.orderGrowthRate)}
            positive={insights.metrics.orderGrowthRate >= 0}
          />
        )}
        {insights.metrics.concentrationIndex !== null && (
          <MetricPill
            label="Top 3 Concentration"
            value={`${(insights.metrics.concentrationIndex * 100).toFixed(0)}%`}
            positive={insights.metrics.concentrationIndex < 0.6}
          />
        )}
      </div>

      {/* Insight messages */}
      <ul className="space-y-2">
        {insights.insights.map((insight, idx) => {
          const IconComponent = LEVEL_STYLES[insight.level].icon;
          return (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${LEVEL_ICON_COLORS[insight.level]}`} />
              <span>{insight.message}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MetricPill({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="bg-white/70 rounded-lg px-3 py-1.5 border border-gray-200/50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`ml-2 text-sm font-semibold ${positive ? 'text-green-700' : 'text-amber-700'}`}>
        {value}
      </span>
    </div>
  );
}
