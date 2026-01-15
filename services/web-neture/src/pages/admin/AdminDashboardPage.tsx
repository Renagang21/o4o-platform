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

import { Link } from 'react-router-dom';
import { AiSummaryButton } from '../../components/ai';

export default function AdminDashboardPage() {
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
          <AiSummaryButton contextLabel="플랫폼 운영 요약" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">🏪</div>
            <div className="text-2xl font-bold text-gray-900">5</div>
            <div className="text-sm text-gray-500">활성 서비스</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold text-gray-900">3</div>
            <div className="text-sm text-gray-500">등록 공급자</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">🤝</div>
            <div className="text-2xl font-bold text-gray-900">2</div>
            <div className="text-sm text-gray-500">활성 파트너</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-2xl font-bold text-primary-600">4</div>
            <div className="text-sm text-gray-500">승인 대기</div>
          </div>
        </div>

        {/* Pending Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">승인 대기 항목</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">📦</span>
                <div>
                  <div className="font-medium text-gray-900">공급자 신청</div>
                  <div className="text-sm text-gray-500">팜프레시코리아 외 2건</div>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                3건 대기
              </span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🤝</span>
                <div>
                  <div className="font-medium text-gray-900">파트너 신청</div>
                  <div className="text-sm text-gray-500">뷰티랩 코스메틱</div>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                1건 대기
              </span>
            </div>
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

        {/* Notice */}
        <div className="mt-8 text-center text-sm text-gray-400">
          상세 관리 기능은 순차적으로 추가됩니다.
        </div>
      </main>
    </div>
  );
}
