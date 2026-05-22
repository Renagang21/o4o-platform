import { lazy, Suspense, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
// WO-O4O-STORE-PRODUCTS-QUERYCLIENT-PROVIDER-ALIGN-V1
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});
import { AuthProvider, useAuth, getGlycopharmDashboardRoute } from '@/contexts/AuthContext';
import { GLYCOPHARM_ROLES } from '@/lib/role-constants';
import { LoginModalProvider } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/common/LoginModal';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import { TemplateProvider } from '@o4o/ui';
import { templates } from '@o4o/shared-space-ui';
import { glycopharmConfig } from '@o4o/operator-ux-core';

// Layouts (always needed)
import MainLayout from '@/components/layouts/MainLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import OperatorLayoutWrapper from '@/components/layouts/OperatorLayoutWrapper';
import StoreLayout from '@/components/layouts/StoreLayout';
import KioskLayout from '@/components/layouts/KioskLayout';
import TabletLayout from '@/components/layouts/TabletLayout';
import { RoleGuard, OperatorRoute } from '@/components/auth/RoleGuard';

// WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 매장 경영자용 매장 상품 관리 (공통 패키지)
import { StoreProductsManagerPage } from '@o4o/store-products-ui';

// Public Pages (always loaded - first paint)
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

// WO-O4O-GLYCOPHARM-PATIENT-SURFACE-REMOVAL-V1: Patient/pharmacist pages removed

// Store Management pages (WO-O4O-GLYCOPHARM-NAVIGATION-AND-STORE-STRUCTURE-REFINE-V1:
//   pages/pharmacy/ → pages/store-management/ 이동, /store/* 라우트 담당)
const StoreMainPage = lazy(() => import('@/pages/store-management/StoreMainPage'));
const PharmacyOrders = lazy(() => import('@/pages/store-management/PharmacyOrders'));
// WO-O4O-GLYCO-CARE-CLEANUP-V1: PharmacyPatients (환자/Care 잔재) 제거.
// 현재 GlycoPharm canonical = 전문 매장 운영 + Blog + Content + Store. /store/services 라우트도 함께 제거됨.
const PharmacySettings = lazy(() => import('@/pages/store-management/PharmacySettings'));
const PharmacyManagement = lazy(() => import('@/pages/store-management/PharmacyManagement'));
const PharmacyB2BProducts = lazy(() => import('@/pages/store-management/PharmacyB2BProducts'));
const CustomerRequestsPage = lazy(() => import('@/pages/store-management/CustomerRequestsPage')); // Phase 1: Common Request
// WO-O4O-GLYCO-BLOG-INTRODUCE-V1: Blog 도입 (KPA canonical 정렬)
const PharmacyBlogPage = lazy(() => import('@/pages/store-management/PharmacyBlogPage'));
const StoreBlogPage = lazy(() => import('@/pages/store/StoreBlogPage'));
const StoreBlogPostPage = lazy(() => import('@/pages/store/StoreBlogPostPage'));

// Store Signage — WO-O4O-GLYCOPHARM-SIGNAGE-PHASE1-V1 (StoreSignagePage → StoreSignageMainPage로 교체됨)

// Signage Extension (New)
const ContentLibraryPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.ContentLibraryPage })));
const ContentHubPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.ContentHubPage })));
const SignagePreviewPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.SignagePreviewPage })));
const SignagePlaylistDetailPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.PlaylistDetailPage })));
const SignageMediaDetailPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.MediaDetailPage })));
// WO-O4O-GLYCOPHARM-SIGNAGE-PHASE1-V1
const StoreSignageMainPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.StoreSignageMainPage })));
const SignagePlaybackPage = lazy(() => import('@/pages/store-management/signage').then(m => ({ default: m.SignagePlaybackPage })));
const SignagePlayerSelectPage = lazy(() => import('@/pages/store-management/signage/SignagePlayerSelectPage').then(m => ({ default: m.SignagePlayerSelectPage })));

// Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1)
const HqMediaPage = lazy(() => import('@/pages/operator/signage/HqMediaPage'));
const HqMediaDetailPage = lazy(() => import('@/pages/operator/signage/HqMediaDetailPage'));
const HqPlaylistsPage = lazy(() => import('@/pages/operator/signage/HqPlaylistsPage'));
const HqPlaylistDetailPage = lazy(() => import('@/pages/operator/signage/HqPlaylistDetailPage'));
const SignageTemplatesPage = lazy(() => import('@/pages/operator/signage/TemplatesPage'));
const SignageTemplateDetailPage = lazy(() => import('@/pages/operator/signage/TemplateDetailPage'));
// WO-O4O-GLYCOPHARM-SIGNAGE-FORCED-CONTENT-V1
const ForcedContentPage = lazy(() => import('@/pages/operator/signage/ForcedContentPage'));

// B2B Order & Supply
const B2BOrderPage = lazy(() => import('@/pages/store-management/b2b-order').then(m => ({ default: m.B2BOrderPage })));
const SupplyPage = lazy(() => import('@/pages/b2b').then(m => ({ default: m.SupplyPage })));

// Forum Post Detail (WO-O4O-GLYCOPHARM-KPA-STYLE-UX-REFINE-P3-V1)
const ForumPostDetailPage = lazy(() => import('@/pages/forum/ForumPostDetailPage'));

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
const GlycopharmMembersPage = lazy(() => import('@/pages/operator/GlycopharmMembersPage'));
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
// Operator Guide Contents (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1)
const OperatorGuideContentsPage = lazy(() => import('@/pages/operator/OperatorGuideContentsPage'));

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
// WO-O4O-GLYCOPHARM-STORE-HUB-PORT-V1: index → StoreHubTemplate 기반 페이지로 교체
const GlycoStoreHubPage = lazy(() => import('@/pages/hub/StoreHubPage').then(m => ({ default: m.StoreHubPage })));
const HubB2BCatalogPage = lazy(() => import('@/pages/hub/HubB2BCatalogPage').then(m => ({ default: m.HubB2BCatalogPage })));
const HubContentListPage = lazy(() => import('@/pages/hub/HubContentListPage').then(m => ({ default: m.HubContentListPage })));
// WO-O4O-GLYCOPHARM-EVENT-OFFERS-HUB-CANONICAL-ALIGNMENT-V1
const HubEventOffersPage = lazy(() => import('@/pages/hub/HubEventOffersPage').then(m => ({ default: m.HubEventOffersPage })));
import { GlycoPharmHubLayout } from '@/components/layouts/GlycoPharmHubLayout';

// Guide pages (shared components — WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1)
import {
  GuideIntroPage,
  GuideIntroStructurePage,
  GuideIntroKpaPage,
  GuideIntroOperationPage,
  GuideIntroConceptPage,
  GuideUsagePage,
  GuideFeaturesPage,
  GuideFeatureManualPage,
  glycopharmGuideIntroProps,
  glycopharmGuideIntroStructureProps,
  glycopharmGuideIntroKpaProps,
  glycopharmGuideIntroOperationProps,
  glycopharmGuideIntroConceptProps,
  glycopharmGuideUsageProps,
  glycopharmGuideFeaturesProps,
  glycopharmGuideFeatureForumProps,
  glycopharmGuideFeatureResourcesProps,
  glycopharmGuideFeatureContentProps,
  glycopharmGuideFeatureSignageProps,
} from '@o4o/shared-space-ui';

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, GLYCOPHARM_STORE_CONFIG, resolveStoreMenu } from '@o4o/store-ui-core';
import { GlycoGlobalHeader } from './components/GlycoGlobalHeader';
import { useStoreCapabilities } from './hooks/useStoreCapabilities';
const StoreOverviewPage = lazy(() => import('@/pages/store/StoreOverviewPage'));
// WO-O4O-GLYCO-STORE-CANONICAL-ENTRY-ALIGN-V1: StoreEntryPage 라우트 제거됨.
// 페이지 파일은 보존(별도 cleanup WO에서 판단). 라우트 사용 제거에 따른 import만 정리.
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

// WO-O4O-GLYCOPHARM-MENU-CANONICAL-ALIGN-V1: 모바일 약국 경영 허브
const MobilePharmacyPage = lazy(() => import('@/pages/mobile/MobilePharmacyPage'));

// WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1: Community main page
const CommunityMainPage = lazy(() => import('@/pages/community/CommunityMainPage'));
const CommunityManagementPage = lazy(() => import('@/pages/operator/CommunityManagementPage'));

