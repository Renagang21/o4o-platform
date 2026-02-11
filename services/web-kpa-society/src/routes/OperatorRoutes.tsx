/**
 * OperatorRoutes - 서비스 운영자 라우트 설정
 * WO-AI-SERVICE-OPERATOR-REPORT-V1: 운영자 AI 리포트 추가
 * WO-SIGNAGE-CONTENT-HUB-V1-A: 사이니지 콘텐츠 허브 추가
 * WO-KPA-A-OPERATOR-DASHBOARD-UX-V1: Signal 기반 대시보드 도입
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { KpaOperatorDashboard, OperatorAiReportPage, ForumManagementPage, LegalManagementPage, OperatorManagementPage } from '../pages/operator';
import ContentHubPage from '../pages/signage/ContentHubPage';

// 간단한 Operator Layout
function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-bold text-blue-600">
              KPA Society
            </a>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">운영자</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="/operator" className="text-sm text-slate-600 hover:text-blue-600">
              대시보드
            </a>
            <a href="/operator/ai-report" className="text-sm text-slate-600 hover:text-blue-600">
              AI 리포트
            </a>
            <a href="/operator/forum-management" className="text-sm text-slate-600 hover:text-blue-600">
              포럼 관리
            </a>
            <a href="/operator/signage/content" className="text-sm text-slate-600 hover:text-blue-600">
              콘텐츠 허브
            </a>
            <a href="/operator/legal" className="text-sm text-slate-600 hover:text-blue-600">
              약관 관리
            </a>
            <a href="/operator/operators" className="text-sm text-slate-600 hover:text-blue-600">
              운영자 관리
            </a>
            <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
              메인으로
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="pb-20">
        {children}
      </main>
    </div>
  );
}

export function OperatorRoutes() {
  return (
    <OperatorLayout>
      <Routes>
        {/* 기본 경로 → Signal 기반 대시보드 (WO-KPA-A-OPERATOR-DASHBOARD-UX-V1) */}
        <Route index element={<KpaOperatorDashboard />} />

        {/* AI 리포트 */}
        <Route path="ai-report" element={<OperatorAiReportPage />} />

        {/* 포럼 관리 */}
        <Route path="forum-management" element={<ForumManagementPage />} />

        {/* 사이니지 콘텐츠 허브 */}
        <Route path="signage/content" element={<ContentHubPage />} />

        {/* 약관 관리 (WO-KPA-LEGAL-PAGES-V1) */}
        <Route path="legal" element={<LegalManagementPage />} />

        {/* 운영자 관리 */}
        <Route path="operators" element={<OperatorManagementPage />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </OperatorLayout>
  );
}
