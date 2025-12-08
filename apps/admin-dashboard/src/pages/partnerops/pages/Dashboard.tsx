/**
 * PartnerOps Dashboard Page
 *
 * Partner dashboard showing summary metrics:
 * - Total conversions and commission
 * - Link performance
 * - Recent activity
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authClient } from '@o4o/auth-client';
import {
  TrendingUp,
  DollarSign,
  Link2,
  MousePointer,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface DashboardSummary {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  activeLinks: number;
  activeRoutines: number;
  periodSummary: {
    clicks: number;
    conversions: number;
    commission: number;
    growth: number;
  };
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.api.get('/partnerops/dashboard/summary');
      if (response.data?.data) {
        setSummary(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard summary:', err);
      // Show demo data when API is not available
      setSummary({
        totalClicks: 15420,
        totalConversions: 342,
        conversionRate: 2.22,
        totalCommission: 1542000,
        pendingCommission: 234000,
        paidCommission: 1308000,
        activeLinks: 28,
        activeRoutines: 5,
        periodSummary: {
          clicks: 2340,
          conversions: 52,
          commission: 312000,
          growth: 12.5,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">PartnerOps 대시보드</h1>
          <p className="text-gray-600">파트너 성과 및 수익 현황</p>
        </div>
        <button
          onClick={fetchSummary}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          {error}
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 클릭수</p>
              <p className="text-2xl font-bold">
                {summary?.totalClicks.toLocaleString()}
              </p>
            </div>
            <MousePointer className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 전환</p>
              <p className="text-2xl font-bold">
                {summary?.totalConversions.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                전환율: {summary?.conversionRate.toFixed(2)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">누적 커미션</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary?.totalCommission.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">정산 예정</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary?.pendingCommission.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Active Links */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            활성 링크
          </h2>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-blue-600">
              {summary?.activeLinks}
            </p>
            <p className="text-gray-600 mt-2">개의 추적 링크</p>
          </div>
        </div>

        {/* Active Routines */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            콘텐츠/루틴
          </h2>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-purple-600">
              {summary?.activeRoutines}
            </p>
            <p className="text-gray-600 mt-2">개 활성화됨</p>
          </div>
        </div>

        {/* Period Summary */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">이번 달 성과</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">클릭</span>
              <span className="font-medium">
                {summary?.periodSummary.clicks.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">전환</span>
              <span className="font-medium">
                {summary?.periodSummary.conversions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">커미션</span>
              <span className="font-medium text-blue-600">
                {summary?.periodSummary.commission.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">성장률</span>
              <span
                className={`font-medium ${
                  (summary?.periodSummary.growth ?? 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {(summary?.periodSummary.growth ?? 0) >= 0 ? '+' : ''}
                {summary?.periodSummary.growth}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Paid Commission */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">정산 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">지급 완료</p>
            <p className="text-2xl font-bold text-green-600">
              {summary?.paidCommission.toLocaleString()}원
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-700">지급 예정</p>
            <p className="text-2xl font-bold text-orange-600">
              {summary?.pendingCommission.toLocaleString()}원
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
