/**
 * Physical Stores Page
 *
 * WO-O4O-CROSS-SERVICE-STORE-LINKING-V1
 * WO-O4O-PHYSICAL-STORE-AI-HYBRID-V1 (AI Insights block in drawer)
 *
 * Platform admin page for cross-service store linking.
 * Blocks: Sync button + list table, detail drawer with AI insights.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Store,
  ShoppingCart,
  TrendingUp,
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import PageHeader from '@/components/common/PageHeader';

// ==================== Types ====================

interface PhysicalStoreListItem {
  physicalStoreId: string;
  businessNumber: string;
  storeName: string;
  region: string | null;
  services: string[];
  monthlyRevenue: number;
  monthlyOrders: number;
}

interface ListResponse {
  items: PhysicalStoreListItem[];
  total: number;
  page: number;
  limit: number;
}

interface ServiceStoreDetail {
  serviceType: string;
  serviceStoreId: string;
  storeName: string;
  monthlyRevenue: number;
  monthlyOrders: number;
}

interface PhysicalStoreSummary {
  physicalStoreId: string;
  businessNumber: string;
  storeName: string;
  region: string | null;
  monthlyRevenue: number;
  monthlyOrders: number;
  services: ServiceStoreDetail[];
}

interface SyncResult {
  created: number;
  updated: number;
  linked: number;
}

type InsightLevel = 'positive' | 'warning' | 'info';

interface StoreInsight {
  level: InsightLevel;
  message: string;
}

interface StoreInsightsResult {
  level: InsightLevel;
  messages: string[];
  insights: StoreInsight[];
  metrics: {
    growthRate: number | null;
    serviceConcentration: number | null;
    synergyScore: number | null;
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
  if (value >= 1_000_000) return `₩${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₩${(value / 1_000).toFixed(0)}K`;
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

export default function PhysicalStoresPage() {
  const [listData, setListData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<PhysicalStoreSummary | null>(null);
  const [insights, setInsights] = useState<StoreInsightsResult | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const LIMIT = 20;

  const fetchList = useCallback(async (p: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authClient.api.get<{ success: boolean; data: ListResponse }>(
        `/v1/admin/physical-stores?page=${p}&limit=${LIMIT}`,
      );
      if (res.data.success) {
        setListData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch physical stores:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(page);
  }, [fetchList, page]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await authClient.api.post<{ success: boolean; data: SyncResult }>(
        '/v1/admin/physical-stores/sync',
      );
      if (res.data.success) {
        const d = res.data.data;
        setSyncMessage(`Sync complete: ${d.created} created, ${d.updated} updated, ${d.linked} linked`);
        fetchList(page);
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncMessage(`Sync failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRowClick = async (id: string) => {
    setSelectedId(id);
    setDrawerLoading(true);
    setSummary(null);
    setInsights(null);
    try {
      const [summaryRes, insightsRes] = await Promise.all([
        authClient.api.get<{ success: boolean; data: PhysicalStoreSummary }>(
          `/v1/admin/physical-stores/${id}/summary`,
        ),
        authClient.api.get<{ success: boolean; data: StoreInsightsResult }>(
          `/v1/admin/physical-stores/${id}/insights`,
        ),
      ]);
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
      if (insightsRes.data.success) {
        setInsights(insightsRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch store detail:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const totalPages = listData ? Math.ceil(listData.total / LIMIT) : 0;

  if (loading && !listData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error && !listData) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-lg font-medium">Failed to load physical stores</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchList(page)}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Physical Stores"
        subtitle="Cross-service store linking by business number"
        actions={[
          {
            id: 'sync',
            label: syncing ? 'Syncing...' : 'Sync Stores',
            icon: <Link2 className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />,
            onClick: handleSync,
            variant: 'primary',
            disabled: syncing,
          },
          {
            id: 'refresh',
            label: 'Refresh',
            icon: <RefreshCw className="w-4 h-4" />,
            onClick: () => fetchList(page),
            variant: 'secondary',
          },
        ]}
      />

      {/* Sync message */}
      {syncMessage && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          syncMessage.startsWith('Sync complete')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {syncMessage}
        </div>
      )}

      {/* Store list table */}
      {listData && listData.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-3 pr-4 font-medium w-10">#</th>
                  <th className="py-3 pr-4 font-medium">Store Name</th>
                  <th className="py-3 pr-4 font-medium">Business Number</th>
                  <th className="py-3 pr-4 font-medium">Services</th>
                  <th className="py-3 pr-4 font-medium text-right">Revenue</th>
                  <th className="py-3 font-medium text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {listData.items.map((store, idx) => (
                  <tr
                    key={store.physicalStoreId}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(store.physicalStoreId)}
                  >
                    <td className="py-3 pr-4 text-gray-400 font-medium">
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {store.storeName}
                      {store.region && (
                        <span className="ml-2 text-xs text-gray-400">{store.region}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 font-mono text-xs">
                      {store.businessNumber}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-1 flex-wrap">
                        {store.services.map((svc) => (
                          <span
                            key={svc}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              SERVICE_COLORS[svc] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {SERVICE_LABELS[svc] || svc}
                          </span>
                        ))}
                        {store.services.length >= 2 && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Multi
                          </span>
                        )}
                      </div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {listData.total} stores total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {listData && listData.items.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No physical stores linked</p>
          <p className="text-sm mt-1">Click "Sync Stores" to link stores by business number.</p>
        </div>
      )}

      {/* Detail drawer */}
      {selectedId && (
        <DetailDrawer
          summary={summary}
          insights={insights}
          loading={drawerLoading}
          onClose={() => {
            setSelectedId(null);
            setSummary(null);
            setInsights(null);
          }}
        />
      )}
    </div>
  );
}

