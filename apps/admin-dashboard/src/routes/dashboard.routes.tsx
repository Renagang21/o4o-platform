import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

const AdminHome = lazy(() => import('@/pages/AdminHome'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const UnifiedDashboard = lazy(() => import('@/pages/dashboard/unified/UnifiedDashboard'));
const BusinessDashboard = lazy(() => import('@/pages/dashboard/business/BusinessDashboard'));
const ServiceContentManagerPage = lazy(() => import('@/pages/service-content-manager/ServiceContentManagerPage'));
const AppDisabled = lazy(() => import('@/pages/error/AppDisabled'));

// WO-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1 (Axis D):
// PD-3/PD-4/PD-5 seller·supplier 대시보드 6화면을 은퇴했다. 6화면 모두
// 존재하지 않는 backend(`/api/v2/seller/*`, `/api/v2/supplier/*`,
// `/api/v1/seller/settlements`, `/api/v1/supplier/settlements`)를 호출했고,
// 진입 네비게이션도 0건이었다 (DEAD_CROSSLINK).
// canonical: 공급자 정산 = web-neture `/supplier/settlements`
//            (backend `/api/v1/neture/supplier/settlements`).
// seller(플랫폼 직접판매) 축은 PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE.

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Dashboard routes — admin home, unified dashboard, seller/supplier dashboards
 */
export function DashboardRoutes() {
  return [
    // Error Pages - No permission required
    <Route key="/error/app-disabled" path="/error/app-disabled" element={
      <Suspense fallback={<PageLoader />}>
        <AppDisabled />
      </Suspense>
    } />,

    // 관리자 메인 대시보드
    <Route key="/admin" path="/admin" element={
      <Suspense fallback={<PageLoader />}>
        <AdminDashboard />
      </Suspense>
    } />,

    <Route key="/home" path="/home" element={
      <Suspense fallback={<PageLoader />}>
        <AdminHome />
      </Suspense>
    } />,

    // Unified Dashboard v1 - Primary entry point
    <Route key="/dashboard" path="/dashboard" element={
      <Suspense fallback={<PageLoader />}>
        <UnifiedDashboard />
      </Suspense>
    } />,

    // WO-O4O-BUSINESS-DASHBOARD-V1: Business Dashboard
    <Route key="/dashboard/business" path="/dashboard/business" element={
      <AdminProtectedRoute requiredRoles={['partner', 'affiliate', 'seller', 'supplier']}>
        <Suspense fallback={<PageLoader />}>
          <BusinessDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // WO-ADMIN-CONTENT-SLOT-V1: Service Content Manager
    <Route key="/admin/service-content-manager" path="/admin/service-content-manager" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <ServiceContentManagerPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}
