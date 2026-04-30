import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// Store Network Dashboard (WO-O4O-STORE-NETWORK-DASHBOARD-V1)
const StoreNetworkPage = lazy(() => import('@/pages/platform/StoreNetworkPage'));

// Physical Stores (WO-O4O-CROSS-SERVICE-STORE-LINKING-V1)
const PhysicalStoresPage = lazy(() => import('@/pages/platform/PhysicalStoresPage'));

// Platform Hub — Global Operations (WO-PLATFORM-GLOBAL-HUB-V1)
const PlatformHubPage = lazy(() => import('@/pages/platform/PlatformHubPage'));

// Monitoring
const IntegratedMonitoring = lazy(() => import('@/pages/monitoring/IntegratedMonitoring'));
const PerformanceDashboard = lazy(() => import('@/pages/monitoring/PerformanceDashboard'));
const OperationsDashboard = lazy(() => import('@/pages/dashboard/phase2.4'));

// Service Monitoring (Phase 9 Task 3)
const ServiceOverview = lazy(() => import('@/pages/services/ServiceOverview'));

// Auth Analytics (WO-O4O-AUTH-ANALYTICS-UI-V1)
const AuthAnalyticsPage = lazy(() => import('@/pages/operator/AuthAnalyticsPage'));

// Content Approvals (WO-O4O-OPERATOR-CONTENT-APPROVAL-PHASE1-V1)
const ContentApprovalsPage = lazy(() => import('@/pages/operator/ContentApprovalsPage'));

// KPA HUB & Store Content (WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1)
const HubContentsPage = lazy(() => import('@/pages/kpa/HubContentsPage'));
const MyStoreContentsPage = lazy(() => import('@/pages/kpa/MyStoreContentsPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Platform routes — store network, monitoring, services overview, platform hub
 */
export function PlatformRoutes() {
  return [
    // Store Network Dashboard (WO-O4O-STORE-NETWORK-DASHBOARD-V1)
    <Route key="/admin/store-network" path="/admin/store-network" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <StoreNetworkPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Physical Stores (WO-O4O-CROSS-SERVICE-STORE-LINKING-V1)
    <Route key="/admin/physical-stores" path="/admin/physical-stores" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <PhysicalStoresPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Platform Hub — Global Operations (WO-PLATFORM-GLOBAL-HUB-V1)
    <Route key="/admin/platform/hub" path="/admin/platform/hub" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <PlatformHubPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // System Monitoring
    <Route key="/monitoring" path="/monitoring" element={
      <AdminProtectedRoute requiredPermissions={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <IntegratedMonitoring />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/monitoring/performance" path="/monitoring/performance" element={
      <AdminProtectedRoute requiredPermissions={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <PerformanceDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/monitoring/security" path="/monitoring/security" element={
      <AdminProtectedRoute requiredPermissions={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <IntegratedMonitoring />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Phase 2.4 - Operations Dashboard
    <Route key="/admin/dashboard/operations" path="/admin/dashboard/operations" element={
      <AdminProtectedRoute requiredPermissions={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <OperationsDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Phase 9 Task 3 - Service Monitoring Dashboard
    <Route key="/admin/services/overview" path="/admin/services/overview" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <ServiceOverview />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/services" path="/admin/services" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <ServiceOverview />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Auth Analytics (WO-O4O-AUTH-ANALYTICS-UI-V1)
    <Route key="/operator/analytics/auth" path="/operator/analytics/auth" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator']}>
        <Suspense fallback={<PageLoader />}>
          <AuthAnalyticsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Content Approvals (WO-O4O-OPERATOR-CONTENT-APPROVAL-PHASE1-V1)
    <Route key="/operator/approvals" path="/operator/approvals" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator']}>
        <Suspense fallback={<PageLoader />}>
          <ContentApprovalsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // HUB 콘텐츠 목록 (WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1)
    <Route key="/operator/hub-contents" path="/operator/hub-contents" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator']}>
        <Suspense fallback={<PageLoader />}>
          <HubContentsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 내 매장 콘텐츠 (WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1)
    <Route key="/kpa/my-store-contents" path="/kpa/my-store-contents" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator', 'supplier']}>
        <Suspense fallback={<PageLoader />}>
          <MyStoreContentsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}
