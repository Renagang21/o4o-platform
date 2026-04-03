/**
 * Neture - o4o 플랫폼 기반 서비스
 *
 * Work Orders:
 * - WO-O4O-NETURE-UI-REFACTORING-V1: 플랫폼 협업 구조 리팩토링
 *
 * 구조:
 * 1. Neture 메인 (/) - NetureLayout: 홍보 + 광고 + 활동 + 커뮤니티 미리보기 + 진입
 * 2. Supplier Space (/supplier/*) - SupplierSpaceLayout: 공급자 운영 공간
 * 2a. Supplier Account (/account/supplier/*) - SupplierAccountLayout: 공급자 계정 대시보드
 * 3. Partner Space (/partner/*) - PartnerSpaceLayout: 파트너 협업 공간
 * 3a. Partner Account (/account/partner/*) - PartnerAccountLayout: 파트너 계정 대시보드
 * 4. o4o 공통 영역 (/o4o/*) - MainLayout: 플랫폼 소개
 * 5. Admin/Operator (/operator/*) - OperatorLayoutWrapper: 관리자 전용
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, LoginModalProvider, useLoginModal } from './contexts';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';

// Layouts
import NetureLayout from './components/layouts/NetureLayout';
import SupplierSpaceLayout from './components/layouts/SupplierSpaceLayout';
import PartnerSpaceLayout from './components/layouts/PartnerSpaceLayout';
import MainLayout from './components/layouts/MainLayout';
import SupplierOpsLayout from './components/layouts/SupplierOpsLayout';
import OperatorLayoutWrapper from './components/layouts/OperatorLayoutWrapper';
import AdminLayoutWrapper from './components/layouts/AdminLayoutWrapper';
import SupplierAccountLayout from './components/layouts/SupplierAccountLayout';
import PartnerAccountLayout from './components/layouts/PartnerAccountLayout';
import AdminVaultLayout from './components/layouts/AdminVaultLayout';
import { RoleGuard, OperatorRoute, AdminRoute, SupplierRoute } from './components/auth/RoleGuard';

// ============================================================================
// Neture 메인 페이지 (항상 로드)
// ============================================================================
import NetureHomePage from './pages/NetureHomePage';
import HandoffPage from './pages/HandoffPage';
import AboutPage from './pages/AboutPage';
import LegalPage from './pages/LegalPage';
import CommunityPage from './pages/CommunityPage';
import KnowledgePage from './pages/knowledge/KnowledgePage';
import KnowledgeDetailPage from './pages/knowledge/KnowledgeDetailPage';
import {
  CommunityAnnouncementsPage,
  CommunityAnnouncementDetailPage,
  CommunitySignagePage,
} from './pages/community';
import ContactPage from './pages/ContactPage';
import SupplierLandingPage from './pages/SupplierLandingPage';
import PartnerLandingPage from './pages/PartnerLandingPage';

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

// Test Guide Pages (o4o 공통 - 다중 서비스) — removed

// o4o Public Site Pages
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

// Admin Vault Pages
import {
  VaultOverviewPage,
  VaultDocsPage,
  VaultArchitecturePage,
  VaultNotesPage,
  VaultInquiriesPage,
} from './pages/admin-vault';


// ============================================================================
// Neture 공통 페이지 (즉시 로드)
// ============================================================================
// RegisterPage는 RegisterModal로 대체됨 (WO-O4O-AUTH-MODAL-SIGNUP-ROLE-UPDATE-V1)
import AccountRecoveryPage from './pages/auth/AccountRecoveryPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { RegisterPendingPage } from './pages/RegisterPendingPage';
import MyPage from './pages/MyPage';
import PartnershipRequestListPage from './pages/partners/requests/PartnershipRequestListPage';
import PartnershipRequestDetailPage from './pages/partners/requests/PartnershipRequestDetailPage';
import PartnershipRequestCreatePage from './pages/partners/requests/PartnershipRequestCreatePage';
import PartnerInfoPage from './pages/PartnerInfoPage';
import PlatformPrinciplesPage from './pages/PlatformPrinciplesPage';
import ContentListPage from './pages/content/ContentListPage';
import ContentDetailPage from './pages/content/ContentDetailPage';
import MyContentPage from './pages/dashboard/MyContentPage';


// Forum Pages
import { ForumPage } from './pages/forum/ForumPage';
import { ForumWritePage } from './pages/forum/ForumWritePage';
import { ForumPostPage } from './pages/forum/ForumPostPage';
import ForumHubPage from './pages/forum/ForumHubPage';

// ============================================================================
// Lazy loaded pages (heavy / rarely accessed)
// ============================================================================

// Supplier Dashboard
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
const SupplyRequestsPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplyRequestsPage }))
);
const SupplierProfilePage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierProfilePage }))
);
const MyHandledProductsPage = lazy(() =>
  import('./pages/seller/MyHandledProductsPage')
);

// Supplier Market Trial (WO-O4O-MARKET-TRIAL-PHASE1-V1)
const SupplierTrialCreatePage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierTrialCreatePage }))
);

// Supplier Library
const SupplierLibraryPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierLibraryPage }))
);
const SupplierLibraryFormPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierLibraryFormPage }))
);
const SupplierPartnerCommissionsPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierPartnerCommissionsPage }))
);
// WO-NETURE-CSV-IMPORT-UI-V1
const SupplierCsvImportPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierCsvImportPage }))
);
// WO-NETURE-B2B-CONTENT-MANAGEMENT-V1
const SupplierB2BContentPage = lazy(() =>
  import('./pages/supplier/SupplierB2BContentPage').then((m) => ({ default: m.default }))
);
// WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
const MyForumDashboardPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.MyForumDashboardPage }))
);
const SupplierRequestCategoryPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.RequestCategoryPage }))
);

// Signage Content Hub
const SignageContentHubPage = lazy(() => import('./pages/seller/SignageContentHubPage'));

// Supplier Product Create
const SupplierProductCreatePage = lazy(() => import('./pages/supplier/SupplierProductCreatePage'));

// Supplier Product Library (WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1)
const SupplierProductLibraryPage = lazy(() => import('./pages/supplier/SupplierProductLibraryPage'));

// Supplier Account
const SupplierAccountDashboardPage = lazy(() => import('./pages/account/SupplierAccountDashboardPage'));
const SupplierProductsListPage = lazy(() => import('./pages/account/SupplierProductsListPage'));
const SupplierOrdersListPage = lazy(() => import('./pages/account/SupplierOrdersListPage'));
const SupplierOrderDetailPage = lazy(() => import('./pages/account/SupplierOrderDetailPage'));
const SupplierInventoryPage = lazy(() => import('./pages/account/SupplierInventoryPage'));
const SupplierSettlementsPage = lazy(() => import('./pages/account/SupplierSettlementsPage'));

// Store (WO-O4O-STORE-CART-PAGE-V1 + WO-O4O-STORE-ORDERS-PAGE-V1 + WO-O4O-STORE-ORDER-DETAIL-PAGE-V1)
const StoreCartPage = lazy(() => import('./pages/store/StoreCartPage'));
const StoreOrdersPage = lazy(() => import('./pages/store/StoreOrdersPage'));
const StoreOrderDetailPage = lazy(() => import('./pages/store/StoreOrderDetailPage'));
const StoreBlogListPage = lazy(() => import('./pages/store/StoreBlogListPage'));
const StoreBlogPage = lazy(() => import('./pages/store/StoreBlogPage'));
// Store Owner Manage (WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1)
const StoreListingsPage = lazy(() => import('./pages/store/StoreListingsPage'));
const StoreProductLibraryPage = lazy(() => import('./pages/store/StoreProductLibraryPage'));

// Partner Account
const PartnerAccountDashboardPage = lazy(() =>
  import('./pages/partner/PartnerAccountDashboardPage').then((m) => ({ default: m.PartnerAccountDashboardPage }))
);
const PartnerContentsPage = lazy(() =>
  import('./pages/partner/PartnerContentsPage').then((m) => ({ default: m.PartnerContentsPage }))
);
const PartnerLinksPage = lazy(() =>
  import('./pages/partner/PartnerLinksPage').then((m) => ({ default: m.PartnerLinksPage }))
);
const PartnerStoresPage = lazy(() =>
  import('./pages/partner/PartnerStoresPage').then((m) => ({ default: m.PartnerStoresPage }))
);

// Partner Dashboard
const RecruitingProductsPage = lazy(() => import('./pages/partner/RecruitingProductsPage'));
const PartnerOverviewPage = lazy(() =>
  import('./pages/partner/PartnerOverviewPage').then((m) => ({ default: m.PartnerOverviewPage }))
);
const PromotionsPage = lazy(() =>
  import('./pages/partner/PromotionsPage').then((m) => ({ default: m.PromotionsPage }))
);
const SettlementsPage = lazy(() =>
  import('./pages/partner/SettlementsPage').then((m) => ({ default: m.SettlementsPage }))
);

// Admin Dashboard (admin-only pages, now under /operator/*)
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

// Admin Operators
const OperatorsPage = lazy(() => import('./pages/admin/OperatorsPage'));

// Admin Approval Pages
const AdminSupplierApprovalPage = lazy(() => import('./pages/admin/AdminSupplierApprovalPage'));
const AdminProductApprovalPage = lazy(() => import('./pages/admin/AdminProductApprovalPage'));
const AdminMasterManagementPage = lazy(() => import('./pages/admin/AdminMasterManagementPage'));
const AdminServiceApprovalPage = lazy(() => import('./pages/admin/AdminServiceApprovalPage'));
const AdminSettlementsPage = lazy(() => import('./pages/admin/AdminSettlementsPage'));
const AdminCommissionsPage = lazy(() => import('./pages/admin/AdminCommissionsPage'));
const AdminPartnerSettlementsPage = lazy(() => import('./pages/admin/AdminPartnerSettlementsPage'));
const AdminPartnerMonitoringPage = lazy(() => import('./pages/admin/AdminPartnerMonitoringPage'));
const AdminPartnerDetailPage = lazy(() => import('./pages/admin/AdminPartnerDetailPage'));
const AdminContactMessagesPage = lazy(() => import('./pages/admin/AdminContactMessagesPage'));
const CommunityManagementPage = lazy(() => import('./pages/admin/CommunityManagementPage'));

// Partner HUB (WO-O4O-PARTNER-HUB-DASHBOARD-V1)
const PartnerHubDashboardPage = lazy(() =>
  import('./pages/partner/PartnerHubDashboardPage').then((m) => ({ default: m.PartnerHubDashboardPage }))
);

// Partner Settlement Batch (WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1)
const PartnerSettlementBatchPage = lazy(() =>
  import('./pages/partner/PartnerSettlementBatchPage').then((m) => ({ default: m.PartnerSettlementBatchPage }))
);

// Partner Affiliate (WO-O4O-PARTNER-HUB-CORE-V1)
const ProductPoolPage = lazy(() => import('./pages/partner/ProductPoolPage'));
const ReferralLinksPage = lazy(() => import('./pages/partner/ReferralLinksPage'));

// Store Product Detail (WO-O4O-PARTNER-HUB-CORE-V1)
const StoreProductPage = lazy(() => import('./pages/store/StoreProductPage'));

// QR Landing (WO-O4O-STORE-PRODUCT-PAGE-INTEGRATION-V1)
const QrLandingPage = lazy(() => import('./pages/store/QrLandingPage'));

// Catalog Import
const CatalogImportDashboardPage = lazy(() => import('./pages/admin/catalog-import/CatalogImportDashboardPage'));
const CSVImportPage = lazy(() => import('./pages/admin/catalog-import/CSVImportPage'));
const ImportHistoryPage = lazy(() => import('./pages/admin/catalog-import/ImportHistoryPage'));

// Hub
const HubPage = lazy(() => import('./pages/hub/HubPage'));

// Operator Dashboard
const NetureOperatorDashboard = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.NetureOperatorDashboard }))
);
// Admin Dashboard (WO-O4O-ADMIN-OPERATOR-DASHBOARD-SEPARATION-V1)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
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
const ForumDeleteRequestsPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.ForumDeleteRequestsPage }))
);
const ForumAnalyticsPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.ForumAnalyticsPage }))
);
const SupplyDashboardPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.SupplyDashboardPage }))
);
// WO-NETURE-OPERATOR-PRODUCT-SUPPLY-OVERVIEW-V1
const AllProductsOverviewPage = lazy(() => import('./pages/operator/AllProductsOverviewPage'));
const RecruitingProductsOverviewPage = lazy(() => import('./pages/operator/RecruitingProductsOverviewPage'));

// WO-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
const UsersManagementPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.UsersManagementPage }))
);
const UserDetailPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.UserDetailPage }))
);
const StoreManagementPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.StoreManagementPage }))
);
const OrdersManagementPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.OrdersManagementPage }))
);
// WO-O4O-ROLE-MANAGEMENT-UI-V1
const RoleManagementPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.RoleManagementPage }))
);
// WO-O4O-AUDIT-ANALYTICS-LAYER-V1
const OperatorAnalyticsPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.OperatorAnalyticsPage }))
);
// WO-O4O-NETURE-SUPPLIER-QUALITY-REPORT-V1
const SupplierQualityPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.SupplierQualityPage }))
);
// WO-NETURE-CATEGORY-MAPPING-RULE-SYSTEM-V1
const CategoryMappingRulesPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.CategoryMappingRulesPage }))
);
// WO-O4O-MARKET-TRIAL-PHASE1-V1
const MarketTrialApprovalsPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.MarketTrialApprovalsPage }))
);
const MarketTrialApprovalDetailPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.MarketTrialApprovalDetailPage }))
);
// WO-NETURE-PRODUCT-DATA-CLEANUP-V1
const ProductDataCleanupPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.ProductDataCleanupPage }))
);
// WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
const ProductServiceApprovalPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.ProductServiceApprovalPage }))
);
// WO-NETURE-PRODUCT-CURATION-V1
const ProductCurationPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.ProductCurationPage }))
);
const OperatorActionQueuePage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.OperatorActionQueuePage }))
);
// WO-O4O-NETURE-PRODUCT-APPROVAL-UI-V1
const OperatorProductApprovalPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.OperatorProductApprovalPage }))
);

// WO-NETURE-CATEGORY-MANAGEMENT-V1
const CategoryManagementPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.CategoryManagementPage }))
);
// WO-NETURE-BRAND-MANAGEMENT-V1
const BrandManagementPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.BrandManagementPage }))
);

// Signage Operator Console (WO-O4O-SIGNAGE-CONSOLE-V1)
// Store Signage (WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1)
const StoreSignagePage = lazy(() => import('./pages/supplier/StoreSignagePage'));
const SignageHqMediaPage = lazy(() => import('./pages/operator/signage/HqMediaPage'));
const SignageHqMediaDetailPage = lazy(() => import('./pages/operator/signage/HqMediaDetailPage'));
const SignageHqPlaylistsPage = lazy(() => import('./pages/operator/signage/HqPlaylistsPage'));
const SignageHqPlaylistDetailPage = lazy(() => import('./pages/operator/signage/HqPlaylistDetailPage'));
const SignageTemplatesPage = lazy(() => import('./pages/operator/signage/TemplatesPage'));
const SignageTemplateDetailPage = lazy(() => import('./pages/operator/signage/TemplateDetailPage'));

// Homepage CMS (WO-O4O-NETURE-HOMEPAGE-CMS-V1)
const HomepageCmsPage = lazy(() => import('./pages/operator/HomepageCmsPage'));

// Content Library (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1)
const ContentLibraryPage = lazy(() => import('./pages/library/ContentLibraryPage'));

// Loading fallback
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}

// 인증 모달 렌더링 컴포넌트 (로그인 + 회원가입)
function ModalRenderer() {
  const { activeModal, closeModal, loginReturnUrl } = useLoginModal();
  return (
    <>
      <LoginModal
        isOpen={activeModal === 'login'}
        onClose={closeModal}
        returnUrl={loginReturnUrl}
      />
      <RegisterModal isOpen={activeModal === 'register'} />
    </>
  );
}

// Legacy redirect helpers
function RedirectSupplierDetail() {
  return <Navigate to="/community" replace />;
}
function RedirectPartnershipRequestDetail() {
  const { id } = useParams();
  return <Navigate to={`/workspace/partners/requests/${id}`} replace />;
}
function RedirectContentDetail() {
  const { id } = useParams();
  return <Navigate to={`/partner/contents/${id}`} replace />;
}

// /login 경로 접근 시 홈으로 리다이렉트하고 로그인 모달 열기
function LoginRedirect() {
  const { openLoginModal } = useLoginModal();
  const location = useLocation();

  const returnUrl = (location.state as any)?.from || new URLSearchParams(location.search).get('returnUrl');

  useEffect(() => {
    openLoginModal(returnUrl || undefined);
  }, [openLoginModal, returnUrl]);

  return <Navigate to="/" replace />;
}

// /register 경로 접근 시 홈으로 리다이렉트하고 회원가입 모달 열기
function RegisterRedirect() {
  const { openRegisterModal } = useLoginModal();

  useEffect(() => {
    openRegisterModal();
  }, [openRegisterModal]);

  return <Navigate to="/" replace />;
}

// WO-O4O-NETURE-ROUTE-UNIFICATION-BIG-SWITCH-V1: Legacy /workspace/operator/* → /operator/*
function WorkspaceOperatorRedirect() {
  const location = useLocation();
  const subpath = location.pathname.replace(/^\/workspace\/operator/, '');
  return <Navigate to={`/operator${subpath}${location.search}`} replace />;
}

const ProtectedRoute = RoleGuard;

function App() {
  return (
    <O4OErrorBoundary>
    <AuthProvider>
      <LoginModalProvider>
        <BrowserRouter>
          <O4OToastProvider />
          <ModalRenderer />
          <Suspense fallback={<PageLoading />}>
            <Routes>
            {/* ================================================================
                인증 페이지 (레이아웃 없음)
            ================================================================ */}
            <Route path="/handoff" element={<HandoffPage />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/register" element={<RegisterRedirect />} />
            <Route path="/forgot-password" element={<AccountRecoveryPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register/pending" element={<RegisterPendingPage />} />
            <Route path="/qr/:slug" element={<QrLandingPage />} />

            {/* ================================================================
                Neture 메인 (NetureLayout)
                WO-O4O-NETURE-UI-REFACTORING-V1
            ================================================================ */}
            <Route element={<NetureLayout />}>
              <Route path="/" element={<NetureHomePage />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/my" element={<Navigate to="/mypage" replace />} />
              <Route path="/supplier" element={<SupplierLandingPage />} />
              <Route path="/partner" element={<PartnerLandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<LegalPage slug="terms-of-service" title="이용약관" />} />
              <Route path="/privacy" element={<LegalPage slug="privacy-policy" title="개인정보처리방침" />} />

              {/* Community (WO-O4O-NETURE-COMMUNITY-PAGE-V1) */}
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/announcements" element={<CommunityAnnouncementsPage />} />
              <Route path="/community/announcements/:id" element={<CommunityAnnouncementDetailPage />} />
              <Route path="/community/signage" element={<CommunitySignagePage />} />
              <Route path="/community/forum" element={<ForumHubPage title="네뚜레 포럼" description="o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다" basePath="/community/forum" />} />
              <Route path="/community/forum/posts" element={<ForumPage title="네뚜레 포럼" description="o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다" />} />
              <Route path="/community/forum/write" element={<ForumWritePage />} />
              <Route path="/community/forum/post/:slug" element={<ForumPostPage />} />

              {/* Community Articles (WO-O4O-COMMUNITY-ARTICLE-SYSTEM-V1) */}
              <Route path="/community/write" element={<ForumWritePage categorySlug="article" backPath="/community" postSegment="article" />} />
              <Route path="/community/article/:slug" element={<ForumPostPage />} />

              {/* Knowledge (WO-O4O-KNOWLEDGE-LIBRARY-V1) */}
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/knowledge/:id" element={<KnowledgeDetailPage />} />

              {/* WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1 */}
              <Route path="/library/content" element={<ContentLibraryPage />} />
            </Route>

            {/* ================================================================
                Supplier Space (/supplier/*)
                WO-O4O-NETURE-UI-REFACTORING-V1
                WO-O4O-AUTH-RBAC-STABILIZATION-V1: SupplierRoute guard 추가
            ================================================================ */}
            <Route element={
              <SupplierRoute>
                <SupplierSpaceLayout />
              </SupplierRoute>
            }>
              <Route path="/supplier/dashboard" element={<SupplierDashboardPage />} />
              <Route path="/supplier/products" element={<SupplierProductsPage />} />
              <Route path="/supplier/products/library" element={<SupplierProductLibraryPage />} />
              <Route path="/supplier/products/new" element={<SupplierProductCreatePage />} />
              <Route path="/supplier/offers" element={<SupplyRequestsPage />} />
              <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
              <Route path="/supplier/requests" element={<SellerRequestsPage />} />
              <Route path="/supplier/requests/:id" element={<SellerRequestDetailPage />} />
              <Route path="/supplier/library" element={<SupplierLibraryPage />} />
              <Route path="/supplier/library/new" element={<SupplierLibraryFormPage />} />
              <Route path="/supplier/library/:id/edit" element={<SupplierLibraryFormPage />} />
              <Route path="/supplier/partner-commissions" element={<SupplierPartnerCommissionsPage />} />
              {/* WO-NETURE-CSV-IMPORT-UI-V1 */}
              <Route path="/supplier/csv-import" element={<SupplierCsvImportPage />} />
              {/* WO-NETURE-B2B-CONTENT-MANAGEMENT-V1 */}
              <Route path="/supplier/b2b-content" element={<SupplierB2BContentPage />} />
              <Route path="/supplier/profile" element={<SupplierProfilePage />} />
              {/* WO-O4O-MARKET-TRIAL-PHASE1-V1 */}
              <Route path="/supplier/market-trial/new" element={<SupplierTrialCreatePage />} />
              <Route path="/supplier/signage/content" element={<SignageContentHubPage />} />
              <Route path="/supplier/signage/manage" element={<StoreSignagePage />} />
              <Route path="/supplier/forum" element={<ForumPage title="공급자 포럼" description="공급자 간 소통 공간" basePath="/supplier/forum" />} />
              <Route path="/supplier/forum/write" element={<ForumWritePage backPath="/supplier/forum" />} />
              <Route path="/supplier/forum/post/:slug" element={<ForumPostPage basePath="/supplier/forum" />} />
              {/* WO-O4O-FORUM-MY-FORUM-EXPANSION-V1 */}
              <Route path="/supplier/my-forum" element={<MyForumDashboardPage />} />
              <Route path="/supplier/forum/request-category" element={<SupplierRequestCategoryPage />} />
            </Route>

            {/* ================================================================
                Supplier Account (/account/supplier/*)
                WO-O4O-SUPPLIER-DASHBOARD-PAGE-V1
                WO-O4O-AUTH-RBAC-STABILIZATION-V1: SupplierRoute guard 추가
            ================================================================ */}
            <Route element={
              <SupplierRoute>
                <SupplierAccountLayout />
              </SupplierRoute>
            }>
              <Route path="/account/supplier" element={<SupplierAccountDashboardPage />} />
              <Route path="/account/supplier/products" element={<SupplierProductsListPage />} />
              <Route path="/account/supplier/orders" element={<SupplierOrdersListPage />} />
              <Route path="/account/supplier/orders/:id" element={<SupplierOrderDetailPage />} />
              <Route path="/account/supplier/inventory" element={<SupplierInventoryPage />} />
              <Route path="/account/supplier/settlements" element={<SupplierSettlementsPage />} />
            </Route>

            {/* ================================================================
                Partner Account (/account/partner/*)
                WO-O4O-PARTNER-DASHBOARD-PAGE-V1
            ================================================================ */}
            <Route element={<PartnerAccountLayout />}>
              <Route path="/account/partner" element={<PartnerAccountDashboardPage />} />
              <Route path="/account/partner/contents" element={<PartnerContentsPage />} />
              <Route path="/account/partner/links" element={<PartnerLinksPage />} />
              <Route path="/account/partner/stores" element={<PartnerStoresPage />} />
            </Route>

            {/* ================================================================
                Partner Space (/partner/*)
                WO-O4O-NETURE-UI-REFACTORING-V1
            ================================================================ */}
            <Route element={<PartnerSpaceLayout />}>
              <Route path="/partner/dashboard" element={<PartnerHubDashboardPage />} />
              <Route path="/partner/products" element={<ProductPoolPage />} />
              <Route path="/partner/links" element={<ReferralLinksPage />} />
              <Route path="/partner/settlements" element={<PartnerSettlementBatchPage />} />
              {/* Legacy routes kept for compatibility */}
              <Route path="/partner/overview" element={<PartnerOverviewPage />} />
              <Route path="/partner/contents" element={<ContentListPage />} />
              <Route path="/partner/contents/:id" element={<ContentDetailPage />} />
              <Route path="/partner/stores" element={<RecruitingProductsPage />} />
              <Route path="/partner/commissions" element={<SettlementsPage />} />
              <Route path="/partner/promotions" element={<PromotionsPage />} />
              <Route path="/partner/product-pool" element={<Navigate to="/partner/products" replace />} />
              <Route path="/partner/referrals" element={<Navigate to="/partner/links" replace />} />
              <Route path="/partner/forum" element={<ForumPage title="파트너 포럼" description="파트너 간 소통 공간" basePath="/partner/forum" />} />
              <Route path="/partner/forum/write" element={<ForumWritePage backPath="/partner/forum" />} />
              <Route path="/partner/forum/post/:slug" element={<ForumPostPage basePath="/partner/forum" />} />
            </Route>

            {/* ================================================================
                Store Space (/store/*)
                WO-O4O-STORE-CART-PAGE-V1
            ================================================================ */}
            <Route element={<MainLayout />}>
              <Route path="/store/product/:offerId" element={<StoreProductPage />} />
              <Route path="/store/:storeSlug/product/:productSlug" element={<StoreProductPage />} />
              <Route path="/store/:storeSlug/blog" element={<StoreBlogListPage />} />
              <Route path="/store/:storeSlug/blog/:postSlug" element={<StoreBlogPage />} />
              <Route path="/store/cart" element={<StoreCartPage />} />
              <Route path="/store/orders" element={<StoreOrdersPage />} />
              <Route path="/store/orders/:id" element={<StoreOrderDetailPage />} />
              {/* Store Owner Manage (WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1) */}
              <Route path="/store/manage/products" element={<StoreListingsPage />} />
              <Route path="/store/manage/products/library" element={<StoreProductLibraryPage />} />
            </Route>

            {/* ================================================================
                o4o 공통 영역 (MainLayout)
            ================================================================ */}
            <Route element={<MainLayout />}>
              <Route path="/o4o" element={<O4OMainPage />} />
              <Route path="/o4o/intro" element={<O4OIntroPage />} />
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

              {/* 채널 구조 설명 */}
              <Route path="/channel/structure" element={<ChannelSalesStructurePage />} />
              <Route path="/channel/dental" element={<DentalChannelExplanationPage />} />
              <Route path="/channel/pharmacy" element={<PharmacyChannelExplanationPage />} />
              <Route path="/channel/optical" element={<OpticalChannelExplanationPage />} />
              <Route path="/channel/medical" element={<MedicalChannelExplanationPage />} />

              {/* 판매자 개요 */}
              <Route path="/seller/overview" element={<SellerOverviewPage />} />
              <Route path="/seller/overview/pharmacy" element={<SellerOverviewPharmacy />} />
              <Route path="/seller/overview/beauty" element={<SellerOverviewBeauty />} />
              <Route path="/seller/overview/market" element={<SellerOverviewMarket />} />
              <Route path="/seller/overview/medical" element={<MedicalOverviewPage />} />
              <Route path="/seller/qr-guide" element={<SellerQRGuidePage />} />
              <Route path="/seller/my-products" element={<MyHandledProductsPage />} />

              {/* 파트너 개요 */}
              <Route path="/partner/overview-info" element={<PartnerOverviewInfoPage />} />

              {/* 테스트 센터 포럼 */}
              <Route path="/forum" element={<ForumPage title="테스트 센터" description="모든 서비스의 테스트 피드백과 의견을 나누는 공간입니다." noticeText="서비스 테스트 후 발견한 문제점, 개선 의견, 질문을 남겨주세요." />} />
              <Route path="/forum/write" element={<ForumWritePage />} />
              <Route path="/forum/post/:slug" element={<ForumPostPage />} />
              <Route path="/forum/service-update" element={<ForumPage boardSlug="service-update" />} />
              <Route path="/forum/service-update/new" element={<ForumWritePage />} />
              <Route path="/forum/service-update/:slug" element={<ForumPostPage />} />
            </Route>

            {/* ================================================================
                Admin Vault (/admin-vault)
            ================================================================ */}
            <Route element={
              <ProtectedRoute allowedRoles={['neture:admin', 'platform:super_admin']}>
                <AdminVaultLayout />
              </ProtectedRoute>
            }>
              <Route path="/admin-vault" element={<VaultOverviewPage />} />
              <Route path="/admin-vault/docs" element={<VaultDocsPage />} />
              <Route path="/admin-vault/architecture" element={<VaultArchitecturePage />} />
              <Route path="/admin-vault/notes" element={<VaultNotesPage />} />
              <Route path="/admin-vault/inquiries" element={<VaultInquiriesPage />} />
            </Route>

            {/* ================================================================
                Workspace - Admin/Operator 전용 (SupplierOpsLayout 유지)
            ================================================================ */}
            <Route element={<SupplierOpsLayout />}>
              {/* Workspace 공통 페이지 */}
              <Route path="/workspace/partners" element={<Navigate to="/workspace/partners/requests" replace />} />
              <Route path="/workspace/partners/requests" element={<PartnershipRequestListPage />} />
              <Route path="/workspace/partners/requests/new" element={<PartnershipRequestCreatePage />} />
              <Route path="/workspace/partners/requests/:id" element={<PartnershipRequestDetailPage />} />
              <Route path="/workspace/partners/info" element={<PartnerInfoPage />} />
              <Route path="/workspace/platform/principles" element={<PlatformPrinciplesPage />} />
              <Route path="/workspace/my-content" element={<MyContentPage />} />

              {/* Workspace 포럼 */}
              <Route path="/workspace/forum" element={<ForumHubPage title="네뚜레 포럼" description="o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다" basePath="/workspace/forum" />} />
              <Route path="/workspace/forum/posts" element={<ForumPage title="네뚜레 포럼" description="o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다" />} />
              <Route path="/workspace/forum/write" element={<ForumWritePage />} />
              <Route path="/workspace/forum/post/:slug" element={<ForumPostPage />} />

              {/* Hub */}
              <Route path="/workspace/hub" element={<HubPage />} />

            </Route>

            {/* ================================================================
                Admin Dashboard (/admin/*)
                WO-O4O-ROLE-ROUTE-ISOLATION-V1
                admin 전용 레이아웃. 전체 메뉴 (adminOnly 포함).
            ================================================================ */}
            <Route element={
              <AdminRoute>
                <AdminLayoutWrapper />
              </AdminRoute>
            }>
              {/* ─── 공통 + Admin-only 전체 라우트 ─── */}
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<UsersManagementPage />} />
              <Route path="/admin/users/:id" element={<UserDetailPage />} />
              <Route path="/admin/stores" element={<StoreManagementPage />} />
              <Route path="/admin/orders" element={<OrdersManagementPage />} />
              <Route path="/admin/ai-report" element={<OperatorAiReportPage />} />
              <Route path="/admin/settings/notifications" element={<EmailNotificationSettingsPage />} />
              <Route path="/admin/applications" element={<RegistrationRequestsPage />} />
              <Route path="/admin/community" element={<ForumManagementPage />} />
              <Route path="/admin/forum-delete-requests" element={<ForumDeleteRequestsPage />} />
              <Route path="/admin/forum-analytics" element={<ForumAnalyticsPage />} />
              <Route path="/admin/supply" element={<SupplyDashboardPage />} />
              <Route path="/admin/all-products" element={<AllProductsOverviewPage />} />
              <Route path="/admin/recruiting-products" element={<RecruitingProductsOverviewPage />} />
              <Route path="/admin/ai-card-report" element={<AiCardReportPage />} />
              <Route path="/admin/ai-operations" element={<AiOperationsPage />} />
              <Route path="/admin/ai/asset-quality" element={<AssetQualityPage />} />
              <Route path="/admin/signage/hq-media" element={<SignageHqMediaPage />} />
              <Route path="/admin/signage/hq-media/:mediaId" element={<SignageHqMediaDetailPage />} />
              <Route path="/admin/signage/hq-playlists" element={<SignageHqPlaylistsPage />} />
              <Route path="/admin/signage/hq-playlists/:playlistId" element={<SignageHqPlaylistDetailPage />} />
              <Route path="/admin/signage/templates" element={<SignageTemplatesPage />} />
              <Route path="/admin/signage/templates/:templateId" element={<SignageTemplateDetailPage />} />
              <Route path="/admin/homepage-cms" element={<HomepageCmsPage />} />
              <Route path="/admin/analytics" element={<OperatorAnalyticsPage />} />
              <Route path="/admin/supplier-quality" element={<SupplierQualityPage />} />
              <Route path="/admin/category-mapping-rules" element={<CategoryMappingRulesPage />} />
              <Route path="/admin/roles" element={<RoleManagementPage />} />
              <Route path="/admin/market-trial" element={<MarketTrialApprovalsPage />} />
              <Route path="/admin/market-trial/:id" element={<MarketTrialApprovalDetailPage />} />
              <Route path="/admin/categories" element={<CategoryManagementPage />} />
              <Route path="/admin/brands" element={<BrandManagementPage />} />
              <Route path="/admin/product-cleanup" element={<ProductDataCleanupPage />} />
              <Route path="/admin/product-service-approvals" element={<ProductServiceApprovalPage />} />
              <Route path="/admin/curation" element={<ProductCurationPage />} />
              <Route path="/admin/actions" element={<OperatorActionQueuePage />} />
              {/* Admin-only 페이지 */}
              <Route path="/admin/operators" element={<OperatorsPage />} />
              <Route path="/admin/contact-messages" element={<AdminContactMessagesPage />} />
              <Route path="/admin/service-approvals" element={<AdminServiceApprovalPage />} />
              <Route path="/admin/admin-suppliers" element={<AdminSupplierApprovalPage />} />
              <Route path="/admin/product-approvals" element={<AdminProductApprovalPage />} />
              <Route path="/admin/masters" element={<AdminMasterManagementPage />} />
              <Route path="/admin/catalog-import" element={<CatalogImportDashboardPage />} />
              <Route path="/admin/catalog-import/csv" element={<CSVImportPage />} />
              <Route path="/admin/catalog-import/history" element={<ImportHistoryPage />} />
              <Route path="/admin/partners" element={<AdminPartnerMonitoringPage />} />
              <Route path="/admin/partners/:id" element={<AdminPartnerDetailPage />} />
              <Route path="/admin/settlements" element={<AdminSettlementsPage />} />
              <Route path="/admin/commissions" element={<AdminCommissionsPage />} />
              <Route path="/admin/partner-settlements" element={<AdminPartnerSettlementsPage />} />
              <Route path="/admin/community-admin" element={<CommunityManagementPage />} />
              <Route path="/admin/ai-admin" element={<AiAdminDashboardPage />} />
              <Route path="/admin/ai-admin/engines" element={<AiEnginesPage />} />
              <Route path="/admin/ai-admin/policy" element={<AiPolicyPage />} />
              <Route path="/admin/ai-admin/cost" element={<AiCostPage />} />
              <Route path="/admin/ai-admin/context-assets" element={<ContextAssetListPage />} />
              <Route path="/admin/ai-admin/context-assets/new" element={<ContextAssetFormPage />} />
              <Route path="/admin/ai-admin/context-assets/:id/edit" element={<ContextAssetFormPage />} />
              <Route path="/admin/ai-admin/composition-rules" element={<AnswerCompositionRulesPage />} />
              <Route path="/admin/ai-card-rules" element={<AiCardExplainPage />} />
              <Route path="/admin/ai-business-pack" element={<AiBusinessPackPage />} />
              <Route path="/admin/settings/email" element={<EmailSettingsPage />} />
            </Route>

            {/* ================================================================
                Operator Dashboard (/operator/*)
                WO-O4O-ROLE-ROUTE-ISOLATION-V1
                operator 전용 레이아웃. adminOnly 항목 제외.
            ================================================================ */}
            <Route element={
              <OperatorRoute>
                <OperatorLayoutWrapper />
              </OperatorRoute>
            }>
              {/* ─── Operator 공통 라우트 (adminOnly 제외) ─── */}
              <Route path="/operator" element={<NetureOperatorDashboard />} />
              <Route path="/operator/users" element={<UsersManagementPage />} />
              <Route path="/operator/users/:id" element={<UserDetailPage />} />
              <Route path="/operator/stores" element={<StoreManagementPage />} />
              <Route path="/operator/orders" element={<OrdersManagementPage />} />
              <Route path="/operator/ai-report" element={<OperatorAiReportPage />} />
              <Route path="/operator/settings/notifications" element={<EmailNotificationSettingsPage />} />
              <Route path="/operator/applications" element={<RegistrationRequestsPage />} />
              <Route path="/operator/community" element={<ForumManagementPage />} />
              <Route path="/operator/forum-delete-requests" element={<ForumDeleteRequestsPage />} />
              <Route path="/operator/forum-analytics" element={<ForumAnalyticsPage />} />
              <Route path="/operator/supply" element={<SupplyDashboardPage />} />
              <Route path="/operator/all-products" element={<AllProductsOverviewPage />} />
              <Route path="/operator/recruiting-products" element={<RecruitingProductsOverviewPage />} />
              <Route path="/operator/ai-card-report" element={<AiCardReportPage />} />
              <Route path="/operator/ai-operations" element={<AiOperationsPage />} />
              <Route path="/operator/ai/asset-quality" element={<AssetQualityPage />} />
              <Route path="/operator/signage/hq-media" element={<SignageHqMediaPage />} />
              <Route path="/operator/signage/hq-media/:mediaId" element={<SignageHqMediaDetailPage />} />
              <Route path="/operator/signage/hq-playlists" element={<SignageHqPlaylistsPage />} />
              <Route path="/operator/signage/hq-playlists/:playlistId" element={<SignageHqPlaylistDetailPage />} />
              <Route path="/operator/signage/templates" element={<SignageTemplatesPage />} />
              <Route path="/operator/signage/templates/:templateId" element={<SignageTemplateDetailPage />} />
              <Route path="/operator/homepage-cms" element={<HomepageCmsPage />} />
              <Route path="/operator/analytics" element={<OperatorAnalyticsPage />} />
              <Route path="/operator/supplier-quality" element={<SupplierQualityPage />} />
              <Route path="/operator/category-mapping-rules" element={<CategoryMappingRulesPage />} />
              <Route path="/operator/market-trial" element={<MarketTrialApprovalsPage />} />
              <Route path="/operator/market-trial/:id" element={<MarketTrialApprovalDetailPage />} />
              <Route path="/operator/product-service-approvals" element={<ProductServiceApprovalPage />} />
              <Route path="/operator/product-approvals" element={<OperatorProductApprovalPage />} />
              <Route path="/operator/curation" element={<ProductCurationPage />} />
              <Route path="/operator/actions" element={<OperatorActionQueuePage />} />
            </Route>

            {/* ================================================================
                레거시 리다이렉트 (기존 경로 → 신규 경로)
            ================================================================ */}
            {/* Workspace → 새 경로 */}
            <Route path="/workspace" element={<Navigate to="/" replace />} />
            <Route path="/workspace/suppliers" element={<Navigate to="/community" replace />} />
            <Route path="/workspace/suppliers/:slug" element={<RedirectSupplierDetail />} />
            <Route path="/workspace/content" element={<Navigate to="/partner/contents" replace />} />
            <Route path="/workspace/content/:id" element={<RedirectContentDetail />} />

            {/* Supplier Dashboard 리다이렉트 */}
            <Route path="/workspace/supplier/dashboard" element={<Navigate to="/supplier" replace />} />
            <Route path="/workspace/supplier/products" element={<Navigate to="/supplier/products" replace />} />
            <Route path="/workspace/supplier/orders" element={<Navigate to="/supplier/orders" replace />} />
            <Route path="/workspace/supplier/requests" element={<Navigate to="/supplier/requests" replace />} />
            <Route path="/workspace/supplier/library" element={<Navigate to="/supplier/library" replace />} />
            <Route path="/workspace/supplier/profile" element={<Navigate to="/supplier/profile" replace />} />
            <Route path="/workspace/supplier/supply-requests" element={<Navigate to="/supplier/offers" replace />} />
            <Route path="/workspace/supplier/*" element={<Navigate to="/supplier" replace />} />

            {/* Partner Dashboard 리다이렉트 */}
            <Route path="/workspace/partner" element={<Navigate to="/partner/dashboard" replace />} />
            <Route path="/workspace/partner/collaboration" element={<Navigate to="/partner/links" replace />} />
            <Route path="/workspace/partner/promotions" element={<Navigate to="/partner/promotions" replace />} />
            <Route path="/workspace/partner/settlements" element={<Navigate to="/partner/settlements" replace />} />
            <Route path="/workspace/partner/recruiting-products" element={<Navigate to="/partner/stores" replace />} />
            <Route path="/workspace/partner/*" element={<Navigate to="/partner/dashboard" replace />} />

            {/* 기존 최상위 경로 리다이렉트 */}
            <Route path="/suppliers" element={<Navigate to="/community" replace />} />
            <Route path="/suppliers/:slug" element={<RedirectSupplierDetail />} />
            <Route path="/partners/requests" element={<Navigate to="/workspace/partners/requests" replace />} />
            <Route path="/partners/requests/:id" element={<RedirectPartnershipRequestDetail />} />
            <Route path="/partners/info" element={<Navigate to="/workspace/partners/info" replace />} />
            <Route path="/platform/principles" element={<Navigate to="/workspace/platform/principles" replace />} />
            <Route path="/content" element={<Navigate to="/partner/contents" replace />} />
            <Route path="/content/:id" element={<RedirectContentDetail />} />
            <Route path="/my-content" element={<Navigate to="/workspace/my-content" replace />} />

            {/* Hub/Workspace 리다이렉트 — WO-O4O-ROLE-ROUTE-ISOLATION-V1 */}
            <Route path="/hub" element={<Navigate to="/workspace/hub" replace />} />
            {/* /admin은 AdminRoute가 직접 처리. 레거시 redirect 제거 */}
            <Route path="/workspace/admin" element={<Navigate to="/admin" replace />} />
            <Route path="/workspace/admin/*" element={<Navigate to="/admin" replace />} />
            <Route path="/workspace/operator" element={<Navigate to="/operator" replace />} />
            <Route path="/workspace/operator/*" element={<WorkspaceOperatorRedirect />} />

            {/* Legacy supplier/partner 리다이렉트 */}
            <Route path="/supplier/dashboard" element={<Navigate to="/supplier" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LoginModalProvider>
    </AuthProvider>
    </O4OErrorBoundary>
  );
}

export default App;
