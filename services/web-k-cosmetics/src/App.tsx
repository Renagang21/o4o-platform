/**
 * App - K-Cosmetics
 * Based on GlycoPharm App structure
 */

import { lazy, Suspense, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
// WO-O4O-STORE-PRODUCTS-QUERYCLIENT-PROVIDER-ALIGN-V1
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});
import { LoginModalProvider } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/common/LoginModal';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import { TemplateProvider } from '@o4o/ui';
import { templates } from '@o4o/shared-space-ui';
import { kcosmeticsConfig } from '@o4o/operator-ux-core';
import { KCosGlobalHeader } from '@/components/KCosGlobalHeader';

// Layouts (always needed)
import MainLayout from '@/components/layouts/MainLayout';
import { KCosmeticsHubLayout } from '@/components/layouts/KCosmeticsHubLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import OperatorLayoutWrapper from '@/components/layouts/OperatorLayoutWrapper';
import { RoleGuard, OperatorRoute } from '@/components/auth/RoleGuard';

// WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 매장 경영자용 매장 상품 관리 (공통 패키지)
import { StoreProductsManagerPage } from '@o4o/store-products-ui';

// Public Pages (always loaded - first paint)
import { HomePage, NotFoundPage } from '@/pages';
import LoginPage from '@/pages/auth/LoginPage';
import HandoffPage from '@/pages/HandoffPage';
import AccountRecoveryPage from '@/pages/auth/AccountRecoveryPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
// WO-O4O-AUTH-VERIFY-EMAIL-FRONTEND-PAGE-V1: 이메일 인증 결과 페이지
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// ============================================================================
// Lazy loaded pages (heavy / rarely accessed)
// ============================================================================

// WO-O4O-KCOS-MENU-CANONICAL-ALIGN-V1: 모바일 매장 경영 허브
const MobileStorePage = lazy(() => import('@/pages/mobile/MobileStorePage'));

// Public pages
const ContactPage = lazy(() => import('@/pages').then(m => ({ default: m.ContactPage })));
const RoleNotAvailablePage = lazy(() => import('@/pages').then(m => ({ default: m.RoleNotAvailablePage })));
const StoresPage = lazy(() => import('@/pages').then(m => ({ default: m.StoresPage })));
const ProductsPage = lazy(() => import('@/pages').then(m => ({ default: m.ProductsPage })));
const SupplyPage = lazy(() => import('@/pages').then(m => ({ default: m.SupplyPage })));
const TouristHubPage = lazy(() => import('@/pages').then(m => ({ default: m.TouristHubPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const PartnerInfoPage = lazy(() => import('@/pages/PartnerInfoPage'));
// MyPage 3-split (WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1)
const MyPageHub = lazy(() => import('@/pages/mypage/MyPageHub'));
const MyProfilePage = lazy(() => import('@/pages/mypage/MyProfilePage'));
const MySettingsPage = lazy(() => import('@/pages/mypage/MySettingsPage'));
// MyPage LMS (WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1)
const MyCreditsPage = lazy(() => import('@/pages/mypage/MyCreditsPage'));
const MyEnrollmentsPage = lazy(() => import('@/pages/mypage/MyEnrollmentsPage'));
const MyCertificatesPage = lazy(() => import('@/pages/mypage/MyCertificatesPage'));
// WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
const KcosMyRequestsPage = lazy(() => import('@/pages/mypage/MyRequestsPage'));

// Partner Application (WO-PARTNER-APPLICATION-V1)
const PartnerApplyPage = lazy(() => import('@/pages/partners/ApplyPage'));

// Hub (WO-O4O-EXPLORATION-HUB-REMOVAL-V1: StoreHubTemplate 기반)
// WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1: KCosmeticsHubLayout + nested routes
const KCosmeticsHubPage = lazy(() => import('@/pages/hub/KCosmeticsHubPage'));
const HubB2BPage = lazy(() => import('@/pages/hub/HubB2BPage').then(m => ({ default: m.HubB2BPage })));
const HubContentPage = lazy(() => import('@/pages/hub/HubContentPage').then(m => ({ default: m.HubContentPage })));
const HubSignagePage = lazy(() => import('@/pages/hub/HubSignagePage').then(m => ({ default: m.HubSignagePage })));
const HubEventOffersPage = lazy(() => import('@/pages/hub/HubEventOffersPage').then(m => ({ default: m.HubEventOffersPage })));
// WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1
const HubBlogLibraryPage = lazy(() => import('@/pages/hub/HubBlogLibraryPage').then(m => ({ default: m.HubBlogLibraryPage })));
// WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1: 매장 HUB POP/QR 가져가기 페이지
const HubPopLibraryPage = lazy(() => import('@/pages/hub/HubPopLibraryPage').then(m => ({ default: m.HubPopLibraryPage })));
const HubQrLibraryPage = lazy(() => import('@/pages/hub/HubQrLibraryPage').then(m => ({ default: m.HubQrLibraryPage })));

// Forum Pages
const ForumHubPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.ForumHubPage })));
const ForumPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.ForumPage })));
const PostDetailPage = lazy(() => import('@/pages/forum').then(m => ({ default: m.PostDetailPage })));
const ForumWritePage = lazy(() => import('@/pages/forum/ForumWritePage'));
// WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
const MyForumDashboardPage = lazy(() => import('@/pages/forum/MyForumDashboardPage'));
const ForumRequestCategoryPage = lazy(() => import('@/pages/forum/RequestCategoryPage'));
// WO-O4O-FORUM-MEMBER-MANAGEMENT-EXPANSION-FRONTEND-V1
const ForumMemberManagementPage = lazy(() => import('@/pages/forum/ForumMemberManagementPage'));

