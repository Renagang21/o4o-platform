import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout, DemoLayout } from './components';
import { AuthProvider, OrganizationProvider } from './contexts';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import { ServiceProvider } from './contexts/ServiceContext';
import { useAuth } from './contexts/AuthContext';
import { getPharmacyInfo } from './api/pharmacyInfo';
import { LoginModalProvider, useAuthModal } from './contexts/LoginModalContext';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import { DashboardPage } from './pages/DashboardPage';
import HandoffPage from './pages/HandoffPage';
import AccountRecoveryPage from './pages/auth/AccountRecoveryPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Forum pages
import { ForumHomePage, ForumListPage, ForumDetailPage, ForumWritePage } from './pages/forum';

// Market Trial — WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
// 실행은 Neture 단독. KPA는 entry → Neture redirect 만 유지.
import { MarketTrialNetureRedirect } from './components/MarketTrialNetureRedirect';

// LMS pages
import { EducationPage, LmsCoursesPage, LmsCourseDetailPage, LmsLessonPage, LmsCertificatesPage } from './pages/lms';
// Certificate Verification (WO-O4O-LMS-CERTIFICATE-VERIFICATION-V1) — public, no auth
import CertificateVerifyPage from './pages/lms/CertificateVerifyPage';

// Course pages (Public-facing) - WO-CONTENT-COURSE-HUB/INTRO
import { CourseHubPage, CourseIntroPage } from './pages/courses';

// Instructor pages - WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1
import { InstructorProfilePage } from './pages/instructors/InstructorProfilePage';
// Instructor Dashboard - WO-O4O-INSTRUCTOR-DASHBOARD-V1
import InstructorDashboardPage from './pages/instructor/InstructorDashboardPage';
// LMS Instructor pages - WO-O4O-LMS-FOUNDATION-V1
import CourseListPage from './pages/instructor/courses/CourseListPage';
import CourseNewPage from './pages/instructor/courses/CourseNewPage';
import CourseEditPage from './pages/instructor/courses/CourseEditPage';
// Instructor Course Dashboard - WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1
import InstructorCourseDashboardPage from './pages/instructor/InstructorCourseDashboardPage';
// Content Participants Page - WO-O4O-MARKETING-CONTENT-OPERATIONS-MVP-V1
import ContentParticipantsPage from './pages/instructor/ContentParticipantsPage';

// Events pages (WO-KPA-COMMUNITY-HOME-V1)
import { EventsHomePage } from './pages/events/EventsHomePage';

// Organization Service page (WO-KPA-COMMUNITY-HOME-V1)
import { OrganizationServicePage } from './pages/OrganizationServicePage';

// Participation pages (WO-KPA-PARTICIPATION-APP-V1)
import {
  ParticipationListPage,
  ParticipationCreatePage,
  ParticipationRespondPage,
  ParticipationResultPage,
  QuestionType,
} from './pages/participation';

// Event Offer pages
import { EventOfferListPage, EventOfferDetailPage, EventOfferHistoryPage, KpaEventOfferPage } from './pages/event-offer';
// Supplier pages
import { SupplierEventOfferPage } from './pages/supplier/SupplierEventOfferPage';

// News pages
import { NewsListPage, NewsDetailPage, GalleryPage } from './pages/news';

// Signage pages
import ContentHubPage from './pages/signage/ContentHubPage';
import PlaylistEditorPage from './pages/signage/PlaylistEditorPage';
import PlaylistDetailPage from './pages/signage/PlaylistDetailPage';
import MediaDetailPage from './pages/signage/MediaDetailPage';
import PublicSignagePage from './pages/signage/PublicSignagePage';

// Legal pages (WO-KPA-LEGAL-PAGES-V1)
import { PolicyPage, PrivacyPage } from './pages/legal';

// Organization pages
import { OrganizationAboutPage, OfficersPage, ContactPage } from './pages/organization';

// MyPage pages
import { MyDashboardPage, MyProfilePage, MySettingsPage, MyCertificatesPage, PersonalStatusReportPage, AnnualReportFormPage, MyForumDashboardPage, RequestCategoryPage as KpaRequestCategoryPage, MyRequestsPage, ForumMemberManagementPage, MyQualificationsPage, MyEnrollmentsPage, MyCreditsPage } from './pages/mypage';

// Admin Routes (지부 관리자)
import { AdminRoutes } from './routes/AdminRoutes';

// Operator Routes (서비스 운영자)
import { OperatorRoutes } from './routes/OperatorRoutes';
// Resources Hub (공동자료실 진입 허브 — WO-KPA-RESOURCE-SYSTEM-RESET-V1)
import { ResourcesHubPage } from './pages/resources/ResourcesHubPage';
import { ResourceWritePage } from './pages/resources/ResourceWritePage';


// Intranet Routes (인트라넷)
import { IntranetRoutes } from './routes/IntranetRoutes';

// Login & Register pages - legacy imports (페이지는 제거, 모달로 대체)
// WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1
import RegisterPendingPage from './pages/auth/RegisterPendingPage';

// Manual Pages (WO-KPA-A-MANUAL-MAIN-PAGE-V1)


// Community Home (WO-KPA-COMMUNITY-HOME-V1)
import { CommunityHomePage } from './pages/CommunityHomePage';

// Community Hub — /community는 Home으로 리다이렉트 (WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1)

// Service Detail Pages (WO-KPA-HOME-SERVICE-SECTION-V1)
import { PharmacyServicePage, ForumServicePage, LmsServicePage } from './pages/services';

// Join/Participation Pages (WO-KPA-HOME-SERVICE-SECTION-V1)
import { PharmacyJoinPage } from './pages/join';

// Pharmacy Management (WO-KPA-PHARMACY-MANAGEMENT-V1, WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1)
import { PharmacyPage, PharmacyB2BPage, PharmacyStorePage, PharmacyApprovalGatePage, HubContentLibraryPage, HubB2BCatalogPage, HubSignageLibraryPage, PharmacySellPage, StoreAssetsPage, StoreContentEditPage, TabletRequestsPage, PharmacyBlogPage, PharmacyTemplatePage, StoreChannelsPage, StoreOrdersPage, StoreBillingPage, StoreSignagePage, StoreQRPage, StorePopPage, MarketingAnalyticsPage, StoreHomePage, ProductMarketingPage, StoreLocalProductsPage, StoreTabletDisplaysPage } from './pages/pharmacy';
import { StoreOrderWorktablePage } from './pages/pharmacy/StoreOrderWorktablePage';
import { SignagePlaybackPage } from './pages/pharmacy/SignagePlaybackPage';
import { SignagePlayerSelectPage } from './pages/pharmacy/SignagePlayerSelectPage';
// WO-KPA-PHARMACY-HUB-SIDEBAR-LAYOUT-AND-PRODUCT-TABS-FIX-V1: 약국 HUB 사이드바 레이아웃
import { PharmacyHubLayout } from './components/pharmacy/PharmacyHubLayout';
// WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1: PharmacyInfoPage + HubGuard
import { PharmacyInfoPage } from './pages/pharmacy/PharmacyInfoPage';
// WO-O4O-KPA-STORE-HUB-CANONICAL-REFINEMENT-V1: 매장 운영 허브 인덱스
import { StoreHubPage } from './pages/pharmacy/StoreHubPage';

