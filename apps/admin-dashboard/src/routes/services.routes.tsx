import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';
import { AppRouteGuard } from '@/components/AppRouteGuard';

// Cosmetics Partner Extension Pages
const CosmeticsPartnerRouter = lazy(() => import('@/pages/cosmetics-partner/CosmeticsPartnerRouter'));

// Cosmetics Products Pages (Phase 7-H)
const CosmeticsProductsRouter = lazy(() => import('@/pages/cosmetics-products/CosmeticsProductsRouter'));

// Glycopharm Pages (Phase B-3)
const GlycopharmRouter = lazy(() => import('@/pages/glycopharm/GlycopharmRouter'));

// GlucoseView Pages (Phase C-3)
const GlucoseViewRouter = lazy(() => import('@/pages/glucoseview/GlucoseViewRouter'));

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
 * Service domain routes — cosmetics, glycopharm, glucoseview, neture, service applications
 */
export function ServiceRoutes() {
  return [
    // Cosmetics Partner Extension - Partner/Influencer for Cosmetics
    <Route key="/cosmetics-partner/*" path="/cosmetics-partner/*" element={
      <AdminProtectedRoute requiredRoles={['partner', 'admin']}>
        <AppRouteGuard appId="cosmetics-partner-extension">
          <Suspense fallback={<PageLoader />}>
            <CosmeticsPartnerRouter />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

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

    // GlucoseView - CGM Data View Configuration (Phase C-3)
    <Route key="/glucoseview/*" path="/glucoseview/*" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <GlucoseViewRouter />
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
