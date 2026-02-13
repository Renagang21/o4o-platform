/**
 * Neture - o4o 플랫폼 기반 서비스
 *
 * Work Orders:
 * - WO-SUPPLIER-OPS-ROUTE-REFACTOR-V1: /workspace 기준 라우트 분리
 *
 * 구조:
 * 1. o4o 공통 영역 (/, /o4o, /channel/*, /seller/overview/*, /partner/overview-info)
 * 2. Neture 고유 기능 (/workspace/*) - 공급자 중심 운영·연결 서비스
 *
 * HARD RULES:
 * - /workspace는 공급자 중심 운영·연결 서비스
 * - admin/operator는 /workspace 전용
 * - o4o 공통 영역에서는 공급자/파트너 운영 기능 노출 금지
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, LoginModalProvider, useLoginModal, useAuth, ROLE_DASHBOARDS } from './contexts';
import LoginModal from './components/LoginModal';
import MainLayout from './components/layouts/MainLayout';
import SupplierOpsLayout from './components/layouts/SupplierOpsLayout';
import AdminVaultLayout from './components/layouts/AdminVaultLayout';

// ============================================================================
// o4o 공통 페이지 (항상 로드)
// ============================================================================
import O4OIntroPage from './pages/O4OIntroPage';
import SellerOverviewPage from './pages/SellerOverviewPage';
import SellerQRGuidePage from './pages/SellerQRGuidePage';
import {
  SellerOverviewPharmacy,
  SellerOverviewBeauty,
  SellerOverviewMarket,
  MedicalOverviewPage,
} from './pages/seller';
import PartnerOverviewInfoPage from './pages/PartnerOverviewInfoPage';
import {
  DentalChannelExplanationPage,
  PharmacyChannelExplanationPage,
  OpticalChannelExplanationPage,
  MedicalChannelExplanationPage,
  ChannelSalesStructurePage,
} from './pages/channel';

// Test Guide Pages (o4o 공통 - 다중 서비스)
import {
  TestGuidePage,
  ContentEditorManualPage,
  KCosmeticsServiceManualPage,
  GlycoPharmServiceManualPage,
  GlucoseViewServiceManualPage,
  KpaSocietyServiceManualPage,
} from './pages/test-guide';

// o4o Public Site Pages (WO-O4O-PUBLIC-SITE-PHASE1-BUILD-V1)
import O4OMainPage from './pages/o4o/O4OMainPage';
import OtherTargetsPage from './pages/o4o/OtherTargetsPage';
import SiteOperatorPage from './pages/o4o/SiteOperatorPage';
import {
  PharmacyTargetPage,
  ClinicTargetPage,
  SalonTargetPage,
  OpticalTargetPage,
} from './pages/o4o/targets';
import ConceptsPage from './pages/manual/concepts/ConceptsPage';
import ChannelMapPage from './pages/manual/concepts/ChannelMapPage';
import BusinessInquiryPage from './pages/o4o/BusinessInquiryPage';
import ConsultationRequestPage from './pages/o4o/ConsultationRequestPage';

// Admin Vault Pages (WO-O4O-ADMIN-VAULT-ACCESS-V1)
import {
  VaultOverviewPage,
  VaultDocsPage,
  VaultArchitecturePage,
  VaultNotesPage,
  VaultInquiriesPage,
} from './pages/admin-vault';

// Test Center (다중 서비스)
import TestCenterPage from './pages/TestCenterPage';

// Contact (문의 안내)
import ContactPage from './pages/ContactPage';

// ============================================================================
// Neture 고유 페이지 (/workspace)
// ============================================================================
import HomePage from './pages/HomePage';
import MyPage from './pages/MyPage';
import { RegisterPage } from './pages/RegisterPage';
import { RegisterPendingPage } from './pages/RegisterPendingPage';
import SupplierListPage from './pages/suppliers/SupplierListPage';
import SupplierDetailPage from './pages/suppliers/SupplierDetailPage';
import PartnershipRequestListPage from './pages/partners/requests/PartnershipRequestListPage';
import PartnershipRequestDetailPage from './pages/partners/requests/PartnershipRequestDetailPage';
import PartnershipRequestCreatePage from './pages/partners/requests/PartnershipRequestCreatePage';
import PartnerInfoPage from './pages/PartnerInfoPage';
import PlatformPrinciplesPage from './pages/PlatformPrinciplesPage';
import ContentListPage from './pages/content/ContentListPage';
import ContentDetailPage from './pages/content/ContentDetailPage';
import MyContentPage from './pages/dashboard/MyContentPage';

// Neture 전용 Test Guide
import {
  SupplierManualPage,
  PartnerManualPage,
  AdminManualPage,
  NetureServiceManualPage,
} from './pages/test-guide';

// Forum Pages
import { ForumPage } from './pages/forum/ForumPage';
import { ForumWritePage } from './pages/forum/ForumWritePage';
import { ForumPostPage } from './pages/forum/ForumPostPage';
import ForumHubPage from './pages/forum/ForumHubPage';

// ============================================================================
// Lazy loaded pages (heavy / rarely accessed)
// ============================================================================

// Supplier Dashboard
const SupplierDashboardLayout = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierDashboardLayout }))
);
const MyHandledProductsPage = lazy(() =>
  import('./pages/seller/MyHandledProductsPage')
);
const SupplierDashboardPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierDashboardPage }))
);
const SellerRequestsPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SellerRequestsPage }))
);
const SellerRequestDetailPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SellerRequestDetailPage }))
);
const SupplierProductsPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierProductsPage }))
);
const SupplierOrdersPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierOrdersPage }))
);
const SupplierContentsPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierContentsPage }))
);
const SupplyRequestsPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplyRequestsPage }))
);
const SupplierProfilePage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierProfilePage }))
);

// Signage Content Hub (WO-SIGNAGE-CONTENT-HUB-V1)
const SignageContentHubPage = lazy(() => import('./pages/seller/SignageContentHubPage'));

// Content Editor (TipTap - heavy)
const ContentEditorPage = lazy(() => import('./pages/supplier/content/ContentEditorPage'));

// Partner Dashboard
const RecruitingProductsPage = lazy(() => import('./pages/partner/RecruitingProductsPage'));
const PartnerOverviewPage = lazy(() =>
  import('./pages/partner/PartnerOverviewPage').then((m) => ({ default: m.PartnerOverviewPage }))
);
const CollaborationPage = lazy(() =>
  import('./pages/partner/CollaborationPage').then((m) => ({ default: m.CollaborationPage }))
);
const PromotionsPage = lazy(() =>
  import('./pages/partner/PromotionsPage').then((m) => ({ default: m.PromotionsPage }))
);
const SettlementsPage = lazy(() =>
  import('./pages/partner/SettlementsPage').then((m) => ({ default: m.SettlementsPage }))
);

// Admin Dashboard
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AiCardExplainPage = lazy(() => import('./pages/admin/AiCardExplainPage'));
const AiCardReportPage = lazy(() => import('./pages/admin/AiCardReportPage'));
const AiBusinessPackPage = lazy(() => import('./pages/admin/AiBusinessPackPage'));
const AiOperationsPage = lazy(() => import('./pages/admin/AiOperationsPage'));

// AI Admin Control Plane
const AiAdminDashboardPage = lazy(() =>
  import('./pages/admin/ai').then((m) => ({ default: m.AiAdminDashboardPage }))
);
const AiEnginesPage = lazy(() =>
  import('./pages/admin/ai').then((m) => ({ default: m.AiEnginesPage }))
);
const AiPolicyPage = lazy(() =>
  import('./pages/admin/ai').then((m) => ({ default: m.AiPolicyPage }))
);
const AssetQualityPage = lazy(() =>
  import('./pages/admin/ai').then((m) => ({ default: m.AssetQualityPage }))
);
const AiCostPage = lazy(() =>
  import('./pages/admin/ai').then((m) => ({ default: m.AiCostPage }))
);
const ContextAssetListPage = lazy(() =>
  import('./pages/admin/ai').then((m) => ({ default: m.ContextAssetListPage }))
);
const ContextAssetFormPage = lazy(() =>
  import('./pages/admin/ai').then((m) => ({ default: m.ContextAssetFormPage }))
);
const AnswerCompositionRulesPage = lazy(() =>
  import('./pages/admin/ai').then((m) => ({ default: m.AnswerCompositionRulesPage }))
);

// Admin Settings
const EmailSettingsPage = lazy(() =>
  import('./pages/admin/settings').then((m) => ({ default: m.EmailSettingsPage }))
);

// Admin Operators (WO-NETURE-OPERATOR-UI-REALIZATION-V1)
const OperatorsPage = lazy(() => import('./pages/admin/OperatorsPage'));

// Operator Dashboard
const NetureOperatorDashboard = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.NetureOperatorDashboard }))
);
const OperatorAiReportPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.OperatorAiReportPage }))
);
const EmailNotificationSettingsPage = lazy(() =>
  import('./pages/operator/settings').then((m) => ({ default: m.EmailNotificationSettingsPage }))
);
const RegistrationRequestsPage = lazy(() =>
  import('./pages/operator/registrations').then((m) => ({ default: m.RegistrationRequestsPage }))
);
const ForumManagementPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.ForumManagementPage }))
);
const SupplyDashboardPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.SupplyDashboardPage }))
);

// Loading fallback
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}

// 로그인 모달 렌더링 컴포넌트
function LoginModalRenderer() {
  const { isLoginModalOpen, closeLoginModal, loginReturnUrl } = useLoginModal();
  return (
    <LoginModal
      isOpen={isLoginModalOpen}
      onClose={closeLoginModal}
      returnUrl={loginReturnUrl}
    />
  );
}

// Legacy redirect helpers - React Router v6 Navigate doesn't interpolate params
function RedirectSupplierDetail() {
  const { slug } = useParams();
  return <Navigate to={`/workspace/suppliers/${slug}`} replace />;
}
function RedirectPartnershipRequestDetail() {
  const { id } = useParams();
  return <Navigate to={`/workspace/partners/requests/${id}`} replace />;
}
function RedirectContentDetail() {
  const { id } = useParams();
  return <Navigate to={`/workspace/content/${id}`} replace />;
}

// /login 경로 접근 시 workspace로 리다이렉트하고 로그인 모달 열기
function LoginRedirect() {
  const { openLoginModal } = useLoginModal();
  const location = useLocation();

  // state.from 또는 query param에서 returnUrl 추출
  const returnUrl = (location.state as any)?.from || new URLSearchParams(location.search).get('returnUrl');

  // 컴포넌트 마운트 시 로그인 모달 열기 (returnUrl 전달)
  useEffect(() => {
    openLoginModal(returnUrl || undefined);
  }, [openLoginModal, returnUrl]);

  return <Navigate to="/workspace" replace />;
}


/**
 * ProtectedRoute - 역할 기반 접근 제어
 *
 * WO-OPERATOR-GUARD-UNIFICATION-P0:
 * GlycoPharm/K-Cosmetics Reference Implementation 패턴 적용
 */
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.currentRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * RoleBasedWorkspaceHome - WO-NETURE-ROLE-BASED-LANDING-V1
 * /workspace 접근 시 역할 기반 자동 리다이렉트
 * admin → /workspace/admin, supplier → /workspace/supplier/dashboard, partner → /workspace/partner
 * user → /workspace (HomePage 유지)
 */
function RoleBasedWorkspaceHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.currentRole && user.currentRole !== 'user') {
      const target = ROLE_DASHBOARDS[user.currentRole];
      if (target && target !== '/') {
        navigate(target, { replace: true });
      }
    }
  }, [user, navigate]);

  return <HomePage />;
}

function App() {
  return (
    <AuthProvider>
      <LoginModalProvider>
        <BrowserRouter>
          <LoginModalRenderer />
          <Suspense fallback={<PageLoading />}>
            <Routes>
            {/* ================================================================
                인증 페이지 (레이아웃 없음)
            ================================================================ */}
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register/pending" element={<RegisterPendingPage />} />
            <Route path="/my" element={<MyPage />} />

            {/* ================================================================
                o4o 공통 영역 (MainLayout)
            ================================================================ */}
            <Route element={<MainLayout />}>
              {/* o4o 메인 (WO-O4O-PUBLIC-SITE-PHASE1-BUILD-V1) */}
              <Route path="/" element={<O4OMainPage />} />
              <Route path="/o4o" element={<O4OIntroPage />} />
              <Route path="/o4o/other-targets" element={<OtherTargetsPage />} />
              <Route path="/o4o/site-operator" element={<SiteOperatorPage />} />
              <Route path="/o4o/targets/pharmacy" element={<PharmacyTargetPage />} />
              <Route path="/o4o/targets/clinic" element={<ClinicTargetPage />} />
              <Route path="/o4o/targets/salon" element={<SalonTargetPage />} />
              <Route path="/o4o/targets/optical" element={<OpticalTargetPage />} />
              <Route path="/o4o/business-inquiry" element={<BusinessInquiryPage />} />
              <Route path="/o4o/consultation" element={<ConsultationRequestPage />} />
              <Route path="/manual/concepts" element={<ConceptsPage />} />
              <Route path="/manual/concepts/channel-map" element={<ChannelMapPage />} />

              {/* 채널 구조 설명 (o4o 공통) */}
              <Route path="/channel/structure" element={<ChannelSalesStructurePage />} />
              <Route path="/channel/dental" element={<DentalChannelExplanationPage />} />
              <Route path="/channel/pharmacy" element={<PharmacyChannelExplanationPage />} />
              <Route path="/channel/optical" element={<OpticalChannelExplanationPage />} />
              <Route path="/channel/medical" element={<MedicalChannelExplanationPage />} />

              {/* 판매자 개요 (o4o 공통) */}
              <Route path="/seller/overview" element={<SellerOverviewPage />} />
              <Route path="/seller/overview/pharmacy" element={<SellerOverviewPharmacy />} />
              <Route path="/seller/overview/beauty" element={<SellerOverviewBeauty />} />
              <Route path="/seller/overview/market" element={<SellerOverviewMarket />} />
              <Route path="/seller/overview/medical" element={<MedicalOverviewPage />} />
              <Route path="/seller/qr-guide" element={<SellerQRGuidePage />} />
              <Route path="/seller/my-products" element={<MyHandledProductsPage />} />

              {/* 파트너 개요 (o4o 공통) */}
              <Route path="/partner/overview-info" element={<PartnerOverviewInfoPage />} />

              {/* 문의 안내 */}
              <Route path="/contact" element={<ContactPage />} />

              {/* 테스트 센터 (다중 서비스) */}
              <Route path="/test-center" element={<TestCenterPage />} />

              {/* 테스트 가이드 (다중 서비스 - o4o 레벨) */}
              <Route path="/test-guide" element={<TestGuidePage />} />
              <Route path="/test-guide/manual/content-editor" element={<ContentEditorManualPage />} />
              <Route path="/test-guide/service/k-cosmetics" element={<KCosmeticsServiceManualPage />} />
              <Route path="/test-guide/service/glycopharm" element={<GlycoPharmServiceManualPage />} />
              <Route path="/test-guide/service/glucoseview" element={<GlucoseViewServiceManualPage />} />
              <Route path="/test-guide/service/kpa-society" element={<KpaSocietyServiceManualPage />} />

              {/* 테스트 센터 포럼 (o4o 공통 - /forum) */}
              <Route path="/forum" element={<ForumPage title="테스트 센터" description="모든 서비스의 테스트 피드백과 의견을 나누는 공간입니다." noticeText="서비스 테스트 후 발견한 문제점, 개선 의견, 질문을 남겨주세요." />} />
              <Route path="/forum/write" element={<ForumWritePage />} />
              <Route path="/forum/post/:slug" element={<ForumPostPage />} />
              <Route path="/forum/test-feedback" element={<ForumPage boardSlug="test-feedback" />} />
              <Route path="/forum/test-feedback/new" element={<ForumWritePage />} />
              <Route path="/forum/test-feedback/:slug" element={<ForumPostPage />} />
              <Route path="/forum/service-update" element={<ForumPage boardSlug="service-update" />} />
              <Route path="/forum/service-update/new" element={<ForumWritePage />} />
              <Route path="/forum/service-update/:slug" element={<ForumPostPage />} />
            </Route>

            {/* ================================================================
                Admin Vault (/admin-vault) - 설계 보호 구역
                WO-O4O-ADMIN-VAULT-ACCESS-V1
            ================================================================ */}
            <Route element={<AdminVaultLayout />}>
              <Route path="/admin-vault" element={<VaultOverviewPage />} />
              <Route path="/admin-vault/docs" element={<VaultDocsPage />} />
              <Route path="/admin-vault/architecture" element={<VaultArchitecturePage />} />
              <Route path="/admin-vault/notes" element={<VaultNotesPage />} />
              <Route path="/admin-vault/inquiries" element={<VaultInquiriesPage />} />
            </Route>

            {/* ================================================================
                Neture 고유 기능 (/workspace) - SupplierOpsLayout
            ================================================================ */}
            <Route element={<SupplierOpsLayout />}>
              {/* Neture 홈 - WO-NETURE-ROLE-BASED-LANDING-V1: 역할 기반 자동 리다이렉트 */}
              <Route path="/workspace" element={<RoleBasedWorkspaceHome />} />

              {/* 공급자 */}
              <Route path="/workspace/suppliers" element={<SupplierListPage />} />
              <Route path="/workspace/suppliers/:slug" element={<SupplierDetailPage />} />

              {/* 파트너/제휴 */}
              <Route path="/workspace/partners" element={<Navigate to="/workspace/partners/requests" replace />} />
              <Route path="/workspace/partners/requests" element={<PartnershipRequestListPage />} />
              <Route path="/workspace/partners/requests/new" element={<PartnershipRequestCreatePage />} />
              <Route path="/workspace/partners/requests/:id" element={<PartnershipRequestDetailPage />} />
              <Route path="/workspace/partners/info" element={<PartnerInfoPage />} />

              {/* 플랫폼 정책 */}
              <Route path="/workspace/platform/principles" element={<PlatformPrinciplesPage />} />

              {/* 콘텐츠 */}
              <Route path="/workspace/content" element={<ContentListPage />} />
              <Route path="/workspace/content/:id" element={<ContentDetailPage />} />

              {/* 내 콘텐츠 (WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1) */}
              <Route path="/workspace/my-content" element={<MyContentPage />} />

              {/* 포럼 허브 + 글 목록/작성/상세 */}
              <Route path="/workspace/forum" element={<ForumHubPage title="네뚜레 포럼" description="o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다" basePath="/workspace/forum" />} />
              <Route path="/workspace/forum/posts" element={<ForumPage title="네뚜레 포럼" description="o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다" />} />
              <Route path="/workspace/forum/write" element={<ForumWritePage />} />
              <Route path="/workspace/forum/post/:slug" element={<ForumPostPage />} />

              {/* Neture 전용 테스트 가이드 */}
              <Route path="/workspace/manual/supplier" element={<SupplierManualPage />} />
              <Route path="/workspace/manual/partner" element={<PartnerManualPage />} />
              <Route path="/workspace/manual/admin" element={<AdminManualPage />} />
              <Route path="/workspace/manual/service" element={<NetureServiceManualPage />} />
            </Route>

            {/* ================================================================
                Supplier Dashboard (/workspace/supplier/*)
            ================================================================ */}
            <Route element={<SupplierDashboardLayout />}>
              <Route path="/workspace/supplier/dashboard" element={<SupplierDashboardPage />} />
              <Route path="/workspace/supplier/requests" element={<SellerRequestsPage />} />
              <Route path="/workspace/supplier/requests/:id" element={<SellerRequestDetailPage />} />
              <Route path="/workspace/supplier/products" element={<SupplierProductsPage />} />
              <Route path="/workspace/supplier/supply-requests" element={<SupplyRequestsPage />} />
              <Route path="/workspace/supplier/orders" element={<SupplierOrdersPage />} />
              <Route path="/workspace/supplier/contents" element={<SupplierContentsPage />} />
              <Route path="/workspace/supplier/contents/new" element={<ContentEditorPage />} />
              <Route path="/workspace/supplier/contents/:id/edit" element={<ContentEditorPage />} />
              <Route path="/workspace/supplier/profile" element={<SupplierProfilePage />} />
              {/* Signage Content Hub (WO-SIGNAGE-CONTENT-HUB-V1) */}
              <Route path="/workspace/supplier/signage/content" element={<SignageContentHubPage />} />
            </Route>

            {/* ================================================================
                Partner Dashboard (/workspace/partner/*)
            ================================================================ */}
            <Route element={<SupplierOpsLayout />}>
              <Route path="/workspace/partner" element={<PartnerOverviewPage />} />
              <Route path="/workspace/partner/recruiting-products" element={<RecruitingProductsPage />} />
              <Route path="/workspace/partner/collaboration" element={<CollaborationPage />} />
              <Route path="/workspace/partner/promotions" element={<PromotionsPage />} />
              <Route path="/workspace/partner/settlements" element={<SettlementsPage />} />
            </Route>

            {/* ================================================================
                Admin Dashboard (/workspace/admin/*)
            ================================================================ */}
            <Route element={<SupplierOpsLayout />}>
              <Route path="/workspace/admin" element={<AdminDashboardPage />} />
              <Route path="/workspace/admin/ai-card-rules" element={<AiCardExplainPage />} />
              <Route path="/workspace/admin/ai-card-report" element={<AiCardReportPage />} />
              <Route path="/workspace/admin/ai-business-pack" element={<AiBusinessPackPage />} />
              <Route path="/workspace/admin/ai-operations" element={<AiOperationsPage />} />
              {/* AI Admin Control Plane */}
              <Route path="/workspace/admin/ai" element={<AiAdminDashboardPage />} />
              <Route path="/workspace/admin/ai/engines" element={<AiEnginesPage />} />
              <Route path="/workspace/admin/ai/policy" element={<AiPolicyPage />} />
              <Route path="/workspace/admin/ai/asset-quality" element={<AssetQualityPage />} />
              <Route path="/workspace/admin/ai/cost" element={<AiCostPage />} />
              <Route path="/workspace/admin/ai/context-assets" element={<ContextAssetListPage />} />
              <Route path="/workspace/admin/ai/context-assets/new" element={<ContextAssetFormPage />} />
              <Route path="/workspace/admin/ai/context-assets/:id/edit" element={<ContextAssetFormPage />} />
              <Route path="/workspace/admin/ai/composition-rules" element={<AnswerCompositionRulesPage />} />
              {/* Admin Settings */}
              <Route path="/workspace/admin/settings/email" element={<EmailSettingsPage />} />
              {/* Admin Operators (WO-NETURE-OPERATOR-UI-REALIZATION-V1) */}
              <Route path="/workspace/admin/operators" element={<OperatorsPage />} />
            </Route>

            {/* ================================================================
                Operator Dashboard (/workspace/operator/*)
                WO-OPERATOR-GUARD-UNIFICATION-P0: ProtectedRoute 가드 적용
            ================================================================ */}
            <Route element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SupplierOpsLayout />
              </ProtectedRoute>
            }>
              {/* Signal 기반 대시보드 (WO-NETURE-OPERATOR-DASHBOARD-UX-V1) */}
              <Route path="/workspace/operator" element={<NetureOperatorDashboard />} />
              <Route path="/workspace/operator/ai-report" element={<OperatorAiReportPage />} />
              <Route path="/workspace/operator/settings/notifications" element={<EmailNotificationSettingsPage />} />
              <Route path="/workspace/operator/registrations" element={<RegistrationRequestsPage />} />
              <Route path="/workspace/operator/forum-management" element={<ForumManagementPage />} />
              <Route path="/workspace/operator/supply" element={<SupplyDashboardPage />} />
            </Route>

            {/* ================================================================
                레거시 리다이렉트 (기존 경로 → 신규 경로)
            ================================================================ */}
            {/* Neture 고유 기능 리다이렉트 */}
            <Route path="/suppliers" element={<Navigate to="/workspace/suppliers" replace />} />
            <Route path="/suppliers/:slug" element={<RedirectSupplierDetail />} />
            <Route path="/partners/requests" element={<Navigate to="/workspace/partners/requests" replace />} />
            <Route path="/partners/requests/:id" element={<RedirectPartnershipRequestDetail />} />
            <Route path="/partners/info" element={<Navigate to="/workspace/partners/info" replace />} />
            <Route path="/platform/principles" element={<Navigate to="/workspace/platform/principles" replace />} />
            <Route path="/content" element={<Navigate to="/workspace/content" replace />} />
            <Route path="/content/:id" element={<RedirectContentDetail />} />
            <Route path="/my-content" element={<Navigate to="/workspace/my-content" replace />} />

            {/* Supplier Dashboard 리다이렉트 */}
            <Route path="/supplier/dashboard" element={<Navigate to="/workspace/supplier/dashboard" replace />} />
            <Route path="/supplier/requests" element={<Navigate to="/workspace/supplier/requests" replace />} />
            <Route path="/supplier/products" element={<Navigate to="/workspace/supplier/products" replace />} />
            <Route path="/supplier/orders" element={<Navigate to="/workspace/supplier/orders" replace />} />
            <Route path="/supplier/contents" element={<Navigate to="/workspace/supplier/contents" replace />} />
            <Route path="/supplier/*" element={<Navigate to="/workspace/supplier/dashboard" replace />} />

            {/* Partner Dashboard 리다이렉트 */}
            <Route path="/partner" element={<Navigate to="/workspace/partner" replace />} />
            <Route path="/partner/collaboration" element={<Navigate to="/workspace/partner/collaboration" replace />} />
            <Route path="/partner/promotions" element={<Navigate to="/workspace/partner/promotions" replace />} />
            <Route path="/partner/settlements" element={<Navigate to="/workspace/partner/settlements" replace />} />

            {/* Admin/Operator 리다이렉트 */}
            <Route path="/admin" element={<Navigate to="/workspace/admin" replace />} />
            <Route path="/admin/*" element={<Navigate to="/workspace/admin" replace />} />
            <Route path="/operator" element={<Navigate to="/workspace/operator" replace />} />
            <Route path="/operator/*" element={<Navigate to="/workspace/operator" replace />} />

            {/* Test Guide 리다이렉트 (Neture 전용) */}
            <Route path="/test-guide/manual/supplier" element={<Navigate to="/workspace/manual/supplier" replace />} />
            <Route path="/test-guide/manual/partner" element={<Navigate to="/workspace/manual/partner" replace />} />
            <Route path="/test-guide/manual/admin" element={<Navigate to="/workspace/manual/admin" replace />} />
            <Route path="/test-guide/service/neture" element={<Navigate to="/workspace/manual/service" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LoginModalProvider>
    </AuthProvider>
  );
}

export default App;
