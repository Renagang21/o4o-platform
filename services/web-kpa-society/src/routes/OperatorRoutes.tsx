/**
 * OperatorRoutes - 서비스 운영자 라우트 설정 (상태 관리 + 콘텐츠 CRUD)
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (news, docs, forum) AdminRoutes에서 이동
 * - 요청 관리 (organization-requests, service-enrollments) AdminRoutes에서 이동
 * - members 제거 (Admin 구조 관리 영역)
 *
 * WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1:
 * - /operator 루트 → /hub 리다이렉트
 * - 서브 페이지는 main Layout에서 렌더 (App.tsx에서 Layout 래핑)
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1:
 * - 인라인 Guard → RoleGuard 통일
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { OperatorAiReportPage, ForumManagementPage, LegalManagementPage, OperatorManagementPage, ForumAnalyticsDashboard, ContentManagementPage, AuditLogPage } from '../pages/operator';
import { NewsPage, DocsPage, ForumPage } from '../pages/admin-branch';
import { OrganizationJoinRequestsPage } from '../pages/admin/OrganizationJoinRequestsPage';
import { ServiceEnrollmentManagementPage } from '../pages/admin/ServiceEnrollmentManagementPage';
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

        {/* 콘텐츠 관리 (WO-KPA-A-CONTENT-CMS-PHASE1-V1) */}
        <Route path="content" element={<ContentManagementPage />} />

        {/* 사이니지 콘텐츠 허브 */}
        <Route path="signage/content" element={<ContentHubPage />} />

        {/* 약관 관리 (WO-KPA-LEGAL-PAGES-V1) */}
        <Route path="legal" element={<LegalManagementPage />} />

        {/* 감사 로그 (WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1) */}
        <Route path="audit-logs" element={<AuditLogPage />} />

        {/* ── 콘텐츠 CRUD (WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1: Admin에서 이동) ── */}

        {/* 공지사항 */}
        <Route path="news" element={<NewsPage />} />

        {/* 자료실 */}
        <Route path="docs" element={<DocsPage />} />

        {/* 게시판 */}
        <Route path="forum" element={<ForumPage />} />

        {/* 조직 가입/역할 요청 관리 */}
        <Route path="organization-requests" element={<OrganizationJoinRequestsPage />} />

        {/* 서비스 신청 관리 */}
        <Route path="service-enrollments" element={<ServiceEnrollmentManagementPage />} />

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
