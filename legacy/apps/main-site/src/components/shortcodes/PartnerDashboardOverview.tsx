/**
 * Partner Dashboard Overview Shortcode
 * Phase PD-6 Part 2: Compact dashboard view for embedding in CMS pages
 *
 * Usage: [partner_dashboard_overview]
 *
 * Features:
 * - Top 4 KPI cards (total earnings, monthly earnings, clicks, conversions)
 * - 2 key charts (commission trend + conversion funnel)
 * - Recent activity/links list (5 items)
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { KPICard, KPIGrid } from '../dashboard/common/KPICard';
import { LineChart } from '../charts/LineChart';
import { BarChart } from '../charts/BarChart';
import { KPICardSkeleton } from '../common/Skeleton';
import { DollarSign, TrendingUp, MousePointerClick, ShoppingCart } from 'lucide-react';

interface PartnerDashboardSummary {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingCommissions: number;
  conversionRate: number;
  totalClicks: number;
  totalConversions: number;
  activeLinks: number;
  tierLevel: string;
  tierProgress: number;
  referralCode: string;
}

interface PartnerAnalytics {
  metrics: {
    earnings: {
      data: number[];
    };
    clicks: {
      data: number[];
    };
    conversions: {
      data: number[];
    };
  };
}

export const PartnerDashboardOverview: React.FC = () => {
  const [summary, setSummary] = useState<PartnerDashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<PartnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both summary and analytics data
      const [summaryRes, analyticsRes] = await Promise.allSettled([
        authClient.api.get('/v1/dropshipping/partner/dashboard/summary'),
        authClient.api.get('/v1/dropshipping/partner/analytics?period=30d'),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.success) {
        setSummary(summaryRes.value.data.summary);
      } else {
        setError('Failed to load dashboard summary');
      }

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.success) {
        setAnalytics(analyticsRes.value.data.analytics);
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <KPIGrid>
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </KPIGrid>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">파트너 대시보드 개요</h2>
        <p className="text-gray-600 mt-1">
          전체 성과 요약 · {summary?.tierLevel || 'Bronze'} 등급
        </p>
      </div>

      {/* KPI Cards */}
      <KPIGrid>
        <KPICard
          title="총 수익"
          value={`${(summary?.totalEarnings || 0).toLocaleString()}원`}
          subtitle="누적 수익"
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="이번 달 수익"
          value={`${(summary?.monthlyEarnings || 0).toLocaleString()}원`}
          subtitle="이번 달"
          icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="총 클릭 수"
          value={summary?.totalClicks || 0}
          subtitle="추천 링크 클릭"
          icon={MousePointerClick}
          color="purple"
        />
        <KPICard
          title="총 전환 수"
          value={summary?.totalConversions || 0}
          subtitle={`전환율 ${(summary?.conversionRate || 0).toFixed(1)}%`}
          icon={ShoppingCart}
          color="orange"
          badge={summary?.totalConversions}
        />
      </KPIGrid>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          title="수익 추이 (최근 7일)"
          series={[
            {
              name: '일별 수익',
              data: analytics?.metrics.earnings?.data || [0]
            }
          ]}
          categories={
            analytics?.metrics.earnings?.data
              ? analytics.metrics.earnings.data.map((_, idx) => `Day ${idx + 1}`)
              : ['데이터 없음']
          }
          height={300}
          yAxisFormatter={(value) => `${value.toLocaleString()}원`}
          tooltipFormatter={(value) => `${value.toLocaleString()}원`}
        />

        <BarChart
          title="클릭 vs 전환 (최근 7일)"
          series={[
            {
              name: '클릭',
              data: analytics?.metrics.clicks?.data || [0]
            },
            {
              name: '전환',
              data: analytics?.metrics.conversions?.data || [0]
            }
          ]}
          categories={
            analytics?.metrics.clicks?.data
              ? analytics.metrics.clicks.data.map((_, idx) => `Day ${idx + 1}`)
              : ['데이터 없음']
          }
          height={300}
          yAxisFormatter={(value) => `${value}회`}
          tooltipFormatter={(value) => `${value}회`}
        />
      </div>

      {/* Performance Summary */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">성과 요약</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🔗</div>
            <p className="text-2xl font-bold">{summary?.activeLinks || 0}</p>
            <p className="text-sm text-gray-600">활성 링크</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-2xl font-bold">{(summary?.conversionRate || 0).toFixed(1)}%</p>
            <p className="text-sm text-gray-600">전환율</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">💰</div>
            <p className="text-2xl font-bold">{(summary?.pendingCommissions || 0).toLocaleString()}원</p>
            <p className="text-sm text-gray-600">정산 예정</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">⭐</div>
            <p className="text-2xl font-bold">{summary?.tierLevel || 'Bronze'}</p>
            <p className="text-sm text-gray-600">현재 등급</p>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">다음 등급까지</span>
            <span className="text-gray-500">{summary?.tierProgress || 0}% 달성</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${summary?.tierProgress || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-semibold text-blue-900 mb-2">
              파트너 프로그램 팁
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 추천 링크를 SNS와 블로그에 공유하여 더 많은 수익을 창출하세요</li>
              <li>• 추천 코드: <span className="font-mono font-bold">{summary?.referralCode || 'N/A'}</span></li>
              <li>• 정산은 매월 1일 자동으로 처리됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboardOverview;
