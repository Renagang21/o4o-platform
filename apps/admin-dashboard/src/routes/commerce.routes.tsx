import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// DS-4: Dropshipping Admin Pages (Order Relay & Settlement)
const DropshippingOrderRelayListPage = lazy(() => import('@/pages/dropshipping/OrderRelayListPage'));
const DropshippingOrderRelayDetailPage = lazy(() => import('@/pages/dropshipping/OrderRelayDetailPage'));
const DropshippingSettlementListPage = lazy(() => import('@/pages/dropshipping/SettlementListPage'));
const DropshippingSettlementDetailPage = lazy(() => import('@/pages/dropshipping/SettlementDetailPage'));

// Admin Order Pages (Phase 4)
const OrderListPage = lazy(() => import('@/pages/admin/orders/OrderListPage'));
const OrderDetailPage = lazy(() => import('@/pages/admin/orders/OrderDetailPage'));

// Groupbuy Pages
const GroupbuyCampaignListPage = lazy(() => import('@/pages/groupbuy/GroupbuyCampaignListPage'));
const GroupbuyCampaignDetailPage = lazy(() => import('@/pages/groupbuy/GroupbuyCampaignDetailPage'));
const GroupbuyParticipantsPage = lazy(() => import('@/pages/groupbuy/GroupbuyParticipantsPage'));
const GroupbuySettlementPage = lazy(() => import('@/pages/groupbuy/GroupbuySettlementPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Commerce routes — dropshipping, orders, groupbuy
 */
export function CommerceRoutes() {
  return [
    // DS-4: Dropshipping Admin Routes (Order Relay & Settlement)
    <Route key="/admin/dropshipping/order-relays" path="/admin/dropshipping/order-relays" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <DropshippingOrderRelayListPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/dropshipping/order-relays/:id" path="/admin/dropshipping/order-relays/:id" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <DropshippingOrderRelayDetailPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/dropshipping/settlements" path="/admin/dropshipping/settlements" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <DropshippingSettlementListPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/dropshipping/settlements/:id" path="/admin/dropshipping/settlements/:id" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <DropshippingSettlementDetailPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

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

    // Groupbuy Management
    <Route key="/admin/groupbuy" path="/admin/groupbuy" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <GroupbuyCampaignListPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/groupbuy/settlement" path="/admin/groupbuy/settlement" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <GroupbuySettlementPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/groupbuy/:id" path="/admin/groupbuy/:id" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <GroupbuyCampaignDetailPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/groupbuy/:id/participants" path="/admin/groupbuy/:id/participants" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <GroupbuyParticipantsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}
