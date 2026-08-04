import { Route, Navigate } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';
import { AppRouteGuard } from '@/components/AppRouteGuard';
import { PLATFORM_ADMIN_ROLES } from '@/config/rolePermissions';

// Membership-Yaksa: Membership Management
const MembershipDashboard = lazy(() => import('@/pages/membership/dashboard/MembershipDashboard'));
const MemberManagement = lazy(() => import('@/pages/membership/members/MemberManagement'));
const MemberDetail = lazy(() => import('@/pages/membership/members/MemberDetail'));
const VerificationManagement = lazy(() => import('@/pages/membership/verifications/VerificationManagement'));
const CategoryManagement = lazy(() => import('@/pages/membership/categories/CategoryManagement'));
const AuditLogManagement = lazy(() => import('@/pages/membership/audit-logs/AuditLogManagement'));
// WO-O4O-MEMBERSHIP-UI-API-CONTRACT-AUDIT-AND-MINIMAL-RECOVERY-V1
//   AffiliationManagement 제거 — 메뉴·대시보드 어디에서도 링크되지 않고,
//   화면이 요구하는 전역 목록 GET endpoint 가 백엔드에 존재한 적이 없다
//   (AffiliationService 는 회원별·조직별 조회만 제공). 소속 관리 기능이 실제로
//   필요해지면 권한·범위·필터 계약을 새로 설계한다.

// Reporting-Yaksa: Annual Report Management
const ReportingDashboard = lazy(() => import('@/pages/reporting/dashboard/ReportingDashboard'));
const ReportList = lazy(() => import('@/pages/reporting/reports/ReportList'));
const TemplateList = lazy(() => import('@/pages/reporting/templates/TemplateList'));

// Yaksa Admin Hub (Phase 19-D)
const YaksaAdminHub = lazy(() => import('@/pages/yaksa/YaksaAdminHub'));

// Yaksa Admin - Phase 1 Approval & Overview UI
const YaksaAdminDashboard = lazy(() => import('@/pages/yaksa-admin/YaksaAdminDashboard'));
const MemberApprovalPage = lazy(() => import('@/pages/yaksa-admin/MemberApprovalPage'));
const ReportReviewPage = lazy(() => import('@/pages/yaksa-admin/ReportReviewPage'));
const OfficerManagePage = lazy(() => import('@/pages/yaksa-admin/OfficerManagePage'));
const EducationOverviewPage = lazy(() => import('@/pages/yaksa-admin/EducationOverviewPage'));
const FeeOverviewPage = lazy(() => import('@/pages/yaksa-admin/FeeOverviewPage'));