// LMS (WO-KCOS-KPA-LMS-STEP1-ENABLE-V1 / WO-KCOS-KPA-LMS-STEP3-LESSON-PLAYER-V1)
const EducationPage = lazy(() => import('@/pages/lms/EducationPage'));
const LmsCourseDetailPage = lazy(() => import('@/pages/lms/LmsCourseDetailPage'));
const LmsLessonPage = lazy(() => import('@/pages/lms/LmsLessonPage'));

// LMS Instructor (WO-KCOS-LMS-INSTRUCTOR-BOOTSTRAP-V1)
const InstructorDashboardPage = lazy(() => import('@/pages/instructor/InstructorDashboardPage'));
const InstructorCoursesPage = lazy(() => import('@/pages/instructor/InstructorCoursesPage'));

// Resources Hub (WO-KCOS-RESOURCES-HUB-IMPLEMENTATION-V1)
const ResourcesPage = lazy(() => import('@/pages/resources/ResourcesPage').then(m => ({ default: m.ResourcesPage })));


// Content Library (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1)
const ContentLibraryPage = lazy(() => import('@/pages/library/ContentLibraryPage'));
const ContentLibraryDetailPage = lazy(() => import('@/pages/library/ContentDetailPage'));

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
const ForcedContentPage = lazy(() => import('@/pages/operator/signage/ForcedContentPage'));

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, COSMETICS_STORE_CONFIG, resolveStoreMenu, StoreOwnerGuard } from '@o4o/store-ui-core';
import { useStoreCapabilities } from './hooks/useStoreCapabilities';

// Store Settings (WO-STORE-COMMON-SETTINGS-KCOS-UI-V1)
const StoreSettingsPage = lazy(() => import('@/pages/store/StoreSettingsPage'));
// WO-O4O-KCOSMETICS-STORE-PROFILE-EDIT-PAGE-V1
const StoreInfoPage = lazy(() => import('@/pages/store/StoreInfoPage'));

// WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1: Blog / POP / QR
const StoreBlogPage = lazy(() => import('@/pages/store/StoreBlogPage'));
const StoreBlogPostPage = lazy(() => import('@/pages/store/StoreBlogPostPage'));
const StoreBlogManagePage = lazy(() => import('@/pages/store/StoreBlogManagePage'));
const StorePopPage = lazy(() => import('@/pages/store/StorePopPage'));
const StoreQrPage = lazy(() => import('@/pages/store/StoreQrPage'));
// WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1: 내 자료함
const StoreLibraryContentsPage = lazy(() => import('@/pages/store/StoreLibraryContentsPage'));
const StoreLibraryResourcesPage = lazy(() => import('@/pages/store/StoreLibraryResourcesPage'));
// WO-O4O-STORE-PRODUCTION-MATERIALS-CROSSSERVICE-PHASE2-C-V1: 제작 자료
const StoreProductionMaterialsPage = lazy(() => import('@/pages/store/StoreProductionMaterialsPage'));
// WO-O4O-PRODUCTION-AI-EDITOR-CROSSSERVICE-PHASE2-I-V1: AI 제작 자료 편집
const ProductionMaterialEditorPage = lazy(() => import('@/pages/store/ProductionMaterialEditorPage'));
// WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1: 매장 상품 설명
const StoreProductDescriptionsPage = lazy(() => import('@/pages/store/StoreProductDescriptionsPage'));
// WO-O4O-PRODUCT-MARKETING-POP-BUILDER-EXTRACTION-V1: 상품 마케팅 자산 + POP 빌더
const ProductMarketingPage = lazy(() => import('@/pages/store/ProductMarketingPage').then(m => ({ default: m.ProductMarketingPage })));
const ProductPopBuilderPage = lazy(() => import('@/pages/store/ProductPopBuilderPage').then(m => ({ default: m.ProductPopBuilderPage })));
// WO-O4O-STORE-MARKETING-ANALYTICS-CROSSSERVICE-V1: 마케팅 분석
const StoreMarketingAnalyticsPage = lazy(() => import('@/pages/store/StoreMarketingAnalyticsPage').then(m => ({ default: m.StoreMarketingAnalyticsPage })));
// WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1: 매장 주문 관리
const StoreOrdersPage = lazy(() => import('@/pages/store/StoreOrdersPage'));
// WO-O4O-KCOSMETICS-STORE-REVENUE-SUMMARY-FRONTEND-V1: 매출 요약 (참고용)
const StoreRevenueSummaryPage = lazy(() => import('@/pages/store/StoreRevenueSummaryPage'));
// WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1
const StoreAssetsPage = lazy(() => import('@/pages/store/StoreAssetsPage'));