// WO-PHARMACY-MANAGEMENT-CONSOLIDATION-V1 Phase 2: Store Core v1.0 통합
import { StoreDashboardLayout, KPA_SOCIETY_STORE_CONFIG } from '@o4o/store-ui-core';
import { KpaGlobalHeader } from './components/KpaGlobalHeader';
import { SupplierListPage, SupplierDetailPage } from './pages/pharmacy/b2b';

// Work Pages (WO-KPA-WORK-IMPLEMENT-V1) - 근무약사 전용 업무 화면
import { WorkPage, WorkTasksPage, WorkLearningPage, WorkDisplayPage, WorkCommunityPage } from './pages/work';

// WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1: 상태 기반 AuthGate
import { AuthGate } from './components/auth/AuthGate';
import { ActivitySetupPage } from './pages/ActivitySetupPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';

// User Dashboard (WO-KPA-SOCIETY-PHASE4-DASHBOARD-IMPLEMENTATION-V1)
// WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1: UserDashboardPage 제거 (/dashboard → /mypage 리다이렉트)
import { MyContentPage } from './pages/dashboard';

// WO-KPA-A-ROLE-BASED-REDIRECT-V1
import { getDefaultRouteByRole } from './lib/auth-utils';

// WO-O4O-GUARD-PATTERN-NORMALIZATION-V1: 통일된 Guard 인터페이스
import { PharmacyGuard } from './components/auth/PharmacyGuard';
import { PharmacyOwnerOnlyGuard } from './components/auth/PharmacyOwnerOnlyGuard';
// WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1: HUB용 완화 가드
import { HubGuard } from './components/auth/HubGuard';

// Tablet Kiosk (WO-STORE-TABLET-REQUEST-CHANNEL-V1)
import { TabletStorePage } from './pages/tablet/TabletStorePage';

// Store Blog (WO-STORE-BLOG-CHANNEL-V1)
import { StoreBlogPage } from './pages/store/StoreBlogPage';
import { StoreBlogPostPage } from './pages/store/StoreBlogPostPage';

// Store Home (WO-STORE-TEMPLATE-PROFILE-V1)
import { StorefrontHomePage } from './pages/store/StorefrontHomePage';

// WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1: Storefront Commerce Pages
import { StorefrontProductDetailPage } from './pages/storefront/StorefrontProductDetailPage';
import { CheckoutPage } from './pages/storefront/CheckoutPage';
import { PaymentSuccessPage } from './pages/storefront/PaymentSuccessPage';
import { PaymentFailPage } from './pages/storefront/PaymentFailPage';

// Public Content View (WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1)
import { PublicContentViewPage, PrintContentPage } from './pages/content';

// Contents Hub (WO-KPA-CONTENT-HUB-FOUNDATION-V1 / WO-CONTENT-HUB-STRUCTURE-AND-TABLE-FOUNDATION-V1)
import { ContentListPage, ContentDetailPage, ContentWritePage, ContentTypeSelectPage } from './pages/contents';

// QR Landing Page (WO-O4O-QR-LANDING-PAGE-V1)
import QrLandingPage from './pages/qr/QrLandingPage';

// Legacy pages (for backward compatibility)
import {
  MemberApplyPage,
  MyApplicationsPage,
} from './pages';

/**
 * KPA Society - 약사회 SaaS
 *
 * WO-KPA-DEMO-ROUTE-ISOLATION-V1
 * - 기존 약사회 서비스 전체를 /demo 하위로 이동
 * - / 경로는 플랫폼 홈용으로 비워둠
 * - 기존 서비스 코드 변경 없이 라우팅만 이동
 */

const SERVICE_NAME = 'KPA-Society';

// ServiceUserProtectedRoute removed — WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1
// Service User 인증 제거, Platform User 단일 인증으로 통합

/**
 * WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1
 * /login, /register URL 접근 시 홈으로 리다이렉트 + 모달 오픈
 */
function LoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { openLoginModal, setOnLoginSuccess } = useAuthModal();

  useEffect(() => {
    // WO-KPA-A-AUTH-LOOP-GUARD-STABILIZATION-V1:
    // 항상 / (공개 페이지)로 이동 — 가드된 경로로 직접 이동하면 Guard→/login→Guard 무한 루프 발생
    navigate('/', { replace: true });

    // from/returnTo는 로그인 성공 후에만 사용
    const returnTo = searchParams.get('returnTo') ||
                     (location.state as { from?: string })?.from;
    if (returnTo) {
      setOnLoginSuccess(() => {
        navigate(returnTo);
      });
    }

    openLoginModal();
  }, [navigate, openLoginModal, location.state, searchParams, setOnLoginSuccess]);

  return null;
}

function RegisterRedirect() {
  const navigate = useNavigate();
  const { openRegisterModal } = useAuthModal();

  useEffect(() => {
    // WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1
    navigate('/mypage', { replace: true });
    openRegisterModal();
  }, [navigate, openRegisterModal]);

  return null;
}

/**
 * /select-function URL 접근 시 대시보드로 리다이렉트 + 모달 표시
 * (페이지 → 모달 전환 후 하위호환용)
 */
/** Legacy /news/:id → / redirect (WO-KPA-CONTENT-HUB-REMOVAL-V1) */
function NewsIdRedirect() {
  return <Navigate to="/" replace />;
}

/**
 * WO-KPA-A-DEFAULT-ROUTE-FIX-V2
 * / 접근 시 로그인된 관리자/운영자는 적절한 경로로 자동 리다이렉트
 * 일반 사용자 및 비로그인 → CommunityHomePage 표시
 */
function RoleBasedHome() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading || checked) return;
    setChecked(true);

    if (user?.roles) {
      const target = getDefaultRouteByRole(user.roles);
      // WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1: /mypage가 기본값
      if (target !== '/mypage' && target !== '/login') {
        navigate(target, { replace: true });
      }
    }
  }, [user, isLoading, navigate, checked]);

  return <Layout serviceName={SERVICE_NAME}><CommunityHomePage /></Layout>;
}

// WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1:
// DashboardRoute 제거 — /dashboard는 /mypage로 리다이렉트 처리
// 기존 DashboardRoute (WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1) 역할은
// /mypage 자체 + getDefaultRouteByRole 변경으로 대체됨

// FunctionGateRedirect removed — WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
// /select-function → /setup-activity 리다이렉트로 대체

