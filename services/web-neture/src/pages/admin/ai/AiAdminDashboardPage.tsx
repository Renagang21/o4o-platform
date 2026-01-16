/**
 * AiAdminDashboardPage - AI 운영 대시보드 (관리자)
 *
 * Work Order: WO-AI-ADMIN-CONTROL-PLANE-V1
 *
 * 관리자 AI 제어 대시보드
 * - 현재 AI 상태 한눈에 파악
 * - 사용량 추이
 * - 가드레일 상태
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface AiEngineInfo {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  provider: string;
  isActive: boolean;
}

interface DashboardData {
  activeEngine: AiEngineInfo | null;
  aiEnabled: boolean;
  todayUsage: {
    totalQueries: number;
    globalLimit: number;
    usagePercent: number;
  };
  operationsStatus: {
    overallStatus: string;
    errorRate: number;
    circuitBreakerState: string;
  };
  policy: {
    freeDailyLimit: number;
    paidDailyLimit: number;
    warningThreshold: number;
  };
}

interface UsageStats {
  daily: Array<{ date: string; queries: number; successRate: number }>;
  total: { queries: number; successCount: number; errorCount: number };
}

export default function AiAdminDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, usageRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ai/admin/dashboard`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/ai/admin/usage?days=7`, { credentials: 'include' }),
      ]);

      const dashData = await dashRes.json();
      const usageData = await usageRes.json();

      if (dashData?.success) setDashboard(dashData.data);
      if (usageData?.success) setUsage(usageData.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      normal: 'bg-green-100 text-green-700',
      warning: 'bg-amber-100 text-amber-700',
      unstable: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      normal: '정상',
      warning: '주의',
      unstable: '불안정',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.normal}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercent = (num: number) => `${num.toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Neture
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">AI 관리</span>
            </div>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              대시보드
            </Link>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6">
            <Link
              to="/admin/ai"
              className="py-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm"
            >
              대시보드
            </Link>
            <Link
              to="/admin/ai/engines"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              엔진 설정
            </Link>
            <Link
              to="/admin/ai/policy"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              사용 기준 설정
            </Link>
            <Link
              to="/admin/ai/asset-quality"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              품질 관리
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI 운영 대시보드</h1>
            <p className="text-gray-500 mt-1">
              AI 서비스의 현재 상태와 사용량을 확인합니다.
            </p>
          </div>
          {dashboard && getStatusBadge(dashboard.operationsStatus.overallStatus)}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : dashboard ? (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Active Engine */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">활성 엔진</div>
                <div className="text-xl font-bold text-gray-900">
                  {dashboard.activeEngine?.name || '없음'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {dashboard.activeEngine?.provider || '-'}
                </div>
              </div>

              {/* Today Usage */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">오늘 AI 질문</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(dashboard.todayUsage.totalQueries)}
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>한도 대비</span>
                    <span>{formatPercent(dashboard.todayUsage.usagePercent)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dashboard.todayUsage.usagePercent >= 100 ? 'bg-red-500' :
                        dashboard.todayUsage.usagePercent >= 80 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(dashboard.todayUsage.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* AI Enabled */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">AI 상태</div>
                <div className={`text-xl font-bold ${dashboard.aiEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboard.aiEnabled ? '활성화' : '비활성화'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Circuit Breaker: {dashboard.operationsStatus.circuitBreakerState === 'closed' ? '정상' :
                    dashboard.operationsStatus.circuitBreakerState === 'half_open' ? '복구 중' : '차단됨'}
                </div>
              </div>

              {/* Error Rate */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">에러율</div>
                <div className={`text-2xl font-bold ${
                  dashboard.operationsStatus.errorRate > 20 ? 'text-red-600' :
                  dashboard.operationsStatus.errorRate > 5 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {formatPercent(dashboard.operationsStatus.errorRate)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  최근 24시간 기준
                </div>
              </div>
            </div>

            {/* Policy Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900">현재 정책</h2>
                <Link to="/admin/ai/policy" className="text-sm text-primary-600 hover:text-primary-700">
                  설정 변경
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-500">무료 사용자 일 한도</div>
                  <div className="text-lg font-medium text-gray-900">{dashboard.policy.freeDailyLimit}회</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">유료 사용자 일 한도</div>
                  <div className="text-lg font-medium text-gray-900">{dashboard.policy.paidDailyLimit}회</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">경고 임계치</div>
                  <div className="text-lg font-medium text-gray-900">{dashboard.policy.warningThreshold}%</div>
                </div>
              </div>
            </div>

            {/* Usage Trend */}
            {usage && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">사용량 추이 (최근 7일)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 font-medium text-gray-500">날짜</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">질문 수</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">성공률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.daily.map((day, index) => (
                        <tr
                          key={day.date}
                          className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                        >
                          <td className="py-3 px-2 text-gray-600">{day.date}</td>
                          <td className="py-3 px-2 text-right font-medium">{formatNumber(day.queries)}</td>
                          <td className={`py-3 px-2 text-right ${
                            day.successRate >= 95 ? 'text-green-600' :
                            day.successRate >= 80 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {formatPercent(day.successRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="py-3 px-2 font-medium text-gray-700">합계</td>
                        <td className="py-3 px-2 text-right font-bold">{formatNumber(usage.total.queries)}</td>
                        <td className="py-3 px-2 text-right font-bold text-green-600">
                          {usage.total.queries > 0
                            ? formatPercent((usage.total.successCount / usage.total.queries) * 100)
                            : '-'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">
            데이터를 불러올 수 없습니다.
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/ai-operations"
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors"
          >
            <div className="font-medium text-gray-900">실시간 운영 상태</div>
            <div className="text-sm text-gray-500">가드레일, 경고, 비정상 패턴</div>
          </Link>
          <Link
            to="/admin/ai-card-report"
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors"
          >
            <div className="font-medium text-gray-900">카드 노출 리포트</div>
            <div className="text-sm text-gray-500">카드 노출 현황</div>
          </Link>
          <Link
            to="/admin/ai-business-pack"
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors"
          >
            <div className="font-medium text-gray-900">사업자용 안내</div>
            <div className="text-sm text-gray-500">파트너 설명용</div>
          </Link>
        </div>
      </main>
    </div>
  );
}
