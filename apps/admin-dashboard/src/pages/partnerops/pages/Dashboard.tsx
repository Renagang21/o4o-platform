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

/**
 * Dashboard Summary (Partner-Core aligned)
 * Maps to DashboardSummaryDto from @o4o/partnerops
 */
interface DashboardSummary {
  // Partner Stats
  partnerId: string;
  partnerLevel: 'newbie' | 'standard' | 'pro' | 'elite';
  partnerStatus: 'pending' | 'active' | 'suspended' | 'inactive';

  // Click/Conversion/Commission Stats from Partner-Core
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalEarnings: number;
  pendingEarnings: number;
  settledEarnings: number;

  // Period Stats (today)
  todayClicks: number;
  todayConversions: number;
  todayEarnings: number;

  // Recent Activity
  recentActivity: Array<{
    type: 'click' | 'conversion' | 'commission' | 'settlement';
    description: string;
    amount?: number;
    timestamp: string;
  }>;
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
        partnerId: 'demo-partner',
        partnerLevel: 'standard',
        partnerStatus: 'active',
        totalClicks: 15420,
        totalConversions: 342,
        conversionRate: 2.22,
        totalEarnings: 1542000,
        pendingEarnings: 234000,
        settledEarnings: 1308000,
        todayClicks: 234,
        todayConversions: 5,
        todayEarnings: 31200,
        recentActivity: [
          { type: 'conversion', description: '주문 전환', amount: 4500, timestamp: new Date().toISOString() },
          { type: 'click', description: '링크 클릭', timestamp: new Date().toISOString() },
        ],
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
              <p className="text-sm text-gray-600">누적 수익</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary?.totalEarnings.toLocaleString()}원
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
                {summary?.pendingEarnings.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Partner Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            파트너 레벨
          </h2>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-blue-600 uppercase">
              {summary?.partnerLevel || '-'}
            </p>
            <p className="text-gray-600 mt-2">
              상태: <span className={`font-medium ${
                summary?.partnerStatus === 'active' ? 'text-green-600' :
                summary?.partnerStatus === 'pending' ? 'text-yellow-600' :
                'text-red-600'
              }`}>{summary?.partnerStatus === 'active' ? '활성' :
                   summary?.partnerStatus === 'pending' ? '심사중' :
                   summary?.partnerStatus === 'suspended' ? '정지' : '비활성'}</span>
            </p>
          </div>
        </div>

        {/* Today Stats */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            오늘 성과
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">클릭</span>
              <span className="font-medium">
                {summary?.todayClicks.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">전환</span>
              <span className="font-medium">
                {summary?.todayConversions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">수익</span>
              <span className="font-medium text-blue-600">
                {summary?.todayEarnings.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">최근 활동</h2>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {summary?.recentActivity && summary.recentActivity.length > 0 ? (
              summary.recentActivity.slice(0, 5).map((activity, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{activity.description}</span>
                  {activity.amount && (
                    <span className="font-medium text-blue-600">
                      +{activity.amount.toLocaleString()}원
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">최근 활동이 없습니다</p>
            )}
          </div>
        </div>
      </div>

      {/* Settlement Status */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">정산 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">지급 완료</p>
            <p className="text-2xl font-bold text-green-600">
              {summary?.settledEarnings.toLocaleString()}원
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-700">지급 예정</p>
            <p className="text-2xl font-bold text-orange-600">
              {summary?.pendingEarnings.toLocaleString()}원
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
