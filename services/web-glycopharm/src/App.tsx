import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, GLYCOPHARM_ROLES } from '@/contexts/AuthContext';
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
// PharmacyPlaceholderPage 제거 — WO-O4O-GLYCOPHARM-NAVIGATION-AND-STORE-STRUCTURE-REFINE-V1:
//   /pharmacy → Navigate to /care/patients (직접 리다이렉트)

// WO-GLYCOPHARM-PHARMACIST-COACHING-SCREEN-V1 + PATIENT-LIST-SCREEN-V1 + PATIENT-DETAIL-SCREEN-V1
// WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-C1:
//   pages/pharmacist/PharmacistCoachingPage → pages/pharmacist/PharmacyCoachingPage
const PharmacyCoachingPage = lazy(() => import('@/pages/pharmacist/PharmacyCoachingPage'));
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
const PatientRecordsListPage = lazy(() => import('@/pages/patient/RecordsListPage'));
const PatientDataAnalysisPage = lazy(() => import('@/pages/patient/DataAnalysisPage'));
// WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-C1:
//   pages/patient/PharmacistCoachingPage → pages/patient/PharmacyCoachingPage
const PatientPharmacyCoachingPage = lazy(() => import('@/pages/patient/PharmacyCoachingPage'));

// Store Management pages (WO-O4O-GLYCOPHARM-NAVIGATION-AND-STORE-STRUCTURE-REFINE-V1:
//   pages/pharmacy/ → pages/store-management/ 이동, /store/* 라우트 담당)
const StoreMainPage = lazy(() => import('@/pages/store-management/StoreMainPage'));
const PharmacyProducts = lazy(() => import('@/pages/store-management/PharmacyProducts'));
const PharmacyOrders = lazy(() => import('@/pages/store-management/PharmacyOrders'));
const PharmacyPatients = lazy(() => import('@/pages/store-management/PharmacyPatients'));
const PharmacySettings = lazy(() => import('@/pages/store-management/PharmacySettings'));
const PharmacyManagement = lazy(() => import('@/pages/store-management/PharmacyManagement'));
const PharmacyB2BProducts = lazy(() => import('@/pages/store-management/PharmacyB2BProducts'));
const CustomerRequestsPage = lazy(() => import('@/pages/store-management/CustomerRequestsPage')); // Phase 1: Common Request

// Store Signage (WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1: KPA standard)
const StoreSignagePage = lazy(() => import('@/pages/store-management/StoreSignagePage'));

// Signage Extension (New)
const ContentLibraryPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.ContentLibraryPage })));
const ContentHubPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.ContentHubPage })));
const SignagePreviewPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.SignagePreviewPage })));
const SignagePlaylistDetailPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.PlaylistDetailPage })));
const SignageMediaDetailPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.MediaDetailPage })));

// Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1)
const HqMediaPage = lazy(() => import('@/pages/operator/signage/HqMediaPage'));
const HqMediaDetailPage = lazy(() => import('@/pages/operator/signage/HqMediaDetailPage'));
const HqPlaylistsPage = lazy(() => import('@/pages/operator/signage/HqPlaylistsPage'));
const HqPlaylistDetailPage = lazy(() => import('@/pages/operator/signage/HqPlaylistDetailPage'));
const SignageTemplatesPage = lazy(() => import('@/pages/operator/signage/TemplatesPage'));
const SignageTemplateDetailPage = lazy(() => import('@/pages/operator/signage/TemplateDetailPage'));

// Market Trial Extension
const MarketTrialListPage = lazy(() => import('@/pages/store-management/market-trial').then(m => ({ default: m.MarketTrialListPage })));
// OperatorTrialSelectorPage removed (WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: deprecated)
// WO-O4O-MARKET-TRIAL-PHASE1-V1: Service approval + store detail pages
const MarketTrialDetailPage = lazy(() => import('@/pages/store-management/market-trial/MarketTrialDetailPage'));

// B2B Order & Supply
const B2BOrderPage = lazy(() => import('@/pages/store-management/b2b-order').then(m => ({ default: m.B2BOrderPage })));
const SupplyPage = lazy(() => import('@/pages/b2b').then(m => ({ default: m.SupplyPage })));

