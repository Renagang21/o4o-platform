/**
 * App - K-Cosmetics
 * Based on GlycoPharm App structure
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, ROLE_DASHBOARDS } from '@/contexts/AuthContext';
import { LoginModalProvider } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/common/LoginModal';

// Layouts (always needed)
import MainLayout from '@/components/layouts/MainLayout';
import PartnerLayout from '@/components/layouts/PartnerLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';

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
const SignagePlaylistDetailPage = lazy(() => import('@/pages/signage/PlaylistDetailPage'));
const SignageMediaDetailPage = lazy(() => import('@/pages/signage/MediaDetailPage'));

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, StorePlaceholderPage, COSMETICS_STORE_CONFIG } from '@o4o/operator-core';

// Operator Dashboard Pages
const KCosmeticsOperatorDashboard = lazy(() => import('@/pages/operator/KCosmeticsOperatorDashboard'));
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
const StoreCockpitPage = lazy(() => import('@/pages/operator/StoreCockpitPage'));

// Loading fallback
function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
    </div>
  );
}

/**
 * ProtectedRoute → RoleGuard alias
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1: 통일된 인터페이스 사용
 * 실제 로직은 components/auth/RoleGuard.tsx (isSessionChecked + checkSession 포함)
 */
const ProtectedRoute = RoleGuard;

/**
 * RoleBasedHome - WO-K-COSMETICS-ROLE-BASED-LANDING-V1
 * / 접근 시 역할 기반 자동 리다이렉트
 * operator → /operator, partner → /partner, 기타 → / (HomePage 유지)
 */
function RoleBasedHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.roles[0]) {
      const target = ROLE_DASHBOARDS[user.roles[0]];
      if (target && target !== '/') {
        navigate(target, { replace: true });
      }
    }
  }, [user, navigate]);

  return <HomePage />;
}

/** Store Dashboard Layout Wrapper - connects auth context to shared layout */
function StoreLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <StoreDashboardLayout
      config={COSMETICS_STORE_CONFIG}
      userName={user?.name || user?.email || ''}
      homeLink="/"
      onLogout={() => { logout(); navigate('/'); }}
    />
  );
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        {/* WO-K-COSMETICS-ROLE-BASED-LANDING-V1: 역할 기반 자동 리다이렉트 */}
        <Route index element={<RoleBasedHome />} />
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
              <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
              <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        <Route path="events" element={<PartnerEventsPage />} />
        <Route path="status" element={<PartnerStatusPage />} />
      </Route>

      {/* Admin Dashboard (WO-K-COSMETICS-ADMIN-AREA-V1: 구조 관리 영역 신설) */}
      <Route
        path="admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<KCosmeticsOperatorDashboard />} />
        <Route path="stores" element={<OperatorStoresPage />} />
        <Route path="users" element={<OperatorUsersPage />} />
        <Route path="settings" element={<OperatorSettingsPage />} />
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
        {/* Signal 기반 대시보드 (WO-K-COSMETICS-OPERATOR-DASHBOARD-UX-V1) */}
        <Route index element={<KCosmeticsOperatorDashboard />} />
        <Route path="applications" element={<OperatorApplicationsPage />} />
        <Route path="products" element={<OperatorProductsPage />} />
        <Route path="orders" element={<OperatorOrdersPage />} />
        <Route path="inventory" element={<OperatorInventoryPage />} />
        <Route path="settlements" element={<OperatorSettlementsPage />} />
        <Route path="analytics" element={<OperatorAnalyticsPage />} />
        <Route path="marketing" element={<OperatorMarketingPage />} />
        <Route path="signage/content" element={<SignageContentHubPage />} />
              <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
              <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        <Route path="support" element={<OperatorSupportPage />} />
        {/* AI Report (WO-AI-SERVICE-OPERATOR-REPORT-V1) */}
        <Route path="ai-report" element={<OperatorAiReportPage />} />
        {/* Store Cockpit (WO-KCOS-STORES-PHASE3-STORE-COCKPIT-V1) */}
        <Route path="store-cockpit" element={<StoreCockpitPage />} />
      </Route>

      {/* Store Owner Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1) */}
      <Route
        path="store"
        element={
          <ProtectedRoute allowedRoles={['operator']}>
            <StoreLayoutWrapper />
          </ProtectedRoute>
        }
      >
        <Route index element={<StoreCockpitPage />} />
        <Route path="identity" element={<StorePlaceholderPage title="매장 정보" />} />
        <Route path="products" element={<StorePlaceholderPage title="상품 관리" />} />
        <Route path="orders" element={<StorePlaceholderPage title="주문 관리" />} />
        <Route path="settlement" element={<StorePlaceholderPage title="정산" />} />
        <Route path="content" element={<StorePlaceholderPage title="콘텐츠/사이니지" />} />
        <Route path="services" element={<StorePlaceholderPage title="서비스 관리" />} />
        <Route path="settings" element={<StorePlaceholderPage title="설정" />} />
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
