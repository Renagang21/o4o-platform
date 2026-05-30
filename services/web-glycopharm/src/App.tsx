import { lazy, Suspense, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
// WO-O4O-STORE-PRODUCTS-QUERYCLIENT-PROVIDER-ALIGN-V1
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});
import { AuthProvider, useAuth, getGlycopharmDashboardRoute } from '@/contexts/AuthContext';
import { GLYCOPHARM_ROLES } from '@/lib/role-constants';
import { LoginModalProvider, useLoginModal } from '@/contexts/LoginModalContext';
// WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1: /register 페이지 제거 + 모달 직접 호출
import { RegisterModalProvider, useRegisterModal } from '@/contexts/RegisterModalContext';
import { RegisterFlowModal } from '@/pages/auth/RegisterFlowModal';
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
// WO-O4O-GLYCOPHARM-MY-STORE-MENU-MEMBERSHIP-GUARD-V1
import { PharmacyStoreGuard } from '@/components/auth/PharmacyStoreGuard';

// WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 매장 경영자용 매장 상품 관리 (공통 패키지)
import { StoreProductsManagerPage } from '@o4o/store-products-ui';

// Public Pages (always loaded - first paint)
import LoginPage from '@/pages/auth/LoginPage';
import HandoffPage from '@/pages/HandoffPage';
import AccountRecoveryPage from '@/pages/auth/AccountRecoveryPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
// WO-O4O-AUTH-VERIFY-EMAIL-FRONTEND-PAGE-V1: 이메일 인증 결과 페이지
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
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
// WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1: RegisterPage 제거 — RegisterFlowModal 로 단일화
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
// WO-O4O-GLYCOPHARM-OPERATOR-ADMIN-CONSOLE-KPA-ALIGNMENT-V1: Admin 회원 완전 삭제 관리
const GlycoPharmAdminMembersPage = lazy(() => import('@/pages/admin/GlycoPharmAdminMembersPage'));

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
// Operator Guide Contents (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1)
const OperatorGuideContentsPage = lazy(() => import('@/pages/operator/OperatorGuideContentsPage'));
// Operator Content Management (WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1)
const OperatorContentPage = lazy(() => import('@/pages/operator/OperatorContentPage'));

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
const HubContentDetailPage = lazy(() => import('@/pages/hub/HubContentDetailPage'));
// WO-O4O-GLYCOPHARM-EVENT-OFFERS-HUB-CANONICAL-ALIGNMENT-V1
const HubEventOffersPage = lazy(() => import('@/pages/hub/HubEventOffersPage').then(m => ({ default: m.HubEventOffersPage })));
// WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1
const HubBlogLibraryPage = lazy(() => import('@/pages/hub/HubBlogLibraryPage').then(m => ({ default: m.HubBlogLibraryPage })));
// WO-O4O-GLYCOPHARM-HUB-POP-QR-LIBRARY-PAGES-V1
const HubPopLibraryPage = lazy(() => import('@/pages/hub/HubPopLibraryPage').then(m => ({ default: m.HubPopLibraryPage })));
const HubQrLibraryPage = lazy(() => import('@/pages/hub/HubQrLibraryPage').then(m => ({ default: m.HubQrLibraryPage })));
import { GlycoPharmHubLayout } from '@/components/layouts/GlycoPharmHubLayout';
import { GlycoHubGuard } from '@/components/auth/GlycoHubGuard';

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

// Pharmacy Store Apply — REMOVED (WO-O4O-GLYCOPHARM-STORE-APPLY-DEAD-CODE-REMOVAL-V1)
// 5개월 사용 0 + UI 진입로 0 + validation 부재로 submit 자체 불가 (soft dead).
// IR-O4O-BUSINESS-REGISTRATION-FIELDS-CROSSSERVICE-AUDIT-V1 의 P0 조사 결과 dead code 확정.

// WO-STORE-BILLING-FOUNDATION-V1: 정산/인보이스
const StoreBillingPage = lazy(() => import('@/pages/store-management/StoreBillingPage'));

// WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1
const PharmacyInfoPage = lazy(() => import('@/pages/store/PharmacyInfoPage'));

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
const ForumMemberManagementPage = lazy(() => import('@/pages/forum/ForumMemberManagementPage'));
const ForumFeedbackPage = lazy(() => import('@/pages/forum/ForumFeedbackPage'));
const EducationPage = lazy(() => import('@/pages/education/EducationPage'));
const CourseDetailPage = lazy(() => import('@/pages/education/CourseDetailPage'));
// WO-O4O-GLYCOPHARM-CONTENT-RESOURCES-ROUTE-ALIGNMENT-V1
const ResourcesPage = lazy(() => import('@/pages/resources/ResourcesPage').then(m => ({ default: m.ResourcesPage })));
// WO-GLYCOPHARM-INSTRUCTOR-OPERATOR-V1
const InstructorDashboardPage = lazy(() => import('@/pages/instructor/InstructorDashboardPage'));
// WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-PARITY-V1
const InstructorCoursesPage = lazy(() => import('@/pages/instructor/InstructorCoursesPage'));
const InstructorCourseEditPage = lazy(() => import('@/pages/instructor/InstructorCourseEditPage'));
const InstructorEnrollmentsPage = lazy(() => import('@/pages/instructor/InstructorEnrollmentsPage'));
// WO-O4O-GLYCOPHARM-LMS-PHASE1-OPERATOR-PARITY-V1: OperatorLmsCoursesPage로 교체
const OperatorLmsCoursesPage = lazy(() => import('@/pages/operator/OperatorLmsCoursesPage'));

// WO-O4O-GLYCOPHARM-AI-CONTENT-ACTIVATION-V1
const OperatorResourcesPage = lazy(() => import('@/pages/operator/OperatorResourcesPage'));

// WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1: Blog + POP HUB write
const OperatorBlogListPage = lazy(() => import('@/pages/operator/blog/OperatorBlogListPage'));
const OperatorBlogWritePage = lazy(() => import('@/pages/operator/blog/OperatorBlogWritePage'));
const OperatorPopListPage = lazy(() => import('@/pages/operator/pop/OperatorPopListPage'));
const OperatorPopWritePage = lazy(() => import('@/pages/operator/pop/OperatorPopWritePage'));
const OperatorQrListPage = lazy(() => import('@/pages/operator/qr/OperatorQrListPage'));
const OperatorQrWritePage = lazy(() => import('@/pages/operator/qr/OperatorQrWritePage'));
const QualificationRequestsPage = lazy(() => import('@/pages/operator/QualificationRequestsPage'));
const EventOfferManagePage = lazy(() => import('@/pages/operator/event-offer/EventOfferManagePage'));
const OperatorStoreChannelsPage = lazy(() => import('@/pages/operator/store-channels/OperatorStoreChannelsPage'));
const OperatorSurveyListPage = lazy(() => import('@/pages/operator/survey/OperatorSurveyListPage'));
const OperatorSurveyCreatePage = lazy(() => import('@/pages/operator/survey/OperatorSurveyCreatePage'));

// MyPage 3-split (WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1)
const MyPageHub = lazy(() => import('@/pages/mypage/MyPageHub'));
const MyProfilePage = lazy(() => import('@/pages/mypage/MyProfilePage'));
const MySettingsPage = lazy(() => import('@/pages/mypage/MySettingsPage'));
// MyPage LMS (WO-O4O-GLYCOPHARM-LMS-PHASE2-LEARNER-FRONTEND-V1)
const MyEnrollmentsPage = lazy(() => import('@/pages/mypage/MyEnrollmentsPage'));
const MyCertificatesPage = lazy(() => import('@/pages/mypage/MyCertificatesPage'));
const MyCreditsPage = lazy(() => import('@/pages/mypage/MyCreditsPage'));
// WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
const MyRequestsInboxPage = lazy(() => import('@/pages/mypage/MyRequestsPage'));
// Lesson Player (WO-O4O-GLYCOPHARM-LMS-PHASE2-LEARNER-FRONTEND-V1)
const LmsLessonPage = lazy(() => import('@/pages/education/LmsLessonPage'));


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

// WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1: 내 자료함
const StoreLibraryContentsPage = lazy(() => import('@/pages/store-management/StoreLibraryContentsPage'));
const StoreLibraryResourcesPage = lazy(() => import('@/pages/store-management/StoreLibraryResourcesPage'));
// WO-O4O-STORE-PRODUCTION-MATERIALS-CROSSSERVICE-PHASE2-C-V1: 제작 자료
const StoreProductionMaterialsPage = lazy(() => import('@/pages/store-management/StoreProductionMaterialsPage'));
// WO-O4O-PRODUCTION-AI-EDITOR-CROSSSERVICE-PHASE2-I-V1: AI 제작 자료 편집
const ProductionMaterialEditorPage = lazy(() => import('@/pages/store-management/ProductionMaterialEditorPage'));

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
/**
 * WO-O4O-GLYCOPHARM-STORE-PATH-NESTED-MIGRATION-V1
 * Dynamic-param-aware redirect wrapper. ':paramName' placeholder 를 actual URL param 값으로 치환.
 * Usage: <ParamRedirect to="/store/marketing/signage/play/:playlistId" />
 */
function ParamRedirect({ to }: { to: string }) {
  const params = useParams();
  const target = Object.entries(params).reduce(
    (acc, [k, v]) => acc.split(`:${k}`).join(v ?? ''),
    to,
  );
  return <Navigate to={target} replace />;
}

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
// WO-O4O-GLYCOPHARM-FRONTEND-CARE-TYPE-UNION-CLEANUP-V1 (W5d-Frontend):
//   feature union 에서 'care' 제거 — backend Care alert pipeline 정리 (W5b commit 1c65e0ad0) 와 정합.
//   실제 SoftGuard 호출은 feature='mypage' 만 사용 중 — 'care' 호출 0건이므로 type 좁히기 안전.
function SoftGuard({ feature, allowedRoles, children }: {
  feature: 'store' | 'mypage';
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

// WO-O4O-GLYCOPHARM-LOGIN-PAGE-TO-MODAL-ALIGNMENT-V1:
//   /login 직접 접근 시 별도 로그인 페이지 대신 홈으로 이동 + 로그인 모달 자동 오픈.
//   RoleGuard 가 state.from 으로 보내는 returnUrl 은 sessionStorage 에 보존 →
//   LoginModal 로그인 성공 시 해당 경로로 복귀.
const LOGIN_RETURN_URL_KEY = 'glycopharm_login_return_url';
function LoginGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openLoginModal } = useLoginModal();

  useEffect(() => {
    const returnUrl = (location.state as { from?: string } | null)?.from;
    if (returnUrl) {
      sessionStorage.setItem(LOGIN_RETURN_URL_KEY, returnUrl);
    } else {
      sessionStorage.removeItem(LOGIN_RETURN_URL_KEY);
    }
    navigate('/', { replace: true });
    openLoginModal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1:
//   전역 RegisterFlowModal 마운트 — RegisterModalContext 의 isRegisterModalOpen / closeRegisterModal 와 wiring.
//   진입점(상단 메뉴 / 로그인 화면 / Footer 등) 은 useRegisterModal().openRegisterModal() 호출.
function GlobalRegisterModal() {
  const { isRegisterModalOpen, closeRegisterModal } = useRegisterModal();
  return <RegisterFlowModal open={isRegisterModalOpen} onClose={closeRegisterModal} />;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* WO-O4O-GLYCOPHARM-HOME-KPA-ALIGNMENT-V1: / = Home 직접 연결 */}
      <Route path="handoff" element={<HandoffPage />} />
      {/* WO-O4O-GLYCOPHARM-LOGIN-PAGE-TO-MODAL-ALIGNMENT-V1: /login → 홈 + 로그인 모달 */}
      <Route path="login" element={<LoginGate />} />
      {/* WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1: /register 라우트 제거.
          가입신청은 상단 메뉴 / 로그인 화면의 버튼이 useRegisterModal().openRegisterModal() 로 직접 호출.
          /register 직접 접근 시 홈으로 리다이렉트. */}
      <Route path="register" element={<Navigate to="/" replace />} />
      <Route path="forgot-password" element={<AccountRecoveryPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="auth/verify-email" element={<VerifyEmailPage />} />
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
        {/* WO-O4O-FORUM-MEMBER-MANAGEMENT-EXPANSION-FRONTEND-V1 */}
        <Route path="forum/my-dashboard/:forumId/members" element={<ForumMemberManagementPage />} />
        <Route path="forum/feedback" element={<ForumFeedbackPage />} />
        {/* WO-O4O-GLYCOPHARM-HOME-KPA-ALIGNMENT-V1: /lms 통일 */}
        {/* WO-O4O-LMS-ROUTING-UNIFICATION-V1: Canonical /lms/course/:id 정렬 */}
        <Route path="lms" element={<EducationPage />} />
        <Route path="lms/course/:id" element={<CourseDetailPage />} />
        {/* WO-O4O-GLYCOPHARM-LMS-PHASE2-LEARNER-FRONTEND-V1: 레슨 플레이어 */}
        <Route path="lms/course/:courseId/lesson/:lessonId" element={<LmsLessonPage />} />
        <Route path="lms/:id" element={<LmsCourseRedirect />} />
        {/* WO-O4O-GLYCOPHARM-CONTENT-RESOURCES-ROUTE-ALIGNMENT-V1: top-level canonical paths */}
        <Route path="content" element={<HubContentListPage />} />
        <Route path="hub/content/:id" element={<HubContentDetailPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        {/* Instructor — WO-GLYCOPHARM-INSTRUCTOR-OPERATOR-V1 + WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-PARITY-V1 */}
        <Route path="instructor" element={
          <RoleGuard allowedRoles={['lms:instructor', 'glycopharm:admin', 'glycopharm:operator', 'platform:super_admin']}>
            <InstructorDashboardPage />
          </RoleGuard>
        } />
        <Route path="instructor/courses" element={
          <RoleGuard allowedRoles={['lms:instructor', 'glycopharm:admin', 'glycopharm:operator', 'platform:super_admin']}>
            <InstructorCoursesPage />
          </RoleGuard>
        } />
        <Route path="instructor/courses/new" element={
          <RoleGuard allowedRoles={['lms:instructor', 'glycopharm:admin', 'glycopharm:operator', 'platform:super_admin']}>
            <InstructorCourseEditPage />
          </RoleGuard>
        } />
        <Route path="instructor/courses/:courseId" element={
          <RoleGuard allowedRoles={['lms:instructor', 'glycopharm:admin', 'glycopharm:operator', 'platform:super_admin']}>
            <InstructorCourseEditPage />
          </RoleGuard>
        } />
        <Route path="instructor/courses/:courseId/enrollments" element={
          <RoleGuard allowedRoles={['lms:instructor', 'glycopharm:admin', 'glycopharm:operator', 'platform:super_admin']}>
            <InstructorEnrollmentsPage />
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
        {/* WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1: GlycoHubGuard 접근 보호 추가 */}
        <Route path="store-hub" element={<GlycoHubGuard><GlycoPharmHubLayout /></GlycoHubGuard>}>
          <Route index element={<GlycoStoreHubPage />} />
          <Route path="b2b" element={<HubB2BCatalogPage />} />
          <Route path="content" element={<HubContentListPage />} />
          <Route path="signage" element={<Navigate to="/store/marketing/signage/library" replace />} />
          {/* WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1: 블로그 탭 추가 */}
          <Route path="blog" element={<HubBlogLibraryPage />} />
          {/* WO-O4O-GLYCOPHARM-HUB-POP-QR-LIBRARY-PAGES-V1: POP / QR 탭 추가 (조회 전용) */}
          <Route path="pop" element={<HubPopLibraryPage />} />
          <Route path="qr" element={<HubQrLibraryPage />} />
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
        {/* WO-O4O-GLYCOPHARM-LMS-PHASE2-LEARNER-FRONTEND-V1: MyPage LMS */}
        <Route path="mypage/enrollments" element={
          <SoftGuard feature="mypage">
            <MyEnrollmentsPage />
          </SoftGuard>
        } />
        <Route path="mypage/certificates" element={
          <SoftGuard feature="mypage">
            <MyCertificatesPage />
          </SoftGuard>
        } />
        <Route path="mypage/credits" element={
          <SoftGuard feature="mypage">
            <MyCreditsPage />
          </SoftGuard>
        } />
        {/* WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1 */}
        <Route path="mypage/my-requests" element={
          <SoftGuard feature="mypage">
            <MyRequestsInboxPage />
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
        {/* WO-O4O-GLYCOPHARM-OPERATOR-ADMIN-CONSOLE-KPA-ALIGNMENT-V1: Admin 회원 관리 (soft+hard delete) */}
        <Route path="members" element={<GlycoPharmAdminMembersPage />} />
        <Route path="members/:id" element={<UserDetailPage />} />
        <Route path="users" element={<Navigate to="/admin/members" replace />} />
        <Route path="users/:id" element={<Navigate to="/admin/members" replace />} />
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
        {/* legacy redirect: /operator/glycopharm-members → /operator/members */}
        <Route path="glycopharm-members" element={<Navigate to="/operator/members" replace />} />
        {/* WO-O4O-GLYCOPHARM-OPERATOR-ROUTE-CANONICALIZATION-V1: canonical route */}
        <Route path="members" element={<UsersPage />} />
        <Route path="members/:id" element={<UserDetailPage />} />
        {/* backward compat redirect: /operator/users → /operator/members */}
        <Route path="users" element={<Navigate to="/operator/members" replace />} />
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
        {/* Content Management 공지/뉴스 (WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1) */}
        <Route path="content-management" element={<OperatorContentPage />} />
        {/* LMS Management (WO-O4O-GLYCOPHARM-LMS-PHASE1-OPERATOR-PARITY-V1) */}
        {/* canonical: /operator/lms — legacy /operator/lms/courses redirect 유지 */}
        <Route path="lms" element={<OperatorLmsCoursesPage />} />
        <Route path="lms/courses" element={<Navigate to="/operator/lms" replace />} />
        {/* Resources Management + AI Content (WO-O4O-GLYCOPHARM-AI-CONTENT-ACTIVATION-V1) */}
        <Route path="resources" element={<OperatorResourcesPage />} />
        {/* Store HUB Blog write (WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1) */}
        <Route path="blog" element={<OperatorBlogListPage />} />
        <Route path="blog/new" element={<OperatorBlogWritePage />} />
        <Route path="blog/:id/edit" element={<OperatorBlogWritePage />} />
        {/* Store HUB POP write (WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1) */}
        <Route path="pop" element={<OperatorPopListPage />} />
        <Route path="pop/new" element={<OperatorPopWritePage />} />
        <Route path="pop/:id/edit" element={<OperatorPopWritePage />} />
        {/* Store HUB QR write (WO-O4O-GLYCOPHARM-OPERATOR-QR-WRITE-FRONTEND-V1) */}
        <Route path="qr" element={<OperatorQrListPage />} />
        <Route path="qr/new" element={<OperatorQrWritePage />} />
        <Route path="qr/:id/edit" element={<OperatorQrWritePage />} />
        {/* LMS Qualification (WO-O4O-GLYCOPHARM-OPERATOR-LMS-QUALIFICATION-WORKFLOW-V1) */}
        <Route path="qualification-requests" element={<QualificationRequestsPage />} />
        {/* Event Offer Approval (WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1) */}
        <Route path="event-offers" element={<EventOfferManagePage />} />
        {/* Store Channels (WO-O4O-GLYCOPHARM-OPERATOR-STORE-CHANNELS-V1) */}
        <Route path="store-channels" element={<OperatorStoreChannelsPage />} />
        {/* Surveys (WO-O4O-GLYCOPHARM-OPERATOR-SURVEYS-V1) */}
        <Route path="surveys" element={<OperatorSurveyListPage />} />
        <Route path="surveys/new" element={<OperatorSurveyCreatePage />} />
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
      {/* WO-O4O-GLYCOPHARM-STORE-OWNER-ROUTE-GUARD-FIX-V1 + WO-O4O-GLYCOPHARM-MY-STORE-MENU-FLICKER-FIX-V1:
          glycopharm:store_owner / operator / admin / super_admin 진입 보장.
          WO-O4O-GLYCOPHARM-MY-STORE-MENU-MEMBERSHIP-GUARD-V1:
          membership 기반 약국 회원 (service_memberships.glycopharm.role='pharmacy' status active|approved)
          도 진입 허용 — 헤더 isPharmacy 정책과 정렬. allowedRoles 만 검사하던 ProtectedRoute 는
          unprefixed 'pharmacy' role / membership 사용자를 거부 → '내 약국' 클릭 시 / 리다이렉트 (화면 변화 없음 증상). */}
      <Route
        path="store"
        element={
          <PharmacyStoreGuard>
            <StoreLayoutWrapper />
          </PharmacyStoreGuard>
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
        {/* WO-O4O-GLYCOPHARM-STORE-PATH-NESTED-MIGRATION-V1:
              commerce / marketing / library 영역 nested canonical 정렬.
              기존 flat path 는 아래 redirect alias 로 유지. */}
        <Route path="commerce/local-products" element={<StoreLocalProductsPage />} />
        <Route path="commerce/tablet-displays" element={<StoreTabletDisplaysPage />} />
        <Route path="commerce/orders" element={<PharmacyOrders />} />
        {/* channels: 채널 관리 (WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1) */}
        <Route path="channels" element={<StoreChannelsPage />} />
        <Route path="content" element={<StoreAssetsPage />} />
        {/* Blog (WO-O4O-GLYCO-BLOG-INTRODUCE-V1) — staff 작성/관리 */}
        <Route path="content/blog" element={<PharmacyBlogPage />} />
        {/* WO-O4O-GLYCO-CARE-CLEANUP-V1: /store/services (PharmacyPatients) 라우트 제거.
            환자/Care 직접 관리 시스템은 현재 canonical 구조에 포함되지 않음. */}
        <Route path="settings" element={<PharmacySettings />} />
        {/* WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1:
              약국 경영자 (store_owner) 만 접근 — 약국·사업자 정보 조회·수정 */}
        <Route
          path="info"
          element={
            <RoleGuard
              allowedRoles={[
                'glycopharm:store_owner',
                GLYCOPHARM_ROLES.ADMIN,
                GLYCOPHARM_ROLES.PLATFORM_SUPER_ADMIN,
              ]}
            >
              <PharmacyInfoPage />
            </RoleGuard>
          }
        />
        {/* WO-O4O-GLYCOPHARM-STORE-APPLY-DEAD-CODE-REMOVAL-V1:
            <Route path="apply" element={<StoreApplyPage />} /> 제거. dead code. */}
        {/* billing: 정산/인보이스 (WO-STORE-BILLING-FOUNDATION-V1) */}
        <Route path="billing" element={<StoreBillingPage />} />
        {/* WO-O4O-GLYCOPHARM-STORE-PATH-NESTED-MIGRATION-V1:
              Signage → /store/marketing/signage/* canonical (KPA 정합).
              기존 /store/signage/* flat path 는 아래 redirect alias 로 유지. */}
        {/* Signage — WO-O4O-GLYCOPHARM-SIGNAGE-PHASE1-V1 + IA-RESTRUCTURE-V2 */}
        <Route path="marketing/signage" element={<Navigate to="/store/marketing/signage/playlist" replace />} />
        <Route path="marketing/signage/playlist" element={<StoreSignageMainPage />} />
        <Route path="marketing/signage/videos" element={<StoreSignageMainPage />} />
        <Route path="marketing/signage/schedules" element={<StoreSignageMainPage />} />
        <Route path="marketing/signage/player" element={<SignagePlayerSelectPage />} />
        <Route path="marketing/signage/play/:playlistId" element={<SignagePlaybackPage />} />
        {/* Legacy signage routes (maintained for backward compat) */}
        <Route path="marketing/signage/library" element={<ContentLibraryPage />} />
        <Route path="marketing/signage/playlist/:id" element={<SignagePlaylistDetailPage />} />
        <Route path="marketing/signage/media/:id" element={<SignageMediaDetailPage />} />
        <Route path="marketing/signage/preview" element={<SignagePreviewPage />} />
        {/* Extensions */}
        <Route path="b2b-order" element={<B2BOrderPage />} />
        <Route path="requests" element={<CustomerRequestsPage />} />
        <Route path="funnel" element={<FunnelPage />} />
        {/* POP 생성 (WO-O4O-GLYCOPHARM-POP-STORE-EXECUTION-V1) */}
        <Route path="marketing/pop" element={<StorePopPage />} />
        {/* QR 관리 (WO-O4O-GLYCOPHARM-QR-STORE-EXECUTION-V1) */}
        <Route path="marketing/qr" element={<StoreQrPage />} />
        {/* 내 자료함 (WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1 / PHASE2-C-V1) */}
        <Route path="library/contents" element={<StoreLibraryContentsPage />} />
        <Route path="library/resources" element={<StoreLibraryResourcesPage />} />
        <Route path="library/production-materials" element={<StoreProductionMaterialsPage />} />
        <Route path="library/production-materials/new" element={<ProductionMaterialEditorPage />} />
        <Route path="management" element={<PharmacyManagement />} />
        <Route path="management/b2b" element={<PharmacyB2BProducts />} />

        {/* WO-O4O-GLYCOPHARM-STORE-PATH-NESTED-MIGRATION-V1:
              기존 flat path → nested canonical redirect alias.
              사용자 북마크 / 기존 link 호환. 단순 Navigate replace 사용.
              dynamic :param 은 ParamRedirect 사용. */}
        <Route path="pop"               element={<Navigate to="/store/marketing/pop" replace />} />
        <Route path="qr"                element={<Navigate to="/store/marketing/qr" replace />} />
        <Route path="signage"           element={<Navigate to="/store/marketing/signage/playlist" replace />} />
        <Route path="signage/playlist"  element={<Navigate to="/store/marketing/signage/playlist" replace />} />
        <Route path="signage/videos"    element={<Navigate to="/store/marketing/signage/videos" replace />} />
        <Route path="signage/schedules" element={<Navigate to="/store/marketing/signage/schedules" replace />} />
        <Route path="signage/player"    element={<Navigate to="/store/marketing/signage/player" replace />} />
        <Route path="signage/library"   element={<Navigate to="/store/marketing/signage/library" replace />} />
        <Route path="signage/preview"   element={<Navigate to="/store/marketing/signage/preview" replace />} />
        <Route path="signage/play/:playlistId" element={<ParamRedirect to="/store/marketing/signage/play/:playlistId" />} />
        <Route path="signage/playlist/:id"     element={<ParamRedirect to="/store/marketing/signage/playlist/:id" />} />
        <Route path="signage/media/:id"        element={<ParamRedirect to="/store/marketing/signage/media/:id" />} />
        <Route path="local-products"    element={<Navigate to="/store/commerce/local-products" replace />} />
        <Route path="orders"            element={<Navigate to="/store/commerce/orders" replace />} />
        <Route path="tablet-displays"   element={<Navigate to="/store/commerce/tablet-displays" replace />} />
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
            <RegisterModalProvider>
            {/* WO-O4O-TEMPLATE-PROVIDER-V1: 서비스 디자인 토큰 자동 주입 */}
            <TemplateProvider template={templates[glycopharmConfig.template]}>
            <O4OToastProvider />
            <LoginModal />
            {/* WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1: 전역 가입신청 모달 */}
            <GlobalRegisterModal />
            {/* WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1: 역할 기반 redirect 단일화 */}
            <PostLoginRedirect />
            <Suspense fallback={<PageLoading />}>
              <AppRoutes />
            </Suspense>
            </TemplateProvider>
            </RegisterModalProvider>
          </LoginModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </O4OErrorBoundary>
    </QueryClientProvider>
  );
}