// Admin Dashboard (WO-O4O-KCOS-ADMIN-DASHBOARD-DEDICATED-V1)
const KCosmeticsAdminDashboard = lazy(() => import('@/pages/admin/KCosmeticsAdminDashboard'));

// Operator Dashboard Pages
const KCosmeticsOperatorDashboard = lazy(() => import('@/pages/operator/KCosmeticsOperatorDashboard'));
const OperatorStoresPage = lazy(() => import('@/pages/operator/StoresPage'));
const OperatorStoreDetailPage = lazy(() => import('@/pages/operator/StoreDetailPage'));
// WO-O4O-KCOSMETICS-OPERATOR-STORE-CHANNELS-V1
const OperatorStoreChannelsPage = lazy(() => import('@/pages/operator/store-channels/OperatorStoreChannelsPage'));
const OperatorApplicationsPage = lazy(() => import('@/pages/operator/ApplicationsPage'));
const OperatorProductsPage = lazy(() => import('@/pages/operator/ProductsPage'));
const OperatorProductDetailPage = lazy(() => import('@/pages/operator/ProductDetailPage'));
const OperatorOrdersPage = lazy(() => import('@/pages/operator/OrdersPage'));
// WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1
const OperatorEventOfferApprovalsPage = lazy(() => import('@/pages/operator/EventOfferApprovalsPage'));
const OperatorUsersPage = lazy(() => import('@/pages/operator/UsersPage'));
const OperatorUserDetailPage = lazy(() => import('@/pages/operator/UserDetailPage'));
// WO-O4O-KCOSMETICS-ADMIN-MEMBER-HARD-DELETE-V1
const KCosmeticsAdminMembersPage = lazy(() => import('@/pages/admin/KCosmeticsAdminMembersPage'));
const OperatorSettingsPage = lazy(() => import('@/pages/operator/SettingsPage'));
const OperatorRoleManagementPage = lazy(() => import('@/pages/operator/RoleManagementPage'));
const OperatorAiReportPage = lazy(() => import('@/pages/operator/AiReportPage'));
const StoreCockpitPage = lazy(() => import('@/pages/operator/StoreCockpitPage'));
// Operator Guide Contents (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1)
const OperatorGuideContentsPage = lazy(() => import('@/pages/operator/OperatorGuideContentsPage'));
// Operator Resources (WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1)
const OperatorResourcesPage = lazy(() => import('@/pages/operator/OperatorResourcesPage'));
// Operator Content Management (WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1)
const OperatorContentPage = lazy(() => import('@/pages/operator/OperatorContentPage'));
// WO-KCOS-OPERATOR-LMS-BOOTSTRAP-V1
const OperatorLmsCoursesPage = lazy(() => import('@/pages/operator/OperatorLmsCoursesPage'));

// WO-O4O-KCOSMETICS-OPERATOR-SURVEYS-V1
const OperatorSurveyListPage = lazy(() => import('@/pages/operator/survey/OperatorSurveyListPage'));
const OperatorSurveyCreatePage = lazy(() => import('@/pages/operator/survey/OperatorSurveyCreatePage'));

// WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
const OperatorBlogListPage = lazy(() => import('@/pages/operator/blog/OperatorBlogListPage'));
const OperatorBlogWritePage = lazy(() => import('@/pages/operator/blog/OperatorBlogWritePage'));
const OperatorPopListPage = lazy(() => import('@/pages/operator/pop/OperatorPopListPage'));
const OperatorPopWritePage = lazy(() => import('@/pages/operator/pop/OperatorPopWritePage'));
const OperatorQrListPage = lazy(() => import('@/pages/operator/qr/OperatorQrListPage'));
const OperatorQrWritePage = lazy(() => import('@/pages/operator/qr/OperatorQrWritePage'));

// Guide pages (shared components — WO-O4O-CROSSSERVICE-HOME-LATEST-AND-GUIDE-ALIGNMENT-V1)
import {
  GuideIntroPage,
  GuideIntroStructurePage,
  GuideIntroKpaPage,
  GuideIntroOperationPage,
  GuideIntroConceptPage,
  GuideUsagePage,
  GuideFeaturesPage,
  GuideFeatureManualPage,
  kCosmeticsGuideIntroProps,
  kCosmeticsGuideIntroStructureProps,
  kCosmeticsGuideIntroKpaProps,
  kCosmeticsGuideIntroOperationProps,
  kCosmeticsGuideIntroConceptProps,
  kCosmeticsGuideUsageProps,
  kCosmeticsGuideFeaturesProps,
  kCosmeticsGuideFeatureForumProps,
  kCosmeticsGuideFeatureLmsProps,
  kCosmeticsGuideFeatureContentProps,
  kCosmeticsGuideFeatureResourcesProps,
  kCosmeticsGuideFeatureSignageProps,
} from '@o4o/shared-space-ui';

