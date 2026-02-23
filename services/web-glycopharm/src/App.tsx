import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginModalProvider } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/common/LoginModal';

// Layouts (always needed)
import MainLayout from '@/components/layouts/MainLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import StoreLayout from '@/components/layouts/StoreLayout';
import KioskLayout from '@/components/layouts/KioskLayout';
import TabletLayout from '@/components/layouts/TabletLayout';
import PartnerLayout from '@/components/layouts/PartnerLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';

// Public Pages (always loaded - first paint)
import HomeLivePage from '@/pages/HomeLivePage';
import LoginPage from '@/pages/auth/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import RedirectNoticeBanner from '@/components/common/RedirectNoticeBanner';
import FeatureIntroPage from '@/components/common/FeatureIntroPage';

// Phase 2: Service User Login (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
const ServiceLoginPage = lazy(() => import('@/pages/auth/ServiceLoginPage'));
const ServiceDashboardPage = lazy(() => import('@/pages/service/ServiceDashboardPage'));

// ============================================================================
// Lazy loaded pages (heavy / rarely accessed)
// ============================================================================

// Auth & Public
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const RoleSelectPage = lazy(() => import('@/pages/auth/RoleSelectPage'));

// Store pages (files under pages/pharmacy/ — reused by /store routes)
const StoreMainPage = lazy(() => import('@/pages/pharmacy/StoreMainPage'));
const PharmacyProducts = lazy(() => import('@/pages/pharmacy/PharmacyProducts'));
const PharmacyOrders = lazy(() => import('@/pages/pharmacy/PharmacyOrders'));
const PharmacyPatients = lazy(() => import('@/pages/pharmacy/PharmacyPatients'));
const PharmacySettings = lazy(() => import('@/pages/pharmacy/PharmacySettings'));
const PharmacyManagement = lazy(() => import('@/pages/pharmacy/PharmacyManagement'));
const PharmacyB2BProducts = lazy(() => import('@/pages/pharmacy/PharmacyB2BProducts'));
const CustomerRequestsPage = lazy(() => import('@/pages/pharmacy/CustomerRequestsPage')); // Phase 1: Common Request

// Smart Display (Legacy)
const SmartDisplayPage = lazy(() => import('@/pages/pharmacy/smart-display/SmartDisplayPage'));
const PlaylistsPage = lazy(() => import('@/pages/pharmacy/smart-display/PlaylistsPage'));
const SchedulesPage = lazy(() => import('@/pages/pharmacy/smart-display/SchedulesPage'));
const MediaLibraryPage = lazy(() => import('@/pages/pharmacy/smart-display/MediaLibraryPage'));
const PlaylistForumPage = lazy(() => import('@/pages/pharmacy/smart-display/PlaylistForumPage'));

// Signage Extension (New)
const ContentLibraryPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.ContentLibraryPage })));
const ContentHubPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.ContentHubPage })));
const MySignagePage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.MySignagePage })));
const SignagePreviewPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.SignagePreviewPage })));
const SignagePlaylistDetailPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.PlaylistDetailPage })));
const SignageMediaDetailPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.MediaDetailPage })));

// Market Trial Extension
const MarketTrialListPage = lazy(() => import('@/pages/pharmacy/market-trial').then(m => ({ default: m.MarketTrialListPage })));
const OperatorTrialSelectorPage = lazy(() => import('@/pages/operator/market-trial').then(m => ({ default: m.OperatorTrialSelectorPage })));

// B2B Order & Supply
const B2BOrderPage = lazy(() => import('@/pages/pharmacy/b2b-order').then(m => ({ default: m.B2BOrderPage })));
const SupplyPage = lazy(() => import('@/pages/b2b').then(m => ({ default: m.SupplyPage })));

