/**
 * App - K-Cosmetics
 * Based on GlycoPharm App structure
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getPrimaryDashboardRoute } from '@o4o/auth-utils';
import { LoginModalProvider } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/common/LoginModal';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';

// Layouts (always needed)
import MainLayout from '@/components/layouts/MainLayout';
import PartnerLayout from '@/components/layouts/PartnerLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';

// Public Pages (always loaded - first paint)
import { HomePage, NotFoundPage } from '@/pages';
import LoginPage from '@/pages/auth/LoginPage';
import HandoffPage from '@/pages/HandoffPage';
import AccountRecoveryPage from '@/pages/auth/AccountRecoveryPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

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

// Hub (WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1)
const KCosmeticsHubPage = lazy(() => import('@/pages/hub/KCosmeticsHubPage'));

// Forum Pages
const ForumHubPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.ForumHubPage })));
const ForumPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.ForumPage })));
const PostDetailPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.PostDetailPage })));
const ForumWritePage = lazy(() => import('@/pages/forum/ForumWritePage'));

// Community Hub (WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1)
const CommunityHubPage = lazy(() => import('@/pages/community/CommunityHubPage'));

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

// Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1)
const HqMediaPage = lazy(() => import('@/pages/operator/signage/HqMediaPage'));
const HqMediaDetailPage = lazy(() => import('@/pages/operator/signage/HqMediaDetailPage'));
const HqPlaylistsPage = lazy(() => import('@/pages/operator/signage/HqPlaylistsPage'));
const HqPlaylistDetailPage = lazy(() => import('@/pages/operator/signage/HqPlaylistDetailPage'));
const SignageTemplatesPage = lazy(() => import('@/pages/operator/signage/TemplatesPage'));
const SignageTemplateDetailPage = lazy(() => import('@/pages/operator/signage/TemplateDetailPage'));

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, StorePlaceholderPage, COSMETICS_STORE_CONFIG, resolveStoreMenu } from '@o4o/store-ui-core';
import { useStoreCapabilities } from './hooks/useStoreCapabilities';

// Market Trial (WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1)
const MarketTrialListPage = lazy(() => import('@/pages/store/MarketTrialListPage'));

// Operator Dashboard Pages
const KCosmeticsOperatorDashboard = lazy(() => import('@/pages/operator/KCosmeticsOperatorDashboard'));
const OperatorStoresPage = lazy(() => import('@/pages/operator/StoresPage'));
const OperatorStoreDetailPage = lazy(() => import('@/pages/operator/StoreDetailPage'));
const OperatorApplicationsPage = lazy(() => import('@/pages/operator/ApplicationsPage'));
const OperatorProductsPage = lazy(() => import('@/pages/operator/ProductsPage'));
const OperatorProductDetailPage = lazy(() => import('@/pages/operator/ProductDetailPage'));
const OperatorOrdersPage = lazy(() => import('@/pages/operator/OrdersPage'));
// WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: Deprecated (mock) — removed from sidebar & routes
// const OperatorInventoryPage = lazy(() => import('@/pages/operator/InventoryPage'));
// const OperatorSettlementsPage = lazy(() => import('@/pages/operator/SettlementsPage'));
// const OperatorAnalyticsPage = lazy(() => import('@/pages/operator/AnalyticsPage'));
// const OperatorMarketingPage = lazy(() => import('@/pages/operator/MarketingPage'));
const OperatorUsersPage = lazy(() => import('@/pages/operator/UsersPage'));
const OperatorUserDetailPage = lazy(() => import('@/pages/operator/UserDetailPage'));
// WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: Deprecated (mock) — removed from sidebar & routes
// const OperatorSupportPage = lazy(() => import('@/pages/operator/SupportPage'));
const OperatorSettingsPage = lazy(() => import('@/pages/operator/SettingsPage'));
const OperatorRoleManagementPage = lazy(() => import('@/pages/operator/RoleManagementPage'));
const OperatorAiReportPage = lazy(() => import('@/pages/operator/AiReportPage'));
const StoreCockpitPage = lazy(() => import('@/pages/operator/StoreCockpitPage'));

// Community Management (WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1)
const CommunityManagementPage = lazy(() => import('@/pages/operator/CommunityManagementPage'));

// Store Channel Management (WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1)
const StoreChannelsPage = lazy(() => import('@/pages/store/StoreChannelsPage'));

// WO-O4O-STORE-LOCAL-PRODUCT-UI-V1: 자체 상품 CRUD + 태블릿 진열 관리
const StoreLocalProductsPage = lazy(() => import('@/pages/store/StoreLocalProductsPage'));
const StoreTabletDisplaysPage = lazy(() => import('@/pages/store/StoreTabletDisplaysPage'));

// WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1: Tablet 키오스크 + Interest 관리
const TabletStorePage = lazy(() => import('@/pages/tablet/TabletStorePage'));
const InterestRequestsPage = lazy(() => import('@/pages/store/InterestRequestsPage'));

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
      const target = getPrimaryDashboardRoute(user.roles);
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
  const enabledCaps = useStoreCapabilities();
  const resolvedConfig = resolveStoreMenu(COSMETICS_STORE_CONFIG, enabledCaps);

  return (
    <StoreDashboardLayout
      config={resolvedConfig}
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
        <Route path="handoff" element={<HandoffPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<AccountRecoveryPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="partners" element={<PartnerInfoPage />} />
        <Route path="partners/apply" element={<PartnerApplyPage />} />

        {/* Community Hub (WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1) */}
        <Route path="community" element={<CommunityHubPage />} />

        {/* Forum */}
        <Route path="forum" element={<ForumHubPage />} />
        <Route path="forum/posts" element={<ForumPage />} />
        <Route path="forum/post/:postId" element={<PostDetailPage />} />
        <Route
          path="forum/write"
          element={
            <ProtectedRoute>
              <ForumWritePage />
            </ProtectedRoute>
          }
        />

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

        {/* Hub (WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1) */}
        <Route path="hub" element={<KCosmeticsHubPage />} />

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
        <Route path="stores/:storeId" element={<OperatorStoreDetailPage />} />
        <Route path="users" element={<OperatorUsersPage />} />
        <Route path="users/:id" element={<OperatorUserDetailPage />} />
        <Route path="settings" element={<OperatorSettingsPage />} />
        {/* 역할 관리 (WO-O4O-ROLE-MANAGEMENT-UI-V1) */}
        <Route path="roles" element={<OperatorRoleManagementPage />} />
      </Route>

      {/* Operator Dashboard */}
      <Route
        path="operator"
        element={
          <ProtectedRoute allowedRoles={['admin', 'operator']}>
            <DashboardLayout role="operator" />
          </ProtectedRoute>
        }
      >
        {/* Signal 기반 대시보드 (WO-K-COSMETICS-OPERATOR-DASHBOARD-UX-V1) */}
        <Route index element={<KCosmeticsOperatorDashboard />} />
        <Route path="applications" element={<OperatorApplicationsPage />} />
        <Route path="products" element={<OperatorProductsPage />} />
        <Route path="products/:productId" element={<OperatorProductDetailPage />} />
        {/* 매장 관리 (WO-O4O-STORE-CONSOLE-V1) */}
        <Route path="stores" element={<OperatorStoresPage />} />
        <Route path="stores/:storeId" element={<OperatorStoreDetailPage />} />
        <Route path="orders" element={<OperatorOrdersPage />} />
        {/* WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: Deprecated routes removed (inventory, settlements, analytics, marketing) */}
        <Route path="signage/content" element={<SignageContentHubPage />} />
              <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
              <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        {/* Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1) */}
        <Route path="signage/hq-media" element={<HqMediaPage />} />
        <Route path="signage/hq-media/:mediaId" element={<HqMediaDetailPage />} />
        <Route path="signage/hq-playlists" element={<HqPlaylistsPage />} />
        <Route path="signage/hq-playlists/:playlistId" element={<HqPlaylistDetailPage />} />
        <Route path="signage/templates" element={<SignageTemplatesPage />} />
        <Route path="signage/templates/:templateId" element={<SignageTemplateDetailPage />} />
        {/* WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: support route removed (mock) */}
        {/* 회원 관리 (WO-O4O-MEMBERSHIP-CONSOLE-V1) */}
        <Route path="users" element={<OperatorUsersPage />} />
        <Route path="users/:id" element={<OperatorUserDetailPage />} />
        {/* AI Report (WO-AI-SERVICE-OPERATOR-REPORT-V1) */}
        <Route path="ai-report" element={<OperatorAiReportPage />} />
        {/* Store Cockpit (WO-KCOS-STORES-PHASE3-STORE-COCKPIT-V1) */}
        <Route path="store-cockpit" element={<StoreCockpitPage />} />
        {/* Community Management (WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1) */}
        <Route path="community" element={<CommunityManagementPage />} />
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
        <Route path="products" element={<StorePlaceholderPage title="상품 관리" />} />
        <Route path="local-products" element={<StoreLocalProductsPage />} />
        <Route path="tablet-displays" element={<StoreTabletDisplaysPage />} />
        {/* channels: 채널 관리 (WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1) */}
        <Route path="channels" element={<StoreChannelsPage />} />
        <Route path="orders" element={<StorePlaceholderPage title="주문 관리" />} />
        <Route path="billing" element={<StorePlaceholderPage title="정산/인보이스" />} />
        <Route path="content" element={<StorePlaceholderPage title="콘텐츠 관리" />} />
        <Route path="market-trial" element={<MarketTrialListPage />} />
        {/* Interest 관리 (WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1) */}
        <Route path="interest-requests" element={<InterestRequestsPage />} />
        <Route path="settings" element={<StorePlaceholderPage title="설정" />} />
      </Route>

      {/* Tablet Kiosk — Public, no auth (WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1) */}
      <Route path="tablet/:slug" element={<TabletStorePage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <O4OErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LoginModalProvider>
            <O4OToastProvider />
            <LoginModal />
            <Suspense fallback={<PageLoading />}>
              <AppRoutes />
            </Suspense>
          </LoginModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </O4OErrorBoundary>
  );
}