// ==================== Sub-components ====================

function DetailDrawer({
  summary,
  insights,
  loading,
  onClose,
}: {
  summary: PhysicalStoreSummary | null;
  insights: StoreInsightsResult | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-xl border-l border-gray-200 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Store Detail</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && summary && (
            <>
              {/* Store info */}
              <div>
                <h3 className="text-xl font-bold text-gray-900">{summary.storeName}</h3>
                <p className="text-sm text-gray-500 font-mono mt-1">{summary.businessNumber}</p>
                {summary.region && (
                  <p className="text-sm text-gray-400 mt-0.5">{summary.region}</p>
                )}
              </div>

              {/* Unified KPI cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-500">Monthly Revenue</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(summary.monthlyRevenue)}
                  </p>
                  {insights?.metrics.growthRate !== null && insights?.metrics.growthRate !== undefined && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      MoM: {formatPct(insights.metrics.growthRate)}
                    </p>
                  )}
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-gray-500">Monthly Orders</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(summary.monthlyOrders)}
                  </p>
                </div>
              </div>

              {/* AI Insights Block */}
              {insights && insights.insights.length > 0 && (
                <InsightsBlock insights={insights} />
              )}

              {/* Per-service breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Service Breakdown</h4>
                <div className="space-y-3">
                  {summary.services.map((svc) => (
                    <div
                      key={`${svc.serviceType}-${svc.serviceStoreId}`}
                      className="border border-gray-100 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            SERVICE_COLORS[svc.serviceType] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {SERVICE_LABELS[svc.serviceType] || svc.serviceType}
                        </span>
                        <span className="text-xs text-gray-400">{svc.storeName}</span>
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
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-service indicator */}
              {summary.services.length >= 2 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
                  <Store className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                  This store operates across {summary.services.length} services
                </div>
              )}
            </>
          )}

          {!loading && !summary && (
            <div className="text-center text-gray-400 py-12">
              <p>Failed to load store details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightsBlock({ insights }: { insights: StoreInsightsResult }) {
  const style = LEVEL_STYLES[insights.level];

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-5`}>
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Brain className="w-4 h-4" />
        AI Insights
      </h4>

      {/* Metric pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {insights.metrics.growthRate !== null && (
          <MetricPill
            label="Growth"
            value={formatPct(insights.metrics.growthRate)}
            positive={insights.metrics.growthRate >= 0}
          />
        )}
        {insights.metrics.serviceConcentration !== null && (
          <MetricPill
            label="Top Svc"
            value={`${(insights.metrics.serviceConcentration * 100).toFixed(0)}%`}
            positive={insights.metrics.serviceConcentration < 0.70}
          />
        )}
        {insights.metrics.synergyScore !== null && (
          <MetricPill
            label="Synergy"
            value={`${(insights.metrics.synergyScore * 100).toFixed(0)}%`}
            positive={insights.metrics.synergyScore >= 0.5}
          />
        )}
      </div>

      {/* Insight messages */}
      <ul className="space-y-1.5">
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
    <div className="bg-white/70 rounded-lg px-2.5 py-1 border border-gray-200/50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`ml-1.5 text-sm font-semibold ${positive ? 'text-green-700' : 'text-amber-700'}`}>
        {value}
      </span>
    </div>
  );
}