// WO-O4O-FORUM-OPERATOR-UNIFICATION-V1
const ForumRequestsPage = lazy(() => import('@/pages/operator/ForumRequestsPage'));
const ForumDeleteRequestsPage = lazy(() => import('@/pages/operator/ForumDeleteRequestsPage'));
// WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1
const ForumAnalyticsPage = lazy(() => import('@/pages/operator/ForumAnalyticsPage'));

// Store Channel Management (WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1)
const StoreChannelsPage = lazy(() => import('@/pages/store/StoreChannelsPage'));
// WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1
const StoreSignagePage = lazy(() => import('@/pages/store/StoreSignagePage'));
// WO-O4O-KCOSMETICS-SIGNAGE-PLAYER-V1
const SignagePlayerSelectPage = lazy(() => import('@/pages/store/signage/SignagePlayerSelectPage').then(m => ({ default: m.SignagePlayerSelectPage })));
const SignagePlaybackPage = lazy(() => import('@/pages/store/signage/SignagePlaybackPage'));

// WO-O4O-STORE-LOCAL-PRODUCT-UI-V1: 자체 상품 CRUD + 태블릿 진열 관리
const StoreLocalProductsPage = lazy(() => import('@/pages/store/StoreLocalProductsPage'));
const StoreTabletDisplaysPage = lazy(() => import('@/pages/store/StoreTabletDisplaysPage'));

// WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1: Tablet 키오스크 + Interest 관리
const TabletStorePage = lazy(() => import('@/pages/tablet/TabletStorePage'));
const InterestRequestsPage = lazy(() => import('@/pages/store/InterestRequestsPage'));

/**
 * ParamRedirect — :param이 포함된 redirect alias 처리
 * WO-O4O-KCOSMETICS-SIGNAGE-PLAYER-V1: flat signage/play/:playlistId → canonical 경로 보존
 * Usage: <ParamRedirect to="/store/marketing/signage/play/:playlistId" />
 */
function ParamRedirect({ to }: { to: string }) {
  const params = useParams<Record<string, string>>();
  const target = to.replace(/:(\w+)/g, (_, key) => params[key] ?? '');
  return <Navigate to={target} replace />;
}

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
 * StoreOwnerRoute — K-Cosmetics /store 진입 가드
 * WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-GUARD-ALIGNMENT-V1:
 *   기존 inline ProtectedRoute(allowedRoles=[...role-only...]) → 공통 StoreOwnerGuard.
 *   GlycoPharm canonical 의 3-way OR (role / membership / operator-or-above) 흡수.
 *   K-Cosmetics 는 membership-based store_owner SSOT 미보유 — 현재는 role/operator 분기로만 통과되며,
 *   향후 cosmetics 도 membership SSOT 도입 시 StoreOwnerGuard 의 cfg.membershipStoreOwnerRole 만 활성화하면 됨.
 */
function StoreOwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  return (
    <StoreOwnerGuard
      serviceKey="cosmetics"
      user={user}
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
    >
      {children}
    </StoreOwnerGuard>
  );
}

// WO-K-COSMETICS-ROLEBASED-HOME-REMOVAL-V1:
// RoleBasedHome 제거 — "/" 는 항상 사이트 홈 (역할 기반 자동 redirect 없음)
// 역할별 대시보드 이동은 Header 사용자 드롭다운 "대시보드" 링크로만 제공 (KCosGlobalHeader.tsx)

/** Store Dashboard Layout Wrapper - connects auth context to shared layout */
function StoreLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const enabledCaps = useStoreCapabilities();
  const resolvedConfig = resolveStoreMenu(COSMETICS_STORE_CONFIG, enabledCaps);

  return (
    <div className="min-h-screen flex flex-col">
      <KCosGlobalHeader />
      <StoreDashboardLayout
        config={resolvedConfig}
        userName={user?.name || user?.email || ''}
        homeLink="/"
        onLogout={() => { logout(); navigate('/'); }}
        hideTopBar
      />
    </div>
  );
}

/**
 * PostLoginRedirect — 로그인 이후 역할 기반 redirect
 *
 * WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1
 *
 * canonical 패턴 (KPA reference implementation 기반):
 * - 로그인 직후 1회만 실행 (wasAuthRef + didRedirectRef 이중 가드)
 * - / 또는 /login 에서만 redirect (기존 LoginModal '/' 가드 정책 유지)
 * - returnUrl은 LoginPage에서 처리 (먼저 navigate하면 path가 변경되어 자동 bail)
 * - workspace 경로 진입 시 early-exit
 */
