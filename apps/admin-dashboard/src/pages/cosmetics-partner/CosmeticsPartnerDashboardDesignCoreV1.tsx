/**
 * Cosmetics Partner Dashboard - Design Core v1.0 Variant
 *
 * Phase 4-A: Design Core Inner Page Variant Application (Cosmetics)
 *
 * This is a Design Core v1.0 variant of the Cosmetics Partner Dashboard.
 * Uses AG components from packages/ui Design Core.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

// Design Core v1.0 Components
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGKPIBlock,
  AGKPIGrid,
  AGTag,
} from '@o4o/ui';

// Icons
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
  Activity,
  ShoppingCart,
  Clock,
  Sparkles,
  LayoutDashboard,
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

interface CosmeticsPartnerDashboardDesignCoreV1Props {
  onRefresh?: () => void;
}

export default function CosmeticsPartnerDashboardDesignCoreV1({
  onRefresh,
}: CosmeticsPartnerDashboardDesignCoreV1Props) {
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
      // Demo data when API is not available
      setSummary({
        totalClicks: period === 'today' ? 245 : period === '7d' ? 1840 : 12580,
        totalConversions: period === 'today' ? 8 : period === '7d' ? 45 : 284,
        conversionRate: 2.26,
        totalEarnings: period === 'today' ? 85000 : period === '7d' ? 420000 : 1420000,
        pendingEarnings: 180000,
        availableEarnings: 1240000,
        activeLinks: 18,
        publishedRoutines: 7,
        recentLinks: [
          { id: '1', urlSlug: 'summer-skincare-2024', linkType: 'product', clicks: 245, conversions: 12, createdAt: '2024-12-10T10:00:00Z' },
          { id: '2', urlSlug: 'anti-aging-routine', linkType: 'routine', clicks: 189, conversions: 8, createdAt: '2024-12-09T15:30:00Z' },
          { id: '3', urlSlug: 'best-sunscreen-picks', linkType: 'product', clicks: 156, conversions: 5, createdAt: '2024-12-08T09:00:00Z' },
        ],
        recentEvents: [
          { id: '1', type: 'SALE', linkSlug: 'summer-skincare-2024', amount: 45000, createdAt: '2024-12-12T14:30:00Z' },
          { id: '2', type: 'CONVERSION', linkSlug: 'anti-aging-routine', createdAt: '2024-12-12T13:20:00Z' },
          { id: '3', type: 'CLICK', linkSlug: 'best-sunscreen-picks', createdAt: '2024-12-12T12:45:00Z' },
          { id: '4', type: 'SALE', linkSlug: 'summer-skincare-2024', amount: 32000, createdAt: '2024-12-12T11:30:00Z' },
          { id: '5', type: 'CLICK', linkSlug: 'anti-aging-routine', createdAt: '2024-12-12T10:15:00Z' },
        ],
        comparison: {
          clicksChange: 12.5,
          conversionsChange: 8.3,
          earningsChange: 15.2,
        },
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

  const hasNoData = !summary?.activeLinks && !summary?.publishedRoutines;

  // Period Filter Component
  const PeriodFilterButtons = () => (
    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
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
  );

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
          <AGButton
            variant="primary"
            size="sm"
            onClick={() => navigate(action.path)}
            className="mt-4"
          >
            {action.label}
          </AGButton>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AGPageHeader
          title="대시보드"
          description="파트너 성과 및 수익 현황"
          icon={<LayoutDashboard className="w-5 h-5" />}
        />
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <AGKPIGrid columns={4}>
            {[1, 2, 3, 4].map((i) => (
              <AGKPIBlock key={i} title="" value="" loading />
            ))}
          </AGKPIGrid>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header - Design Core v1.0 */}
      <AGPageHeader
        title="대시보드"
        description="파트너 성과 및 수익 현황"
        icon={<LayoutDashboard className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <PeriodFilterButtons />
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchSummary}
              iconLeft={<RefreshCw className="w-4 h-4" />}
            >
              새로고침
            </AGButton>
          </div>
        }
      />

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <AGCard padding="md" className="border-yellow-200 bg-yellow-50">
            <p className="text-yellow-800 text-sm">{error}</p>
          </AGCard>
        )}

        {/* KPI Section */}
        <AGSection title="주요 지표" spacing="sm">
          <AGKPIGrid columns={4}>
            <AGKPIBlock
              title="총 클릭수"
              value={summary?.totalClicks.toLocaleString() || '0'}
              delta={summary?.comparison?.clicksChange}
              deltaLabel="%"
              colorMode={summary?.comparison?.clicksChange && summary.comparison.clicksChange > 0 ? 'positive' : 'neutral'}
              trend={summary?.comparison?.clicksChange && summary.comparison.clicksChange > 0 ? 'up' : summary?.comparison?.clicksChange && summary.comparison.clicksChange < 0 ? 'down' : 'stable'}
              icon={<MousePointer className="w-5 h-5 text-pink-500" />}
            />
            <AGKPIBlock
              title="총 전환"
              value={summary?.totalConversions.toLocaleString() || '0'}
              subtitle={`전환율: ${summary?.conversionRate.toFixed(2)}%`}
              colorMode="info"
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            />
            <AGKPIBlock
              title="총 수익"
              value={`${summary?.totalEarnings.toLocaleString() || '0'}원`}
              delta={summary?.comparison?.earningsChange}
              deltaLabel="%"
              colorMode={summary?.comparison?.earningsChange && summary.comparison.earningsChange > 0 ? 'positive' : 'neutral'}
              trend={summary?.comparison?.earningsChange && summary.comparison.earningsChange > 0 ? 'up' : 'stable'}
              icon={<DollarSign className="w-5 h-5 text-blue-500" />}
            />
            <AGKPIBlock
              title="인출 가능"
              value={`${summary?.availableEarnings.toLocaleString() || '0'}원`}
              subtitle={`대기중: ${summary?.pendingEarnings.toLocaleString() || '0'}원`}
              colorMode="neutral"
              icon={<DollarSign className="w-5 h-5 text-orange-500" />}
            />
          </AGKPIGrid>
        </AGSection>

        {/* Content Stats Section */}
        <AGSection title="콘텐츠 현황" spacing="sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Links Card */}
            <AGCard padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-pink-500" />
                  활성 링크
                </h3>
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
                  <AGButton
                    variant="primary"
                    fullWidth
                    iconLeft={<Plus className="w-4 h-4" />}
                    onClick={() => navigate('/cosmetics-partner/links')}
                  >
                    새 링크 생성
                  </AGButton>
                </>
              )}
            </AGCard>

            {/* Published Routines Card */}
            <AGCard padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  공개 루틴
                </h3>
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
                  <AGButton
                    variant="secondary"
                    fullWidth
                    iconLeft={<Plus className="w-4 h-4" />}
                    onClick={() => navigate('/cosmetics-partner/routines')}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    새 루틴 생성
                  </AGButton>
                </>
              )}
            </AGCard>
          </div>
        </AGSection>

        {/* Recent Activity Section */}
        <AGSection title="최근 활동" spacing="sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity Log */}
            <AGCard padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-gray-500" />
                  활동 로그
                </h3>
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
                        <AGTag color="green" variant="subtle" size="sm">
                          +{event.amount.toLocaleString()}원
                        </AGTag>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AGCard>

            {/* Recent Links Performance */}
            <AGCard padding="lg">
              <h3 className="text-lg font-semibold mb-4">링크 성과</h3>

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
                        <div className="mt-1">
                          <AGTag color="gray" variant="subtle" size="sm">
                            {link.linkType}
                          </AGTag>
                        </div>
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
            </AGCard>
          </div>
        </AGSection>

        {/* Earnings Chart Placeholder */}
        <AGSection title="수익 추이" spacing="sm">
          <AGCard padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">수익 그래프</h3>
              <AGTag color="gray" variant="subtle" size="sm">
                Phase 7에서 차트 추가 예정
              </AGTag>
            </div>
            <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">수익 그래프가 여기에 표시됩니다</p>
              </div>
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
}
