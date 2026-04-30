import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { Layout, DemoLayout } from './components';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { AuthProvider, OrganizationProvider } from './contexts';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import { ServiceProvider } from './contexts/ServiceContext';
import { useAuth } from './contexts/AuthContext';
import { getPharmacyInfo } from './api/pharmacyInfo';
import { LoginModalProvider, useAuthModal } from './contexts/LoginModalContext';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
// Phase 2 lazy: DashboardPage + auth flow
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const HandoffPage = lazy(() => import('./pages/HandoffPage'));
const AccountRecoveryPage = lazy(() => import('./pages/auth/AccountRecoveryPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Forum pages — Phase 2 lazy (barrel unwound)
const ForumHomePage = lazy(() => import('./pages/forum/ForumHomePage').then(m => ({ default: m.ForumHomePage })));
const ForumListPage = lazy(() => import('./pages/forum/ForumListPage').then(m => ({ default: m.ForumListPage })));
const ForumDetailPage = lazy(() => import('./pages/forum/ForumDetailPage').then(m => ({ default: m.ForumDetailPage })));
const ForumWritePage = lazy(() => import('./pages/forum/ForumWritePage').then(m => ({ default: m.ForumWritePage })));
// WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1
const ForumFeedPage = lazy(() => import('./pages/forum/ForumFeedPage').then(m => ({ default: m.ForumFeedPage })));

// Market Trial — WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
// 실행은 Neture 단독. KPA는 entry → Neture redirect 만 유지.
import { MarketTrialNetureRedirect } from './components/MarketTrialNetureRedirect';

// LMS pages — WO-KPA-SOCIETY-APP-ROUTE-CODE-SPLITTING-V1: lazy (barrel unwound)
const EducationPage = lazy(() => import('./pages/lms/EducationPage').then(m => ({ default: m.EducationPage })));
const LmsCoursesPage = lazy(() => import('./pages/lms/LmsCoursesPage').then(m => ({ default: m.LmsCoursesPage })));
const LmsCourseDetailPage = lazy(() => import('./pages/lms/LmsCourseDetailPage').then(m => ({ default: m.LmsCourseDetailPage })));
const LmsLessonPage = lazy(() => import('./pages/lms/LmsLessonPage').then(m => ({ default: m.LmsLessonPage })));
const LmsCertificatesPage = lazy(() => import('./pages/lms/LmsCertificatesPage').then(m => ({ default: m.LmsCertificatesPage })));
// Certificate Verification (WO-O4O-LMS-CERTIFICATE-VERIFICATION-V1) — public, no auth — Phase 2 lazy
const CertificateVerifyPage = lazy(() => import('./pages/lms/CertificateVerifyPage'));

// Course pages (Public-facing) — Phase 2 lazy (barrel unwound)
const CourseHubPage = lazy(() => import('./pages/courses/CourseHubPage').then(m => ({ default: m.CourseHubPage })));
const CourseIntroPage = lazy(() => import('./pages/courses/CourseIntroPage').then(m => ({ default: m.CourseIntroPage })));

// Instructor public profile — Phase 2 lazy
const InstructorProfilePage = lazy(() => import('./pages/instructors/InstructorProfilePage').then(m => ({ default: m.InstructorProfilePage })));
// Instructor pages — WO-KPA-SOCIETY-APP-ROUTE-CODE-SPLITTING-V1: lazy
const InstructorDashboardPage = lazy(() => import('./pages/instructor/InstructorDashboardPage'));
const CourseListPage = lazy(() => import('./pages/instructor/courses/CourseListPage'));
const CourseNewPage = lazy(() => import('./pages/instructor/courses/CourseNewPage'));
const CourseEditPage = lazy(() => import('./pages/instructor/courses/CourseEditPage'));
const InstructorCourseDashboardPage = lazy(() => import('./pages/instructor/InstructorCourseDashboardPage'));
const ContentParticipantsPage = lazy(() => import('./pages/instructor/ContentParticipantsPage'));

// Events pages — Phase 2 lazy
const EventsHomePage = lazy(() => import('./pages/events/EventsHomePage').then(m => ({ default: m.EventsHomePage })));

// Participation pages — Phase 2 lazy (barrel unwound). QuestionType은 enum이라 별도 유지.
const ParticipationListPage = lazy(() => import('./pages/participation/ParticipationListPage').then(m => ({ default: m.ParticipationListPage })));
const ParticipationCreatePage = lazy(() => import('./pages/participation/ParticipationCreatePage').then(m => ({ default: m.ParticipationCreatePage })));
const ParticipationRespondPage = lazy(() => import('./pages/participation/ParticipationRespondPage').then(m => ({ default: m.ParticipationRespondPage })));
const ParticipationResultPage = lazy(() => import('./pages/participation/ParticipationResultPage').then(m => ({ default: m.ParticipationResultPage })));
import { QuestionType } from './pages/participation/types';

// Event Offer pages — Phase 2 lazy (barrel unwound)
const EventOfferListPage = lazy(() => import('./pages/event-offer/EventOfferListPage').then(m => ({ default: m.EventOfferListPage })));
const EventOfferDetailPage = lazy(() => import('./pages/event-offer/EventOfferDetailPage').then(m => ({ default: m.EventOfferDetailPage })));
const EventOfferHistoryPage = lazy(() => import('./pages/event-offer/EventOfferHistoryPage').then(m => ({ default: m.EventOfferHistoryPage })));
const KpaEventOfferPage = lazy(() => import('./pages/event-offer/KpaEventOfferPage').then(m => ({ default: m.KpaEventOfferPage })));
// Supplier pages — Phase 2 lazy
const SupplierEventOfferPage = lazy(() => import('./pages/supplier/SupplierEventOfferPage').then(m => ({ default: m.SupplierEventOfferPage })));

// News pages — Phase 2 lazy (barrel unwound)
const NewsListPage = lazy(() => import('./pages/news/NewsListPage').then(m => ({ default: m.NewsListPage })));
const NewsDetailPage = lazy(() => import('./pages/news/NewsDetailPage').then(m => ({ default: m.NewsDetailPage })));
const GalleryPage = lazy(() => import('./pages/news/GalleryPage').then(m => ({ default: m.GalleryPage })));

// Signage pages — WO-KPA-SOCIETY-APP-ROUTE-CODE-SPLITTING-V1: lazy
const ContentHubPage = lazy(() => import('./pages/signage/ContentHubPage'));
const PlaylistEditorPage = lazy(() => import('./pages/signage/PlaylistEditorPage'));
const PlaylistDetailPage = lazy(() => import('./pages/signage/PlaylistDetailPage'));
const MediaDetailPage = lazy(() => import('./pages/signage/MediaDetailPage'));
const PublicSignagePage = lazy(() => import('./pages/signage/PublicSignagePage'));

// Legal pages — Phase 2 lazy (barrel unwound)
const PolicyPage = lazy(() => import('./pages/legal/PolicyPage').then(m => ({ default: m.PolicyPage })));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage').then(m => ({ default: m.PrivacyPage })));

// MyPage pages — Phase 2 lazy (barrel unwound; 9 named + 4 default-as-named)
const MyDashboardPage = lazy(() => import('./pages/mypage/MyDashboardPage').then(m => ({ default: m.MyDashboardPage })));
const MyProfilePage = lazy(() => import('./pages/mypage/MyProfilePage').then(m => ({ default: m.MyProfilePage })));
const MySettingsPage = lazy(() => import('./pages/mypage/MySettingsPage').then(m => ({ default: m.MySettingsPage })));
const MyCertificatesPage = lazy(() => import('./pages/mypage/MyCertificatesPage').then(m => ({ default: m.MyCertificatesPage })));
const PersonalStatusReportPage = lazy(() => import('./pages/mypage/PersonalStatusReportPage').then(m => ({ default: m.PersonalStatusReportPage })));
const AnnualReportFormPage = lazy(() => import('./pages/mypage/AnnualReportFormPage').then(m => ({ default: m.AnnualReportFormPage })));
const MyQualificationsPage = lazy(() => import('./pages/mypage/MyQualificationsPage').then(m => ({ default: m.MyQualificationsPage })));
const MyEnrollmentsPage = lazy(() => import('./pages/mypage/MyEnrollmentsPage').then(m => ({ default: m.MyEnrollmentsPage })));
const MyCreditsPage = lazy(() => import('./pages/mypage/MyCreditsPage').then(m => ({ default: m.MyCreditsPage })));
// default-as-named (wrapper 불필요)
const MyForumDashboardPage = lazy(() => import('./pages/mypage/MyForumDashboardPage'));
const KpaRequestCategoryPage = lazy(() => import('./pages/mypage/RequestCategoryPage'));
const MyRequestsPage = lazy(() => import('./pages/mypage/MyRequestsPage'));
const ForumMemberManagementPage = lazy(() => import('./pages/mypage/ForumMemberManagementPage'));

// Admin Routes (지부 관리자) — WO-KPA-SOCIETY-APP-ROUTE-CODE-SPLITTING-V1: lazy
const AdminRoutes = lazy(() => import('./routes/AdminRoutes').then(m => ({ default: m.AdminRoutes })));

// Operator Routes (서비스 운영자) — WO-KPA-SOCIETY-APP-ROUTE-CODE-SPLITTING-V1: lazy
const OperatorRoutes = lazy(() => import('./routes/OperatorRoutes').then(m => ({ default: m.OperatorRoutes })));
// Resources Hub — Phase 2 lazy
const ResourcesHubPage = lazy(() => import('./pages/resources/ResourcesHubPage').then(m => ({ default: m.ResourcesHubPage })));
const ResourceWritePage = lazy(() => import('./pages/resources/ResourceWritePage').then(m => ({ default: m.ResourceWritePage })));

// Intranet Routes — Phase 2 lazy (resolves Phase 1 ContentHubPage warning)
const IntranetRoutes = lazy(() => import('./routes/IntranetRoutes').then(m => ({ default: m.IntranetRoutes })));

// Auth/Register — Phase 2 lazy
const RegisterPendingPage = lazy(() => import('./pages/auth/RegisterPendingPage'));

// Manual Pages (WO-KPA-A-MANUAL-MAIN-PAGE-V1)

// Guide Pages — Phase 2 lazy (14 pages)
const GuideIntroPage = lazy(() => import('./pages/guide/GuideIntroPage').then(m => ({ default: m.GuideIntroPage })));
const GuideIntroStructurePage = lazy(() => import('./pages/guide/GuideIntroStructurePage').then(m => ({ default: m.GuideIntroStructurePage })));
const GuideIntroKpaPage = lazy(() => import('./pages/guide/GuideIntroKpaPage').then(m => ({ default: m.GuideIntroKpaPage })));
const GuideIntroOperationPage = lazy(() => import('./pages/guide/GuideIntroOperationPage').then(m => ({ default: m.GuideIntroOperationPage })));
const GuideIntroConceptPage = lazy(() => import('./pages/guide/GuideIntroConceptPage').then(m => ({ default: m.GuideIntroConceptPage })));
const GuideUsagePage = lazy(() => import('./pages/guide/GuideUsagePage').then(m => ({ default: m.GuideUsagePage })));
const GuideFeaturesPage = lazy(() => import('./pages/guide/GuideFeaturesPage').then(m => ({ default: m.GuideFeaturesPage })));
const GuideFeatureForumPage = lazy(() => import('./pages/guide/GuideFeatureForumPage').then(m => ({ default: m.GuideFeatureForumPage })));
const GuideFeatureResourcesPage = lazy(() => import('./pages/guide/GuideFeatureResourcesPage').then(m => ({ default: m.GuideFeatureResourcesPage })));
const GuideFeatureContentPage = lazy(() => import('./pages/guide/GuideFeatureContentPage').then(m => ({ default: m.GuideFeatureContentPage })));
const GuideFeatureSignagePage = lazy(() => import('./pages/guide/GuideFeatureSignagePage').then(m => ({ default: m.GuideFeatureSignagePage })));
const GuideFeatureQrTabletPage = lazy(() => import('./pages/guide/GuideFeatureQrTabletPage').then(m => ({ default: m.GuideFeatureQrTabletPage })));
const GuideFeatureStorePage = lazy(() => import('./pages/guide/GuideFeatureStorePage').then(m => ({ default: m.GuideFeatureStorePage })));
const GuideFeatureLmsPage = lazy(() => import('./pages/guide/GuideFeatureLmsPage').then(m => ({ default: m.GuideFeatureLmsPage })));

// Community Home (WO-KPA-COMMUNITY-HOME-V1)
import { CommunityHomePage } from './pages/CommunityHomePage';

// Community Hub — /community는 Home으로 리다이렉트 (WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1)

// Service Detail Pages — Phase 2 lazy (barrel unwound)
const PharmacyServicePage = lazy(() => import('./pages/services/PharmacyServicePage').then(m => ({ default: m.PharmacyServicePage })));
const ForumServicePage = lazy(() => import('./pages/services/ForumServicePage').then(m => ({ default: m.ForumServicePage })));
const LmsServicePage = lazy(() => import('./pages/services/LmsServicePage').then(m => ({ default: m.LmsServicePage })));

// Join Pages — Phase 2 lazy (barrel unwound)
const PharmacyJoinPage = lazy(() => import('./pages/join/PharmacyJoinPage').then(m => ({ default: m.PharmacyJoinPage })));

// Pharmacy Management — Phase 2 lazy (barrel unwound; 20 named + 4 default-as-named)
const PharmacyPage = lazy(() => import('./pages/pharmacy/PharmacyPage').then(m => ({ default: m.PharmacyPage })));
const PharmacyB2BPage = lazy(() => import('./pages/pharmacy/PharmacyB2BPage').then(m => ({ default: m.PharmacyB2BPage })));
const PharmacyStorePage = lazy(() => import('./pages/pharmacy/PharmacyStorePage').then(m => ({ default: m.PharmacyStorePage })));
const PharmacyApprovalGatePage = lazy(() => import('./pages/pharmacy/PharmacyApprovalGatePage').then(m => ({ default: m.PharmacyApprovalGatePage })));
const HubContentLibraryPage = lazy(() => import('./pages/pharmacy/HubContentLibraryPage').then(m => ({ default: m.HubContentLibraryPage })));
const HubB2BCatalogPage = lazy(() => import('./pages/pharmacy/HubB2BCatalogPage').then(m => ({ default: m.HubB2BCatalogPage })));
const HubSignageLibraryPage = lazy(() => import('./pages/pharmacy/HubSignageLibraryPage').then(m => ({ default: m.HubSignageLibraryPage })));
const PharmacySellPage = lazy(() => import('./pages/pharmacy/PharmacySellPage').then(m => ({ default: m.PharmacySellPage })));
const TabletRequestsPage = lazy(() => import('./pages/pharmacy/TabletRequestsPage').then(m => ({ default: m.TabletRequestsPage })));
const PharmacyBlogPage = lazy(() => import('./pages/pharmacy/PharmacyBlogPage').then(m => ({ default: m.PharmacyBlogPage })));
const PharmacyTemplatePage = lazy(() => import('./pages/pharmacy/PharmacyTemplatePage').then(m => ({ default: m.PharmacyTemplatePage })));
const StoreChannelsPage = lazy(() => import('./pages/pharmacy/StoreChannelsPage').then(m => ({ default: m.StoreChannelsPage })));
const StoreOrdersPage = lazy(() => import('./pages/pharmacy/StoreOrdersPage').then(m => ({ default: m.StoreOrdersPage })));
const StoreBillingPage = lazy(() => import('./pages/pharmacy/StoreBillingPage').then(m => ({ default: m.StoreBillingPage })));
const StoreSignagePage = lazy(() => import('./pages/pharmacy/StoreSignagePage').then(m => ({ default: m.StoreSignagePage })));
const StoreQRPage = lazy(() => import('./pages/pharmacy/StoreQRPage').then(m => ({ default: m.StoreQRPage })));
const StorePopPage = lazy(() => import('./pages/pharmacy/StorePopPage').then(m => ({ default: m.StorePopPage })));
const MarketingAnalyticsPage = lazy(() => import('./pages/pharmacy/MarketingAnalyticsPage').then(m => ({ default: m.MarketingAnalyticsPage })));
const StoreHomePage = lazy(() => import('./pages/pharmacy/StoreHomePage').then(m => ({ default: m.StoreHomePage })));
const ProductMarketingPage = lazy(() => import('./pages/pharmacy/ProductMarketingPage').then(m => ({ default: m.ProductMarketingPage })));
// default-as-named (wrapper 불필요)
const StoreAssetsPage = lazy(() => import('./pages/pharmacy/StoreAssetsPage'));
const StoreContentEditPage = lazy(() => import('./pages/pharmacy/StoreContentEditPage'));
const StoreLocalProductsPage = lazy(() => import('./pages/pharmacy/StoreLocalProductsPage'));
const StoreTabletDisplaysPage = lazy(() => import('./pages/pharmacy/StoreTabletDisplaysPage'));
// Pharmacy specific (not in barrel)
const StoreOrderWorktablePage = lazy(() => import('./pages/pharmacy/StoreOrderWorktablePage').then(m => ({ default: m.StoreOrderWorktablePage })));
const SignagePlaybackPage = lazy(() => import('./pages/pharmacy/SignagePlaybackPage').then(m => ({ default: m.SignagePlaybackPage })));
const SignagePlayerSelectPage = lazy(() => import('./pages/pharmacy/SignagePlayerSelectPage').then(m => ({ default: m.SignagePlayerSelectPage })));
const PharmacyInfoPage = lazy(() => import('./pages/pharmacy/PharmacyInfoPage').then(m => ({ default: m.PharmacyInfoPage })));
const StoreHubPage = lazy(() => import('./pages/pharmacy/StoreHubPage').then(m => ({ default: m.StoreHubPage })));
// PharmacyHubLayout는 정적 유지 (Layout)
import { PharmacyHubLayout } from './components/pharmacy/PharmacyHubLayout';

// WO-PHARMACY-MANAGEMENT-CONSOLIDATION-V1 Phase 2: Store Core v1.0 통합
import { StoreDashboardLayout, KPA_SOCIETY_STORE_CONFIG, resolveStoreMenu } from '@o4o/store-ui-core';
import { useStoreCapabilities } from './hooks/useStoreCapabilities';
import { KpaGlobalHeader } from './components/KpaGlobalHeader';
// Pharmacy B2B — Phase 2 lazy (barrel unwound)
const SupplierListPage = lazy(() => import('./pages/pharmacy/b2b/SupplierListPage').then(m => ({ default: m.SupplierListPage })));
const SupplierDetailPage = lazy(() => import('./pages/pharmacy/b2b/SupplierDetailPage').then(m => ({ default: m.SupplierDetailPage })));

// Work Pages — Phase 2 lazy (barrel unwound)
const WorkPage = lazy(() => import('./pages/work/WorkPage').then(m => ({ default: m.WorkPage })));
const WorkTasksPage = lazy(() => import('./pages/work/WorkTasksPage').then(m => ({ default: m.WorkTasksPage })));
const WorkLearningPage = lazy(() => import('./pages/work/WorkLearningPage').then(m => ({ default: m.WorkLearningPage })));
const WorkDisplayPage = lazy(() => import('./pages/work/WorkDisplayPage').then(m => ({ default: m.WorkDisplayPage })));
const WorkCommunityPage = lazy(() => import('./pages/work/WorkCommunityPage').then(m => ({ default: m.WorkCommunityPage })));

// AuthGate는 정적 유지 (Guard)
import { AuthGate } from './components/auth/AuthGate';
// ActivitySetupPage / PendingApprovalPage — Phase 2 lazy
const ActivitySetupPage = lazy(() => import('./pages/ActivitySetupPage').then(m => ({ default: m.ActivitySetupPage })));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage').then(m => ({ default: m.PendingApprovalPage })));

// MyContentPage — Phase 2 lazy
const MyContentPage = lazy(() => import('./pages/dashboard/MyContentPage').then(m => ({ default: m.MyContentPage })));

// WO-O4O-ROLEBASED-HOME-REMOVAL-AND-ROUTING-NORMALIZATION-V1: getDefaultRouteByRole 사용 제거

// WO-O4O-GUARD-PATTERN-NORMALIZATION-V1: 통일된 Guard 인터페이스
import { PharmacyGuard } from './components/auth/PharmacyGuard';
import { PharmacyOwnerOnlyGuard } from './components/auth/PharmacyOwnerOnlyGuard';
// WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1: HUB용 완화 가드
import { HubGuard } from './components/auth/HubGuard';

// Tablet Kiosk — Phase 2 lazy
const TabletStorePage = lazy(() => import('./pages/tablet/TabletStorePage').then(m => ({ default: m.TabletStorePage })));

// Store Blog — Phase 2 lazy
const StoreBlogPage = lazy(() => import('./pages/store/StoreBlogPage').then(m => ({ default: m.StoreBlogPage })));
const StoreBlogPostPage = lazy(() => import('./pages/store/StoreBlogPostPage').then(m => ({ default: m.StoreBlogPostPage })));

// Storefront Home — Phase 2 lazy
const StorefrontHomePage = lazy(() => import('./pages/store/StorefrontHomePage').then(m => ({ default: m.StorefrontHomePage })));

// Storefront Commerce — Phase 2 lazy
const StorefrontProductDetailPage = lazy(() => import('./pages/storefront/StorefrontProductDetailPage').then(m => ({ default: m.StorefrontProductDetailPage })));
const CheckoutPage = lazy(() => import('./pages/storefront/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const PaymentSuccessPage = lazy(() => import('./pages/storefront/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailPage = lazy(() => import('./pages/storefront/PaymentFailPage').then(m => ({ default: m.PaymentFailPage })));

// Public Content View — Phase 2 lazy (default-as-named, wrapper 불필요)
const PublicContentViewPage = lazy(() => import('./pages/content/PublicContentViewPage'));
const PrintContentPage = lazy(() => import('./pages/content/PrintContentPage'));

// Contents Hub — Phase 2 lazy (barrel unwound)
const ContentListPage = lazy(() => import('./pages/contents/ContentListPage').then(m => ({ default: m.ContentListPage })));
const ContentDetailPage = lazy(() => import('./pages/contents/ContentDetailPage').then(m => ({ default: m.ContentDetailPage })));
const ContentWritePage = lazy(() => import('./pages/contents/ContentWritePage').then(m => ({ default: m.ContentWritePage })));

// QR Landing Page — Phase 2 lazy
const QrLandingPage = lazy(() => import('./pages/qr/QrLandingPage'));

// Legacy pages — Phase 2 lazy (root barrel unwound)
const MemberApplyPage = lazy(() => import('./pages/MemberApplyPage').then(m => ({ default: m.MemberApplyPage })));
const MyApplicationsPage = lazy(() => import('./pages/MyApplicationsPage').then(m => ({ default: m.MyApplicationsPage })));

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

// WO-O4O-ROLEBASED-HOME-REMOVAL-AND-ROUTING-NORMALIZATION-V1:
// RoleBasedHome 제거 — "/" 는 항상 커뮤니티 홈 (역할 기반 자동 redirect 없음)
// 역할별 대시보드 진입은 Header 드롭다운("운영 대시보드" 등) 명시적 링크로만 제공
// WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1:
// DashboardRoute 제거 — /dashboard는 /mypage로 리다이렉트 처리

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

  // WO-O4O-STORE-CAPABILITY-CONSISTENCY-FIX-V1: GlycoPharm/K-Cosmetics와 동일한 capability 필터링 적용
  const enabledCaps = useStoreCapabilities();
  const resolvedConfig = resolveStoreMenu(KPA_SOCIETY_STORE_CONFIG, enabledCaps);

  return (
    <div className="min-h-screen flex flex-col">
      <KpaGlobalHeader />
      <StoreDashboardLayout
        config={resolvedConfig}
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

// WO-KPA-SOCIETY-APP-ROUTE-CODE-SPLITTING-V1: lazy fallback
function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner size="large" />
    </div>
  );
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
        <Suspense fallback={<PageLoader />}>
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
          <Route path="/" element={<AuthGate><Layout serviceName={SERVICE_NAME}><CommunityHomePage /></Layout></AuthGate>} />
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
          {/* WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1: 포럼 피드 (slug). 모든 literal 라우트 뒤에 위치 */}
          <Route path="/forum/:slug" element={<Layout serviceName={SERVICE_NAME}><ForumFeedPage /></Layout>} />

          {/* Market Trial — WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
              실행은 Neture 단독. 기존 URL은 backward-compat을 위해 redirect 유지. */}
          <Route path="/market-trial" element={<Layout serviceName={SERVICE_NAME}><MarketTrialNetureRedirect /></Layout>} />
          <Route path="/market-trial/my" element={<Layout serviceName={SERVICE_NAME}><MarketTrialNetureRedirect /></Layout>} />
          <Route path="/market-trial/:id" element={<Layout serviceName={SERVICE_NAME}><MarketTrialNetureRedirect /></Layout>} />



          {/* Guide Pages (WO-KPA-GUIDE-INTRO-PAGE-V1 / WO-KPA-GUIDE-INTRO-SUBPAGES-V1) — public, no auth */}
          <Route path="/guide/intro" element={<Layout serviceName={SERVICE_NAME}><GuideIntroPage /></Layout>} />
          <Route path="/guide/intro/structure" element={<Layout serviceName={SERVICE_NAME}><GuideIntroStructurePage /></Layout>} />
          <Route path="/guide/intro/kpa" element={<Layout serviceName={SERVICE_NAME}><GuideIntroKpaPage /></Layout>} />
          <Route path="/guide/intro/operation" element={<Layout serviceName={SERVICE_NAME}><GuideIntroOperationPage /></Layout>} />
          <Route path="/guide/intro/concept" element={<Layout serviceName={SERVICE_NAME}><GuideIntroConceptPage /></Layout>} />
          <Route path="/guide/usage" element={<Layout serviceName={SERVICE_NAME}><GuideUsagePage /></Layout>} />
          <Route path="/guide/features" element={<Layout serviceName={SERVICE_NAME}><GuideFeaturesPage /></Layout>} />
          <Route path="/guide/features/forum" element={<Layout serviceName={SERVICE_NAME}><GuideFeatureForumPage /></Layout>} />
          <Route path="/guide/features/resources" element={<Layout serviceName={SERVICE_NAME}><GuideFeatureResourcesPage /></Layout>} />
          <Route path="/guide/features/content" element={<Layout serviceName={SERVICE_NAME}><GuideFeatureContentPage /></Layout>} />
          <Route path="/guide/features/signage" element={<Layout serviceName={SERVICE_NAME}><GuideFeatureSignagePage /></Layout>} />
          <Route path="/guide/features/qr" element={<Layout serviceName={SERVICE_NAME}><GuideFeatureQrTabletPage /></Layout>} />
          <Route path="/guide/features/store" element={<Layout serviceName={SERVICE_NAME}><GuideFeatureStorePage /></Layout>} />
          <Route path="/guide/features/lms" element={<Layout serviceName={SERVICE_NAME}><GuideFeatureLmsPage /></Layout>} />

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

          {/* ──────────────────────────────────────────────────────────────────
              Content Hub
              WO-KPA-CONTENT-HUB-FOUNDATION-V1 / WO-CONTENT-HUB-STRUCTURE-AND-TABLE-FOUNDATION-V1
              WO-KPA-CONTENT-SECTION-CREATE-FLOW-ALIGN-V1 (Phase 1):
                섹션별 등록 라우트(/content/{documents,surveys,courses}/new) 도입.
                저장 후 returnTo/redirectAfterCreate가 content hub 섹션으로 복귀.
                레거시 /content/new* 는 신규 라우트로 redirect.
              ────────────────────────────────────────────────────────────────── */}
          <Route path="/content" element={<Layout serviceName={SERVICE_NAME}><ContentListPage /></Layout>} />

          {/* 섹션별 등록 — Phase 1 신규 라우트 */}
          <Route path="/content/documents/new" element={<Layout serviceName={SERVICE_NAME}><ContentWritePage /></Layout>} />
          <Route path="/content/surveys/new" element={
            <Layout serviceName={SERVICE_NAME}>
              <ParticipationCreatePage
                pageTitle="새 설문 만들기"
                pageDescription="구성원 의견을 수집하는 설문을 만듭니다"
                breadcrumb={[
                  { label: '홈', href: '/' },
                  { label: '콘텐츠', href: '/content' },
                  { label: '설문', href: '/content/surveys' },
                  { label: '새 설문' },
                ]}
                returnTo="/content/surveys"
                allowedQuestionTypes={[QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE, QuestionType.FREE_TEXT]}
              />
            </Layout>
          } />
          <Route path="/content/courses/new" element={
            <Layout serviceName={SERVICE_NAME}>
              <CourseNewPage
                pageTitle="새 코스형 자료 만들기"
                backLinkText="← 콘텐츠 허브"
                returnTo="/content/courses"
                redirectAfterCreate={(id) => `/content/courses/${id}`}
                redirectAfterCreateFallback="/content/courses"
              />
            </Layout>
          } />

          {/* 섹션 목록 — Phase 2까지 임시 redirect로 사용자가 만든 항목을 즉시 확인 */}
          <Route path="/content/surveys" element={<Navigate to="/participation" replace />} />
          <Route path="/content/courses" element={<Navigate to="/instructor/courses" replace />} />
          <Route path="/content/courses/:id" element={<Navigate to="/instructor/courses" replace />} />

          {/* 콘텐츠 상세/수정 (sub_type='content' 문서) */}
          <Route path="/content/:id" element={<Layout serviceName={SERVICE_NAME}><ContentDetailPage /></Layout>} />
          <Route path="/content/:id/edit" element={<Layout serviceName={SERVICE_NAME}><ContentWritePage /></Layout>} />

          {/* Legacy redirects → 신규 섹션 라우트 */}
          <Route path="/content/new" element={<Navigate to="/content/documents/new" replace />} />
          <Route path="/content/write" element={<Navigate to="/content/documents/new" replace />} />
          <Route path="/content/new/survey" element={<Navigate to="/content/surveys/new" replace />} />
          <Route path="/content/new/course" element={<Navigate to="/content/courses/new" replace />} />
          <Route path="/content/new/lecture" element={<Navigate to="/content/courses/new" replace />} />
          {/* 퀴즈는 LMS 전용 (WO-KPA-CONTENT-QUIZ-REMOVE-V1) — /lms로 리다이렉트 */}
          <Route path="/content/new/quiz" element={<Navigate to="/lms" replace />} />

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

            {/* ── WO-O4O-STORE-REQUESTS-UNIFIED-MENU-V1: 상담 요청 독립 메뉴 ── */}
            <Route path="requests" element={<TabletRequestsPage />} />

            {/* ── Hidden routes (사이드바 미표시, URL 직접 접근 유지) ── */}
            <Route path="channels" element={<StoreChannelsPage />} />
            <Route path="channels/tablet" element={<Navigate to="/store/requests" replace />} />
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
        </Suspense>
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
        {/* WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1: 포럼 피드 */}
        <Route path="/forum/:slug" element={<ForumFeedPage />} />

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