function PostLoginRedirect() {
  const { user, isAuthenticated, isSessionChecked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wasAuthRef = useRef(isAuthenticated);
  const didRedirectRef = useRef(false);

  useEffect(() => {
    const justLoggedIn = !wasAuthRef.current && isAuthenticated;
    wasAuthRef.current = isAuthenticated;

    if (!isAuthenticated) { didRedirectRef.current = false; return; }
    if (!justLoggedIn && !didRedirectRef.current) return;
    if (!isSessionChecked || !user) return;
    if (didRedirectRef.current) return;

    // '/' 또는 '/login'에서만 redirect — 기존 LoginModal 가드 정책 유지
    if (location.pathname !== '/' && location.pathname !== '/login') {
      didRedirectRef.current = true; return;
    }

    // workspace 경로 early-exit
    const WORKSPACE_PREFIXES = ['/store', '/operator', '/admin', '/partner', '/instructor'];
    if (WORKSPACE_PREFIXES.some(p => location.pathname.startsWith(p))) {
      didRedirectRef.current = true; return;
    }

    const target = getKCosmeticsDashboardRoute(user.roles ?? []);
    didRedirectRef.current = true;
    if (target && target !== '/') navigate(target, { replace: true });
  }, [isAuthenticated, isSessionChecked, user, navigate, location.pathname]);

  return null;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="handoff" element={<HandoffPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<AccountRecoveryPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="auth/verify-email" element={<VerifyEmailPage />} />
        <Route path="contact" element={<ContactPage />} />
        {/* WO-O4O-KCOS-MENU-CANONICAL-ALIGN-V1: 모바일 매장 경영 허브 */}
        <Route path="mobile/store" element={<MobileStorePage />} />
        <Route path="partners" element={<PartnerInfoPage />} />
        <Route path="partners/apply" element={<PartnerApplyPage />} />

        {/* Resources Hub (WO-KCOS-RESOURCES-HUB-IMPLEMENTATION-V1) */}
        <Route path="resources" element={<ResourcesPage />} />

        {/* WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1 */}
        <Route path="library/content" element={<ContentLibraryPage />} />
        <Route path="library/content/:id" element={<ContentLibraryDetailPage />} />

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
        {/* WO-O4O-FORUM-MY-FORUM-EXPANSION-V1 */}
        <Route
          path="forum/my-dashboard"
          element={
            <ProtectedRoute>
              <MyForumDashboardPage />
            </ProtectedRoute>
          }
        />
        {/* WO-O4O-FORUM-MEMBER-MANAGEMENT-EXPANSION-FRONTEND-V1 */}
        <Route
          path="forum/my-dashboard/:forumId/members"
          element={
            <ProtectedRoute>
              <ForumMemberManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="forum/request-category"
          element={
            <ProtectedRoute>
              <ForumRequestCategoryPage />
            </ProtectedRoute>
          }
        />

        {/* LMS (WO-KCOS-KPA-LMS-STEP1-ENABLE-V1 / WO-KCOS-KPA-LMS-STEP3-LESSON-PLAYER-V1) */}
        <Route path="lms" element={<EducationPage />} />
        <Route path="lms/course/:id" element={<LmsCourseDetailPage />} />
        <Route path="lms/course/:courseId/lesson/:lessonId" element={<LmsLessonPage />} />

        {/* LMS Instructor (WO-KCOS-LMS-INSTRUCTOR-BOOTSTRAP-V1)
            진입은 lms:instructor / cosmetics:admin / platform:super_admin.
            백엔드 requireInstructor 가 실제 권한을 검증하므로 가드는 정책상 일관성을 위한 1차 차단. */}
        <Route
          path="instructor"
          element={
            <ProtectedRoute allowedRoles={['lms:instructor', 'cosmetics:admin', 'platform:super_admin']}>
              <InstructorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="instructor/courses"
          element={
            <ProtectedRoute allowedRoles={['lms:instructor', 'cosmetics:admin', 'platform:super_admin']}>
              <InstructorCoursesPage />
            </ProtectedRoute>
          }
        />

        {/* MyPage 3-split (WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1) */}
        <Route
          path="mypage"
          element={
            <ProtectedRoute>
              <MyPageHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="mypage/profile"
          element={
            <ProtectedRoute>
              <MyProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="mypage/settings"
          element={
            <ProtectedRoute>
              <MySettingsPage />
            </ProtectedRoute>
          }
        />
        {/* MyPage LMS (WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1) */}
        <Route
          path="mypage/credits"
          element={
            <ProtectedRoute>
              <MyCreditsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="mypage/enrollments"
          element={
            <ProtectedRoute>
              <MyEnrollmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="mypage/certificates"
          element={
            <ProtectedRoute>
              <MyCertificatesPage />
            </ProtectedRoute>
          }
        />
        {/* WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1 */}
        <Route
          path="mypage/my-requests"
          element={
            <ProtectedRoute>
              <KcosMyRequestsPage />
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

        {/* Hub (WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1: KCosmeticsHubLayout + nested routes) */}
        {/* WO-O4O-HUB-TO-STORE-HUB-RENAMING-V1: /hub → /store-hub canonical */}
        {/* WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1: RoleGuard 접근 보호 추가 */}
        <Route
          path="store-hub"
          element={
            <RoleGuard allowedRoles={['cosmetics:store_owner', 'cosmetics:operator', 'cosmetics:admin', 'platform:super_admin']}>
              <KCosmeticsHubLayout />
            </RoleGuard>
          }
        >
          <Route index element={<KCosmeticsHubPage />} />
          <Route path="b2b" element={<HubB2BPage />} />
          <Route path="content" element={<HubContentPage />} />
          <Route path="signage" element={<HubSignagePage />} />
          {/* WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1: 블로그 탭 추가 */}
          <Route path="blog" element={<HubBlogLibraryPage />} />
          {/* WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1: POP/QR 가져가기 (KPA/GlycoPharm canonical) */}
          <Route path="pop" element={<HubPopLibraryPage />} />
          <Route path="qr" element={<HubQrLibraryPage />} />
          <Route path="event-offers" element={<HubEventOffersPage />} />
        </Route>

        {/* Services Routes */}
        <Route path="services/tourists" element={<TouristHubPage />} />

        {/* Guide pages — WO-O4O-CROSSSERVICE-HOME-LATEST-AND-GUIDE-ALIGNMENT-V1 */}
        <Route path="guide/intro" element={<GuideIntroPage {...kCosmeticsGuideIntroProps} />} />
        <Route path="guide/intro/structure" element={<GuideIntroStructurePage {...kCosmeticsGuideIntroStructureProps} />} />
        <Route path="guide/intro/kpa" element={<GuideIntroKpaPage {...kCosmeticsGuideIntroKpaProps} />} />
        <Route path="guide/intro/operation" element={<GuideIntroOperationPage {...kCosmeticsGuideIntroOperationProps} />} />
        <Route path="guide/intro/concept" element={<GuideIntroConceptPage {...kCosmeticsGuideIntroConceptProps} />} />
        <Route path="guide/usage" element={<GuideUsagePage {...kCosmeticsGuideUsageProps} />} />
        <Route path="guide/features" element={<GuideFeaturesPage {...kCosmeticsGuideFeaturesProps} />} />
        <Route path="guide/features/forum" element={<GuideFeatureManualPage {...kCosmeticsGuideFeatureForumProps} />} />
        <Route path="guide/features/lms" element={<GuideFeatureManualPage {...kCosmeticsGuideFeatureLmsProps} />} />
        <Route path="guide/features/content" element={<GuideFeatureManualPage {...kCosmeticsGuideFeatureContentProps} />} />
        <Route path="guide/features/resources" element={<GuideFeatureManualPage {...kCosmeticsGuideFeatureResourcesProps} />} />
        <Route path="guide/features/signage" element={<GuideFeatureManualPage {...kCosmeticsGuideFeatureSignageProps} />} />
      </Route>

      {/* Admin Dashboard (WO-K-COSMETICS-ADMIN-AREA-V1: 구조 관리 영역 신설) */}
      <Route
        path="admin"
        element={
          <ProtectedRoute allowedRoles={['cosmetics:admin', 'platform:super_admin']}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        {/* WO-O4O-KCOS-ADMIN-DASHBOARD-DEDICATED-V1: Operator 재사용 → Admin 전용 뷰 분리 */}
        <Route index element={<KCosmeticsAdminDashboard />} />
        <Route path="stores" element={<OperatorStoresPage />} />
        <Route path="stores/:storeId" element={<OperatorStoreDetailPage />} />
        {/* 회원 관리 — admin 전용 완전삭제 포함 (WO-O4O-KCOSMETICS-ADMIN-MEMBER-HARD-DELETE-V1) */}
        <Route path="members" element={<KCosmeticsAdminMembersPage />} />
        <Route path="members/:id" element={<OperatorUserDetailPage />} />
        {/* legacy /admin/users redirect */}
        <Route path="users" element={<Navigate to="/admin/members" replace />} />
        <Route path="users/:id" element={<Navigate to="/admin/members" replace />} />
        <Route path="settings" element={<OperatorSettingsPage />} />
        {/* 역할 관리 (WO-O4O-ROLE-MANAGEMENT-UI-V1) */}
        <Route path="roles" element={<OperatorRoleManagementPage />} />
      </Route>

      {/* Operator Dashboard */}
      <Route
        path="operator"
        element={
          <OperatorRoute>
            <OperatorLayoutWrapper />
          </OperatorRoute>
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
        {/* 채널 관리 (WO-O4O-KCOSMETICS-OPERATOR-STORE-CHANNELS-V1) */}
        <Route path="store-channels" element={<OperatorStoreChannelsPage />} />
        <Route path="orders" element={<OperatorOrdersPage />} />
        {/* WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1: 이벤트 오퍼 승인 */}
        <Route path="event-offers" element={<OperatorEventOfferApprovalsPage />} />
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
        <Route path="signage/forced-content" element={<ForcedContentPage />} />
        {/* WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: support route removed (mock) */}
        {/* 회원 관리 — canonical route (WO-O4O-K-COSMETICS-OPERATOR-ROUTE-CANONICALIZATION-V1) */}
        <Route path="members" element={<OperatorUsersPage />} />
        <Route path="members/:id" element={<OperatorUserDetailPage />} />
        {/* legacy redirect (WO-O4O-MEMBERSHIP-CONSOLE-V1) */}
        <Route path="users" element={<Navigate to="/operator/members" replace />} />
        <Route path="users/:id" element={<Navigate to="/operator/members" replace />} />
        {/* AI Report (WO-AI-SERVICE-OPERATOR-REPORT-V1) */}
        <Route path="ai-report" element={<OperatorAiReportPage />} />
        {/* Store Cockpit (WO-KCOS-STORES-PHASE3-STORE-COCKPIT-V1) */}
        <Route path="store-cockpit" element={<StoreCockpitPage />} />
        {/* WO-O4O-FORUM-OPERATOR-UNIFICATION-V1 */}
        <Route path="forum-requests" element={<ForumRequestsPage />} />
        <Route path="forum-delete-requests" element={<ForumDeleteRequestsPage />} />
        {/* WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1 */}
        <Route path="forum-analytics" element={<ForumAnalyticsPage />} />
        {/* Guide Contents (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1) */}
        <Route path="guide-contents" element={<OperatorGuideContentsPage />} />
        {/* Resources (WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1) */}
        <Route path="resources" element={<OperatorResourcesPage />} />
        {/* Content Management 공지/뉴스 (WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1) */}
        <Route path="content-management" element={<OperatorContentPage />} />
        {/* LMS 강의 관리 (WO-KCOS-OPERATOR-LMS-BOOTSTRAP-V1) */}
        <Route path="lms" element={<OperatorLmsCoursesPage />} />
        {/* 설문조사 관리 (WO-O4O-KCOSMETICS-OPERATOR-SURVEYS-V1) */}
        <Route path="surveys" element={<OperatorSurveyListPage />} />
        <Route path="surveys/new" element={<OperatorSurveyCreatePage />} />
        {/* 매장 HUB Blog / POP / QR (WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1) */}
        <Route path="blog" element={<OperatorBlogListPage />} />
        <Route path="blog/new" element={<OperatorBlogWritePage />} />
        <Route path="blog/:id/edit" element={<OperatorBlogWritePage />} />
        <Route path="pop" element={<OperatorPopListPage />} />
        <Route path="pop/new" element={<OperatorPopWritePage />} />
        <Route path="pop/:id/edit" element={<OperatorPopWritePage />} />
        <Route path="qr" element={<OperatorQrListPage />} />
        <Route path="qr/new" element={<OperatorQrWritePage />} />
        <Route path="qr/:id/edit" element={<OperatorQrWritePage />} />
      </Route>

      {/* Store Owner Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
          WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-GUARD-ALIGNMENT-V1:
            inline ProtectedRoute(allowedRoles=[...role-only]) → 공통 StoreOwnerGuard wrapper. */}
      <Route
        path="store"
        element={
          <StoreOwnerRoute>
            <StoreLayoutWrapper />
          </StoreOwnerRoute>
        }
      >
        <Route index element={<StoreCockpitPage />} />
        {/* WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 내 매장 상품 (ProductMaster + Listing).
            상위 ProtectedRoute 가 cosmetics:store_owner 포함 게이트. */}
        <Route path="my-products" element={<StoreProductsManagerPage />} />
        {/* channels: 채널 관리 (WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1) */}
        <Route path="channels" element={<StoreChannelsPage />} />
        {/* WO-O4O-KCOSMETICS-STORE-PATH-NESTED-MIGRATION-V1:
              KPA canonical 정합 — nested canonical routes (commerce/* · marketing/*) 가 실제 page 를 렌더한다.
              flat path 는 본 블록 하단의 redirect alias 그룹에서 nested canonical 으로 redirect.
            WO-O4O-MY-STORE-SIGNAGE-SUBMENU-ALIGNMENT-V1: KPA/GP 기준 서브메뉴 정렬 (player 미구현 제외) */}
        <Route path="commerce/local-products" element={<StoreLocalProductsPage />} />
        <Route path="commerce/tablet-displays" element={<StoreTabletDisplaysPage />} />
        <Route path="commerce/orders" element={<StoreOrdersPage />} />
        <Route path="commerce/billing" element={<StoreRevenueSummaryPage />} />
        <Route path="marketing/signage" element={<Navigate to="playlist" replace />} />
        <Route path="marketing/signage/playlist" element={<StoreSignagePage />} />
        <Route path="marketing/signage/videos" element={<StoreSignagePage />} />
        <Route path="marketing/signage/schedules" element={<StoreSignagePage />} />
        {/* WO-O4O-KCOSMETICS-SIGNAGE-PLAYER-V1: TV 재생 (player select + fullscreen playback) */}
        <Route path="marketing/signage/player" element={<SignagePlayerSelectPage />} />
        <Route path="marketing/signage/play/:playlistId" element={<SignagePlaybackPage />} />
        {/* WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1: placeholder → StoreAssetsPanel */}
        <Route path="content" element={<StoreAssetsPage />} />
        {/* Interest 관리 (WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1) */}
        <Route path="interest-requests" element={<InterestRequestsPage />} />
        <Route path="settings" element={<StoreSettingsPage />} />
        {/* WO-O4O-KCOSMETICS-STORE-PROFILE-EDIT-PAGE-V1:
              매장 경영자 (store_owner) 만 접근 — 매장·사업자 정보 조회·수정 */}
        <Route
          path="info"
          element={
            <RoleGuard
              allowedRoles={['cosmetics:store_owner', 'cosmetics:admin', 'platform:super_admin']}
            >
              <StoreInfoPage />
            </RoleGuard>
          }
        />
        {/* WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1: Blog / POP / QR */}
        <Route path="content/blog" element={<StoreBlogManagePage />} />
        {/* WO-O4O-KCOSMETICS-STORE-PATH-NESTED-MIGRATION-V1: POP/QR nested canonical (marketing/*) */}
        <Route path="marketing/pop" element={<StorePopPage />} />
        <Route path="marketing/qr" element={<StoreQrPage />} />
        {/* 마케팅 분석 (WO-O4O-STORE-MARKETING-ANALYTICS-CROSSSERVICE-V1) */}
        <Route path="analytics/marketing" element={<StoreMarketingAnalyticsPage />} />
        {/* 내 자료함 (WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1 / PHASE2-C-V1) */}
        <Route path="library/contents" element={<StoreLibraryContentsPage />} />
        <Route path="library/resources" element={<StoreLibraryResourcesPage />} />
        <Route path="library/production-materials" element={<StoreProductionMaterialsPage />} />
        <Route path="library/production-materials/new" element={<ProductionMaterialEditorPage />} />
        {/* WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1: 매장 상품 설명 */}
        <Route path="library/product-descriptions" element={<StoreProductDescriptionsPage />} />
        {/* WO-O4O-PRODUCT-MARKETING-POP-BUILDER-EXTRACTION-V1: 상품별 마케팅 자산 + POP 빌더 */}
        <Route path="commerce/products/:productId/marketing" element={<ProductMarketingPage />} />
        <Route path="commerce/products/:productId/pop" element={<ProductPopBuilderPage />} />
        {/* WO-O4O-KCOSMETICS-STORE-PATH-NESTED-MIGRATION-V1:
              Legacy flat paths → nested canonical redirect aliases.
              북마크 / 외부 링크 호환을 위해 유지. 신규 코드는 nested canonical 을 사용한다. */}
        <Route path="local-products"   element={<Navigate to="/store/commerce/local-products" replace />} />
        <Route path="tablet-displays"  element={<Navigate to="/store/commerce/tablet-displays" replace />} />
        <Route path="orders"           element={<Navigate to="/store/commerce/orders" replace />} />
        <Route path="billing"          element={<Navigate to="/store/commerce/billing" replace />} />
        <Route path="signage"          element={<Navigate to="/store/marketing/signage/playlist" replace />} />
        <Route path="signage/playlist" element={<Navigate to="/store/marketing/signage/playlist" replace />} />
        <Route path="signage/videos"   element={<Navigate to="/store/marketing/signage/videos" replace />} />
        <Route path="signage/schedules" element={<Navigate to="/store/marketing/signage/schedules" replace />} />
        <Route path="signage/player"   element={<Navigate to="/store/marketing/signage/player" replace />} />
        <Route path="signage/play/:playlistId" element={<ParamRedirect to="/store/marketing/signage/play/:playlistId" />} />
        <Route path="pop"              element={<Navigate to="/store/marketing/pop" replace />} />
        <Route path="qr"               element={<Navigate to="/store/marketing/qr" replace />} />
      </Route>

      {/* Store public blog routes (WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1)
          WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1: 공개 사용자-facing 페이지 →
          MainLayout(헤더+Footer)으로 감싸 플랫폼 정보/지원 연락처 노출 */}
      <Route element={<MainLayout />}>
        <Route path="store/:slug/blog" element={<StoreBlogPage />} />
        <Route path="store/:slug/blog/:postSlug" element={<StoreBlogPostPage />} />
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
    <QueryClientProvider client={queryClient}>
    <O4OErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LoginModalProvider>
            <O4OToastProvider />
            <LoginModal />
            {/* WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1: 역할 기반 redirect 단일화 */}
            <PostLoginRedirect />
            {/* WO-O4O-REFERENCE-DESIGN-IMPORT-V1: TemplateProvider 추가 */}
            <TemplateProvider template={templates[kcosmeticsConfig.template]}>
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