// Forum & Education
const ForumHubPage = lazy(() => import('@/pages/forum/ForumHubPage'));
const ForumPage = lazy(() => import('@/pages/forum/ForumPage'));
const ForumWritePage = lazy(() => import('@/pages/forum/ForumWritePage'));
const RequestCategoryPage = lazy(() => import('@/pages/forum/RequestCategoryPage'));
const MyRequestsPage = lazy(() => import('@/pages/forum/MyRequestsPage'));
// WO-O4O-GLYCOPHARM-FORUM-DASHBOARD-V1
const MyForumDashboardPage = lazy(() => import('@/pages/forum/MyForumDashboardPage'));
const ForumFeedbackPage = lazy(() => import('@/pages/forum/ForumFeedbackPage'));
const EducationPage = lazy(() => import('@/pages/education/EducationPage'));
const CourseDetailPage = lazy(() => import('@/pages/education/CourseDetailPage'));
// WO-O4O-GLYCOPHARM-CONTENT-RESOURCES-ROUTE-ALIGNMENT-V1
const ResourcesPage = lazy(() => import('@/pages/resources/ResourcesPage').then(m => ({ default: m.ResourcesPage })));
// WO-GLYCOPHARM-INSTRUCTOR-OPERATOR-V1
const InstructorDashboardPage = lazy(() => import('@/pages/instructor/InstructorDashboardPage'));
const LmsCoursesPage = lazy(() => import('@/pages/operator/LmsCoursesPage'));

// WO-O4O-GLYCOPHARM-AI-CONTENT-ACTIVATION-V1
const OperatorResourcesPage = lazy(() => import('@/pages/operator/OperatorResourcesPage'));

// MyPage 3-split (WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1)
const MyPageHub = lazy(() => import('@/pages/mypage/MyPageHub'));
const MyProfilePage = lazy(() => import('@/pages/mypage/MyProfilePage'));
const MySettingsPage = lazy(() => import('@/pages/mypage/MySettingsPage'));


// Apply Pages (API 연동)
const PharmacyApplyPage = lazy(() => import('@/pages/apply/PharmacyApplyPage'));
const MyApplicationsPage = lazy(() => import('@/pages/apply/MyApplicationsPage'));
const PharmacistApplyPage = lazy(() => import('@/pages/apply/PharmacistApplyPage'));

// QR Landing (Phase 2-B: WO-O4O-REQUEST-UX-REFINEMENT-PHASE2B)
const QrLandingPage = lazy(() => import('@/pages/qr/QrLandingPage'));

// Funnel Visualization (Phase 3-A: WO-O4O-FUNNEL-VISUALIZATION-PHASE3A-CP1)
const FunnelPage = lazy(() => import('@/pages/store-management/FunnelPage'));

// WO-O4O-GLYCOPHARM-POP-STORE-EXECUTION-V1
const StorePopPage = lazy(() => import('@/pages/store-management/StorePopPage'));

// WO-O4O-GLYCOPHARM-QR-STORE-EXECUTION-V1
const StoreQrPage = lazy(() => import('@/pages/store/StoreQrPage'));

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

