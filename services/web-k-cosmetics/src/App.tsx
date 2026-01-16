/**
 * App - K-Cosmetics
 * Based on GlycoPharm App structure
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Layouts
import MainLayout from '@/components/layouts/MainLayout';
import PartnerLayout from '@/components/layouts/PartnerLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Public Pages
import { HomePage, ContactPage, NotFoundPage, RoleNotAvailablePage, StoresPage, ProductsPage, SupplyPage, TouristHubPage } from '@/pages';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import PartnerInfoPage from '@/pages/PartnerInfoPage';
import MyPage from '@/pages/MyPage';

// Partner Application (WO-PARTNER-APPLICATION-V1)
import PartnerApplyPage from '@/pages/partners/ApplyPage';

// Test Guide Pages
import {
  TestGuidePage,
  ConsumerManualPage,
  SellerManualPage,
  SupplierManualPage,
  AdminManualPage,
  OperatorManualPage,
} from '@/pages/test-guide';

// Forum Pages
import { ForumPage, PostDetailPage } from '@/pages/forum';

// Partner Dashboard Pages
import PartnerIndex from '@/pages/partner/index';
import PartnerOverviewPage from '@/pages/partner/OverviewPage';
import PartnerTargetsPage from '@/pages/partner/TargetsPage';
import PartnerContentPage from '@/pages/partner/ContentPage';
import PartnerEventsPage from '@/pages/partner/EventsPage';
import PartnerStatusPage from '@/pages/partner/StatusPage';

// Operator Dashboard Pages
import OperatorIndex from '@/pages/operator/index';
import OperatorStoresPage from '@/pages/operator/StoresPage';
import OperatorApplicationsPage from '@/pages/operator/ApplicationsPage';
import OperatorProductsPage from '@/pages/operator/ProductsPage';
import OperatorOrdersPage from '@/pages/operator/OrdersPage';
import OperatorInventoryPage from '@/pages/operator/InventoryPage';
import OperatorSettlementsPage from '@/pages/operator/SettlementsPage';
import OperatorAnalyticsPage from '@/pages/operator/AnalyticsPage';
import OperatorMarketingPage from '@/pages/operator/MarketingPage';
import OperatorUsersPage from '@/pages/operator/UsersPage';
import OperatorSupportPage from '@/pages/operator/SupportPage';
import OperatorSettingsPage from '@/pages/operator/SettingsPage';
import OperatorAiReportPage from '@/pages/operator/AiReportPage';

// Protected Route Component - triggers auth check only when entering
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading, isSessionChecked, checkSession } = useAuth();

  // Trigger session check when entering protected route
  React.useEffect(() => {
    if (!isSessionChecked) {
      checkSession();
    }
  }, [isSessionChecked, checkSession]);

  // Wait for session check to complete
  if (!isSessionChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.currentRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="partners" element={<PartnerInfoPage />} />
        <Route path="partners/apply" element={<PartnerApplyPage />} />

        {/* Test Guide */}
        <Route path="test-guide" element={<TestGuidePage />} />
        <Route path="test-guide/manual/consumer" element={<ConsumerManualPage />} />
        <Route path="test-guide/manual/seller" element={<SellerManualPage />} />
        <Route path="test-guide/manual/supplier" element={<SupplierManualPage />} />
        <Route path="test-guide/manual/admin" element={<AdminManualPage />} />
        <Route path="test-guide/manual/operator" element={<OperatorManualPage />} />

        {/* Forum */}
        <Route path="forum" element={<ForumPage />} />
        <Route path="forum/post/:postId" element={<PostDetailPage />} />

        {/* MyPage (Protected) */}
        <Route
          path="mypage"
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          }
        />

        {/* Role Not Available - these roles use Neture platform */}
        <Route path="supplier/*" element={<RoleNotAvailablePage role="supplier" />} />
        <Route path="admin/*" element={<RoleNotAvailablePage role="admin" />} />
        <Route path="seller/*" element={<RoleNotAvailablePage role="seller" />} />

        {/* Platform Routes */}
        <Route path="platform/stores" element={<StoresPage />} />
        <Route path="platform/stores/products" element={<ProductsPage />} />

        {/* B2B Routes */}
        <Route path="b2b/supply" element={<SupplyPage />} />

        {/* Services Routes */}
        <Route path="services/tourists" element={<TouristHubPage />} />
      </Route>

      {/* Partner Dashboard */}
      <Route
        path="partner"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PartnerIndex />} />
        <Route path="overview" element={<PartnerOverviewPage />} />
        <Route path="targets" element={<PartnerTargetsPage />} />
        <Route path="content" element={<PartnerContentPage />} />
        <Route path="events" element={<PartnerEventsPage />} />
        <Route path="status" element={<PartnerStatusPage />} />
      </Route>

      {/* Operator Dashboard */}
      <Route
        path="operator"
        element={
          <ProtectedRoute allowedRoles={['operator']}>
            <DashboardLayout role="operator" />
          </ProtectedRoute>
        }
      >
        <Route index element={<OperatorIndex />} />
        <Route path="stores" element={<OperatorStoresPage />} />
        <Route path="applications" element={<OperatorApplicationsPage />} />
        <Route path="products" element={<OperatorProductsPage />} />
        <Route path="orders" element={<OperatorOrdersPage />} />
        <Route path="inventory" element={<OperatorInventoryPage />} />
        <Route path="settlements" element={<OperatorSettlementsPage />} />
        <Route path="analytics" element={<OperatorAnalyticsPage />} />
        <Route path="marketing" element={<OperatorMarketingPage />} />
        <Route path="users" element={<OperatorUsersPage />} />
        <Route path="support" element={<OperatorSupportPage />} />
        <Route path="settings" element={<OperatorSettingsPage />} />
        {/* AI Report (WO-AI-SERVICE-OPERATOR-REPORT-V1) */}
        <Route path="ai-report" element={<OperatorAiReportPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