// Forum Post Detail (WO-O4O-GLYCOPHARM-KPA-STYLE-UX-REFINE-P3-V1)
const ForumPostDetailPage = lazy(() => import('@/pages/forum/ForumPostDetailPage'));

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
const ForumDeleteRequestsPage = lazy(() => import('@/pages/operator/ForumDeleteRequestsPage'));
// WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1
const ForumAnalyticsPage = lazy(() => import('@/pages/operator/ForumAnalyticsPage'));
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
// Hub Exploration (WO-O4O-HUB-EXPLORATION-CORE-V1 / WO-O4O-GLYCOPHARM-KPA-STYLE-UX-REFINE-P1-V1)
const GlycoPharmHubPage = lazy(() => import('@/pages/hub/GlycoPharmHubPage').then(m => ({ default: m.GlycoPharmHubPage })));
const HubB2BCatalogPage = lazy(() => import('@/pages/hub/HubB2BCatalogPage').then(m => ({ default: m.HubB2BCatalogPage })));
const HubContentListPage = lazy(() => import('@/pages/hub/HubContentListPage').then(m => ({ default: m.HubContentListPage })));
import { GlycoPharmHubLayout } from '@/components/layouts/GlycoPharmHubLayout';

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, GLYCOPHARM_STORE_CONFIG, resolveStoreMenu } from '@o4o/store-ui-core';
import { useStoreCapabilities } from './hooks/useStoreCapabilities';
const StoreOverviewPage = lazy(() => import('@/pages/store/StoreOverviewPage'));
const StoreEntryPage = lazy(() => import('@/pages/store/StoreEntryPage'));
const StoreAssetsPage = lazy(() => import('@/pages/store/StoreAssetsPage'));
const StoreChannelsPage = lazy(() => import('@/pages/store/StoreChannelsPage'));

// Pharmacy Store Apply
const StoreApplyPage = lazy(() => import('@/pages/store-management/StoreApplyPage'));

// WO-STORE-BILLING-FOUNDATION-V1: 정산/인보이스
const StoreBillingPage = lazy(() => import('@/pages/store-management/StoreBillingPage'));

// WO-O4O-STORE-LOCAL-PRODUCT-UI-V1: 자체 상품 CRUD + 태블릿 진열 관리
const StoreLocalProductsPage = lazy(() => import('@/pages/store-management/StoreLocalProductsPage'));
const StoreTabletDisplaysPage = lazy(() => import('@/pages/store-management/StoreTabletDisplaysPage'));

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

// MyPage 3-split (WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1)
const MyPageHub = lazy(() => import('@/pages/mypage/MyPageHub'));
const MyProfilePage = lazy(() => import('@/pages/mypage/MyProfilePage'));
const MySettingsPage = lazy(() => import('@/pages/mypage/MySettingsPage'));


// Apply Pages (API 연동)
const PharmacyApplyPage = lazy(() => import('@/pages/apply/PharmacyApplyPage'));
const MyApplicationsPage = lazy(() => import('@/pages/apply/MyApplicationsPage'));

// QR Landing (Phase 2-B: WO-O4O-REQUEST-UX-REFINEMENT-PHASE2B)
const QrLandingPage = lazy(() => import('@/pages/qr/QrLandingPage'));

// Funnel Visualization (Phase 3-A: WO-O4O-FUNNEL-VISUALIZATION-PHASE3A-CP1)
const FunnelPage = lazy(() => import('@/pages/store-management/FunnelPage'));

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
const PATIENT_ROLES = ['customer'];