/**
 * WO-STORE-CORE-MENU-ALIGNMENT-V1 Phase 2 Step 3
 * WO-O4O-GLOBAL-LAYOUT-HOTFIX-V1: GlobalHeader 추가 + StoreTopBar 숨김
 * Store Core v1.0 — KPA-a Store Dashboard Layout Wrapper
 */
function KpaStoreLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // WO-KPA-SOCIETY-STORE-LAYOUT-ORGNAME-TO-PHARMACY-NAME-FIX-V1:
  // 분회명(membershipOrgName) 대신 실제 약국명을 표시
  const [pharmacyName, setPharmacyName] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    getPharmacyInfo().then((info) => {
      if (!cancelled && info?.name) setPharmacyName(info.name);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <KpaGlobalHeader />
      <StoreDashboardLayout
        config={KPA_SOCIETY_STORE_CONFIG}
        userName={user?.name || user?.email || ''}
        homeLink="/"
        orgName={pharmacyName}
        onLogout={() => { logout(); navigate('/'); }}
        hideTopBar
      />
    </div>
  );
}

/** WO-STORE-SLUG-UNIFICATION-V1: /kpa/store/:slug → /store/:slug redirect */
function KpaRedirect({ to, suffix }: { to: string; suffix?: string }) {
  const { slug, postSlug } = useParams<{ slug: string; postSlug: string }>();
  let target = `${to}/${slug}`;
  if (suffix) target += suffix.replace(':postSlug', postSlug || '');
  return <Navigate to={target} replace />;
}