/** Store Dashboard Layout Wrapper - connects auth context to shared layout */
function StoreLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const enabledCaps = useStoreCapabilities();
  const resolvedConfig = resolveStoreMenu(GLYCOPHARM_STORE_CONFIG, enabledCaps);

  return (
    <div className="min-h-screen flex flex-col">
      <GlycoGlobalHeader />
      <StoreDashboardLayout
        config={resolvedConfig}
        userName={user?.name || user?.email || ''}
        homeLink="/"
        onLogout={() => { logout(); navigate('/'); }}
        banner={<RedirectNoticeBanner />}
        hideTopBar
      />
    </div>
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

/**
 * PostLoginRedirect — 로그인 이후 역할 기반 redirect
 *
 * WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1
 *
 * canonical 패턴 (KPA reference implementation 기반):
 * - 로그인 직후 1회만 실행 (wasAuthRef + didRedirectRef 이중 가드)
 * - / 또는 /login 에서만 redirect (기존 LoginModal '/' 가드 정책 유지)
 * - loginType override (pharmacy/operator) 및 returnUrl은 LoginPage에서 처리
 *   → LoginPage가 먼저 navigate하면 path가 바뀌어 자동으로 이 가드에 걸림
 * - workspace 경로 진입 시 early-exit
 */
function PostLoginRedirect() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wasAuthRef = useRef(isAuthenticated);
  const didRedirectRef = useRef(false);

  useEffect(() => {
    const justLoggedIn = !wasAuthRef.current && isAuthenticated;
    wasAuthRef.current = isAuthenticated;

    if (!isAuthenticated) { didRedirectRef.current = false; return; }
    if (!justLoggedIn && !didRedirectRef.current) return;
    if (!user) return;
    if (didRedirectRef.current) return;

    // '/' 또는 '/login'에서만 redirect — 기존 LoginModal 가드 정책 유지
    // (loginType/returnUrl로 LoginPage가 먼저 navigate했으면 path가 이미 변경됨)
    if (location.pathname !== '/' && location.pathname !== '/login') {
      didRedirectRef.current = true; return;
    }

    // workspace 경로 early-exit
    const WORKSPACE_PREFIXES = ['/store', '/operator', '/admin', '/patient', '/partner', '/instructor'];
    if (WORKSPACE_PREFIXES.some(p => location.pathname.startsWith(p))) {
      didRedirectRef.current = true; return;
    }

    const target = getGlycopharmDashboardRoute(user.roles ?? []);
    didRedirectRef.current = true;
    if (target && target !== '/') navigate(target, { replace: true });
  }, [isAuthenticated, user, navigate, location.pathname]);

  return null;
}

