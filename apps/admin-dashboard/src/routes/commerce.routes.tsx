import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// Admin Order Pages (Phase 4)
const OrderListPage = lazy(() => import('@/pages/admin/orders/OrderListPage'));
const OrderDetailPage = lazy(() => import('@/pages/admin/orders/OrderDetailPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Commerce routes — orders
 */
export function CommerceRoutes() {
  return [
    // Admin Order Management (Phase 4)
    <Route key="/admin/orders" path="/admin/orders" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <OrderListPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/orders/:id" path="/admin/orders/:id" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <OrderDetailPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

  ];
}
