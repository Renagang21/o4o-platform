import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// WO-O4O-LEGACY-COSMETICS-PARTNER-REMOVAL-V1:
//   과거 K-Cosmetics 인플루언서·제휴판매 기능(Cosmetics Partner)의 관리자 라우트를 제거했다.
//   본체 패키지 @o4o/cosmetics-partner-extension 은 이미 삭제된 상태에서 화면·앱 등록만 남아 있었고,
//   화면이 호출하던 /partner/routines · /partner/earnings · /cosmetics-partner/commission-policies
//   백엔드 라우트도 존재하지 않아 동작 불가였다.
//   Partner 는 Neture 서비스의 활동 주체이며, Cosmetics 는 분야이지 별도 Partner 계정 유형이 아니다.
//   현재 Neture 공급자·파트너·인플루언서 기능은 이 제거와 무관하며 변경하지 않았다.

// Cosmetics Products Pages (Phase 7-H)
const CosmeticsProductsRouter = lazy(() => import('@/pages/cosmetics-products/CosmeticsProductsRouter'));

// Glycopharm Pages (Phase B-3)
const GlycopharmRouter = lazy(() => import('@/pages/glycopharm/GlycopharmRouter'));

// Service Applications Admin Pages (Phase C-4)
const ServiceApplicationsPage = lazy(() => import('@/pages/service-applications/ServiceApplicationsPage'));
const ServiceApplicationDetailPage = lazy(() => import('@/pages/service-applications/ServiceApplicationDetailPage'));

// Neture Pages (Phase D-3)
const NetureRouter = lazy(() => import('@/pages/neture/NetureRouter'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Service domain routes — cosmetics, glycopharm, neture, service applications
 */
export function ServiceRoutes() {
  return [
    // Cosmetics Products - Products/Brands Management (Phase 7-H)
    <Route key="/cosmetics-products/*" path="/cosmetics-products/*" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CosmeticsProductsRouter />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Glycopharm - Pharmacy Blood Glucose Products (Phase B-3)
    <Route key="/glycopharm/*" path="/glycopharm/*" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <GlycopharmRouter />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Service Applications Admin (Phase C-4)
    <Route key="/admin/service-applications/:service" path="/admin/service-applications/:service" element={
      <AdminProtectedRoute requiredRoles={['admin', 'operator']}>
        <Suspense fallback={<PageLoader />}>
          <ServiceApplicationsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/service-applications/:service/:id" path="/admin/service-applications/:service/:id" element={
      <AdminProtectedRoute requiredRoles={['admin', 'operator']}>
        <Suspense fallback={<PageLoader />}>
          <ServiceApplicationDetailPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Neture - B2C Reference Service Management (Phase D-3)
    <Route key="/neture/*" path="/neture/*" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <NetureRouter />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}
