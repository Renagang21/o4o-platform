/**
 * Cosmetics Partner Dashboard
 *
 * 화장품 파트너/인플루언서 대시보드
 * - KPI 요약: 총 클릭수, 전환수, 수익
 * - 기간 필터 (오늘/7일/30일/전체)
 * - 최근 활동 로그
 * - Empty state 지원
 *
 * Phase 6-E: UX Enhancement
 *
 * @variant default - Original UI implementation
 * @variant design-core-v1 - Design Core v1.0 UI (Phase 4-A Cosmetics)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { AppGuard } from '@/components/common/AppGuard';

// ViewVariant type definition for Design Core transition
type ViewVariant = 'default' | 'design-core-v1';

// Design Core v1.0 Variant
import CosmeticsPartnerDashboardDesignCoreV1 from './CosmeticsPartnerDashboardDesignCoreV1';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Link2,
  MousePointer,
  Eye,
  RefreshCw,
  ArrowRight,
  Plus,
  ExternalLink,
  Calendar,
  Activity,
  ShoppingCart,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardSummary {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalEarnings: number;
  pendingEarnings: number;
  availableEarnings: number;
  activeLinks: number;
  publishedRoutines: number;
  recentLinks: {
    id: string;
    urlSlug: string;
    linkType: string;
    clicks: number;
    conversions: number;
    createdAt: string;
  }[];
  recentEvents: {
    id: string;
    type: 'CLICK' | 'CONVERSION' | 'SALE';
    linkSlug?: string;
    amount?: number;
    createdAt: string;
  }[];
  comparison?: {
    clicksChange: number;
    conversionsChange: number;
    earningsChange: number;
  };
}

type PeriodFilter = 'today' | '7d' | '30d' | 'all';

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'all', label: '전체' },
];

const CosmeticsPartnerDashboardContent: React.FC = () => {
  const api = authClient.api;
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/partner/dashboard/summary?period=${period}`);
      if (response.data?.data) {
        setSummary(response.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch dashboard summary:', err);
      // API failure: set error state and empty summary
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
      setSummary({
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        availableEarnings: 0,
        activeLinks: 0,
        publishedRoutines: 0,
        recentLinks: [],
        recentEvents: [],
        comparison: undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [api, period]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const getEventIcon = (type: 'CLICK' | 'CONVERSION' | 'SALE') => {
    switch (type) {
      case 'CLICK':
        return <MousePointer className="w-4 h-4 text-blue-500" />;
      case 'CONVERSION':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'SALE':
        return <ShoppingCart className="w-4 h-4 text-pink-500" />;
    }
  };

  const getEventLabel = (type: 'CLICK' | 'CONVERSION' | 'SALE') => {
    switch (type) {
      case 'CLICK':
        return '클릭';
      case 'CONVERSION':
        return '전환';
      case 'SALE':
        return '판매';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  const renderChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <span className="flex items-center text-xs text-green-600">
          <TrendingUp className="w-3 h-3 mr-0.5" />
          +{change.toFixed(1)}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-xs text-red-600">
          <TrendingDown className="w-3 h-3 mr-0.5" />
          {change.toFixed(1)}%
        </span>
      );
    }
    return <span className="text-xs text-gray-400">-</span>;
  };

  // Empty State Component
  const EmptyState: React.FC<{ type: 'links' | 'routines' | 'events' }> = ({ type }) => {
    const config = {
      links: {
        icon: <Link2 className="w-12 h-12 text-gray-300" />,
        title: '아직 추천 링크가 없습니다',
        description: '제품을 선택하고 첫 번째 추천 링크를 만들어보세요!',
        action: { label: '링크 만들기', path: '/cosmetics-partner/links' },
      },
      routines: {
        icon: <Sparkles className="w-12 h-12 text-gray-300" />,
        title: '공개된 루틴이 없습니다',
        description: '나만의 스킨케어 루틴을 공유해보세요!',
        action: { label: '루틴 만들기', path: '/cosmetics-partner/routines' },
      },
      events: {
        icon: <Activity className="w-12 h-12 text-gray-300" />,
        title: '최근 활동이 없습니다',
        description: '링크를 공유하면 활동 로그가 표시됩니다.',
        action: null,
      },
    };

    const { icon, title, description, action } = config[type];

    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        {icon}
        <h3 className="mt-4 text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        {action && (
          <button
            onClick={() => navigate(action.path)}
            className="mt-4 px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700"
          >
            {action.label}
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const hasNoData = !summary?.activeLinks && !summary?.publishedRoutines;

  return (
    <div className="space-y-6">
      {/* Header with Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 text-sm mt-1">파트너 성과 및 수익 현황</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Filter */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === option.value
                    ? 'bg-pink-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchSummary}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 클릭수</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary?.totalClicks.toLocaleString()}
              </p>
              {summary?.comparison && renderChangeIndicator(summary.comparison.clicksChange)}
            </div>
            <div className="w-12 h-12 bg-pink-50 rounded-lg flex items-center justify-center">
              <MousePointer className="w-6 h-6 text-pink-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 전환</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary?.totalConversions.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                전환율: {summary?.conversionRate.toFixed(2)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 수익</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {summary?.totalEarnings.toLocaleString()}원
              </p>
              {summary?.comparison && renderChangeIndicator(summary.comparison.earningsChange)}
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">인출 가능</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {summary?.availableEarnings.toLocaleString()}원
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                대기중: {summary?.pendingEarnings.toLocaleString()}원
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Links Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-pink-500" />
              활성 링크
            </h2>
            <Link
              to="/cosmetics-partner/links"
              className="text-pink-600 hover:text-pink-700 flex items-center gap-1 text-sm font-medium"
            >
              전체보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {hasNoData ? (
            <EmptyState type="links" />
          ) : (
            <>
              <div className="text-center py-4 mb-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg">
                <p className="text-4xl font-bold text-pink-600">
                  {summary?.activeLinks}
                </p>
                <p className="text-gray-600 text-sm">개의 추적 링크</p>
              </div>
              <Link
                to="/cosmetics-partner/links"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                새 링크 생성
              </Link>
            </>
          )}
        </div>

        {/* Published Routines Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-500" />
              공개 루틴
            </h2>
            <Link
              to="/cosmetics-partner/routines"
              className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-sm font-medium"
            >
              전체보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {!summary?.publishedRoutines ? (
            <EmptyState type="routines" />
          ) : (
            <>
              <div className="text-center py-4 mb-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
                <p className="text-4xl font-bold text-purple-600">
                  {summary?.publishedRoutines}
                </p>
                <p className="text-gray-600 text-sm">개 공개됨</p>
              </div>
              <Link
                to="/cosmetics-partner/routines"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                새 루틴 생성
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity & Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Log */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              최근 활동
            </h2>
          </div>

          {!summary?.recentEvents?.length ? (
            <EmptyState type="events" />
          ) : (
            <div className="space-y-3">
              {summary.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                      {getEventIcon(event.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getEventLabel(event.type)}
                        {event.linkSlug && (
                          <span className="text-gray-500 font-normal"> - {event.linkSlug}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(event.createdAt)}
                      </p>
                    </div>
                  </div>
                  {event.amount && (
                    <span className="text-sm font-semibold text-green-600">
                      +{event.amount.toLocaleString()}원
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Links Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold mb-4">링크 성과</h2>

          {!summary?.recentLinks?.length ? (
            <EmptyState type="links" />
          ) : (
            <div className="space-y-3">
              {summary.recentLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                      {link.urlSlug}
                      <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                        {link.linkType}
                      </span>
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm">
                      <span className="text-blue-600 font-semibold">{link.clicks}</span>
                      <span className="text-gray-400 ml-1">클릭</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-green-600 font-semibold">{link.conversions}</span>
                      <span className="text-gray-400 ml-1">전환</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Earnings Chart Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">수익 추이</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            Phase 7에서 차트 추가 예정
          </span>
        </div>
        <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">수익 그래프가 여기에 표시됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Wrapped export with AppGuard
 * Only renders dashboard content if cosmetics-partner app is installed
 */
interface CosmeticsPartnerDashboardProps {
  variant?: ViewVariant;
}

const CosmeticsPartnerDashboard: React.FC<CosmeticsPartnerDashboardProps> = ({
  variant = 'default',
}) => (
  <AppGuard appId="cosmetics-partner" appName="화장품 파트너">
    {variant === 'design-core-v1' ? (
      <CosmeticsPartnerDashboardDesignCoreV1 />
    ) : (
      <CosmeticsPartnerDashboardContent />
    )}
  </AppGuard>
);

export default CosmeticsPartnerDashboard;