// Forum Extension
const ForumListPage = lazy(() => import('@/pages/forum-ext').then(m => ({ default: m.ForumListPage })));
const ForumFeedPage = lazy(() => import('@/pages/forum-ext').then(m => ({ default: m.ForumFeedPage })));
const OperatorForumManagementPage = lazy(() => import('@/pages/operator/forum-management').then(m => ({ default: m.OperatorForumManagementPage })));

// Role Not Available Page
const RoleNotAvailablePage = lazy(() => import('@/pages/RoleNotAvailablePage'));
const PartnerInfoPage = lazy(() => import('@/pages/PartnerInfoPage'));

// Admin Dashboard (WO-O4O-ADMIN-UX-GLYCOPHARM-PILOT-V1: 4-Block)
const GlycoPharmAdminDashboard = lazy(() => import('@/pages/admin/GlycoPharmAdminDashboard'));

// Operator Dashboard
const GlycoPharmOperatorDashboard = lazy(() => import('@/pages/operator/GlycoPharmOperatorDashboard'));
const ForumRequestsPage = lazy(() => import('@/pages/operator/ForumRequestsPage'));
const ApplicationsPage = lazy(() => import('@/pages/operator/ApplicationsPage'));
const ApplicationDetailPage = lazy(() => import('@/pages/operator/ApplicationDetailPage'));
const StoreApprovalsPage = lazy(() => import('@/pages/operator/StoreApprovalsPage'));
const StoreApprovalDetailPage = lazy(() => import('@/pages/operator/StoreApprovalDetailPage'));
const StoreTemplateManagerPage = lazy(() => import('@/pages/operator/store-template').then(m => ({ default: m.StoreTemplateManagerPage })));
const UsersPage = lazy(() => import('@/pages/operator/UsersPage'));
const SettingsPage = lazy(() => import('@/pages/operator/SettingsPage'));
const AiReportPage = lazy(() => import('@/pages/operator/AiReportPage'));

// Operator Semi-Franchise Pages
const PharmaciesPage = lazy(() => import('@/pages/operator/PharmaciesPage'));
const ProductsPage = lazy(() => import('@/pages/operator/ProductsPage'));
const OrdersPage = lazy(() => import('@/pages/operator/OrdersPage'));
const InventoryPage = lazy(() => import('@/pages/operator/InventoryPage'));
const SettlementsPage = lazy(() => import('@/pages/operator/SettlementsPage'));
const AnalyticsPage = lazy(() => import('@/pages/operator/AnalyticsPage'));
const ReportsPage = lazy(() => import('@/pages/operator/ReportsPage')); // Phase 3-B: Billing Report
const BillingPreviewPage = lazy(() => import('@/pages/operator/BillingPreviewPage')); // Phase 3-C: Billing Preview
const InvoicesPage = lazy(() => import('@/pages/operator/InvoicesPage')); // Phase 3-D: Invoice Finalization
const MarketingPage = lazy(() => import('@/pages/operator/MarketingPage'));
const SupportPage = lazy(() => import('@/pages/operator/SupportPage'));

// Hub Exploration (WO-O4O-HUB-EXPLORATION-CORE-V1)
const GlycoPharmHubPage = lazy(() => import('@/pages/hub/GlycoPharmHubPage').then(m => ({ default: m.GlycoPharmHubPage })));

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, StorePlaceholderPage, GLYCOPHARM_STORE_CONFIG } from '@o4o/store-ui-core';
const StoreOverviewPage = lazy(() => import('@/pages/store/StoreOverviewPage'));
const StoreEntryPage = lazy(() => import('@/pages/store/StoreEntryPage'));
const StoreAssetsPage = lazy(() => import('@/pages/store/StoreAssetsPage'));

// Pharmacy Store Apply
const StoreApplyPage = lazy(() => import('@/pages/pharmacy/StoreApplyPage'));

// WO-STORE-BILLING-FOUNDATION-V1: 정산/인보이스
const StoreBillingPage = lazy(() => import('@/pages/pharmacy/StoreBillingPage'));

