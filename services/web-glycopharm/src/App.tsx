import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginModalProvider } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/common/LoginModal';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';

// Layouts (always needed)
import MainLayout from '@/components/layouts/MainLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import OperatorLayoutWrapper from '@/components/layouts/OperatorLayoutWrapper';
import StoreLayout from '@/components/layouts/StoreLayout';
import KioskLayout from '@/components/layouts/KioskLayout';
import TabletLayout from '@/components/layouts/TabletLayout';
import { RoleGuard, OperatorRoute } from '@/components/auth/RoleGuard';

// Public Pages (always loaded - first paint)
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import HandoffPage from '@/pages/HandoffPage';
import AccountRecoveryPage from '@/pages/auth/AccountRecoveryPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
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

// WO-GLYCOPHARM-ENTRY-SCREENS-V1: Placeholder dashboards
const PatientMainPage = lazy(() => import('@/pages/PatientPlaceholderPage'));
const PharmacistPlaceholderPage = lazy(() => import('@/pages/PharmacistPlaceholderPage'));

// WO-GLYCOPHARM-PHARMACIST-COACHING-SCREEN-V1 + PATIENT-LIST-SCREEN-V1 + PATIENT-DETAIL-SCREEN-V1
const PharmacistCoachingPage = lazy(() => import('@/pages/pharmacist/PharmacistCoachingPage'));
const PharmacistPatientsPage = lazy(() => import('@/pages/pharmacist/PharmacistPatientsPage'));
const PharmacistPatientDetailPage = lazy(() => import('@/pages/pharmacist/PharmacistPatientDetailPage'));

// WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1
const PatientSelectPharmacyPage = lazy(() => import('@/pages/patient/SelectPharmacyPage'));
const PharmacistPatientRequestsPage = lazy(() => import('@/pages/pharmacist/PatientRequestsPage'));

// WO-GLYCOPHARM-APPOINTMENT-SYSTEM-V1
const PatientAppointmentsPage = lazy(() => import('@/pages/patient/AppointmentsPage'));
const PharmacistAppointmentsPage = lazy(() => import('@/pages/pharmacist/AppointmentsPage'));

// WO-GLYCOPHARM-PATIENT-MAIN-SCREEN-V1: Patient sub-pages
const PatientProfilePage = lazy(() => import('@/pages/patient/ProfilePage'));
const PatientGlucoseInputPage = lazy(() => import('@/pages/patient/GlucoseInputPage'));
const PatientDataAnalysisPage = lazy(() => import('@/pages/patient/DataAnalysisPage'));
const PatientPharmacistCoachingPage = lazy(() => import('@/pages/patient/PharmacistCoachingPage'));
const PatientCareGuidelinePage = lazy(() => import('@/pages/patient/CareGuidelinePage'));

// Store pages (files under pages/pharmacy/ — reused by /store routes)
const StoreMainPage = lazy(() => import('@/pages/pharmacy/StoreMainPage'));
const PharmacyProducts = lazy(() => import('@/pages/pharmacy/PharmacyProducts'));
const PharmacyOrders = lazy(() => import('@/pages/pharmacy/PharmacyOrders'));
const PharmacyPatients = lazy(() => import('@/pages/pharmacy/PharmacyPatients'));
const PharmacySettings = lazy(() => import('@/pages/pharmacy/PharmacySettings'));
const PharmacyManagement = lazy(() => import('@/pages/pharmacy/PharmacyManagement'));
const PharmacyB2BProducts = lazy(() => import('@/pages/pharmacy/PharmacyB2BProducts'));
const CustomerRequestsPage = lazy(() => import('@/pages/pharmacy/CustomerRequestsPage')); // Phase 1: Common Request

// Store Signage (WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1: KPA standard)
const StoreSignagePage = lazy(() => import('@/pages/pharmacy/StoreSignagePage'));

