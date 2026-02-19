/**
 * OperatorRoutes - 서비스 운영자 라우트 설정 (상태 관리 + 콘텐츠 CRUD)
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (news, docs, forum) AdminRoutes에서 이동
 * - 요청 관리 (organization-requests, service-enrollments) AdminRoutes에서 이동
 * - members: WO-KPA-C-REQUEST-KPI-SYNC-AUDIT-V1에서 복원 (KPI → 목록 연결)
 *
 * WO-O4O-OPERATOR-UX-KPA-A-PILOT-V1:
 * - /operator 루트 → 5-Block 대시보드 렌더 (Hub 기능 흡수)
 * - Hub는 /hub에서 유지 (접근 가능)
 * - 서브 페이지는 main Layout에서 렌더 (App.tsx에서 Layout 래핑)
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1:
 * - 인라인 Guard → RoleGuard 통일
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { OperatorAiReportPage, ForumManagementPage, LegalManagementPage, OperatorManagementPage, ForumAnalyticsDashboard, ContentManagementPage, AuditLogPage, MemberManagementPage } from '../pages/operator';
import KpaOperatorDashboard from '../pages/operator/KpaOperatorDashboard';
import { NewsPage, DocsPage, ForumPage } from '../pages/admin-branch';
import { OrganizationJoinRequestsPage } from '../pages/admin/OrganizationJoinRequestsPage';
import { ServiceEnrollmentManagementPage } from '../pages/admin/ServiceEnrollmentManagementPage';
import ContentHubPage from '../pages/signage/ContentHubPage';
import { RoleGuard } from '../components/auth/RoleGuard';

export function OperatorRoutes() {
  return (
    <RoleGuard allowedRoles={['kpa:admin', 'kpa:operator']}>
      <Routes>
        {/* /operator → 5-Block 대시보드 (WO-O4O-OPERATOR-UX-KPA-A-PILOT-V1) */}
        <Route index element={<KpaOperatorDashboard />} />

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

        {/* WO-KPA-C-REQUEST-KPI-SYNC-AUDIT-V1: 회원 관리 (KpaMember 기반) */}
        <Route path="members" element={<MemberManagementPage />} />

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