// Consumer Store
const StoreFront = lazy(() => import('@/pages/store/StoreFront'));
const StoreProducts = lazy(() => import('@/pages/store/StoreProducts'));
const StoreProductDetail = lazy(() => import('@/pages/store/StoreProductDetail'));
const StoreCart = lazy(() => import('@/pages/store/StoreCart'));

// Forum & Education
const ForumHubPage = lazy(() => import('@/pages/forum/ForumHubPage'));
const ForumPage = lazy(() => import('@/pages/forum/ForumPage'));
const RequestCategoryPage = lazy(() => import('@/pages/forum/RequestCategoryPage'));
const MyRequestsPage = lazy(() => import('@/pages/forum/MyRequestsPage'));
const ForumFeedbackPage = lazy(() => import('@/pages/forum/ForumFeedbackPage'));
const EducationPage = lazy(() => import('@/pages/education/EducationPage'));

// Common Pages
const MyPage = lazy(() => import('@/pages/MyPage'));

// Partner Application (WO-PARTNER-APPLICATION-V1)
const PartnerApplyPage = lazy(() => import('@/pages/partners/ApplyPage'));

// Apply Pages (API 연동)
const PharmacyApplyPage = lazy(() => import('@/pages/apply/PharmacyApplyPage'));
const MyApplicationsPage = lazy(() => import('@/pages/apply/MyApplicationsPage'));

// QR Landing (Phase 2-B: WO-O4O-REQUEST-UX-REFINEMENT-PHASE2B)
const QrLandingPage = lazy(() => import('@/pages/qr/QrLandingPage'));

// Funnel Visualization (Phase 3-A: WO-O4O-FUNNEL-VISUALIZATION-PHASE3A-CP1)
const FunnelPage = lazy(() => import('@/pages/pharmacy/FunnelPage'));

// Care Pages (WO-CARE-PATIENT-DETAIL-STRUCTURE-V1)
const CareDashboardPage = lazy(() => import('@/pages/care').then(m => ({ default: m.CareDashboardPage })));
const PatientsPage = lazy(() => import('@/pages/care').then(m => ({ default: m.PatientsPage })));
const PatientDetailPage = lazy(() => import('@/pages/care').then(m => ({ default: m.PatientDetailPage })));
const AnalysisPage = lazy(() => import('@/pages/care').then(m => ({ default: m.AnalysisPage })));
const CoachingPage = lazy(() => import('@/pages/care').then(m => ({ default: m.CoachingPage })));

// Patient Detail Tabs (WO-CARE-PATIENT-DETAIL-STRUCTURE-V1)
const SummaryTab = lazy(() => import('@/pages/care/patient-tabs').then(m => ({ default: m.SummaryTab })));
const PatientAnalysisTab = lazy(() => import('@/pages/care/patient-tabs').then(m => ({ default: m.AnalysisTab })));
const PatientCoachingTab = lazy(() => import('@/pages/care/patient-tabs').then(m => ({ default: m.CoachingTab })));
const HistoryTab = lazy(() => import('@/pages/care/patient-tabs').then(m => ({ default: m.HistoryTab })));

// Test Guide Pages
const TestGuidePage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.TestGuidePage })));
const PharmacyManualPage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.PharmacyManualPage })));
const ConsumerManualPage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.ConsumerManualPage })));
const OperatorManualPage = lazy(() => import('@/pages/test-guide').then(m => ({ default: m.OperatorManualPage })));
const TestCenterPage = lazy(() => import('@/pages/TestCenterPage'));

// Partner Dashboard Pages
const PartnerIndex = lazy(() => import('@/pages/partner/index'));
const PartnerOverviewPage = lazy(() => import('@/pages/partner/OverviewPage'));
const PartnerTargetsPage = lazy(() => import('@/pages/partner/TargetsPage'));
const PartnerContentPage = lazy(() => import('@/pages/partner/ContentPage'));
const PartnerEventsPage = lazy(() => import('@/pages/partner/EventsPage'));
const PartnerStatusPage = lazy(() => import('@/pages/partner/StatusPage'));