// Signage Extension (New)
const ContentLibraryPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.ContentLibraryPage })));
const ContentHubPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.ContentHubPage })));
const SignagePreviewPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.SignagePreviewPage })));
const SignagePlaylistDetailPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.PlaylistDetailPage })));
const SignageMediaDetailPage = lazy(() => import('@/pages/pharmacy/signage').then(m => ({ default: m.MediaDetailPage })));

// Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1)
const HqMediaPage = lazy(() => import('@/pages/operator/signage/HqMediaPage'));
const HqMediaDetailPage = lazy(() => import('@/pages/operator/signage/HqMediaDetailPage'));
const HqPlaylistsPage = lazy(() => import('@/pages/operator/signage/HqPlaylistsPage'));
const HqPlaylistDetailPage = lazy(() => import('@/pages/operator/signage/HqPlaylistDetailPage'));
const SignageTemplatesPage = lazy(() => import('@/pages/operator/signage/TemplatesPage'));
const SignageTemplateDetailPage = lazy(() => import('@/pages/operator/signage/TemplateDetailPage'));

// Market Trial Extension
const MarketTrialListPage = lazy(() => import('@/pages/pharmacy/market-trial').then(m => ({ default: m.MarketTrialListPage })));
// OperatorTrialSelectorPage removed (WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: deprecated)
// WO-O4O-MARKET-TRIAL-PHASE1-V1: Service approval + store detail pages
const MarketTrialServiceApprovalsPage = lazy(() => import('@/pages/operator/market-trial/MarketTrialServiceApprovalsPage'));
const MarketTrialServiceApprovalDetailPage = lazy(() => import('@/pages/operator/market-trial/MarketTrialServiceApprovalDetailPage'));
const MarketTrialDetailPage = lazy(() => import('@/pages/pharmacy/market-trial/MarketTrialDetailPage'));

// B2B Order & Supply
const B2BOrderPage = lazy(() => import('@/pages/pharmacy/b2b-order').then(m => ({ default: m.B2BOrderPage })));
const SupplyPage = lazy(() => import('@/pages/b2b').then(m => ({ default: m.SupplyPage })));

// Forum Extension
const ForumListPage = lazy(() => import('@/pages/forum-ext').then(m => ({ default: m.ForumListPage })));
const ForumFeedPage = lazy(() => import('@/pages/forum-ext').then(m => ({ default: m.ForumFeedPage })));
const OperatorForumManagementPage = lazy(() => import('@/pages/operator/forum-management').then(m => ({ default: m.OperatorForumManagementPage })));

// Role Not Available Page
const RoleNotAvailablePage = lazy(() => import('@/pages/RoleNotAvailablePage'));

// Admin Dashboard (WO-O4O-ADMIN-UX-GLYCOPHARM-PILOT-V1: 4-Block)
const GlycoPharmAdminDashboard = lazy(() => import('@/pages/admin/GlycoPharmAdminDashboard'));

// Operator Dashboard
const GlycoPharmOperatorDashboard = lazy(() => import('@/pages/operator/GlycoPharmOperatorDashboard'));
const ForumRequestsPage = lazy(() => import('@/pages/operator/ForumRequestsPage'));
const ApplicationsPage = lazy(() => import('@/pages/operator/ApplicationsPage'));
const ApplicationDetailPage = lazy(() => import('@/pages/operator/ApplicationDetailPage'));
const StoreApprovalsPage = lazy(() => import('@/pages/operator/StoreApprovalsPage'));
const StoreApprovalDetailPage = lazy(() => import('@/pages/operator/StoreApprovalDetailPage'));
// StoreTemplateManagerPage 제거 — pharmacySlug="demo" 하드코딩으로 미완성 (글로벌 템플릿 저장소 미구현)
const UsersPage = lazy(() => import('@/pages/operator/UsersPage'));
const UserDetailPage = lazy(() => import('@/pages/operator/UserDetailPage'));
const RoleManagementPage = lazy(() => import('@/pages/operator/RoleManagementPage'));
const SettingsPage = lazy(() => import('@/pages/operator/SettingsPage'));
const AiReportPage = lazy(() => import('@/pages/operator/AiReportPage'));
const AiUsageDashboardPage = lazy(() => import('@/pages/operator/AiUsageDashboardPage'));
const AiBillingPage = lazy(() => import('@/pages/operator/AiBillingPage'));
const OperatorAnalyticsPage = lazy(() => import('@/pages/operator/AnalyticsPage'));

