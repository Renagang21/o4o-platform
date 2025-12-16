/**
 * Reporting-Yaksa: Dashboard Page
 *
 * Main dashboard for viewing annual report statistics
 *
 * Guarded by AppGuard to prevent API calls when app is not installed.
 */

import React, { useState, useEffect } from 'react';
import { AppGuard } from '@/components/common/AppGuard';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface ReportingStats {
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  revision_requested: number;
}

const ReportingDashboardContent = () => {
  const [stats, setStats] = useState<ReportingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useKeyboardShortcuts();

  useEffect(() => {
    fetchStats();
  }, [year]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get(`/reporting/reports/stats?year=${year}`);

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        toast.error('통계를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      // API가 아직 연결되지 않은 경우 기본값 설정
      setStats({
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        revision_requested: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalReports = stats
    ? stats.draft + stats.submitted + stats.approved + stats.rejected + stats.revision_requested
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminBreadcrumb
          items={[
            { label: '홈', href: '/admin' },
            { label: '신상신고', href: '/admin/reporting' },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '신상신고', href: '/admin/reporting' },
          { label: '대시보드' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">신상신고 대시보드</h1>
            <p className="mt-1 text-sm text-gray-600">
              연간 신상신고 현황을 한눈에 확인하세요.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                );
              })}
            </select>
            <button
              onClick={fetchStats}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="새로고침"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Draft */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">작성 중</p>
                <p className="mt-2 text-3xl font-semibold text-gray-500">
                  {stats?.draft || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <FileText className="w-6 h-6 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Submitted */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">제출됨</p>
                <p className="mt-2 text-3xl font-semibold text-blue-600">
                  {stats?.submitted || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">승인됨</p>
                <p className="mt-2 text-3xl font-semibold text-green-600">
                  {stats?.approved || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">반려됨</p>
                <p className="mt-2 text-3xl font-semibold text-red-600">
                  {stats?.rejected || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Revision Requested */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">수정 요청</p>
                <p className="mt-2 text-3xl font-semibold text-orange-600">
                  {stats?.revision_requested || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">상태별 분포</h2>
            <span className="ml-auto text-sm text-gray-500">
              총 {totalReports}건
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: '작성 중', value: stats?.draft || 0, color: 'bg-gray-500' },
              { label: '제출됨', value: stats?.submitted || 0, color: 'bg-blue-500' },
              { label: '승인됨', value: stats?.approved || 0, color: 'bg-green-500' },
              { label: '반려됨', value: stats?.rejected || 0, color: 'bg-red-500' },
              { label: '수정 요청', value: stats?.revision_requested || 0, color: 'bg-orange-500' },
            ].map((item) => {
              const percentage = totalReports > 0 ? (item.value / totalReports) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-600">
                      {item.value}건 ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/reporting/reports"
              className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-5 h-5 mr-2" />
              신고서 목록
            </a>
            <a
              href="/admin/reporting/reports?status=submitted"
              className="flex items-center justify-center px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Clock className="w-5 h-5 mr-2" />
              승인 대기 목록
            </a>
            <a
              href="/admin/reporting/templates"
              className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              템플릿 관리
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Wrapped export with AppGuard
 * Only renders dashboard content if reporting-yaksa app is installed
 */
const ReportingDashboard = () => (
  <AppGuard appId="reporting-yaksa" appName="신상신고">
    <ReportingDashboardContent />
  </AppGuard>
);

export default ReportingDashboard;