function App() {
  return (
    <O4OErrorBoundary>
    <AuthProvider>
      <LoginModalProvider>
      <OrganizationProvider>
      <BrowserRouter>
        {/* WO-KPA-CONTEXT-SWITCHER-AND-ORG-RESOLUTION-V1: 라우트 기반 서비스 컨텍스트 */}
        <ServiceProvider>
        <O4OToastProvider />
        {/* 전역 인증 모달 (WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1, WO-O4O-AUTH-MODAL-REGISTER-STANDARD-V1) */}
        <LoginModal />
        <RegisterModal />
        <Routes>
          {/* =========================================================
           * SVC-A: 커뮤니티 서비스 (Community Service)
           * WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1
           *
           * SCOPE: 커뮤니티 중심 서비스
           * - / : 커뮤니티 홈 (공개)
           * - /dashboard : /mypage 리다이렉트 (WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1)
           * - /forum/* : 커뮤니티 포럼 (/demo/forum과 별도)
           * - /services/* : 서비스 소개 페이지
           * - /join/* : 서비스 참여 페이지
           * - /pharmacy/* : 약국 경영지원 (실 서비스)
           * - /work/* : 근무약사 업무
           *
           * NOTE: 커뮤니티 UX에서 /demo/*로 연결 금지
           * /demo는 지부/분회 서비스(SVC-B) 전용 영역
           *
           * WO-KPA-DEMO-SCOPE-SEPARATION-AND-IMPLEMENTATION-V1
           * WO-KPA-SOCIETY-PHASE4-ADJUSTMENT-V1
           * ========================================================= */}
          <Route path="/" element={<AuthGate><RoleBasedHome /></AuthGate>} />
          {/* WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1: 기존 북마크 호환 리다이렉트 */}
          <Route path="/dashboard" element={<Navigate to="/mypage" replace />} />

          {/* WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1: 상태 기반 페이지 */}
          <Route path="/setup-activity" element={<ActivitySetupPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

          {/* WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1: Home 통합 */}
          <Route path="/community" element={<Navigate to="/" replace />} />
          {/* /library/content → / 리다이렉트 (WO-KPA-CONTENT-HUB-REMOVAL-V1: /content 제거) */}
          <Route path="/library/content" element={<Navigate to="/" replace />} />

          {/* ========================================
           * 커뮤니티 포럼 (메인 서비스)
           * WO-KPA-COMMUNITY-FORUM-ROUTES-V1
           *
           * / 경로의 커뮤니티 홈에서 접근하는 포럼
           * /demo/forum과 별도의 URL 구조
           * ======================================== */}
          <Route path="/forum" element={<Layout serviceName={SERVICE_NAME}><ForumHomePage /></Layout>} />
          <Route path="/forum/all" element={<Layout serviceName={SERVICE_NAME}><ForumListPage /></Layout>} />
          <Route path="/forum/post/:id" element={<Layout serviceName={SERVICE_NAME}><ForumDetailPage /></Layout>} />
          <Route path="/forum/:slug/write" element={<Layout serviceName={SERVICE_NAME}><ForumWritePage /></Layout>} />
          <Route path="/forum/write" element={<Layout serviceName={SERVICE_NAME}><ForumWritePage /></Layout>} />
          <Route path="/forum/edit/:id" element={<Layout serviceName={SERVICE_NAME}><ForumWritePage /></Layout>} />
          {/* WO-FORUM-REQUEST-ROUTE-EXTRACTION-FROM-MYPAGE-V1: 포럼 개설 신청 → /forum 소속 */}
          <Route path="/forum/request" element={<Layout serviceName={SERVICE_NAME}><KpaRequestCategoryPage /></Layout>} />

          {/* Market Trial — WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
              실행은 Neture 단독. 기존 URL은 backward-compat을 위해 redirect 유지. */}
          <Route path="/market-trial" element={<Layout serviceName={SERVICE_NAME}><MarketTrialNetureRedirect /></Layout>} />
          <Route path="/market-trial/my" element={<Layout serviceName={SERVICE_NAME}><MarketTrialNetureRedirect /></Layout>} />
          <Route path="/market-trial/:id" element={<Layout serviceName={SERVICE_NAME}><MarketTrialNetureRedirect /></Layout>} />



          {/* Service Detail Pages (WO-KPA-HOME-SERVICE-SECTION-V1) */}
          <Route path="/services/branch" element={<Navigate to="/" replace />} />
          <Route path="/services/division" element={<Navigate to="/" replace />} />
          <Route path="/services/pharmacy" element={<PharmacyServicePage />} />
          <Route path="/services/forum" element={<ForumServicePage />} />
          <Route path="/services/lms" element={<LmsServicePage />} />

          {/* Join/Participation Pages (WO-KPA-HOME-SERVICE-SECTION-V1) */}
          <Route path="/join/pharmacy" element={<PharmacyJoinPage />} />

          {/* ========================================
           * 약국 경영지원 — /pharmacy/* 레거시 경로
           * WO-STORE-CORE-MENU-ALIGNMENT-V1: /store/* 로 리다이렉트
           *
           * /pharmacy (게이트)와 /pharmacy/approval은 유지
           * 나머지는 /store/* 기준으로 리다이렉트
           * ======================================== */}
          {/* 게이트: 인증/승인 분기 (PharmacyPage 자체에 완전한 게이트 로직) */}
          <Route path="/pharmacy" element={<Layout serviceName={SERVICE_NAME}><PharmacyPage /></Layout>} />
          {/* /pharmacy/* → /store/* 리다이렉트 */}
          <Route path="/pharmacy/dashboard" element={<Navigate to="/store" replace />} />
          <Route path="/pharmacy/hub" element={<Navigate to="/store-hub" replace />} />
          <Route path="/pharmacy/store" element={<Navigate to="/store" replace />} />
          <Route path="/pharmacy/store/layout" element={<Navigate to="/store/settings/layout" replace />} />
          <Route path="/pharmacy/store/template" element={<Navigate to="/store/settings/template" replace />} />
          <Route path="/pharmacy/store/blog" element={<Navigate to="/store/content/blog" replace />} />
          <Route path="/pharmacy/store/tablet" element={<Navigate to="/store/channels/tablet" replace />} />
          <Route path="/pharmacy/store/channels" element={<Navigate to="/store/channels" replace />} />
          <Route path="/pharmacy/store/cyber-templates" element={<Navigate to="/store/settings" replace />} />
          <Route path="/pharmacy/assets" element={<Navigate to="/store/content" replace />} />
          <Route path="/pharmacy/settings" element={<Navigate to="/store/settings" replace />} />
          <Route path="/pharmacy/sales/b2b" element={<Navigate to="/store/products" replace />} />
          <Route path="/pharmacy/sales/b2b/suppliers" element={<Navigate to="/store/products/suppliers" replace />} />
          <Route path="/pharmacy/sales/b2c" element={<Navigate to="/store/products/b2c" replace />} />
          <Route path="/pharmacy/services" element={<Navigate to="/store/settings" replace />} />
          {/* 레거시 2단 리다이렉트 → /store/* */}
          <Route path="/pharmacy/b2b" element={<Navigate to="/store/products" replace />} />
          <Route path="/pharmacy/b2b/suppliers" element={<Navigate to="/store/products/suppliers" replace />} />
          <Route path="/pharmacy/sell" element={<Navigate to="/store/products/b2c" replace />} />
          <Route path="/pharmacy/tablet-requests" element={<Navigate to="/store/channels/tablet" replace />} />
          <Route path="/pharmacy/blog" element={<Navigate to="/store/content/blog" replace />} />
          <Route path="/pharmacy/kpa-blog" element={<Navigate to="/store/content/blog" replace />} />
          <Route path="/pharmacy/template" element={<Navigate to="/store/settings/template" replace />} />
          <Route path="/pharmacy/layout-builder" element={<Navigate to="/store/settings/layout" replace />} />

          {/* ========================================
           * 약국 서비스 신청 게이트
           * WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1
           * - Service User 로그인 제거, Platform User 단일 인증
           * - 약국 승인 미완료 시 신청 폼 표시
           * ======================================== */}
          {/* WO-KPA-PHARMACY-GATE-SIMPLIFICATION-V1: PharmacyGuard 제거 (자체 인증 체크) */}
          <Route path="/pharmacy/approval" element={<Layout serviceName={SERVICE_NAME}><PharmacyApprovalGatePage /></Layout>} />

          {/* ========================================
           * 근무약사 업무 화면 (개인 기준)
           * WO-KPA-WORK-IMPLEMENT-V1
           * - /pharmacy와 명확히 분리된 개인 업무 화면
           * - 경영/결정 기능 배제
           * ======================================== */}
          <Route path="/work" element={<Layout serviceName={SERVICE_NAME}><WorkPage /></Layout>} />
          <Route path="/work/tasks" element={<Layout serviceName={SERVICE_NAME}><WorkTasksPage /></Layout>} />
          <Route path="/work/learning" element={<Layout serviceName={SERVICE_NAME}><WorkLearningPage /></Layout>} />
          <Route path="/work/display" element={<Layout serviceName={SERVICE_NAME}><WorkDisplayPage /></Layout>} />
          <Route path="/work/community" element={<Layout serviceName={SERVICE_NAME}><WorkCommunityPage /></Layout>} />

          {/* =========================================================
           * SVC-B: 지부/분회 데모 서비스 (District/Branch Demo)
           * WO-KPA-SOCIETY-PHASE6-SVC-B-DEMO-UX-REFINE-V1
           *
           * ⚠️ 삭제 대상: 실제 지부/분회 서비스가 독립 도메인으로
           * 제공되면 이 블록(/demo/*)의 모든 라우트는 전체 삭제 대상.
           * 삭제 시 관련 파일: DemoLayout, DemoHeader, DashboardPage,
           * DemoLayoutRoutes 함수, 그리고 /demo/* 전용 페이지들.
           *
           * SCOPE: 순수 데모 서비스 (실운영 아님)
           * 조직 관리 중심 서비스 — 커뮤니티 홈(/)과 혼합 금지
           * - /demo : 데모 대시보드 (DashboardPage)
           * - /demo/admin/* : 지부 관리자 데모
           * - /demo/operator/* : 서비스 운영자 데모
           * - /demo/intranet/* : 인트라넷 데모
           * - /demo/forum/* : 포럼 데모 (NOT /forum)
           *
           * WO-KPA-DEMO-ROUTE-ISOLATION-V1
           * WO-KPA-DEMO-SCOPE-SEPARATION-AND-IMPLEMENTATION-V1
           * ========================================================= */}

          {/* Login & Register - 모달로 대체 (WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1) */}
          <Route path="/demo/login" element={<LoginRedirect />} />
          <Route path="/demo/register" element={<RegisterRedirect />} />
          <Route path="/demo/register/pending" element={<RegisterPendingPage />} />

          {/* Function Gate → /setup-activity 리다이렉트 (WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1) */}
          <Route path="/demo/select-function" element={<Navigate to="/setup-activity" replace />} />

          {/* Admin Routes (지부 관리자 - 별도 레이아웃) */}
          <Route path="/demo/admin/*" element={<AdminRoutes />} />

          {/* Operator Routes — /demo/operator → /operator 리다이렉트 */}
          <Route path="/demo/operator/*" element={<Navigate to="/operator" replace />} />

          {/* Intranet Routes (인트라넷 - 별도 레이아웃) */}
          <Route path="/demo/intranet/*" element={<IntranetRoutes />} />

          {/* Main Layout Routes - /demo 하위 나머지 경로 */}
          <Route path="/demo/*" element={<DemoLayoutRoutes />} />

          {/* =========================================================
           * SCOPE: 레거시 경로 리다이렉트 (Legacy Redirects)
           * 기존 북마크 호환용, 신규 코드에서 참조 금지
           * WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1
           * ========================================================= */}
          <Route path="/handoff" element={<HandoffPage />} />
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/register" element={<RegisterRedirect />} />
          <Route path="/forgot-password" element={<AccountRecoveryPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/*" element={<AdminRoutes />} />
          {/* 약국 HUB — WO-KPA-PHARMACY-HUB-SIDEBAR-LAYOUT-AND-PRODUCT-TABS-FIX-V1: 좌측 사이드바 레이아웃 */}
          {/* WO-O4O-HUB-TO-STORE-HUB-RENAMING-V1: /hub → /store-hub */}
          <Route path="/hub" element={<Navigate to="/store-hub" replace />} />
          <Route path="/hub/*" element={<Navigate to="/store-hub" replace />} />
          <Route path="/store-hub" element={<Layout serviceName={SERVICE_NAME}><HubGuard><PharmacyHubLayout /></HubGuard></Layout>}>
            <Route index element={<StoreHubPage />} />
            <Route path="b2b" element={<HubB2BCatalogPage />} />
            <Route path="signage" element={<HubSignageLibraryPage />} />
            <Route path="event-offers" element={<PharmacyOwnerOnlyGuard><KpaEventOfferPage /></PharmacyOwnerOnlyGuard>} />
            <Route path="content" element={<HubContentLibraryPage />} />
          </Route>
          {/* 자료실 Hub — 공동자료실 진입점 (WO-KPA-RESOURCE-SYSTEM-RESET-V1) */}
          <Route path="/resources" element={<Layout serviceName={SERVICE_NAME}><ResourcesHubPage /></Layout>} />
          {/* 자료 등록/수정 (WO-KPA-RESOURCES-UPLOAD-ENTRY-AND-FORM-SEPARATION-V1) */}
          <Route path="/resources/new" element={<Layout serviceName={SERVICE_NAME}><ResourceWritePage /></Layout>} />
          <Route path="/resources/:id/edit" element={<Layout serviceName={SERVICE_NAME}><ResourceWritePage /></Layout>} />
          {/* Operator Routes — WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1: KpaOperatorLayout (standalone sidebar) */}
          <Route path="/operator/*" element={<OperatorRoutes />} />
          <Route path="/intranet/*" element={<Navigate to="/demo/intranet" replace />} />

          {/* Supplier Event Offer Proposal (WO-EVENT-OFFER-SUPPLIER-PROPOSAL-PATH-V1) */}
          <Route path="/supplier/event-offers" element={<Layout serviceName={SERVICE_NAME}><SupplierEventOfferPage /></Layout>} />

          {/* ========================================
           * 커뮤니티 서비스 라우트 (메인 서비스)
           * WO-KPA-COMMUNITY-ROOT-ROUTES-V1
           *
           * / 경로의 커뮤니티 홈에서 접근하는 서비스들
           * /demo/* 와 분리된 실제 라우트
           * ======================================== */}

          {/* My Content (내 콘텐츠 관리) - WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1 */}
          <Route path="/my-content" element={<Layout serviceName={SERVICE_NAME}><MyContentPage /></Layout>} />

          {/* Content Hub (WO-KPA-CONTENT-HUB-FOUNDATION-V1 / WO-CONTENT-HUB-STRUCTURE-AND-TABLE-FOUNDATION-V1) */}
          <Route path="/content" element={<Layout serviceName={SERVICE_NAME}><ContentListPage /></Layout>} />
          {/* 타입 선택 → /content/new */}
          <Route path="/content/new" element={<Layout serviceName={SERVICE_NAME}><ContentTypeSelectPage /></Layout>} />
          {/* 문서 제작기 (기존 RichTextEditor) */}
          <Route path="/content/write" element={<Layout serviceName={SERVICE_NAME}><ContentWritePage /></Layout>} />
          {/* 설문 제작기 — ParticipationCreatePage (survey mode) */}
          <Route path="/content/new/survey" element={
            <Layout serviceName={SERVICE_NAME}>
              <ParticipationCreatePage
                pageTitle="새 설문 만들기"
                pageDescription="구성원 의견을 수집하는 설문을 만듭니다"
                breadcrumb={[
                  { label: '홈', href: '/' },
                  { label: '콘텐츠', href: '/content' },
                  { label: '타입 선택', href: '/content/new' },
                  { label: '설문 만들기' },
                ]}
                returnTo="/content/new"
                allowedQuestionTypes={[QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE, QuestionType.FREE_TEXT]}
              />
            </Layout>
          } />
          {/* 퀴즈 제작기 — ParticipationCreatePage (quiz mode) */}
          <Route path="/content/new/quiz" element={
            <Layout serviceName={SERVICE_NAME}>
              <ParticipationCreatePage
                pageTitle="새 퀴즈 만들기"
                pageDescription="지식을 테스트하는 퀴즈를 만듭니다"
                breadcrumb={[
                  { label: '홈', href: '/' },
                  { label: '콘텐츠', href: '/content' },
                  { label: '타입 선택', href: '/content/new' },
                  { label: '퀴즈 만들기' },
                ]}
                returnTo="/content/new"
                allowedQuestionTypes={[QuestionType.QUIZ]}
              />
            </Layout>
          } />
          {/* 코스형 자료 제작기 — CourseNewPage (content context) */}
          <Route path="/content/new/course" element={
            <Layout serviceName={SERVICE_NAME}>
              <CourseNewPage
                pageTitle="새 코스형 자료 만들기"
                backLinkText="← 타입 선택으로"
                returnTo="/content/new"
              />
            </Layout>
          } />
          {/* 레거시 리다이렉트: /content/new/lecture → /content/new/course */}
          <Route path="/content/new/lecture" element={<Navigate to="/content/new/course" replace />} />
          <Route path="/content/:id" element={<Layout serviceName={SERVICE_NAME}><ContentDetailPage /></Layout>} />
          <Route path="/content/:id/edit" element={<Layout serviceName={SERVICE_NAME}><ContentWritePage /></Layout>} />

          {/* Legacy redirects: /contents → /content */}
          <Route path="/contents" element={<Navigate to="/content" replace />} />
          <Route path="/content/notice" element={<Navigate to="/content" replace />} />
          <Route path="/content/news" element={<Navigate to="/content" replace />} />

          {/* Legacy redirect: /news → / */}
          <Route path="/news" element={<Navigate to="/" replace />} />
          <Route path="/news/notice" element={<Navigate to="/" replace />} />
          <Route path="/news/:id" element={<NewsIdRedirect />} />

          {/* Course Hub & Intro (Public-facing) - WO-CONTENT-COURSE-HUB/INTRO */}
          <Route path="/courses" element={<Layout serviceName={SERVICE_NAME}><CourseHubPage /></Layout>} />
          <Route path="/courses/:courseId" element={<Layout serviceName={SERVICE_NAME}><CourseIntroPage /></Layout>} />

          {/* Instructor Public Profile - WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1 */}
          <Route path="/instructors/:userId" element={<Layout serviceName={SERVICE_NAME}><InstructorProfilePage /></Layout>} />

          {/* Instructor Dashboard - WO-O4O-INSTRUCTOR-DASHBOARD-V1 */}
          <Route path="/instructor" element={<Layout serviceName={SERVICE_NAME}><InstructorDashboardPage /></Layout>} />
          <Route path="/instructor/courses" element={<Layout serviceName={SERVICE_NAME}><CourseListPage /></Layout>} />
          <Route path="/instructor/courses/new" element={<Layout serviceName={SERVICE_NAME}><CourseNewPage /></Layout>} />
          <Route path="/instructor/courses/:id" element={<Layout serviceName={SERVICE_NAME}><CourseEditPage /></Layout>} />
          <Route path="/instructor/dashboard" element={<Layout serviceName={SERVICE_NAME}><InstructorCourseDashboardPage /></Layout>} />
          {/* WO-O4O-MARKETING-CONTENT-OPERATIONS-MVP-V1 */}
          <Route path="/instructor/contents/:courseId/participants" element={<Layout serviceName={SERVICE_NAME}><ContentParticipantsPage /></Layout>} />

          {/* LMS (교육/강의) */}
          <Route path="/lms" element={<Layout serviceName={SERVICE_NAME}><EducationPage /></Layout>} />
          <Route path="/lms/courses" element={<Layout serviceName={SERVICE_NAME}><LmsCoursesPage /></Layout>} />
          <Route path="/lms/course/:id" element={<Layout serviceName={SERVICE_NAME}><LmsCourseDetailPage /></Layout>} />
          <Route path="/lms/course/:courseId/lesson/:lessonId" element={<Layout serviceName={SERVICE_NAME}><LmsLessonPage /></Layout>} />
          <Route path="/lms/certificate" element={<Layout serviceName={SERVICE_NAME}><LmsCertificatesPage /></Layout>} />

          {/* Signage (디지털 사이니지) */}
          <Route path="/signage" element={<Layout serviceName={SERVICE_NAME}><ContentHubPage /></Layout>} />
          <Route path="/signage/playlist/new" element={<Layout serviceName={SERVICE_NAME}><PlaylistEditorPage /></Layout>} />
          <Route path="/signage/playlist/:id/edit" element={<Layout serviceName={SERVICE_NAME}><PlaylistEditorPage /></Layout>} />
          <Route path="/signage/playlist/:id" element={<Layout serviceName={SERVICE_NAME}><PlaylistDetailPage /></Layout>} />
          <Route path="/signage/media/:id" element={<Layout serviceName={SERVICE_NAME}><MediaDetailPage /></Layout>} />

          {/* Events (이벤트) */}
          <Route path="/events" element={<Layout serviceName={SERVICE_NAME}><EventsHomePage /></Layout>} />

          {/* Organization (약사회 소개) */}
          <Route path="/organization" element={<Layout serviceName={SERVICE_NAME}><OrganizationAboutPage /></Layout>} />
          <Route path="/organization/branches" element={<Navigate to="/organization" replace />} />
          <Route path="/organization/officers" element={<Layout serviceName={SERVICE_NAME}><OfficersPage /></Layout>} />
          <Route path="/organization/contact" element={<Layout serviceName={SERVICE_NAME}><ContactPage /></Layout>} />

          {/* MyPage (마이페이지) */}
          <Route path="/mypage" element={<Layout serviceName={SERVICE_NAME}><MyDashboardPage /></Layout>} />
          <Route path="/mypage/profile" element={<Layout serviceName={SERVICE_NAME}><MyProfilePage /></Layout>} />
          <Route path="/mypage/settings" element={<Layout serviceName={SERVICE_NAME}><MySettingsPage /></Layout>} />
          <Route path="/mypage/certificates" element={<Layout serviceName={SERVICE_NAME}><MyCertificatesPage /></Layout>} />
          {/* WO-O4O-FORUM-MY-FORUM-EXPANSION-V1 */}
          <Route path="/mypage/my-forums" element={<Layout serviceName={SERVICE_NAME}><MyForumDashboardPage /></Layout>} />
          {/* WO-FORUM-REQUEST-ROUTE-EXTRACTION-FROM-MYPAGE-V1: 레거시 리다이렉트 */}
          <Route path="/mypage/my-forums/request" element={<Navigate to="/forum/request" replace />} />
          {/* WO-KPA-A-FORUM-OWNER-MEMBER-MANAGEMENT-UI-V1: 포럼 회원 관리 */}
          <Route path="/mypage/my-forums/:forumId/members" element={<Layout serviceName={SERVICE_NAME}><ForumMemberManagementPage /></Layout>} />
          {/* WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1 */}
          <Route path="/mypage/my-requests" element={<Layout serviceName={SERVICE_NAME}><MyRequestsPage /></Layout>} />
          {/* WO-O4O-QUALIFICATION-SYSTEM-V1 */}
          <Route path="/mypage/qualifications" element={<Layout serviceName={SERVICE_NAME}><MyQualificationsPage /></Layout>} />
          <Route path="/mypage/enrollments" element={<Layout serviceName={SERVICE_NAME}><MyEnrollmentsPage /></Layout>} />
          {/* WO-O4O-CREDIT-SYSTEM-V1 */}
          <Route path="/mypage/credits" element={<Layout serviceName={SERVICE_NAME}><MyCreditsPage /></Layout>} />
          {/* WO-MYPAGE-STATE-BASED-IA-REDEFINITION-V1: completions → certificates redirect */}
          <Route path="/mypage/completions" element={<Navigate to="/mypage/certificates" replace />} />

          {/* Participation (참여) */}
          <Route path="/participation" element={<Layout serviceName={SERVICE_NAME}><ParticipationListPage /></Layout>} />
          <Route path="/participation/create" element={<Layout serviceName={SERVICE_NAME}><ParticipationCreatePage /></Layout>} />
          <Route path="/participation/:id/respond" element={<Layout serviceName={SERVICE_NAME}><ParticipationRespondPage /></Layout>} />
          <Route path="/participation/:id/results" element={<Layout serviceName={SERVICE_NAME}><ParticipationResultPage /></Layout>} />

          {/* Event Offers (이벤트) */}
          <Route path="/groupbuy" element={<Navigate to="/store-hub/event-offers" replace />} />
          <Route path="/event-offers" element={<Navigate to="/store-hub/event-offers" replace />} />
          <Route path="/event-offers/:id" element={<Layout serviceName={SERVICE_NAME}><PharmacyOwnerOnlyGuard><EventOfferDetailPage /></PharmacyOwnerOnlyGuard></Layout>} />

          {/* Function Gate → /setup-activity 리다이렉트 (WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1) */}
          <Route path="/select-function" element={<Navigate to="/setup-activity" replace />} />

          {/* Legal (이용약관/개인정보처리방침) - WO-KPA-LEGAL-PAGES-V1 */}
          <Route path="/policy" element={<Layout serviceName={SERVICE_NAME}><PolicyPage /></Layout>} />
          <Route path="/privacy" element={<Layout serviceName={SERVICE_NAME}><PrivacyPage /></Layout>} />

          {/* Tablet Kiosk (WO-STORE-TABLET-REQUEST-CHANNEL-V1) — fullscreen, no auth */}
          <Route path="/tablet/:slug" element={<TabletStorePage />} />

          {/* ========================================
           * Store Hub 운영 OS
           * WO-O4O-STORE-HUB-STRUCTURE-REFACTOR-V1
           *
           * Dashboard / Operation / Marketing / Commerce / Analytics
           * StoreDashboardLayout (store-ui-core) 기반 section sidebar
           * PharmacyGuard로 인증/승인 보호
           * ======================================== */}
          <Route path="/store" element={<PharmacyGuard><KpaStoreLayoutWrapper /></PharmacyGuard>}>
            {/* Home (WO-KPA-A-STORE-HOME-AND-SIDEBAR-RESTRUCTURE-V1) */}
            <Route index element={<StoreHomePage />} />
            {/* 레거시 /store/dashboard → /store 리다이렉트 */}
            <Route path="dashboard" element={<Navigate to="/store" replace />} />

            {/* Pharmacy Info (WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1) */}
            <Route path="info" element={<PharmacyInfoPage />} />

            {/* Marketing */}
            <Route path="marketing/qr" element={<StoreQRPage />} />
            <Route path="marketing/pop" element={<StorePopPage />} />
            <Route path="marketing/signage" element={<Navigate to="playlist" replace />} />
            <Route path="marketing/signage/playlist" element={<StoreSignagePage />} />
            <Route path="marketing/signage/videos" element={<StoreSignagePage />} />
            <Route path="marketing/signage/schedules" element={<StoreSignagePage />} />
            <Route path="marketing/signage/player" element={<SignagePlayerSelectPage />} />
            <Route path="marketing/signage/play/:playlistId" element={<SignagePlaybackPage />} />

            {/* Commerce — WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1: orderable → /hub/b2b canonical */}
            <Route path="commerce/orderable" element={<Navigate to="/store-hub/b2b" replace />} />
            <Route path="commerce/products" element={<PharmacyB2BPage />} />
            <Route path="commerce/products/b2c" element={<PharmacySellPage />} />
            <Route path="commerce/products/suppliers" element={<SupplierListPage />} />
            <Route path="commerce/products/suppliers/:supplierId" element={<SupplierDetailPage />} />
            <Route path="commerce/products/:productId/marketing" element={<ProductMarketingPage />} />
            <Route path="commerce/local-products" element={<StoreLocalProductsPage />} />
            <Route path="commerce/tablet-displays" element={<StoreTabletDisplaysPage />} />
            <Route path="commerce/order-worktable" element={<StoreOrderWorktablePage />} />
            <Route path="commerce/orders" element={<StoreOrdersPage />} />

            {/* Analytics */}
            <Route path="analytics/marketing" element={<MarketingAnalyticsPage />} />

            {/* ── Legacy redirects (기존 URL 호환) ── */}
            <Route path="qr" element={<Navigate to="/store/marketing/qr" replace />} />
            <Route path="pop" element={<Navigate to="/store/marketing/pop" replace />} />
            <Route path="signage" element={<Navigate to="/store/marketing/signage/playlist" replace />} />
            <Route path="analytics" element={<Navigate to="/store/analytics/marketing" replace />} />
            <Route path="products" element={<Navigate to="/store/commerce/products" replace />} />
            <Route path="products/b2c" element={<Navigate to="/store/commerce/products/b2c" replace />} />
            <Route path="products/suppliers" element={<Navigate to="/store/commerce/products/suppliers" replace />} />
            <Route path="orders" element={<Navigate to="/store/commerce/orders" replace />} />

            {/* ── Hidden routes (사이드바 미표시, URL 직접 접근 유지) ── */}
            <Route path="channels" element={<StoreChannelsPage />} />
            <Route path="channels/tablet" element={<TabletRequestsPage />} />
            <Route path="content" element={<StoreAssetsPage />} />
            <Route path="content/blog" element={<PharmacyBlogPage />} />
            <Route path="content/:snapshotId/edit" element={<StoreContentEditPage />} />
            <Route path="billing" element={<StoreBillingPage />} />
            <Route path="settings" element={<PharmacyStorePage />} />
            {/* WO-STORE-COMMON-SETTINGS-KPA-MIGRATION-V1: layout integrated into /store/settings */}
            <Route path="settings/layout" element={<Navigate to="/store/settings" replace />} />
            <Route path="settings/template" element={<PharmacyTemplatePage />} />
          </Route>

          {/* Store Home (WO-STORE-TEMPLATE-PROFILE-V1) — public, block-based storefront */}
          <Route path="/store/:slug" element={<StorefrontHomePage />} />

          {/* WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1: Product Detail + Checkout + Payment */}
          <Route path="/store/:slug/products/:id" element={<StorefrontProductDetailPage />} />
          <Route path="/store/:slug/checkout" element={<CheckoutPage />} />
          <Route path="/store/:slug/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/store/:slug/payment/fail" element={<PaymentFailPage />} />

          {/* Store Blog (WO-STORE-BLOG-CHANNEL-V1) — public, no auth */}
          <Route path="/store/:slug/blog" element={<Layout serviceName={SERVICE_NAME}><StoreBlogPage /></Layout>} />
          <Route path="/store/:slug/blog/:postSlug" element={<Layout serviceName={SERVICE_NAME}><StoreBlogPostPage /></Layout>} />

          {/* WO-STORE-SLUG-UNIFICATION-V1: KPA store → unified store redirects */}
          <Route path="/kpa/tablet/:slug" element={<KpaRedirect to="/tablet" />} />
          <Route path="/kpa/store/:slug/blog/:postSlug" element={<KpaRedirect to="/store" suffix="/blog/:postSlug" />} />
          <Route path="/kpa/store/:slug/blog" element={<KpaRedirect to="/store" suffix="/blog" />} />
          <Route path="/kpa/store/:slug" element={<KpaRedirect to="/store" />} />

          {/* Public Content View (WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1) — public, no auth */}
          <Route path="/view/:snapshotId/print" element={<PrintContentPage />} />
          <Route path="/view/:snapshotId" element={<PublicContentViewPage />} />
          {/* Legacy redirect: /content/:snapshotId was moved to /view/:snapshotId */}

          {/* QR Landing Page (WO-O4O-QR-LANDING-PAGE-V1) — public, no auth */}
          <Route path="/qr/:slug" element={<QrLandingPage />} />

          {/* Certificate Verification (WO-O4O-LMS-CERTIFICATE-VERIFICATION-V1) — public, no auth */}
          <Route path="/certificate/verify/:certificateId" element={<CertificateVerifyPage />} />

          {/* Public Signage Rendering (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1) — public, no auth */}
          <Route path="/public/signage" element={<PublicSignagePage />} />

          {/* 404 - 알 수 없는 경로 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </ServiceProvider>
      </BrowserRouter>
      </OrganizationProvider>
      </LoginModalProvider>
    </AuthProvider>
    </O4OErrorBoundary>
  );
}

/**
 * SVC-B: 지부/분회 데모 서비스 — DemoLayout 하위 라우트
 *
 * ⚠️ 삭제 대상: 실제 지부/분회 서비스가 독립 도메인으로 제공되면
 * 이 함수와 모든 하위 라우트는 전체 삭제 대상.
 *
 * WO-KPA-DEMO-HEADER-SEPARATION-V1: DemoLayout 사용
 * WO-KPA-SOCIETY-PHASE6-SVC-B-DEMO-UX-REFINE-V1
 *
 * /demo 하위에서 DemoLayout을 사용하는 라우트들.
 * 이 라우트들은 지부/분회 조직 관리 데모 범위에 속합니다.
 * 커뮤니티 홈(/)과는 별도 스코프이며, 시각적으로도 분리됩니다.
 */
function DemoLayoutRoutes() {
  return (
    <DemoLayout serviceName={SERVICE_NAME}>
      <Routes>
        {/* Home / Dashboard */}
        <Route path="/" element={<DashboardPage />} />

        {/* News (공지/소식) */}
        <Route path="/news" element={<NewsListPage />} />
        <Route path="/news/notice" element={<NewsListPage />} />
        <Route path="/news/branch-news" element={<NewsListPage />} />
        <Route path="/news/kpa-news" element={<NewsListPage />} />
        <Route path="/news/gallery" element={<GalleryPage />} />
        <Route path="/news/press" element={<NewsListPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />

        {/* Forum (포럼) - WO-KPA-COMMUNITY-HOME-V1 */}
        <Route path="/forum" element={<ForumHomePage />} />
        <Route path="/forum/all" element={<ForumListPage />} />
        <Route path="/forum/post/:id" element={<ForumDetailPage />} />
        <Route path="/forum/:slug/write" element={<ForumWritePage />} />
        <Route path="/forum/write" element={<ForumWritePage />} />
        <Route path="/forum/edit/:id" element={<ForumWritePage />} />

        {/* LMS (교육) - WO-KPA-COMMUNITY-HOME-V1 */}
        <Route path="/lms" element={<EducationPage />} />
        <Route path="/lms/courses" element={<LmsCoursesPage />} />
        <Route path="/lms/course/:id" element={<LmsCourseDetailPage />} />
        <Route path="/lms/course/:courseId/lesson/:lessonId" element={<LmsLessonPage />} />
        <Route path="/lms/certificate" element={<LmsCertificatesPage />} />

        {/* Participation (참여 - 설문/퀴즈) WO-KPA-PARTICIPATION-APP-V1 */}
        <Route path="/participation" element={<ParticipationListPage />} />
        <Route path="/participation/create" element={<ParticipationCreatePage />} />
        <Route path="/participation/:id/respond" element={<ParticipationRespondPage />} />
        <Route path="/participation/:id/results" element={<ParticipationResultPage />} />

        {/* Event Offers (이벤트) */}
        <Route path="/event-offers" element={<PharmacyOwnerOnlyGuard><EventOfferListPage /></PharmacyOwnerOnlyGuard>} />
        <Route path="/event-offers/history" element={<PharmacyOwnerOnlyGuard><EventOfferHistoryPage /></PharmacyOwnerOnlyGuard>} />
        <Route path="/event-offers/:id" element={<PharmacyOwnerOnlyGuard><EventOfferDetailPage /></PharmacyOwnerOnlyGuard>} />

        {/* Pharmacy Management - 실경로로 리다이렉트 (WO-KPA-PHARMACY-LOCATION-V1) */}

        {/* Pharmacy Management - 실경로로 리다이렉트 (WO-KPA-PHARMACY-LOCATION-V1) */}
        <Route path="/pharmacy" element={<Navigate to="/pharmacy" replace />} />
        <Route path="/pharmacy/*" element={<Navigate to="/pharmacy" replace />} />



        {/* Organization (조직소개) */}
        <Route path="/organization" element={<OrganizationAboutPage />} />
        <Route path="/organization/branches" element={<Navigate to="/organization" replace />} />
        <Route path="/organization/branches/:id" element={<Navigate to="/organization" replace />} />
        <Route path="/organization/officers" element={<OfficersPage />} />
        <Route path="/organization/contact" element={<ContactPage />} />

        {/* MyPage (마이페이지) */}
        <Route path="/mypage" element={<MyDashboardPage />} />
        <Route path="/mypage/profile" element={<MyProfilePage />} />
        <Route path="/mypage/settings" element={<MySettingsPage />} />
        <Route path="/mypage/certificates" element={<MyCertificatesPage />} />
        <Route path="/mypage/credits" element={<MyCreditsPage />} />
        <Route path="/mypage/completions" element={<Navigate to="/demo/mypage/certificates" replace />} />
        <Route path="/mypage/status-report" element={<PersonalStatusReportPage />} />
        <Route path="/mypage/annual-report" element={<AnnualReportFormPage />} />

        {/* Events (이벤트) - WO-KPA-COMMUNITY-HOME-V1 */}
        <Route path="/events" element={<EventsHomePage />} />

        {/* Organization Service (약사회 서비스 데모) - WO-KPA-COMMUNITY-HOME-V1 */}
        <Route path="/organization-service" element={<OrganizationServicePage />} />

        {/* Legacy routes (for backward compatibility) */}
        <Route path="/member/apply" element={<MemberApplyPage />} />
        <Route path="/applications" element={<MyApplicationsPage />} />

        {/* 404 */}
        <Route path="*" element={<DemoNotFoundPage />} />
      </Routes>
    </DemoLayout>
  );
}

/**
 * 404 페이지 (플랫폼 전체)
 */
function NotFoundPage() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '4rem', margin: 0, color: '#2563EB' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginTop: '16px', color: '#0F172A' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p style={{ color: '#64748B', marginTop: '8px' }}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '24px',
          padding: '12px 24px',
          backgroundColor: '#2563EB',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '6px',
        }}
      >
        홈으로 돌아가기
      </a>
    </div>
  );
}

/**
 * 404 페이지 (/demo 내부)
 */
function DemoNotFoundPage() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '4rem', margin: 0, color: '#2563EB' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginTop: '16px', color: '#0F172A' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p style={{ color: '#64748B', marginTop: '8px' }}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <a
        href="/demo"
        style={{
          display: 'inline-block',
          marginTop: '24px',
          padding: '12px 24px',
          backgroundColor: '#2563EB',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '6px',
        }}
      >
        데모 홈으로 돌아가기
      </a>
    </div>
  );
}

export default App;