// Operator Care Pages (WO-O4O-GLYCOPHARM-OPERATOR-CARE-PAGES-V1)
const OperatorCareDashboardPage = lazy(() => import('@/pages/operator/care/OperatorCareDashboardPage'));
const OperatorCareAlertsPage = lazy(() => import('@/pages/operator/care/OperatorCareAlertsPage'));

// Operator Guideline Management (WO-GLYCOPHARM-GUIDELINE-CMS-MIGRATION-V1)
const GuidelineManagementPage = lazy(() => import('@/pages/operator/GuidelineManagementPage'));

// Operator Semi-Franchise Pages
const PharmaciesPage = lazy(() => import('@/pages/operator/PharmaciesPage'));
const ProductsPage = lazy(() => import('@/pages/operator/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/operator/ProductDetailPage'));
const OperatorStoresPage = lazy(() => import('@/pages/operator/StoresPage'));
const OperatorStoreDetailPage = lazy(() => import('@/pages/operator/StoreDetailPage'));
const OrdersPage = lazy(() => import('@/pages/operator/OrdersPage'));
const SettlementsPage = lazy(() => import('@/pages/operator/SettlementsPage'));
const ReportsPage = lazy(() => import('@/pages/operator/ReportsPage'));
const BillingPreviewPage = lazy(() => import('@/pages/operator/BillingPreviewPage'));
const InvoicesPage = lazy(() => import('@/pages/operator/InvoicesPage'));
// Hub Exploration (WO-O4O-HUB-EXPLORATION-CORE-V1)
const GlycoPharmHubPage = lazy(() => import('@/pages/hub/GlycoPharmHubPage').then(m => ({ default: m.GlycoPharmHubPage })));
const HubB2BCatalogPage = lazy(() => import('@/pages/hub/HubB2BCatalogPage').then(m => ({ default: m.HubB2BCatalogPage })));
const HubContentListPage = lazy(() => import('@/pages/hub/HubContentListPage').then(m => ({ default: m.HubContentListPage })));

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, GLYCOPHARM_STORE_CONFIG, resolveStoreMenu } from '@o4o/store-ui-core';
import { useStoreCapabilities } from './hooks/useStoreCapabilities';
const StoreOverviewPage = lazy(() => import('@/pages/store/StoreOverviewPage'));
const StoreEntryPage = lazy(() => import('@/pages/store/StoreEntryPage'));
const StoreAssetsPage = lazy(() => import('@/pages/store/StoreAssetsPage'));
const StoreChannelsPage = lazy(() => import('@/pages/store/StoreChannelsPage'));

// Pharmacy Store Apply
const StoreApplyPage = lazy(() => import('@/pages/pharmacy/StoreApplyPage'));

// WO-STORE-BILLING-FOUNDATION-V1: 정산/인보이스
const StoreBillingPage = lazy(() => import('@/pages/pharmacy/StoreBillingPage'));

// WO-O4O-STORE-LOCAL-PRODUCT-UI-V1: 자체 상품 CRUD + 태블릿 진열 관리
const StoreLocalProductsPage = lazy(() => import('@/pages/pharmacy/StoreLocalProductsPage'));
const StoreTabletDisplaysPage = lazy(() => import('@/pages/pharmacy/StoreTabletDisplaysPage'));

// Consumer Store
const StoreFront = lazy(() => import('@/pages/store/StoreFront'));
const StoreProducts = lazy(() => import('@/pages/store/StoreProducts'));
const StoreProductDetail = lazy(() => import('@/pages/store/StoreProductDetail'));
const StoreCart = lazy(() => import('@/pages/store/StoreCart'));

// WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1: Community main page
const CommunityMainPage = lazy(() => import('@/pages/community/CommunityMainPage'));
const CommunityManagementPage = lazy(() => import('@/pages/operator/CommunityManagementPage'));

// Forum & Education
const ForumHubPage = lazy(() => import('@/pages/forum/ForumHubPage'));
const ForumPage = lazy(() => import('@/pages/forum/ForumPage'));
const ForumWritePage = lazy(() => import('@/pages/forum/ForumWritePage'));
const RequestCategoryPage = lazy(() => import('@/pages/forum/RequestCategoryPage'));
const MyRequestsPage = lazy(() => import('@/pages/forum/MyRequestsPage'));
const ForumFeedbackPage = lazy(() => import('@/pages/forum/ForumFeedbackPage'));
const EducationPage = lazy(() => import('@/pages/education/EducationPage'));

// Common Pages
const MyPage = lazy(() => import('@/pages/MyPage'));


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

// Pharmacist Guideline (WO-GLYCOPHARM-PHARMACIST-GUIDELINE-V1)
const PharmacistGuidelinePage = lazy(() => import('@/pages/care/PharmacistGuidelinePage'));

// Patient Detail Tabs (WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1)
const DataTab = lazy(() => import('@/pages/care/patient-tabs').then(m => ({ default: m.DataTab })));
const PatientAnalysisTab = lazy(() => import('@/pages/care/patient-tabs').then(m => ({ default: m.AnalysisTab })));
const PatientCoachingTab = lazy(() => import('@/pages/care/patient-tabs').then(m => ({ default: m.CoachingTab })));
const HistoryTab = lazy(() => import('@/pages/care/patient-tabs').then(m => ({ default: m.HistoryTab })));


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
 * WO-GLYCOPHARM-CARE-UI-ADJUST-V1 + WO-GLYCOPHARM-LANDING-FLOW-FIX-V1:
 * Patient Auth Guard — 비로그인 → /login?type=patient 리다이렉트
 */
function PatientAuthGuardOutlet() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) {
    return <Navigate to="/login?type=patient" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
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
  const enabledCaps = useStoreCapabilities();
  const resolvedConfig = resolveStoreMenu(GLYCOPHARM_STORE_CONFIG, enabledCaps);

  return (
    <StoreDashboardLayout
      config={resolvedConfig}
      userName={user?.name || user?.email || ''}
      homeLink="/"
      onLogout={() => { logout(); navigate('/'); }}
      banner={<RedirectNoticeBanner />}
    />
  );
}

/**
 * AdminAreaLayout / OperatorAreaLayout — 역할별 DashboardLayout
 * WO-O4O-DASHBOARD-ROUTING-NORMALIZE-V1: /admin + /operator 분리
 */
function AdminAreaLayout() {
  return <DashboardLayout role="admin" />;
}

