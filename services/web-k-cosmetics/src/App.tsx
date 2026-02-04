/**
 * App - K-Cosmetics
 * Based on GlycoPharm App structure
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginModalProvider } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/common/LoginModal';

// Layouts (always needed)
import MainLayout from '@/components/layouts/MainLayout';
import PartnerLayout from '@/components/layouts/PartnerLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Public Pages (always loaded - first paint)
import { HomePage, NotFoundPage } from '@/pages';
import LoginPage from '@/pages/auth/LoginPage';

// ============================================================================
// Lazy loaded pages (heavy / rarely accessed)
// ============================================================================

// Public pages
const ContactPage = lazy(() => import('@/pages').then(m => ({ default: m.ContactPage })));
const RoleNotAvailablePage = lazy(() => import('@/pages').then(m => ({ default: m.RoleNotAvailablePage })));
const StoresPage = lazy(() => import('@/pages').then(m => ({ default: m.StoresPage })));
const ProductsPage = lazy(() => import('@/pages').then(m => ({ default: m.ProductsPage })));
const SupplyPage = lazy(() => import('@/pages').then(m => ({ default: m.SupplyPage })));
const TouristHubPage = lazy(() => import('@/pages').then(m => ({ default: m.TouristHubPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const PartnerInfoPage = lazy(() => import('@/pages/PartnerInfoPage'));
const MyPage = lazy(() => import('@/pages/MyPage'));

// Partner Application (WO-PARTNER-APPLICATION-V1)
const PartnerApplyPage = lazy(() => import('@/pages/partners/ApplyPage'));

// Test Guide Pages
const TestGuidePage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.TestGuidePage })));
const ConsumerManualPage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.ConsumerManualPage })));
const SellerManualPage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.SellerManualPage })));
const SupplierManualPage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.SupplierManualPage })));
const AdminManualPage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.AdminManualPage })));
const OperatorManualPage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.OperatorManualPage })));
const TestCenterPage = lazy(() => import('@/pages/TestCenterPage'));

// Forum Pages
const ForumHubPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.ForumHubPage })));
const ForumPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.ForumPage })));
const PostDetailPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.PostDetailPage })));

// Partner Dashboard Pages
const PartnerIndex = lazy(() => import('@/pages/partner/index'));
const PartnerOverviewPage = lazy(() => import('@/pages/partner/OverviewPage'));
const PartnerTargetsPage = lazy(() => import('@/pages/partner/TargetsPage'));
const PartnerContentPage = lazy(() => import('@/pages/partner/ContentPage'));
const PartnerEventsPage = lazy(() => import('@/pages/partner/EventsPage'));
const PartnerStatusPage = lazy(() => import('@/pages/partner/StatusPage'));

// Signage Content Hub (WO-SIGNAGE-CONTENT-HUB-V1)
const SignageContentHubPage = lazy(() => import('@/pages/signage/ContentHubPage'));

// Operator Dashboard Pages
const OperatorIndex = lazy(() => import('@/pages/operator/index'));
const OperatorStoresPage = lazy(() => import('@/pages/operator/StoresPage'));
const OperatorApplicationsPage = lazy(() => import('@/pages/operator/ApplicationsPage'));
const OperatorProductsPage = lazy(() => import('@/pages/operator/ProductsPage'));
const OperatorOrdersPage = lazy(() => import('@/pages/operator/OrdersPage'));
const OperatorInventoryPage = lazy(() => import('@/pages/operator/InventoryPage'));
const OperatorSettlementsPage = lazy(() => import('@/pages/operator/SettlementsPage'));
const OperatorAnalyticsPage = lazy(() => import('@/pages/operator/AnalyticsPage'));
const OperatorMarketingPage = lazy(() => import('@/pages/operator/MarketingPage'));
const OperatorUsersPage = lazy(() => import('@/pages/operator/UsersPage'));
const OperatorSupportPage = lazy(() => import('@/pages/operator/SupportPage'));
const OperatorSettingsPage = lazy(() => import('@/pages/operator/SettingsPage'));
const OperatorAiReportPage = lazy(() => import('@/pages/operator/AiReportPage'));

// Loading fallback
function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
    </div>
  );
}

// Protected Route Component - triggers auth check only when entering
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading, isSessionChecked, checkSession } = useAuth();
  const location = useLocation();

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
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
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

        {/* Test Center (WO-TEST-CENTER-SEPARATION-V1) */}
        <Route path="test-center" element={<TestCenterPage />} />

        {/* Test Guide */}
        <Route path="test-guide" element={<TestGuidePage />} />
        <Route path="test-guide/manual/consumer" element={<ConsumerManualPage />} />
        <Route path="test-guide/manual/seller" element={<SellerManualPage />} />
        <Route path="test-guide/manual/supplier" element={<SupplierManualPage />} />
        <Route path="test-guide/manual/admin" element={<AdminManualPage />} />
        <Route path="test-guide/manual/operator" element={<OperatorManualPage />} />

        {/* Forum */}
        <Route path="forum" element={<ForumHubPage />} />
        <Route path="forum/posts" element={<ForumPage />} />
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
        <Route path="signage/content" element={<SignageContentHubPage />} />
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
        <Route path="signage/content" element={<SignageContentHubPage />} />
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
        <LoginModalProvider>
          <LoginModal />
          <Suspense fallback={<PageLoading />}>
            <AppRoutes />
          </Suspense>
        </LoginModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
