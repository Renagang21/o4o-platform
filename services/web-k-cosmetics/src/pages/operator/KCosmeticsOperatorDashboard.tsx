/**
 * KCosmeticsOperatorDashboard - Signal 기반 운영자 대시보드
 *
 * WO-K-COSMETICS-OPERATOR-DASHBOARD-UX-V1
 * KPA-c BranchOperatorDashboard 패턴 재사용
 *
 * 구조:
 *  [ Hero Summary ]     — 매장 운영 상태 배지 (3초 판단)
 *  [ Action Signals ]   — 행동 유도 카드 3장
 *  [ Recent Activity ]  — 최근 운영 활동 5건
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Store,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  FileText,
  Users,
} from 'lucide-react';
import { operatorApi, type OperatorDashboardSummary } from '@/services/operatorApi';

// ─── Signal types ───

type SignalStatus = 'good' | 'warning' | 'alert';

interface Signal {
  status: SignalStatus;
  message: string;
}

// ─── Signal derivation (pure functions) ───

function getOverallStatus(data: OperatorDashboardSummary | null): SignalStatus {
  if (!data) return 'alert';

  const areas = [
    data.stats.totalStores > 0,
    data.stats.activeOrders > 0 || (data.recentOrders?.length || 0) > 0,
    data.stats.newSignups > 0 || data.stats.totalStores > 0,
  ];
  const active = areas.filter(Boolean).length;
  if (active === 3) return 'good';
  if (active >= 1) return 'warning';
  return 'alert';
}

function getStoreSignal(data: OperatorDashboardSummary | null): Signal {
  if (!data) return { status: 'alert', message: '데이터 없음' };

  const { totalStores } = data.stats;
  const pendingApps = data.recentApplications?.filter(a =>
    a.status === '승인대기' || a.status === '검토중' || a.status === '서류심사'
  ).length || 0;

  if (totalStores === 0) {
    return { status: 'alert', message: '등록된 매장 없음 — 초기 상태' };
  }
  if (pendingApps > 0) {
    return { status: 'warning', message: `매장 ${totalStores}개 · 승인 대기 ${pendingApps}건` };
  }
  return { status: 'good', message: `매장 ${totalStores}개 활성` };
}

function getOrderSignal(data: OperatorDashboardSummary | null): Signal {
  if (!data) return { status: 'alert', message: '데이터 없음' };

  const { activeOrders } = data.stats;
  const hasOrders = (data.recentOrders?.length || 0) > 0;

  if (activeOrders === 0 && !hasOrders) {
    return { status: 'alert', message: '주문 내역 없음' };
  }
  if (activeOrders > 5) {
    return { status: 'warning', message: `처리 대기 주문 ${activeOrders}건` };
  }
  return { status: 'good', message: `활성 주문 ${activeOrders}건 정상` };
}

function getOperatorSignal(): Signal {
  return { status: 'good', message: '운영자 계정 관리' };
}

// ─── Status config ───

const STATUS_CONFIG: Record<
  SignalStatus,
  { label: string; subtitle: string; color: string; bgColor: string; Icon: typeof CheckCircle }
> = {
  good: { label: '정상', subtitle: '운영 상태가 안정적입니다', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', Icon: CheckCircle },
  warning: { label: '주의', subtitle: '확인이 필요한 항목이 있습니다', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', Icon: AlertTriangle },
  alert: { label: '점검 필요', subtitle: '즉시 조치가 필요합니다', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', Icon: AlertCircle },
};

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface ActivityItem {
  id: string;
  type: 'order' | 'application';
  title: string;
  detail: string;
  date: string;
}

function buildActivityFeed(data: OperatorDashboardSummary): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const order of data.recentOrders || []) {
    items.push({
      id: `o-${order.id}`,
      type: 'order',
      title: `${order.store} — ${order.amount}`,
      detail: order.status,
      date: order.time,
    });
  }
  for (const app of data.recentApplications || []) {
    items.push({
      id: `a-${app.name}-${app.date}`,
      type: 'application',
      title: app.name,
      detail: `${app.type} · ${app.status}`,
      date: app.date,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items.slice(0, 5);
}

// ─── Sub-components ───

function StatusDot({ label, status }: { label: string; status: SignalStatus }) {
  const dotColor: Record<SignalStatus, string> = {
    good: 'bg-green-500',
    warning: 'bg-amber-500',
    alert: 'bg-red-500',
  };
  const textColor: Record<SignalStatus, string> = {
    good: 'text-green-600',
    warning: 'text-amber-600',
    alert: 'text-red-600',
  };
  return (
    <span className={`flex items-center gap-1.5 ${textColor[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor[status]}`} />
      {label}
    </span>
  );
}

function ActionSignalCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  signal,
  actionLabel,
  actionHref,
  loading,
}: {
  icon: typeof Store;
  iconBg: string;
  iconColor: string;
  title: string;
  signal: Signal;
  actionLabel: string;
  actionHref: string;
  loading: boolean;
}) {
  const signalBg: Record<SignalStatus, string> = {
    good: 'bg-green-50',
    warning: 'bg-amber-50',
    alert: 'bg-red-50',
  };
  const signalText: Record<SignalStatus, string> = {
    good: 'text-green-700',
    warning: 'text-amber-700',
    alert: 'text-red-700',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse">
        <div className="h-10 w-10 bg-slate-200 rounded-xl mb-4" />
        <div className="h-5 bg-slate-200 rounded w-24 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-40 mb-4" />
        <div className="h-9 bg-slate-200 rounded w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>

      <div className={`rounded-lg px-3 py-2 mb-4 ${signalBg[signal.status]}`}>
        <p className={`text-sm font-medium ${signalText[signal.status]}`}>{signal.message}</p>
      </div>

      <Link
        to={actionHref}
        className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors text-sm"
      >
        {actionLabel}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ─── Main component ───

export default function KCosmeticsOperatorDashboard() {
  const [summary, setSummary] = useState<OperatorDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operatorApi.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overall = getOverallStatus(summary);
  const storeSignal = getStoreSignal(summary);
  const orderSignal = getOrderSignal(summary);
  const operatorSignal = getOperatorSignal();
  const feed = summary ? buildActivityFeed(summary) : [];

  const HeroConfig = STATUS_CONFIG[overall];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">매장 운영 현황을 한눈에 확인하세요</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Hero Summary */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-48 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-64" />
        </div>
      )}

      {!loading && summary && (
        <div className={`rounded-2xl border p-5 ${HeroConfig.bgColor}`}>
          <div className="flex items-center gap-3">
            <HeroConfig.Icon className={`w-6 h-6 ${HeroConfig.color}`} />
            <div>
              <span className={`text-lg font-semibold ${HeroConfig.color}`}>
                매장 운영 상태: {HeroConfig.label}
              </span>
              <p className={`text-sm mt-0.5 ${HeroConfig.color} opacity-80`}>{HeroConfig.subtitle}</p>
              <div className="flex gap-4 mt-1 text-sm">
                <StatusDot label="매장" status={storeSignal.status} />
                <StatusDot label="주문" status={orderSignal.status} />
                <StatusDot label="운영" status={operatorSignal.status} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Signal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ActionSignalCard
          icon={Store}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
          title="매장 상태"
          signal={storeSignal}
          actionLabel="매장 관리"
          actionHref="/operator/stores"
          loading={loading}
        />
        <ActionSignalCard
          icon={ShoppingCart}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="주문 상태"
          signal={orderSignal}
          actionLabel="주문 관리"
          actionHref="/operator/orders"
          loading={loading}
        />
        <ActionSignalCard
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          title="운영자 상태"
          signal={operatorSignal}
          actionLabel="회원 관리"
          actionHref="/operator/users"
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">최근 운영 활동</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">로딩 중...</div>
        ) : feed.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle size={40} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-400 text-sm">최근 활동이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feed.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.type === 'order' ? 'bg-pink-50' : 'bg-amber-50'
                  }`}
                >
                  {item.type === 'order' ? (
                    <Package className="w-4 h-4 text-pink-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.detail}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(item.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