// Yaksa Accounting - Phase 2 Expense UI & Export
const AccountingDashboard = lazy(() => import('@/pages/yaksa-admin/accounting/AccountingDashboard'));
const ExpenseListPage = lazy(() => import('@/pages/yaksa-admin/accounting/ExpenseListPage'));
const ClosingPage = lazy(() => import('@/pages/yaksa-admin/accounting/ClosingPage'));
const ExportPage = lazy(() => import('@/pages/yaksa-admin/accounting/ExportPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Yaksa routes — membership, reporting, yaksa admin, accounting
 */
export function YaksaRoutes() {
  return [
    // Membership-Yaksa: 회원 관리
    //
    // WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1
    //   이 6개 화면이 소비하는 `/api/v1/membership/*` 관리자 subtree 는
    //   `MEMBERSHIP_ADMIN_ROLES = ['platform:admin','platform:super_admin']` 로 보호된다.
    //   기존에는 route 가 `requiredPermissions` 만 선언했는데, permission 은 백엔드가 공급하지 않아
    //   사실상 "관리자급이면 통과" 로 동작했다. 그래서 메뉴를 숨겨도 URL 직접 접근이면 화면이 렌더됐다.
    //   메뉴에서 숨긴 대상은 route 에서도 막혀야 하므로 실제 경계를 `requiredRoles` 로 선언한다.
    //   `requiredPermissions` 는 그대로 둔다 — 나중에 permission 이 공급되면 자동으로 AND 조건이 된다.
    <Route key="/admin/membership/dashboard" path="/admin/membership/dashboard" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['membership:view']}>
        <Suspense fallback={<PageLoader />}>
          <MembershipDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/members" path="/admin/membership/members" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['membership:view', 'membership:manage']}>
        <Suspense fallback={<PageLoader />}>
          <MemberManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/members/:id" path="/admin/membership/members/:id" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['membership:view']}>
        <Suspense fallback={<PageLoader />}>
          <MemberDetail />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/verifications" path="/admin/membership/verifications" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['membership:verify']}>
        <Suspense fallback={<PageLoader />}>
          <VerificationManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/categories" path="/admin/membership/categories" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['membership:manage']}>
        <Suspense fallback={<PageLoader />}>
          <CategoryManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/audit-logs" path="/admin/membership/audit-logs" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['membership:view']}>
        <Suspense fallback={<PageLoader />}>
          <AuditLogManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    // Reporting-Yaksa: 신상신고 관리
    <Route key="/admin/reporting" path="/admin/reporting" element={
      <AdminProtectedRoute requiredPermissions={['reporting:view']}>
        <Suspense fallback={<PageLoader />}>
          <ReportingDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/reporting/dashboard" path="/admin/reporting/dashboard" element={
      <AdminProtectedRoute requiredPermissions={['reporting:view']}>
        <Suspense fallback={<PageLoader />}>
          <ReportingDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/reporting/reports" path="/admin/reporting/reports" element={
      <AdminProtectedRoute requiredPermissions={['reporting:view', 'reporting:manage']}>
        <Suspense fallback={<PageLoader />}>
          <ReportList />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/reporting/templates" path="/admin/reporting/templates" element={
      <AdminProtectedRoute requiredPermissions={['reporting:manage']}>
        <Suspense fallback={<PageLoader />}>
          <TemplateList />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Yaksa Admin Hub - Integrated Dashboard (Phase 19-D)
    <Route key="/admin/yaksa-hub" path="/admin/yaksa-hub" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-scheduler.job.read']}>
        <AppRouteGuard appId="yaksa-scheduler">
          <Suspense fallback={<PageLoader />}>
            <YaksaAdminHub />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

    // Yaksa Admin - Phase 1 Approval & Overview UI
    <Route key="/admin/yaksa" path="/admin/yaksa" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
        <Suspense fallback={<PageLoader />}>
          <YaksaAdminDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    // WO-O4O-ADMIN-DASHBOARD-OPERATION-SECURITY-BOUNDARY-ROLE-ACCESS-V1
    //   이 화면(MemberApprovalPage)이 다루는 데이터는 `/api/v1/membership/*` 관리자 subtree —
    //   `MEMBERSHIP_ADMIN_ROLES = ['platform:admin','platform:super_admin']` 로 보호되는
    //   **플랫폼 전역** 회원 데이터다(서비스 경계 없음). 그런데 route 선언은
    //   `requiredPermissions` 뿐이었고, 백엔드가 `user.permissions` 를 공급하지 않으므로
    //   실효 경계는 "관리자급이면 통과"(서비스 접두 `kpa:admin` 포함) 였다.
    //   canonical 회원 콘솔(`/admin/membership/members`)과 같은 경계로 좁힌다.
    //   `requiredPermissions` 는 그대로 둔다 — permission 이 공급되면 AND 조건이 된다.
    //   화면 자체의 운영 주체(canonical 콘솔과의 중복 여부)는 POLICY_REQUIRED 로 남긴다.
    <Route key="/admin/yaksa/members" path="/admin/yaksa/members" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['yaksa-admin.members.approve']}>
        <Suspense fallback={<PageLoader />}>
          <MemberApprovalPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/yaksa/reports" path="/admin/yaksa/reports" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.reports.review']}>
        <Suspense fallback={<PageLoader />}>
          <ReportReviewPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/yaksa/officers" path="/admin/yaksa/officers" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.officers.assign']}>
        <Suspense fallback={<PageLoader />}>
          <OfficerManagePage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/yaksa/education" path="/admin/yaksa/education" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.education.view']}>
        <Suspense fallback={<PageLoader />}>
          <EducationOverviewPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/yaksa/fees" path="/admin/yaksa/fees" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.fees.view']}>
        <Suspense fallback={<PageLoader />}>
          <FeeOverviewPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/yaksa/forum" path="/admin/yaksa/forum" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
        <Navigate to="/forum/boards" replace />
      </AdminProtectedRoute>
    } />,

    // Yaksa Accounting - Phase 2
    <Route key="/admin/yaksa/accounting" path="/admin/yaksa/accounting" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
        <Suspense fallback={<PageLoader />}>
          <AccountingDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/yaksa/accounting/expenses" path="/admin/yaksa/accounting/expenses" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
        <Suspense fallback={<PageLoader />}>
          <ExpenseListPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/yaksa/accounting/close" path="/admin/yaksa/accounting/close" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
        <Suspense fallback={<PageLoader />}>
          <ClosingPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/yaksa/accounting/export" path="/admin/yaksa/accounting/export" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
        <Suspense fallback={<PageLoader />}>
          <ExportPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}