function PatientAuthGuardOutlet() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) {
    return <Navigate to="/login?type=patient" state={{ from: location.pathname }} replace />;
  }
  // 당뇨인 role 체크 — 약국/운영자는 /patient 접근 불가
  if (user && !user.roles.some(r => PATIENT_ROLES.includes(r))) {
    return <Navigate to="/" replace />;
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
  return <DashboardLayout role={GLYCOPHARM_ROLES.ADMIN} />;
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
        <Route path="patient/records" element={<PatientRecordsListPage />} />
        <Route path="patient/data-analysis" element={<PatientDataAnalysisPage />} />
        {/* WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-C2:
            신규 표준 경로 `patient/pharmacy-coaching` + legacy alias `patient/pharmacist-coaching`
            외부 북마크/이전 딥링크 호환을 위해 두 경로 모두 동일 컴포넌트를 가리킴. */}
        <Route path="patient/pharmacy-coaching" element={<PatientPharmacyCoachingPage />} />
        <Route path="patient/pharmacist-coaching" element={<PatientPharmacyCoachingPage />} />
<Route path="patient/select-pharmacy" element={<PatientSelectPharmacyPage />} />
        <Route path="patient/appointments" element={<PatientAppointmentsPage />} />
      </Route>
      {/* WO-O4O-GLYCOPHARM-NAVIGATION-AND-STORE-STRUCTURE-REFINE-V1:
          PharmacyPlaceholderPage 제거 — /pharmacy 직접 리다이렉트.
          약국 사용자는 /care/patients (Care 대시보드) 로 직행.
          비로그인/당뇨인은 / 로 리다이렉트. */}
      <Route path="pharmacy" element={<Navigate to="/care/patients" replace />} />
      <Route path="pharmacy/patients" element={<PharmacistPatientsPage />} />
      <Route path="pharmacy/patient/:patientId" element={<PharmacistPatientDetailPage />} />
      <Route path="pharmacy/patient-requests" element={<PharmacistPatientRequestsPage />} />
      <Route path="pharmacy/appointments" element={<PharmacistAppointmentsPage />} />
      <Route path="pharmacy/coaching/:patientId" element={<PharmacyCoachingPage />} />

      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="role-select" element={<RoleSelectPage />} />
        {/* WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1 */}
        <Route path="community" element={<CommunityMainPage />} />
        <Route path="forum" element={<ForumHubPage />} />
        <Route path="forum/write" element={<ForumWritePage />} />
        <Route path="forum/posts" element={<ForumPage />} />
        <Route path="forum/posts/:id" element={<ForumPostDetailPage />} />
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
        {/* Hub Exploration — sidebar layout (WO-O4O-GLYCOPHARM-KPA-STYLE-UX-REFINE-P1-V1) */}
        <Route path="hub" element={<GlycoPharmHubLayout />}>
          <Route index element={<GlycoPharmHubPage />} />
          <Route path="b2b" element={<HubB2BCatalogPage />} />
          <Route path="content" element={<HubContentListPage />} />
        </Route>
        {/* WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1 */}
        <Route path="library/content" element={<HubContentListPage />} />
        {/* MyPage 3-split (WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1) */}
        <Route path="mypage" element={
          <SoftGuard feature="mypage">
            <MyPageHub />
          </SoftGuard>
        } />
        <Route path="mypage/profile" element={
          <SoftGuard feature="mypage">
            <MyProfilePage />
          </SoftGuard>
        } />
        <Route path="mypage/settings" element={
          <SoftGuard feature="mypage">
            <MySettingsPage />
          </SoftGuard>
        } />

        {/* Store Entry Portal (WO-STORE-MAIN-ENTRY-LAYOUT-V1) */}
        <Route path="store" element={
          <SoftGuard feature="store" allowedRoles={[GLYCOPHARM_ROLES.PHARMACY]}>
            <StoreEntryPage />
          </SoftGuard>
        } />
      </Route>

      {/* Service User Routes (Phase 2: WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM) */}
      <Route path="service-login" element={<MainLayout />}>
        <Route index element={<ServiceLoginPage />} />
      </Route>

      <Route
        path="service"
        element={
          <ServiceUserProtectedRoute>
            <DashboardLayout role={GLYCOPHARM_ROLES.CONSUMER} />
          </ServiceUserProtectedRoute>
        }
      >
        <Route index element={<ServiceDashboardPage />} />
        <Route path="dashboard" element={<ServiceDashboardPage />} />
      </Route>

      {/* Backward compat redirects
          WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-C2:
            `/pharmacist` 및 `/pharmacist/*` → `/pharmacy` 리다이렉트는 레거시 북마크 대응
            (외부 URL 영향이 있으므로 즉시 제거하지 않고 alias 유지). */}
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
          <ProtectedRoute allowedRoles={[GLYCOPHARM_ROLES.ADMIN, GLYCOPHARM_ROLES.PLATFORM_SUPER_ADMIN]}>
            <AdminAreaLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<GlycoPharmAdminDashboard />} />
        <Route path="pharmacies" element={<PharmaciesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        {/* WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-MENU-REALIGNMENT-V1: Finance */}
        <Route path="settlements" element={<SettlementsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="billing-preview" element={<BillingPreviewPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        {/* WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-MENU-REALIGNMENT-V1: Governance */}
        <Route path="roles" element={<RoleManagementPage />} />
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
        {/* WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1: Finance/Governance routes moved to /admin/* only.
            Removed from /operator/*: settlements, reports, billing-preview, invoices, roles. */}
        <Route path="forum-requests" element={<ForumRequestsPage />} />
        <Route path="forum-delete-requests" element={<ForumDeleteRequestsPage />} />
        {/* WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1 */}
        <Route path="forum-analytics" element={<ForumAnalyticsPage />} />
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
        {/* WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1:
            역할 관리는 /admin/roles 에서만 접근. /operator/roles 라우트 제거. */}
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
          <ProtectedRoute allowedRoles={[GLYCOPHARM_ROLES.PHARMACY]}>
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
