import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

const AdminHome = lazy(() => import('@/pages/AdminHome'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const UnifiedDashboard = lazy(() => import('@/pages/dashboard/unified/UnifiedDashboard'));
const BusinessDashboard = lazy(() => import('@/pages/dashboard/business/BusinessDashboard'));
const ServiceContentManagerPage = lazy(() => import('@/pages/service-content-manager/ServiceContentManagerPage'));
const AppDisabled = lazy(() => import('@/pages/error/AppDisabled'));

// PD-3: Seller Dashboard Routes
const SellerCatalog = lazy(() => import('@/pages/dashboard/seller/SellerCatalog'));
const SellerProducts = lazy(() => import('@/pages/dashboard/seller/SellerProducts'));
// PD-4: Orders Pages
const SellerOrders = lazy(() => import('@/pages/dashboard/seller/SellerOrders'));
const SupplierOrders = lazy(() => import('@/pages/dashboard/supplier/SupplierOrders'));
// PD-5: Settlement Pages
const SellerSettlements = lazy(() => import('@/pages/dashboard/seller/SellerSettlements'));
const SupplierSettlements = lazy(() => import('@/pages/dashboard/supplier/SupplierSettlements'));

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
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'platform_admin']}>
        <Suspense fallback={<PageLoader />}>
          <ServiceContentManagerPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // PD-3: Seller Dashboard Routes
    <Route key="/dashboard/seller/catalog" path="/dashboard/seller/catalog" element={
      <AdminProtectedRoute requiredRoles={['seller']}>
        <Suspense fallback={<PageLoader />}>
          <SellerCatalog />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/dashboard/seller/products" path="/dashboard/seller/products" element={
      <AdminProtectedRoute requiredRoles={['seller']}>
        <Suspense fallback={<PageLoader />}>
          <SellerProducts />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // PD-4: Seller Orders
    <Route key="/dashboard/seller/orders" path="/dashboard/seller/orders" element={
      <AdminProtectedRoute requiredRoles={['seller']}>
        <Suspense fallback={<PageLoader />}>
          <SellerOrders />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // PD-5: Seller Settlements
    <Route key="/dashboard/seller/settlements" path="/dashboard/seller/settlements" element={
      <AdminProtectedRoute requiredRoles={['seller']}>
        <Suspense fallback={<PageLoader />}>
          <SellerSettlements />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // PD-4: Supplier Orders
    <Route key="/dashboard/supplier/orders" path="/dashboard/supplier/orders" element={
      <AdminProtectedRoute requiredRoles={['supplier']}>
        <Suspense fallback={<PageLoader />}>
          <SupplierOrders />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // PD-5: Supplier Settlements
    <Route key="/dashboard/supplier/settlements" path="/dashboard/supplier/settlements" element={
      <AdminProtectedRoute requiredRoles={['supplier']}>
        <Suspense fallback={<PageLoader />}>
          <SupplierSettlements />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}