// WO-O4O-LMS-ROUTING-UNIFICATION-V1: /lms/:id → /lms/course/:id legacy redirect
function LmsCourseRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/lms/course/${id}`} replace />;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* WO-O4O-GLYCOPHARM-HOME-KPA-ALIGNMENT-V1: / = Home 직접 연결 */}
      <Route path="handoff" element={<HandoffPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<AccountRecoveryPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="role-select" element={<RoleSelectPage />} />
        {/* WO-O4O-GLYCOPHARM-HOME-KPA-ALIGNMENT-V1: Home 직접 */}
        <Route index element={<CommunityMainPage />} />
        <Route path="forum" element={<ForumHubPage />} />
        <Route path="forum/write" element={<ForumWritePage />} />
        <Route path="forum/posts" element={<ForumPage />} />
        <Route path="forum/posts/:id" element={<ForumPostDetailPage />} />
        <Route path="forum/request-category" element={<RequestCategoryPage />} />
        <Route path="forum/my-requests" element={<MyRequestsPage />} />
        {/* WO-O4O-GLYCOPHARM-FORUM-DASHBOARD-V1 */}
        <Route path="forum/my-dashboard" element={<MyForumDashboardPage />} />
        <Route path="forum/feedback" element={<ForumFeedbackPage />} />
        {/* WO-O4O-GLYCOPHARM-HOME-KPA-ALIGNMENT-V1: /lms 통일 */}
        {/* WO-O4O-LMS-ROUTING-UNIFICATION-V1: Canonical /lms/course/:id 정렬 */}
        <Route path="lms" element={<EducationPage />} />
        <Route path="lms/course/:id" element={<CourseDetailPage />} />
        <Route path="lms/:id" element={<LmsCourseRedirect />} />
        {/* WO-O4O-GLYCOPHARM-CONTENT-RESOURCES-ROUTE-ALIGNMENT-V1: top-level canonical paths */}
        <Route path="content" element={<HubContentListPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        {/* Instructor Dashboard — WO-GLYCOPHARM-INSTRUCTOR-OPERATOR-V1 */}
        <Route path="instructor" element={
          <RoleGuard allowedRoles={['lms:instructor', 'glycopharm:admin', 'platform:super_admin']}>
            <InstructorDashboardPage />
          </RoleGuard>
        } />
        <Route path="contact" element={<ContactPage />} />
        {/* WO-O4O-GLYCOPHARM-MENU-CANONICAL-ALIGN-V1: 모바일 약국 경영 허브 */}
        <Route path="mobile/pharmacy" element={<MobilePharmacyPage />} />

        {/* Guide pages — WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1 */}
        <Route path="guide/intro" element={<GuideIntroPage {...glycopharmGuideIntroProps} />} />
        <Route path="guide/intro/structure" element={<GuideIntroStructurePage {...glycopharmGuideIntroStructureProps} />} />
        <Route path="guide/intro/kpa" element={<GuideIntroKpaPage {...glycopharmGuideIntroKpaProps} />} />
        <Route path="guide/intro/operation" element={<GuideIntroOperationPage {...glycopharmGuideIntroOperationProps} />} />
        <Route path="guide/intro/concept" element={<GuideIntroConceptPage {...glycopharmGuideIntroConceptProps} />} />
        <Route path="guide/usage" element={<GuideUsagePage {...glycopharmGuideUsageProps} />} />
        <Route path="guide/features" element={<GuideFeaturesPage {...glycopharmGuideFeaturesProps} />} />
        <Route path="guide/features/forum" element={<GuideFeatureManualPage {...glycopharmGuideFeatureForumProps} />} />
        <Route path="guide/features/resources" element={<GuideFeatureManualPage {...glycopharmGuideFeatureResourcesProps} />} />
        <Route path="guide/features/content" element={<GuideFeatureManualPage {...glycopharmGuideFeatureContentProps} />} />
        <Route path="guide/features/signage" element={<GuideFeatureManualPage {...glycopharmGuideFeatureSignageProps} />} />

        <Route path="apply" element={<PharmacyApplyPage />} />
        <Route path="apply/pharmacist" element={<PharmacistApplyPage />} />
        <Route path="apply/my-applications" element={<MyApplicationsPage />} />
        {/* B2B Supply */}
        <Route path="b2b/supply" element={<SupplyPage />} />
        {/* Hub Exploration — sidebar layout (WO-O4O-GLYCOPHARM-KPA-STYLE-UX-REFINE-P1-V1) */}
        {/* WO-O4O-HUB-TO-STORE-HUB-RENAMING-V1: /hub → /store-hub */}
        <Route path="store-hub" element={<GlycoPharmHubLayout />}>
          <Route index element={<GlycoStoreHubPage />} />
          <Route path="b2b" element={<HubB2BCatalogPage />} />
          <Route path="content" element={<HubContentListPage />} />
          <Route path="signage" element={<Navigate to="/store/signage/library" replace />} />
          {/* WO-O4O-GLYCOPHARM-EVENT-OFFERS-HUB-CANONICAL-ALIGNMENT-V1 */}
          <Route path="event-offers" element={<HubEventOffersPage />} />
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

        {/* WO-O4O-GLYCO-STORE-CANONICAL-ENTRY-ALIGN-V1:
            /store 인덱스는 StoreLayoutWrapper 라우트(아래)로 단일화. MainLayout 경유 진입 라우트 제거. */}
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
        <Route path="glycopharm-members" element={<GlycopharmMembersPage />} />
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
        {/* WO-O4O-GLYCOPHARM-SIGNAGE-FORCED-CONTENT-V1 */}
        <Route path="signage/forced-content" element={<ForcedContentPage />} />
        {/* 운영 분석 (WO-O4O-AUDIT-ANALYTICS-LAYER-V1) */}
        <Route path="analytics" element={<OperatorAnalyticsPage />} />
        {/* WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1:
            역할 관리는 /admin/roles 에서만 접근. /operator/roles 라우트 제거. */}
        {/* Guideline Management (WO-GLYCOPHARM-GUIDELINE-CMS-MIGRATION-V1) */}
        <Route path="guidelines" element={<GuidelineManagementPage />} />
        {/* Guide Contents (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1) */}
        <Route path="guide-contents" element={<OperatorGuideContentsPage />} />
        {/* LMS Management (WO-GLYCOPHARM-INSTRUCTOR-OPERATOR-V1) */}
        <Route path="lms/courses" element={<LmsCoursesPage />} />
        {/* Resources Management + AI Content (WO-O4O-GLYCOPHARM-AI-CONTENT-ACTIVATION-V1) */}
        <Route path="resources" element={<OperatorResourcesPage />} />
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

      {/* Public Blog (WO-O4O-GLYCO-BLOG-INTRODUCE-V1)
          unified-store-public 경로(/api/v1/stores/:slug/blog/*) 사용. 인증 불필요.
          consumer storefront route(/store/:pharmacyId)와 path 충돌 없음 — `/blog` 세그먼트로 더 specific 매칭 */}
      <Route path="store/:slug/blog" element={<StoreBlogPage />} />
      <Route path="store/:slug/blog/:postSlug" element={<StoreBlogPostPage />} />

      {/* Store Owner Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1) */}
      <Route
        path="store"
        element={
          <ProtectedRoute allowedRoles={[GLYCOPHARM_ROLES.PHARMACIST]}>
            <StoreLayoutWrapper />
          </ProtectedRoute>
        }
      >
        {/* WO-O4O-GLYCO-STORE-CANONICAL-ENTRY-ALIGN-V1: /store 인덱스 = 운영 홈 (canonical). */}
        <Route index element={<StoreOverviewPage />} />
        <Route path="identity" element={<StoreMainPage />} />
        {/* WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 내 매장 상품 (ProductMaster + Listing).
            상위 ProtectedRoute 가 PHARMACIST 게이트 — 추가로 store_owner/admin 만 통과시킨다. */}
        <Route path="my-products" element={
          <RoleGuard allowedRoles={['glycopharm:store_owner', GLYCOPHARM_ROLES.ADMIN, GLYCOPHARM_ROLES.PLATFORM_SUPER_ADMIN]}>
            <StoreProductsManagerPage />
          </RoleGuard>
        } />
        <Route path="local-products" element={<StoreLocalProductsPage />} />
        <Route path="tablet-displays" element={<StoreTabletDisplaysPage />} />
        {/* channels: 채널 관리 (WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1) */}
        <Route path="channels" element={<StoreChannelsPage />} />
        <Route path="orders" element={<PharmacyOrders />} />
        <Route path="content" element={<StoreAssetsPage />} />
        {/* Blog (WO-O4O-GLYCO-BLOG-INTRODUCE-V1) — staff 작성/관리 */}
        <Route path="content/blog" element={<PharmacyBlogPage />} />
        {/* WO-O4O-GLYCO-CARE-CLEANUP-V1: /store/services (PharmacyPatients) 라우트 제거.
            환자/Care 직접 관리 시스템은 현재 canonical 구조에 포함되지 않음. */}
        <Route path="settings" element={<PharmacySettings />} />
        <Route path="apply" element={<StoreApplyPage />} />
        {/* billing: 정산/인보이스 (WO-STORE-BILLING-FOUNDATION-V1) */}
        <Route path="billing" element={<StoreBillingPage />} />
        {/* Signage — WO-O4O-GLYCOPHARM-SIGNAGE-PHASE1-V1 + IA-RESTRUCTURE-V2 */}
        <Route path="signage" element={<Navigate to="playlist" replace />} />
        <Route path="signage/playlist" element={<StoreSignageMainPage />} />
        <Route path="signage/videos" element={<StoreSignageMainPage />} />
        <Route path="signage/schedules" element={<StoreSignageMainPage />} />
        <Route path="signage/player" element={<SignagePlayerSelectPage />} />
        <Route path="signage/play/:playlistId" element={<SignagePlaybackPage />} />
        {/* Legacy signage routes (maintained for backward compat) */}
        <Route path="signage/library" element={<ContentLibraryPage />} />
        <Route path="signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
        <Route path="signage/media/:id" element={<SignageMediaDetailPage />} />
        <Route path="signage/preview" element={<SignagePreviewPage />} />
        {/* Extensions */}
        <Route path="b2b-order" element={<B2BOrderPage />} />
        <Route path="requests" element={<CustomerRequestsPage />} />
        <Route path="funnel" element={<FunnelPage />} />
        {/* POP 생성 (WO-O4O-GLYCOPHARM-POP-STORE-EXECUTION-V1) */}
        <Route path="pop" element={<StorePopPage />} />
        {/* QR 관리 (WO-O4O-GLYCOPHARM-QR-STORE-EXECUTION-V1) */}
        <Route path="qr" element={<StoreQrPage />} />
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
    <QueryClientProvider client={queryClient}>
    <O4OErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LoginModalProvider>
            {/* WO-O4O-TEMPLATE-PROVIDER-V1: 서비스 디자인 토큰 자동 주입 */}
            <TemplateProvider template={templates[glycopharmConfig.template]}>
            <O4OToastProvider />
            <LoginModal />
            {/* WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1: 역할 기반 redirect 단일화 */}
            <PostLoginRedirect />
            <Suspense fallback={<PageLoading />}>
              <AppRoutes />
            </Suspense>
            </TemplateProvider>
          </LoginModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </O4OErrorBoundary>
    </QueryClientProvider>
  );
}
