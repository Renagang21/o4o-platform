import { Route, Navigate } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';
import { AppRouteGuard } from '@/components/AppRouteGuard';

// Membership-Yaksa: Membership Management
const MembershipDashboard = lazy(() => import('@/pages/membership/dashboard/MembershipDashboard'));
const MemberManagement = lazy(() => import('@/pages/membership/members/MemberManagement'));
const MemberDetail = lazy(() => import('@/pages/membership/members/MemberDetail'));
const VerificationManagement = lazy(() => import('@/pages/membership/verifications/VerificationManagement'));
const CategoryManagement = lazy(() => import('@/pages/membership/categories/CategoryManagement'));
const AuditLogManagement = lazy(() => import('@/pages/membership/audit-logs/AuditLogManagement'));
const AffiliationManagement = lazy(() => import('@/pages/membership/affiliations/AffiliationManagement'));

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
    <Route key="/admin/membership/dashboard" path="/admin/membership/dashboard" element={
      <AdminProtectedRoute requiredPermissions={['membership:view']}>
        <Suspense fallback={<PageLoader />}>
          <MembershipDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/members" path="/admin/membership/members" element={
      <AdminProtectedRoute requiredPermissions={['membership:view', 'membership:manage']}>
        <Suspense fallback={<PageLoader />}>
          <MemberManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/members/:id" path="/admin/membership/members/:id" element={
      <AdminProtectedRoute requiredPermissions={['membership:view']}>
        <Suspense fallback={<PageLoader />}>
          <MemberDetail />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/verifications" path="/admin/membership/verifications" element={
      <AdminProtectedRoute requiredPermissions={['membership:verify']}>
        <Suspense fallback={<PageLoader />}>
          <VerificationManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/categories" path="/admin/membership/categories" element={
      <AdminProtectedRoute requiredPermissions={['membership:manage']}>
        <Suspense fallback={<PageLoader />}>
          <CategoryManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/audit-logs" path="/admin/membership/audit-logs" element={
      <AdminProtectedRoute requiredPermissions={['membership:view']}>
        <Suspense fallback={<PageLoader />}>
          <AuditLogManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/membership/affiliations" path="/admin/membership/affiliations" element={
      <AdminProtectedRoute requiredPermissions={['membership:manage']}>
        <Suspense fallback={<PageLoader />}>
          <AffiliationManagement />
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
    <Route key="/admin/yaksa/members" path="/admin/yaksa/members" element={
      <AdminProtectedRoute requiredPermissions={['yaksa-admin.members.approve']}>
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
