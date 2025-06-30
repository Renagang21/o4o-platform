import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DropshippingLayout } from './DropshippingLayout';

// Seller Pages
import { SellerDashboard } from './SellerDashboard';
import { SellerInventoryPage } from './SellerInventoryPage';
import { SellerOrderManagementPage } from './SellerOrderManagementPage';
import { SellerPricingRulesPage } from './SellerPricingRulesPage';
import { SellerSuppliersPage } from './SellerSuppliersPage';
import { SellerReportsPage } from './SellerReportsPage';

// Supplier Pages
import { SupplierDashboard } from './SupplierDashboard';
import { SupplierProductManagementPage } from './SupplierProductManagementPage';
import { SupplierOrdersPage } from './SupplierOrdersPage';
import { SupplierShippingPage } from './SupplierShippingPage';
import { SupplierSettlementPage } from './SupplierSettlementPage';
import { SupplierReportsPage } from './SupplierReportsPage';

// Partner Pages
import { PartnerDashboard } from './PartnerDashboard';
import { PartnerMarketingPage } from './PartnerMarketingPage';
import { PartnerCommissionPage } from './PartnerCommissionPage';
import { PartnerAnalyticsPage } from './PartnerAnalyticsPage';

// Admin Pages
import { AdminDashboard } from './AdminDashboard';
import { UserManagementPage } from './admin/UserManagementPage';
import { SystemMonitoringPage } from './admin/SystemMonitoringPage';
import { PlatformReportsPage } from './admin/PlatformReportsPage';
import { SettingsPage } from './admin/SettingsPage';

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