function OperatorAreaLayout() {
  return <OperatorLayoutWrapper />;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* WO-GLYCOPHARM-ENTRY-SCREENS-V1: 진입 화면 (MainLayout 없음) */}
      <Route index element={<LandingPage />} />
      <Route path="handoff" element={<HandoffPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<AccountRecoveryPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      {/* WO-GLYCOPHARM-CARE-UI-ADJUST-V1: 당뇨인 라우트 인증 가드 */}
      <Route element={<PatientAuthGuardOutlet />}>
        <Route path="patient" element={<PatientMainPage />} />
        <Route path="patient/profile" element={<PatientProfilePage />} />
        <Route path="patient/glucose-input" element={<PatientGlucoseInputPage />} />
        <Route path="patient/data-analysis" element={<PatientDataAnalysisPage />} />
        <Route path="patient/pharmacist-coaching" element={<PatientPharmacistCoachingPage />} />
        <Route path="patient/care-guideline" element={<PatientCareGuidelinePage />} />
        <Route path="patient/select-pharmacy" element={<PatientSelectPharmacyPage />} />
        <Route path="patient/appointments" element={<PatientAppointmentsPage />} />
      </Route>
      {/* WO-GLYCOPHARM-GATEWAY-SERVICE-ROUTING-CLEANUP-V1: /pharmacist → /pharmacy */}
      <Route path="pharmacy" element={<PharmacistPlaceholderPage />} />
      <Route path="pharmacy/patients" element={<PharmacistPatientsPage />} />
      <Route path="pharmacy/patient/:patientId" element={<PharmacistPatientDetailPage />} />
      <Route path="pharmacy/patient-requests" element={<PharmacistPatientRequestsPage />} />
      <Route path="pharmacy/appointments" element={<PharmacistAppointmentsPage />} />
      <Route path="pharmacy/coaching/:patientId" element={<PharmacistCoachingPage />} />

      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="role-select" element={<RoleSelectPage />} />
        {/* WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1 */}
        <Route path="community" element={<CommunityMainPage />} />
        <Route path="forum" element={<ForumHubPage />} />
        <Route path="forum/write" element={<ForumWritePage />} />
        <Route path="forum/posts" element={<ForumPage />} />
        <Route path="forum/request-category" element={<RequestCategoryPage />} />
        <Route path="forum/my-requests" element={<MyRequestsPage />} />
        <Route path="forum/feedback" element={<ForumFeedbackPage />} />
        {/* Forum Extension */}
        <Route path="forum-ext" element={<ForumListPage />} />
        <Route path="forum-ext/:forumId" element={<ForumFeedPage />} />
        <Route path="education" element={<EducationPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="apply" element={<PharmacyApplyPage />} />

        <Route path="apply/my-applications" element={<MyApplicationsPage />} />
        {/* B2B Supply */}
        <Route path="b2b/supply" element={<SupplyPage />} />
        {/* Signage Public (WO-SIGNAGE-CONTENT-HUB-V1) */}
        <Route path="signage" element={<ContentLibraryPage />} />
        {/* Hub Exploration (WO-O4O-HUB-EXPLORATION-CORE-V1) */}
        <Route path="hub" element={<GlycoPharmHubPage />} />
        <Route path="hub/b2b" element={<HubB2BCatalogPage />} />
        <Route path="hub/content" element={<HubContentListPage />} />
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
          {/* Patient Detail with nested tabs (WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1) */}
          <Route path="patients/:id" element={<PatientDetailPage />}>
            <Route index element={<DataTab />} />
            <Route path="analysis" element={<PatientAnalysisTab />} />
            <Route path="coaching" element={<PatientCoachingTab />} />
            <Route path="history" element={<HistoryTab />} />
          </Route>
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="coaching" element={<CoachingPage />} />
          <Route path="guideline" element={<PharmacistGuidelinePage />} />
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

      {/* Backward compat redirects */}
      <Route path="pharmacist" element={<Navigate to="/pharmacy" replace />} />
      <Route path="pharmacist/*" element={<Navigate to="/pharmacy" replace />} />

      {/* Supplier Dashboard - Neture에서 관리 */}
      <Route
        path="supplier"
        element={<RoleNotAvailablePage role="supplier" />}
      />
      <Route
        path="supplier/*"
        element={<RoleNotAvailablePage role="supplier" />}
      />

      {/* Admin Login (outside ProtectedRoute) — WO-GLYCOPHARM-GATEWAY-SERVICE-ROUTING-CLEANUP-V1 */}
      <Route path="admin/login" element={<LoginPage />} />

      {/* Admin Dashboard — admin 전용 (WO-O4O-DASHBOARD-ROUTING-NORMALIZE-V1) */}
      <Route
        path="admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAreaLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<GlycoPharmAdminDashboard />} />
        <Route path="pharmacies" element={<PharmaciesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Operator Dashboard — operator + admin 접근 가능 (WO-O4O-DASHBOARD-ROUTING-NORMALIZE-V1) */}
      <Route
        path="operator"
        element={
          <OperatorRoute>
            <OperatorAreaLayout />
          </OperatorRoute>
        }
      >
        <Route index element={<GlycoPharmOperatorDashboard />} />
        <Route path="pharmacies" element={<PharmaciesPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="stores" element={<OperatorStoresPage />} />
        <Route path="stores/:storeId" element={<OperatorStoreDetailPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="settlements" element={<SettlementsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="billing-preview" element={<BillingPreviewPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="forum-requests" element={<ForumRequestsPage />} />
        <Route path="forum-management" element={<OperatorForumManagementPage />} />
        <Route path="community" element={<CommunityManagementPage />} />
        <Route path="store-approvals" element={<StoreApprovalsPage />} />
        <Route path="store-approvals/:id" element={<StoreApprovalDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="ai-report" element={<AiReportPage />} />
        <Route path="ai-usage" element={<AiUsageDashboardPage />} />
        <Route path="ai-billing" element={<AiBillingPage />} />
        <Route path="signage/library" element={<ContentLibraryPage />} />
        <Route path="signage/content" element={<ContentHubPage />} />
        <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
        <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        {/* signage/my removed — WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1 */}
        <Route path="signage/preview" element={<SignagePreviewPage />} />
        <Route path="signage/hq-media" element={<HqMediaPage />} />
        <Route path="signage/hq-media/:mediaId" element={<HqMediaDetailPage />} />
        <Route path="signage/hq-playlists" element={<HqPlaylistsPage />} />
        <Route path="signage/hq-playlists/:playlistId" element={<HqPlaylistDetailPage />} />
        <Route path="signage/templates" element={<SignageTemplatesPage />} />
        <Route path="signage/templates/:templateId" element={<SignageTemplateDetailPage />} />
        {/* 운영 분석 (WO-O4O-AUDIT-ANALYTICS-LAYER-V1) */}
        <Route path="analytics" element={<OperatorAnalyticsPage />} />
        {/* 역할 관리 (WO-O4O-ROLE-MANAGEMENT-UI-V1) */}
        <Route path="roles" element={<RoleManagementPage />} />
        {/* Care (WO-O4O-GLYCOPHARM-OPERATOR-CARE-PAGES-V1) */}
        <Route path="care" element={<OperatorCareDashboardPage />} />
        <Route path="care/alerts" element={<OperatorCareAlertsPage />} />
        {/* Market Trial 2차 승인 (WO-O4O-MARKET-TRIAL-PHASE1-V1) */}
        <Route path="market-trial" element={<MarketTrialServiceApprovalsPage />} />
        <Route path="market-trial/:id" element={<MarketTrialServiceApprovalDetailPage />} />
        {/* Guideline Management (WO-GLYCOPHARM-GUIDELINE-CMS-MIGRATION-V1) */}
        <Route path="guidelines" element={<GuidelineManagementPage />} />
        {/* Settings */}
        <Route path="settings" element={<SettingsPage />} />
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
        <Route path="local-products" element={<StoreLocalProductsPage />} />
        <Route path="tablet-displays" element={<StoreTabletDisplaysPage />} />
        {/* channels: 채널 관리 (WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1) */}
        <Route path="channels" element={<StoreChannelsPage />} />
        <Route path="orders" element={<PharmacyOrders />} />
        <Route path="content" element={<StoreAssetsPage />} />
        <Route path="services" element={<PharmacyPatients />} />
        <Route path="settings" element={<PharmacySettings />} />
        <Route path="apply" element={<StoreApplyPage />} />
        {/* billing: 정산/인보이스 (WO-STORE-BILLING-FOUNDATION-V1) */}
        <Route path="billing" element={<StoreBillingPage />} />
        {/* Signage — WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1: KPA standard StoreSignagePage */}
        <Route path="signage" element={<StoreSignagePage />} />
        <Route path="signage/library" element={<ContentLibraryPage />} />
        <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
        <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        <Route path="signage/preview" element={<SignagePreviewPage />} />
        {/* Extensions */}
        <Route path="market-trial" element={<MarketTrialListPage />} />
        <Route path="market-trial/:id" element={<MarketTrialDetailPage />} />
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