// Loading fallback
function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
}

/**
 * ProtectedRoute → RoleGuard alias
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1: 통일된 인터페이스 사용
 * 실제 로직은 components/auth/RoleGuard.tsx
 */
const ProtectedRoute = RoleGuard;

// Service User Protected Route (Phase 2: WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
function ServiceUserProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isServiceUserAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isServiceUserAuthenticated) {
    return <Navigate to="/service-login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
}

/**
 * WO-GLYCOPHARM-SOFT-GUARD-INTRO-V1: Soft Guard
 * 비로그인 → FeatureIntroPage 표시 (로그인 리다이렉트 대신)
 * 로그인 + 권한 불일치 → / 리다이렉트
 * 로그인 + 권한 일치 → children 렌더
 */
function SoftGuard({ feature, allowedRoles, children }: {
  feature: 'care' | 'store' | 'mypage';
  allowedRoles?: string[];
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) return <FeatureIntroPage feature={feature} />;
  if (allowedRoles && user && !user.roles.some(r => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/**
 * SoftGuardOutlet — Layout route용 Soft Guard
 * Route의 element로 사용, Outlet을 렌더하거나 FeatureIntroPage를 렌더
 */
function SoftGuardOutlet({ feature, allowedRoles }: {
  feature: 'care' | 'store' | 'mypage';
  allowedRoles?: string[];
}) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) return <FeatureIntroPage feature={feature} />;
  if (allowedRoles && user && !user.roles.some(r => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

/** Store Dashboard Layout Wrapper - connects auth context to shared layout */
function StoreLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <StoreDashboardLayout
      config={GLYCOPHARM_STORE_CONFIG}
      userName={user?.name || user?.email || ''}
      homeLink="/"
      onLogout={() => { logout(); navigate('/'); }}
      banner={<RedirectNoticeBanner />}
    />
  );
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route index element={<HomeLivePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="role-select" element={<RoleSelectPage />} />
        <Route path="forum" element={<ForumHubPage />} />
        <Route path="forum/posts" element={<ForumPage />} />
        <Route path="forum/request-category" element={<RequestCategoryPage />} />
        <Route path="forum/my-requests" element={<MyRequestsPage />} />
        <Route path="forum/feedback" element={<ForumFeedbackPage />} />
        {/* Forum Extension */}
        <Route path="forum-ext" element={<ForumListPage />} />
        <Route path="forum-ext/:forumId" element={<ForumFeedPage />} />
        <Route path="education" element={<EducationPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="partners" element={<PartnerInfoPage />} />
        <Route path="partners/apply" element={<PartnerApplyPage />} />
        <Route path="apply" element={<PharmacyApplyPage />} />

        {/* Test Center (WO-TEST-CENTER-SEPARATION-V1) */}
        <Route path="test-center" element={<TestCenterPage />} />

        {/* Test Guide */}
        <Route path="test-guide" element={<TestGuidePage />} />
        <Route path="test-guide/manual/pharmacy" element={<PharmacyManualPage />} />
        <Route path="test-guide/manual/consumer" element={<ConsumerManualPage />} />
        <Route path="test-guide/manual/operator" element={<OperatorManualPage />} />
        <Route path="apply/my-applications" element={<MyApplicationsPage />} />
        {/* B2B Supply */}
        <Route path="b2b/supply" element={<SupplyPage />} />
        {/* Signage Public (WO-SIGNAGE-CONTENT-HUB-V1) */}
        <Route path="signage" element={<ContentLibraryPage />} />
        {/* Hub Exploration (WO-O4O-HUB-EXPLORATION-CORE-V1) */}
        <Route path="hub" element={<GlycoPharmHubPage />} />
        <Route path="mypage" element={
          <SoftGuard feature="mypage">
            <MyPage />
          </SoftGuard>
        } />

        {/* Store Entry Portal (WO-STORE-MAIN-ENTRY-LAYOUT-V1) */}
        <Route path="store" element={
          <SoftGuard feature="store" allowedRoles={['pharmacy']}>
            <StoreEntryPage />
          </SoftGuard>
        } />
      </Route>

      {/* Care Routes (WO-GLYCOPHARM-SOFT-GUARD-INTRO-V1: SoftGuard로 전환) */}
      <Route path="care" element={<MainLayout />}>
        <Route element={<SoftGuardOutlet feature="care" allowedRoles={['pharmacy']} />}>
          <Route index element={<CareDashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          {/* Patient Detail with nested tabs (WO-CARE-PATIENT-DETAIL-STRUCTURE-V1) */}
          <Route path="patients/:id" element={<PatientDetailPage />}>
            <Route index element={<SummaryTab />} />
            <Route path="analysis" element={<PatientAnalysisTab />} />
            <Route path="coaching" element={<PatientCoachingTab />} />
            <Route path="history" element={<HistoryTab />} />
          </Route>
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="coaching" element={<CoachingPage />} />
        </Route>
      </Route>

      {/* Service User Routes (Phase 2: WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM) */}
      <Route path="service-login" element={<MainLayout />}>
        <Route index element={<ServiceLoginPage />} />
      </Route>

      <Route
        path="service"
        element={
          <ServiceUserProtectedRoute>
            <DashboardLayout role="consumer" />
          </ServiceUserProtectedRoute>
        }
      >
        <Route index element={<ServiceDashboardPage />} />
        <Route path="dashboard" element={<ServiceDashboardPage />} />
      </Route>

      {/* /pharmacy removed — WO-PHARMACY-FULL-REMOVAL-V1 */}

      {/* Supplier Dashboard - Neture에서 관리 */}
      <Route
        path="supplier"
        element={<RoleNotAvailablePage role="supplier" />}
      />
      <Route
        path="supplier/*"
        element={<RoleNotAvailablePage role="supplier" />}
      />

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
        {/* Signage Extension (WO-SIGNAGE-CONTENT-HUB-V1) */}
        <Route path="signage/library" element={<ContentLibraryPage />} />
        <Route path="signage/content" element={<ContentHubPage />} />
        <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
        <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        <Route path="signage/my" element={<MySignagePage />} />
        <Route path="signage/preview" element={<SignagePreviewPage />} />
      </Route>

      {/* Admin Dashboard (WO-O4O-ADMIN-UX-GLYCOPHARM-PILOT-V1: 4-Block 구조) */}
      <Route
        path="admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<GlycoPharmAdminDashboard />} />
        <Route path="pharmacies" element={<PharmaciesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
        {/* Signal 기반 대시보드 (WO-GLYCOPHARM-OPERATOR-DASHBOARD-UX-V1) */}
        <Route index element={<GlycoPharmOperatorDashboard />} />
        {/* Semi-Franchise Management */}
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="settlements" element={<SettlementsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        {/* Billing Report (Phase 3-B) */}
        <Route path="reports" element={<ReportsPage />} />
        {/* Billing Preview (Phase 3-C) */}
        <Route path="billing-preview" element={<BillingPreviewPage />} />
        {/* Invoices (Phase 3-D) */}
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="marketing" element={<MarketingPage />} />
        {/* Forum */}
        <Route path="forum-requests" element={<ForumRequestsPage />} />
        <Route path="forum-management" element={<OperatorForumManagementPage />} />
        {/* Market Trial Extension */}
        <Route path="market-trial" element={<OperatorTrialSelectorPage />} />
        {/* Store Approvals */}
        <Route path="store-approvals" element={<StoreApprovalsPage />} />
        <Route path="store-approvals/:id" element={<StoreApprovalDetailPage />} />
        {/* Store Template Manager */}
        <Route path="store-template" element={<StoreTemplateManagerPage />} />
        {/* Support */}
        <Route path="support" element={<SupportPage />} />
        {/* AI Report (WO-AI-SERVICE-OPERATOR-REPORT-V1) */}
        <Route path="ai-report" element={<AiReportPage />} />
        {/* Signage Extension (WO-SIGNAGE-CONTENT-HUB-V1) */}
        <Route path="signage/library" element={<ContentLibraryPage />} />
        <Route path="signage/content" element={<ContentHubPage />} />
        <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
        <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        <Route path="signage/my" element={<MySignagePage />} />
        <Route path="signage/preview" element={<SignagePreviewPage />} />
      </Route>

      {/* Consumer Store (Subdirectory) */}
      <Route path="store/:pharmacyId" element={<StoreLayout />}>
        <Route index element={<StoreFront />} />
        <Route path="products" element={<StoreProducts />} />
        <Route path="products/:productId" element={<StoreProductDetail />} />
        <Route path="cart" element={<StoreCart />} />
      </Route>

      {/* Kiosk Store Mode - 매장 내 키오스크 */}
      <Route path="store/:pharmacyId/kiosk" element={<KioskLayout />}>
        <Route index element={<StoreFront />} />
        <Route path="products" element={<StoreProducts />} />
        <Route path="products/:productId" element={<StoreProductDetail />} />
        <Route path="cart" element={<StoreCart />} />
      </Route>

      {/* Tablet Store Mode - 직원 보조 태블릿 */}
      <Route path="store/:pharmacyId/tablet" element={<TabletLayout />}>
        <Route index element={<StoreFront />} />
        <Route path="products" element={<StoreProducts />} />
        <Route path="products/:productId" element={<StoreProductDetail />} />
        <Route path="cart" element={<StoreCart />} />
      </Route>

      {/* QR Landing (Phase 2-B: standalone public page, no layout) */}
      <Route path="qr/:pharmacyId" element={<QrLandingPage />} />

      {/* Store Owner Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1) */}
      <Route
        path="store"
        element={
          <ProtectedRoute allowedRoles={['pharmacy']}>
            <StoreLayoutWrapper />
          </ProtectedRoute>
        }
      >
        <Route path="hub" element={<StoreOverviewPage />} />
        <Route path="identity" element={<StoreMainPage />} />
        <Route path="products" element={<PharmacyProducts />} />
        {/* channels: 채널 관리 (WO-PHARMACY-MANAGEMENT-CONSOLIDATION-V1 P3) */}
        <Route path="channels" element={<StorePlaceholderPage title="채널 관리" />} />
        <Route path="orders" element={<PharmacyOrders />} />
        <Route path="content" element={<StoreAssetsPage />} />
        <Route path="services" element={<PharmacyPatients />} />
        <Route path="settings" element={<PharmacySettings />} />
        <Route path="apply" element={<StoreApplyPage />} />
        {/* billing: 정산/인보이스 (WO-STORE-BILLING-FOUNDATION-V1) */}
        <Route path="billing" element={<StoreBillingPage />} />
        {/* Signage — Store Core v1.0 통합 (display + signage extension) */}
        <Route path="signage" element={<SmartDisplayPage />} />
        <Route path="signage/playlists" element={<PlaylistsPage />} />
        <Route path="signage/schedules" element={<SchedulesPage />} />
        <Route path="signage/media" element={<MediaLibraryPage />} />
        <Route path="signage/forum" element={<PlaylistForumPage />} />
        <Route path="signage/library" element={<ContentLibraryPage />} />
        <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
        <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        <Route path="signage/my" element={<MySignagePage />} />
        <Route path="signage/preview" element={<SignagePreviewPage />} />
        {/* Extensions */}
        <Route path="market-trial" element={<MarketTrialListPage />} />
        <Route path="b2b-order" element={<B2BOrderPage />} />
        <Route path="requests" element={<CustomerRequestsPage />} />
        <Route path="funnel" element={<FunnelPage />} />
        <Route path="management" element={<PharmacyManagement />} />
        <Route path="management/b2b" element={<PharmacyB2BProducts />} />
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
