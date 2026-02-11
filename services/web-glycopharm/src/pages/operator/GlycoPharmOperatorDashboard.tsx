/**
 * GlycoPharmOperatorDashboard - Signal 기반 운영자 대시보드
 *
 * WO-GLYCOPHARM-OPERATOR-DASHBOARD-UX-V1
 * KPA-c BranchOperatorDashboard 패턴 재사용
 *
 * 구조:
 *  [ Hero Summary ]     — 서비스 상태 배지 (3초 판단)
 *  [ Action Signals ]   — 행동 유도 카드 3장
 *  [ Recent Status ]    — 주요 운영 지표 5건
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  MessageSquare,
  Monitor,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Package,
  Store,
  FileText,
} from 'lucide-react';
import { glycopharmApi, type OperatorDashboardData } from '@/api/glycopharm';

// ─── Signal types ───

type SignalStatus = 'good' | 'warning' | 'alert';

interface Signal {
  status: SignalStatus;
  message: string;
}

// ─── Signal derivation (pure functions) ───

function getOverallStatus(data: OperatorDashboardData | null): SignalStatus {
  if (!data) return 'alert';

  const areas = [
    data.serviceStatus.activePharmacies > 0,
    data.forumStatus.totalPosts > 0,
    data.contentStatus.hero.total > 0 || data.contentStatus.featured.total > 0,
  ];
  const active = areas.filter(Boolean).length;
  if (active === 3) return 'good';
  if (active >= 1) return 'warning';
  return 'alert';
}

function getStoreSignal(data: OperatorDashboardData | null): Signal {
  if (!data) return { status: 'alert', message: '데이터 없음' };

  const { storeStatus, serviceStatus } = data;

  if (storeStatus.pendingApprovals > 0) {
    return {
      status: 'warning',
      message: `승인 대기 ${storeStatus.pendingApprovals}건 · 활성 스토어 ${storeStatus.activeStores}개`,
    };
  }
  if (storeStatus.activeStores === 0 && serviceStatus.activePharmacies === 0) {
    return { status: 'alert', message: '등록된 약국/스토어 없음' };
  }
  return {
    status: 'good',
    message: `약국 ${serviceStatus.activePharmacies}개 · 스토어 ${storeStatus.activeStores}개 활성`,
  };
}

function getForumSignal(data: OperatorDashboardData | null): Signal {
  if (!data) return { status: 'alert', message: '데이터 없음' };

  const { forumStatus } = data;
  if (forumStatus.totalPosts === 0 && forumStatus.open === 0) {
    return { status: 'alert', message: '포럼 게시글 없음 — 초기 상태' };
  }
  if (forumStatus.open === 0) {
    return { status: 'warning', message: `게시글 ${forumStatus.totalPosts}개 · 공개 포럼 없음` };
  }
  return {
    status: 'good',
    message: `공개 ${forumStatus.open}개 · 게시글 ${forumStatus.totalPosts}개 활성`,
  };
}

function getContentSignal(data: OperatorDashboardData | null): Signal {
  if (!data) return { status: 'alert', message: '데이터 없음' };

  const { contentStatus } = data;
  const totalContent = contentStatus.hero.total + contentStatus.featured.total + contentStatus.eventNotice.total;

  if (totalContent === 0) {
    return { status: 'alert', message: '등록된 콘텐츠 없음' };
  }
  if (contentStatus.hero.active === 0) {
    return { status: 'warning', message: `콘텐츠 ${totalContent}개 · Hero 미설정` };
  }
  return {
    status: 'good',
    message: `Hero ${contentStatus.hero.active}개 · Featured ${contentStatus.featured.total}개 · 이벤트 ${contentStatus.eventNotice.active}개`,
  };
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

interface StatusItem {
  id: string;
  icon: typeof Store;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}

function buildStatusFeed(data: OperatorDashboardData): StatusItem[] {
  return [
    {
      id: 'pharmacies',
      icon: Store,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      label: '활성 약국',
      value: `${data.serviceStatus.activePharmacies}개`,
    },
    {
      id: 'stores',
      icon: ShoppingBag,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      label: '운영 중 스토어',
      value: `${data.storeStatus.activeStores}개`,
    },
    {
      id: 'products',
      icon: Package,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
      label: '등록 상품',
      value: `${data.productStats.total}개 (활성 ${data.productStats.active}개)`,
    },
    {
      id: 'orders',
      icon: FileText,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      label: '총 주문',
      value: `${data.orderStats.totalOrders}건`,
    },
    {
      id: 'forums',
      icon: MessageSquare,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      label: '포럼 게시물',
      value: `${data.forumStatus.totalPosts}개`,
    },
  ];
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
  icon: typeof Monitor;
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

export default function GlycoPharmOperatorDashboard() {
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await glycopharmApi.getOperatorDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overall = getOverallStatus(data);
  const storeSignal = getStoreSignal(data);
  const forumSignal = getForumSignal(data);
  const contentSignal = getContentSignal(data);
  const feed = data ? buildStatusFeed(data) : [];

  const HeroConfig = STATUS_CONFIG[overall];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">약국 네트워크 운영 현황을 한눈에 확인하세요</p>
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

      {!loading && data && (
        <div className={`rounded-2xl border p-5 ${HeroConfig.bgColor}`}>
          <div className="flex items-center gap-3">
            <HeroConfig.Icon className={`w-6 h-6 ${HeroConfig.color}`} />
            <div>
              <span className={`text-lg font-semibold ${HeroConfig.color}`}>
                서비스 운영 상태: {HeroConfig.label}
              </span>
              <p className={`text-sm mt-0.5 ${HeroConfig.color} opacity-80`}>{HeroConfig.subtitle}</p>
              <div className="flex gap-4 mt-1 text-sm">
                <StatusDot label="스토어" status={storeSignal.status} />
                <StatusDot label="포럼" status={forumSignal.status} />
                <StatusDot label="콘텐츠" status={contentSignal.status} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Signal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ActionSignalCard
          icon={ShoppingBag}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          title="스토어 상태"
          signal={storeSignal}
          actionLabel="스토어 관리"
          actionHref="/operator/store-approvals"
          loading={loading}
        />
        <ActionSignalCard
          icon={MessageSquare}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="포럼 상태"
          signal={forumSignal}
          actionLabel="포럼 관리"
          actionHref="/operator/forum-management"
          loading={loading}
        />
        <ActionSignalCard
          icon={Monitor}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          title="콘텐츠 상태"
          signal={contentSignal}
          actionLabel="콘텐츠 관리"
          actionHref="/operator/store-template"
          loading={loading}
        />
      </div>

      {/* Status Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">주요 운영 지표</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">로딩 중...</div>
        ) : feed.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle size={40} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-400 text-sm">운영 데이터가 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feed.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.id} className="p-4 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconBg}`}
                  >
                    <ItemIcon className={`w-4 h-4 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 flex-shrink-0">{item.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Link to detailed cockpit */}
      <div className="text-center">
        <Link
          to="/operator/analytics"
          className="text-sm text-slate-500 hover:text-primary-600 transition-colors"
        >
          상세 분석 보기 →
        </Link>
      </div>
    </div>
  );
}
