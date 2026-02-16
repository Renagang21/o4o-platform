/**
 * OperatorRoutes - 서비스 운영자 라우트 설정
 *
 * WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1:
 * - OperatorLayout 제거 (중복 네비게이션 제거)
 * - /operator 루트 → /hub 리다이렉트
 * - 서브 페이지는 main Layout에서 렌더 (App.tsx에서 Layout 래핑)
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1:
 * - 인라인 Guard → RoleGuard 통일
 * - checkKpaOperatorRole 인라인 → RoleGuard allowedRoles
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { OperatorAiReportPage, ForumManagementPage, LegalManagementPage, OperatorManagementPage, ForumAnalyticsDashboard, MemberManagementPage, ContentManagementPage, AuditLogPage } from '../pages/operator';
import ContentHubPage from '../pages/signage/ContentHubPage';
import { RoleGuard } from '../components/auth/RoleGuard';

export function OperatorRoutes() {
  return (
    <RoleGuard allowedRoles={['kpa:admin', 'kpa:operator']}>
      <Routes>
        {/* /operator → /hub 리다이렉트 (WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1) */}
        <Route index element={<Navigate to="/hub" replace />} />

        {/* AI 리포트 */}
        <Route path="ai-report" element={<OperatorAiReportPage />} />

        {/* 포럼 관리 */}
        <Route path="forum-management" element={<ForumManagementPage />} />

        {/* 포럼 통계 */}
        <Route path="forum-analytics" element={<ForumAnalyticsDashboard />} />

        {/* 회원 관리 (WO-KPA-A-MEMBER-APPROVAL-UI-PHASE1-V1) */}
        <Route path="members" element={<MemberManagementPage />} />

        {/* 콘텐츠 관리 (WO-KPA-A-CONTENT-CMS-PHASE1-V1) */}
        <Route path="content" element={<ContentManagementPage />} />

        {/* 사이니지 콘텐츠 허브 */}
        <Route path="signage/content" element={<ContentHubPage />} />

        {/* 약관 관리 (WO-KPA-LEGAL-PAGES-V1) */}
        <Route path="legal" element={<LegalManagementPage />} />

        {/* 감사 로그 (WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1) */}
        <Route path="audit-logs" element={<AuditLogPage />} />

        {/* 운영자 관리 - Admin only (WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1) */}
        <Route path="operators" element={
          <RoleGuard allowedRoles={['kpa:admin']}>
            <OperatorManagementPage />
          </RoleGuard>
        } />

        {/* 404 → /hub */}
        <Route path="*" element={<Navigate to="/hub" replace />} />
      </Routes>
    </RoleGuard>
  );
}
