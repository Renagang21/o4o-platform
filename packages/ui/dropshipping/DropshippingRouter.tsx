import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DropshippingLayout } from './DropshippingLayout';

// Import existing components
import { SellerDashboard } from './SellerDashboard';
import { PartnerDashboard } from './pages/PartnerDashboard';

// Import placeholder components for missing ones
import { 
  SellerInventoryPage,
  SellerOrderManagementPage,
  SellerPricingRulesPage,
  SellerSuppliersPage,
  SellerReportsPage,
  SupplierDashboard,
  SupplierProductManagementPage,
  SupplierOrdersPage,
  SupplierShippingPage,
  SupplierSettlementPage,
  SupplierReportsPage,
  AdminDashboard,
  UserManagementPage,
  SystemMonitoringPage,
  PlatformReportsPage,
  SettingsPage
} from './missing-components';

// Partner Pages (try to import existing ones, fallback to placeholders)
import { PartnerMarketingPage } from './pages/PartnerMarketingPage';
import { PartnerCommissionPage } from './pages/PartnerCommissionPage';
import { PartnerAnalyticsPage } from './PartnerAnalyticsPage';

interface DropshippingRouterProps {
  userRole: 'seller' | 'supplier' | 'partner' | 'admin';
}

export const DropshippingRouter: React.FC<DropshippingRouterProps> = ({ userRole }) => {
  // 역할별 기본 경로
  const getDefaultPath = () => {
    switch (userRole) {
      case 'seller':
        return '/seller/dashboard';
      case 'supplier':
        return '/supplier/dashboard';
      case 'partner':
        return '/partner/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <Routes>
      <Route path="/" element={<DropshippingLayout userRole={userRole} />}>
        {/* 기본 리다이렉트 */}
        <Route index element={<Navigate to={getDefaultPath()} replace />} />

        {/* Seller Routes */}
        {userRole === 'seller' && (
          <>
            <Route path="seller">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="inventory" element={<SellerInventoryPage />} />
              <Route path="orders" element={<SellerOrderManagementPage />} />
              <Route path="pricing" element={<SellerPricingRulesPage />} />
              <Route path="suppliers" element={<SellerSuppliersPage />} />
              <Route path="reports" element={<SellerReportsPage />} />
            </Route>
            {/* 다른 역할 경로 접근 차단 */}
            <Route path="supplier/*" element={<Navigate to="/seller/dashboard" replace />} />
            <Route path="partner/*" element={<Navigate to="/seller/dashboard" replace />} />
            <Route path="admin/*" element={<Navigate to="/seller/dashboard" replace />} />
          </>
        )}

        {/* Supplier Routes */}
        {userRole === 'supplier' && (
          <>
            <Route path="supplier">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SupplierDashboard />} />
              <Route path="products" element={<SupplierProductManagementPage />} />
              <Route path="orders" element={<SupplierOrdersPage />} />
              <Route path="shipping" element={<SupplierShippingPage />} />
              <Route path="settlement" element={<SupplierSettlementPage />} />
              <Route path="reports" element={<SupplierReportsPage />} />
            </Route>
            {/* 다른 역할 경로 접근 차단 */}
            <Route path="seller/*" element={<Navigate to="/supplier/dashboard" replace />} />
            <Route path="partner/*" element={<Navigate to="/supplier/dashboard" replace />} />
            <Route path="admin/*" element={<Navigate to="/supplier/dashboard" replace />} />
          </>
        )}

        {/* Partner Routes */}
        {userRole === 'partner' && (
          <>
            <Route path="partner">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PartnerDashboard />} />
              <Route path="marketing" element={<PartnerMarketingPage />} />
              <Route path="commission" element={<PartnerCommissionPage />} />
              <Route path="analytics" element={<PartnerAnalyticsPage />} />
            </Route>
            {/* 다른 역할 경로 접근 차단 */}
            <Route path="seller/*" element={<Navigate to="/partner/dashboard" replace />} />
            <Route path="supplier/*" element={<Navigate to="/partner/dashboard" replace />} />
            <Route path="admin/*" element={<Navigate to="/partner/dashboard" replace />} />
          </>
        )}

        {/* Admin Routes */}
        {userRole === 'admin' && (
          <>
            <Route path="admin">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="monitoring" element={<SystemMonitoringPage />} />
              <Route path="reports" element={<PlatformReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            {/* 관리자는 모든 역할의 대시보드에 접근 가능 */}
            <Route path="seller/dashboard" element={<SellerDashboard />} />
            <Route path="supplier/dashboard" element={<SupplierDashboard />} />
            <Route path="partner/dashboard" element={<PartnerDashboard />} />
          </>
        )}

        {/* 404 처리 */}
        <Route path="*" element={<Navigate to={getDefaultPath()} replace />} />
      </Route>
    </Routes>
  );
};