/**
 * Membership-Yaksa: Dashboard Page
 *
 * Main dashboard for viewing membership statistics and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface MembershipStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  verifiedMembers: number;
  unverifiedMembers: number;
  pendingVerifications: number;
  recentJoins7Days: number;
  recentJoins30Days: number;
  categoryCounts: Array<{
    categoryId: string | null;
    categoryName: string;
    count: number;
  }>;
  monthlyJoins: Array<{
    month: string;
    count: number;
  }>;
}

const MembershipDashboard = () => {
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [loading, setLoading] = useState(true);

  useKeyboardShortcuts();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/membership/stats');

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        toast.error('통계를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      const errorCode = error.response?.data?.code;
      if (errorCode === 'FORBIDDEN') {
        toast.error('권한이 필요합니다.');
      } else {
        toast.error('통계를 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminBreadcrumb
          items={[
            { label: '홈', href: '/admin' },
            { label: '약사회 회원 관리', href: '/admin/membership/members' },
            { label: '대시보드' },
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminBreadcrumb
          items={[
            { label: '홈', href: '/admin' },
            { label: '약사회 회원 관리', href: '/admin/membership/members' },
            { label: '대시보드' },
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500 py-12">
            통계 데이터를 불러올 수 없습니다.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '약사회 회원 관리', href: '/admin/membership/members' },
          { label: '대시보드' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">회원 관리 대시보드</h1>
          <p className="mt-1 text-sm text-gray-600">
            약사회 회원 통계 및 현황을 한눈에 확인하세요.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Members Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 회원 수</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {stats.totalMembers.toLocaleString()}
                </p>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="text-green-600">
                    활성 {stats.activeMembers}
                  </span>
                  <span className="text-gray-500">
                    비활성 {stats.inactiveMembers}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">검증 현황</p>
                <p className="mt-2 text-3xl font-semibold text-green-600">
                  {stats.verifiedMembers.toLocaleString()}
                </p>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="text-yellow-600">
                    미검증 {stats.unverifiedMembers}
                  </span>
                  <span className="text-orange-600">
                    심사 중 {stats.pendingVerifications}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Recent Joins (7 Days) Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">최근 7일 가입</p>
                <p className="mt-2 text-3xl font-semibold text-purple-600">
                  {stats.recentJoins7Days.toLocaleString()}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  30일: {stats.recentJoins30Days}명
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Total Categories Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">회원 분류</p>
                <p className="mt-2 text-3xl font-semibold text-orange-600">
                  {stats.categoryCounts.length}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  총 분류 개수
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <PieChart className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">분류별 회원 분포</h2>
            </div>
            <div className="space-y-3">
              {stats.categoryCounts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">분류 데이터가 없습니다.</p>
              ) : (
                stats.categoryCounts.map((cat, index) => {
                  const percentage = stats.totalMembers > 0
                    ? (cat.count / stats.totalMembers) * 100
                    : 0;

                  return (
                    <div key={cat.categoryId || 'none'} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          {cat.categoryName || '미분류'}
                        </span>
                        <span className="text-gray-600">
                          {cat.count}명 ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Monthly Joins Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">월별 가입 추이</h2>
            </div>
            <div className="space-y-3">
              {stats.monthlyJoins.length === 0 ? (
                <p className="text-gray-500 text-center py-8">가입 데이터가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {stats.monthlyJoins.map((month) => {
                    const maxCount = Math.max(...stats.monthlyJoins.map(m => m.count));
                    const percentage = maxCount > 0 ? (month.count / maxCount) * 100 : 0;

                    return (
                      <div key={month.month} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{month.month}</span>
                          <span className="text-gray-600">{month.count}명</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/membership/members"
              className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Users className="w-5 h-5 mr-2" />
              회원 관리
            </a>
            <a
              href="/admin/membership/verifications"
              className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              검증 관리
            </a>
            <a
              href="/admin/membership/categories"
              className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <PieChart className="w-5 h-5 mr-2" />
              분류 관리
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipDashboard;
