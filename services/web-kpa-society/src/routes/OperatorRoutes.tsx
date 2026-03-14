/**
 * OperatorRoutes - 서비스 운영자 라우트 설정 (상태 관리 + 콘텐츠 CRUD)
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (news, docs, forum) AdminRoutes에서 이동
 * - 요청 관리 (organization-requests) AdminRoutes에서 이동
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

import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { OperatorAiReportPage, ForumManagementPage, LegalManagementPage, OperatorManagementPage, ForumAnalyticsDashboard, ContentManagementPage, AuditLogPage, MemberManagementPage, PharmacyRequestManagementPage, ProductApplicationManagementPage, CommunityManagementPage } from '../pages/operator';
import KpaOperatorDashboard from '../pages/operator/KpaOperatorDashboard';
import OperatorStoresPage from '../pages/operator/OperatorStoresPage';
import OperatorStoreDetailPage from '../pages/operator/OperatorStoreDetailPage';
import { NewsPage, DocsPage, ForumPage } from '../pages/admin-branch';
import { OrganizationJoinRequestsPage } from '../pages/admin/OrganizationJoinRequestsPage';
import ContentHubPage from '../pages/signage/ContentHubPage';
// Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1)
import HqMediaPage from '../pages/operator/signage/HqMediaPage';
import HqMediaDetailPage from '../pages/operator/signage/HqMediaDetailPage';
import HqPlaylistsPage from '../pages/operator/signage/HqPlaylistsPage';
import HqPlaylistDetailPage from '../pages/operator/signage/HqPlaylistDetailPage';
import TemplatesPage from '../pages/operator/signage/TemplatesPage';
import TemplateDetailPage from '../pages/operator/signage/TemplateDetailPage';
import { RoleGuard } from '../components/auth/RoleGuard';
import { PLATFORM_ROLES, ROLES } from '../lib/role-constants';

/** 모든 서브 페이지에 "운영자 대시보드" 돌아가기 링크 표시 */
function OperatorSubPageLayout() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-6 pt-5 pb-0">
        <Link
          to="/operator"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 no-underline transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          운영자 대시보드
        </Link>
      </div>
      <Outlet />
    </>
  );
}

export function OperatorRoutes() {
  return (
    <RoleGuard allowedRoles={[...PLATFORM_ROLES]}>
      <Routes>
        {/* /operator → 5-Block 대시보드 (WO-O4O-OPERATOR-UX-KPA-A-PILOT-V1) */}
        <Route index element={<KpaOperatorDashboard />} />

        {/* 서브 페이지: 돌아가기 링크 포함 Layout */}
        <Route element={<OperatorSubPageLayout />}>
          {/* AI 리포트 */}
          <Route path="ai-report" element={<OperatorAiReportPage />} />

          {/* 포럼 관리 */}
          <Route path="forum-management" element={<ForumManagementPage />} />

          {/* 커뮤니티 관리 (WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1) */}
          <Route path="community-management" element={<CommunityManagementPage />} />

          {/* 포럼 통계 */}
          <Route path="forum-analytics" element={<ForumAnalyticsDashboard />} />

          {/* 콘텐츠 관리 (WO-KPA-A-CONTENT-CMS-PHASE1-V1) */}
          <Route path="content" element={<ContentManagementPage />} />

          {/* 사이니지 콘텐츠 허브 */}
          <Route path="signage/content" element={<ContentHubPage />} />
          {/* Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1) */}
          <Route path="signage/hq-media" element={<HqMediaPage />} />
          <Route path="signage/hq-media/:mediaId" element={<HqMediaDetailPage />} />
          <Route path="signage/hq-playlists" element={<HqPlaylistsPage />} />
          <Route path="signage/hq-playlists/:playlistId" element={<HqPlaylistDetailPage />} />
          <Route path="signage/templates" element={<TemplatesPage />} />
          <Route path="signage/templates/:templateId" element={<TemplateDetailPage />} />

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

          {/* 약국 서비스 신청 관리 (WO-KPA-A-PHARMACY-REQUEST-OPERATOR-UI-V1) */}
          <Route path="pharmacy-requests" element={<PharmacyRequestManagementPage />} />

          {/* 상품 판매 신청 관리 (WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1) */}
          <Route path="product-applications" element={<ProductApplicationManagementPage />} />

          {/* 매장 관리 (WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1) */}
          <Route path="stores" element={<OperatorStoresPage />} />
          <Route path="stores/:storeId" element={<OperatorStoreDetailPage />} />

          {/* 운영자 관리 - Admin only (WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1) */}
          <Route path="operators" element={
            <RoleGuard allowedRoles={[ROLES.KPA_ADMIN]}>
              <OperatorManagementPage />
            </RoleGuard>
          } />
        </Route>

        {/* 404 → operator index */}
        <Route path="*" element={<Navigate to="/operator" replace />} />
      </Routes>
    </RoleGuard>
  );
}
