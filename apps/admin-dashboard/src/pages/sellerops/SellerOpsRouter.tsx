/**
 * SellerOps Router
 *
 * SellerOps App의 프론트엔드 페이지를 admin-dashboard에 통합
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load SellerOps pages from the package
// Note: These will be loaded from @o4o/sellerops when the package is built
// For now, we create local wrapper components

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const SuppliersList = lazy(() => import('./pages/SuppliersList'));
const ListingsList = lazy(() => import('./pages/ListingsList'));
const OrdersList = lazy(() => import('./pages/OrdersList'));
const SettlementDashboard = lazy(() => import('./pages/SettlementDashboard'));
const NoticePage = lazy(() => import('./pages/NoticePage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const SellerOpsRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="suppliers" element={<SuppliersList />} />
        <Route path="listings" element={<ListingsList />} />
        <Route path="listings/new" element={<ListingsList />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="orders/:id" element={<OrdersList />} />
        <Route path="settlement" element={<SettlementDashboard />} />
        <Route path="notice" element={<NoticePage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
};

export default SellerOpsRouter;
