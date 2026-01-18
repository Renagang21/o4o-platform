/**
 * AdminDashboardPage - 운영자 대시보드
 *
 * Work Order: WO-AI-PREVIEW-SUMMARY-V1
 *
 * Neture 플랫폼 전체 운영 현황
 * - 서비스 상태 모니터링
 * - 주요 지표 요약
 * - 승인 대기 항목
 * - AI 요약 버튼 (WO-AI-PREVIEW-SUMMARY-V1)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { AiSummaryButton } from '../../components/ai';
import { dashboardApi, type AdminDashboardSummary } from '../../lib/api';

// 빈 데이터 상태 컴포넌트
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <AlertCircle size={36} className="mx-auto mb-3 text-gray-400" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getAdminDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch admin dashboard data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = summary?.stats || {
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalPartnershipRequests: 0,
    openPartnershipRequests: 0,
    pendingRequests: 0,
  };

  const hasRecentApplications = summary?.recentApplications && summary.recentApplications.length > 0;

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
              <span className="text-sm font-medium text-gray-600">운영자 대시보드</span>
            </div>
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
              메인으로
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">운영자 대시보드</h1>
            <p className="text-gray-500 mt-1">플랫폼 전체 운영 현황을 확인합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
            <AiSummaryButton contextLabel="플랫폼 운영 요약" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 opacity-50">
                <div className="text-3xl mb-2">...</div>
                <div className="text-2xl font-bold text-gray-900">-</div>
                <div className="text-sm text-gray-500">로딩 중</div>
              </div>
            ))
          ) : (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">🏪</div>
                <div className="text-2xl font-bold text-gray-900">{stats.activeSuppliers}</div>
                <div className="text-sm text-gray-500">활성 공급자</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">📦</div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</div>
                <div className="text-sm text-gray-500">등록 공급자</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">🤝</div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalPartnershipRequests}</div>
                <div className="text-sm text-gray-500">파트너십 요청</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-2xl font-bold text-primary-600">{stats.pendingRequests}</div>
                <div className="text-sm text-gray-500">승인 대기</div>
              </div>
            </>
          )}
        </div>

        {/* Pending Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">승인 대기 항목</h2>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">로딩 중...</div>
          ) : !hasRecentApplications ? (
            <EmptyState message="자료가 없습니다. 현재 승인 대기 항목이 없습니다." />
          ) : (
            <div className="divide-y divide-gray-100">
              {summary!.recentApplications.map((app) => (
                <div key={app.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <div className="font-medium text-gray-900">{app.type}</div>
                      <div className="text-sm text-gray-500">{app.name}</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">AI 관리</h2>
            <Link to="/admin/ai" className="text-sm text-primary-600 hover:text-primary-700">
              AI 제어판 바로가기 &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6">
            <Link
              to="/admin/ai"
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-primary-200 bg-primary-50 hover:border-primary-400 transition-colors"
            >
              <span className="text-2xl">🎛️</span>
              <div>
                <div className="font-medium text-gray-900">AI 제어판</div>
                <div className="text-sm text-primary-600">엔진 & 정책 설정</div>
              </div>
            </Link>
            <Link
              to="/admin/ai-operations"
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <span className="text-2xl">🔍</span>
              <div>
                <div className="font-medium text-gray-900">운영 상태</div>
                <div className="text-sm text-gray-500">실시간 모니터링</div>
              </div>
            </Link>
            <Link
              to="/admin/ai-card-report"
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <span className="text-2xl">📊</span>
              <div>
                <div className="font-medium text-gray-900">카드 리포트</div>
                <div className="text-sm text-gray-500">노출 현황</div>
              </div>
            </Link>
            <Link
              to="/admin/ai-business-pack"
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-medium text-gray-900">사업자 안내</div>
                <div className="text-sm text-gray-500">파트너용</div>
              </div>
            </Link>
            <Link
              to="/admin/ai-card-rules"
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <span className="text-2xl">⚙️</span>
              <div>
                <div className="font-medium text-gray-900">노출 규칙</div>
                <div className="text-sm text-gray-500">기술 상세</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">빠른 관리</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            <Link
              to="/admin/suppliers"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">📦</span>
              <span className="text-sm font-medium text-gray-700">공급자 관리</span>
            </Link>
            <Link
              to="/admin/partners"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">🤝</span>
              <span className="text-sm font-medium text-gray-700">파트너 관리</span>
            </Link>
            <Link
              to="/admin/services"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">🏪</span>
              <span className="text-sm font-medium text-gray-700">서비스 관리</span>
            </Link>
            <Link
              to="/admin/users"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">👥</span>
              <span className="text-sm font-medium text-gray-700">사용자 관리</span>
            </Link>
          </div>
        </div>

        {/* Platform Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">플랫폼 설정</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            <Link
              to="/admin/settings/email"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">📧</span>
              <span className="text-sm font-medium text-gray-700">이메일 설정</span>
              <span className="text-xs text-gray-400 mt-1">SMTP 구성</span>
            </Link>
          </div>
        </div>

        {/* Notice */}
        <div className="mt-8 text-center text-sm text-gray-400">
          상세 관리 기능은 순차적으로 추가됩니다.
        </div>
      </main>
    </div>
  );
}
