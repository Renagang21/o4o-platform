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

import { Routes, Route, Navigate } from 'react-router-dom';
import { OperatorAiReportPage, ForumManagementPage, ForumDeleteRequestsPage, LegalManagementPage, ForumAnalyticsDashboard, ContentManagementPage, AuditLogPage, MemberManagementPage, PharmacyRequestManagementPage, ProductApplicationManagementPage, CommunityManagementPage } from '../pages/operator';
// WO-KPA-A-OPERATOR-DASHBOARD-FIRST-STABILIZATION-V1: UsersPage → /operator/members redirect
import UserDetailPage from '../pages/operator/UserDetailPage';
import RoleManagementPage from '../pages/operator/RoleManagementPage';
import KpaOperatorDashboard from '../pages/operator/KpaOperatorDashboard';
import OperatorStoresPage from '../pages/operator/OperatorStoresPage';
import OperatorStoreDetailPage from '../pages/operator/OperatorStoreDetailPage';
import OperatorStoreChannelsPage from '../pages/operator/OperatorStoreChannelsPage';
import { NewsPage } from '../pages/admin-branch';
// WO-KPA-A-PLACEHOLDER-PAGES-IMPLEMENTATION: KPA-a operator 전용 페이지로 교체
import OperatorForumPage from '../pages/operator/OperatorForumPage';
import OperatorContentHubPage from '../pages/operator/OperatorContentHubPage';
import OperatorContentDetailPage from '../pages/operator/OperatorContentDetailPage';
import { OrganizationJoinRequestsPage } from '../pages/admin/OrganizationJoinRequestsPage';
import ContentHubPage from '../pages/signage/ContentHubPage';
// Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1)
import HqMediaPage from '../pages/operator/signage/HqMediaPage';
import HqMediaDetailPage from '../pages/operator/signage/HqMediaDetailPage';
import HqPlaylistsPage from '../pages/operator/signage/HqPlaylistsPage';
import HqPlaylistDetailPage from '../pages/operator/signage/HqPlaylistDetailPage';
import TemplatesPage from '../pages/operator/signage/TemplatesPage';
import TemplateDetailPage from '../pages/operator/signage/TemplateDetailPage';
import CategoriesPage from '../pages/operator/signage/CategoriesPage';
import OperatorAnalyticsPage from '../pages/operator/AnalyticsPage';
import { RoleGuard } from '../components/auth/RoleGuard';
import { PLATFORM_ROLES, ROLES } from '../lib/role-constants';
// WO-O4O-OPERATOR-UI-STANDARDIZATION-V1: shared OperatorShell wrapper
import KpaOperatorLayoutWrapper from '../components/kpa-operator/KpaOperatorLayoutWrapper';

export function OperatorRoutes() {
  return (
    <RoleGuard allowedRoles={[...PLATFORM_ROLES]}>
      <Routes>
        {/* WO-O4O-OPERATOR-UI-STANDARDIZATION-V1: shared OperatorShell wrapper */}
        <Route element={<KpaOperatorLayoutWrapper />}>
          {/* /operator → 5-Block 대시보드 (WO-O4O-OPERATOR-UX-KPA-A-PILOT-V1) */}
          <Route index element={<KpaOperatorDashboard />} />

          {/* AI 리포트 */}
          <Route path="ai-report" element={<OperatorAiReportPage />} />

          {/* 포럼 관리 */}
          <Route path="forum-management" element={<ForumManagementPage />} />

          {/* 커뮤니티 관리 (WO-O4O-OPERATOR-ROUTE-REFINEMENT-V1: community-management → community) */}
          <Route path="community" element={<CommunityManagementPage />} />
          <Route path="community-management" element={<Navigate to="/operator/community" replace />} />

          {/* 포럼 삭제 요청 (WO-O4O-KPA-A-FORUM-ALIGNMENT-V1) */}
          <Route path="forum-delete-requests" element={<ForumDeleteRequestsPage />} />

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
          {/* 사이니지 카테고리 관리 (WO-O4O-SIGNAGE-REGISTRATION-AND-CATEGORY-REFINE-V1) */}
          <Route path="signage/categories" element={<CategoriesPage />} />

          {/* 약관 관리 (WO-KPA-LEGAL-PAGES-V1) — admin-only */}
          <Route path="legal" element={<RoleGuard allowedRoles={[ROLES.KPA_ADMIN, ROLES.PLATFORM_SUPER_ADMIN]}><LegalManagementPage /></RoleGuard>} />

          {/* 감사 로그 (WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1) — admin-only */}
          <Route path="audit-logs" element={<RoleGuard allowedRoles={[ROLES.KPA_ADMIN, ROLES.PLATFORM_SUPER_ADMIN]}><AuditLogPage /></RoleGuard>} />

          {/* ── 콘텐츠 CRUD (WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1: Admin에서 이동) ── */}

          {/* 공지사항 */}
          <Route path="news" element={<NewsPage />} />

          {/* 자료실 → 콘텐츠 허브로 전환 (WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1) */}
          <Route path="docs" element={<OperatorContentHubPage />} />
          <Route path="content-hub/:id" element={<OperatorContentDetailPage />} />

          {/* 게시판 (WO-KPA-A-PLACEHOLDER-PAGES-IMPLEMENTATION: KPA-a operator 전용) */}
          <Route path="forum" element={<OperatorForumPage />} />

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

          {/* 채널 관리 (WO-O4O-STORE-CHANNEL-LIFECYCLE-V1) */}
          <Route path="store-channels" element={<OperatorStoreChannelsPage />} />

          {/* WO-KPA-A-OPERATOR-DASHBOARD-FIRST-STABILIZATION-V1: /operator/members를 canonical route로 통일 */}
          <Route path="users" element={<Navigate to="/operator/members" replace />} />
          <Route path="users/:id" element={<UserDetailPage />} />

          {/* 운영 분석 (WO-O4O-AUDIT-ANALYTICS-LAYER-V1) */}
          <Route path="analytics" element={<OperatorAnalyticsPage />} />

          {/* 역할 관리 (WO-O4O-ROLE-MANAGEMENT-UI-V1) — admin-only */}
          <Route path="roles" element={<RoleGuard allowedRoles={[ROLES.KPA_ADMIN, ROLES.PLATFORM_SUPER_ADMIN]}><RoleManagementPage /></RoleGuard>} />

          {/* 레거시 리다이렉트 */}
          <Route path="operators" element={<Navigate to="/operator/members" replace />} />
        </Route>

        {/* 404 → operator index */}
        <Route path="*" element={<Navigate to="/operator" replace />} />
      </Routes>
    </RoleGuard>
  );
}
