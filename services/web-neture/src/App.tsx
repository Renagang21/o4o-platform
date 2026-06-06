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

import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// WO-O4O-STORE-PRODUCTS-QUERYCLIENT-PROVIDER-ALIGN-V1
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});
import { AuthProvider, LoginModalProvider, useLoginModal, useAuth, getNetureDashboardRoute } from './contexts';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import { usePageSeo } from '@o4o/shared-space-ui';
import { netureSeoRegistry, NETURE_SEO_DEFAULTS } from './config/seoRegistry';

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
import { ADMIN_ROLES } from './lib/role-constants';

// ============================================================================
// Neture 메인 페이지 (항상 로드)
// ============================================================================
// NetureHomePage removed — Community promoted to Home (WO-NETURE-HOME-COMMUNITY-PROMOTION-V1)
import HandoffPage from './pages/HandoffPage';
import LegalPage from './pages/LegalPage';
import CommunityPage from './pages/CommunityPage';
import {
  CommunityAnnouncementsPage,
  CommunityAnnouncementDetailPage,
} from './pages/community';
import ContactPage from './pages/ContactPage';
import SupplierLandingPage from './pages/SupplierLandingPage';
import PartnerLandingPage from './pages/PartnerLandingPage';

// ============================================================================
// o4o 공통 페이지 (항상 로드)
// ============================================================================
// WO-O4O-NETURE-CONCEPT-PAGES-DEPRECATE-V1:
//   O4OIntroPage / O4OConceptsPage / O4OPrinciplesPage / O4OStructurePage / O4OServicesPage / ChannelMapPage
//   6 페이지를 /o4o 메인으로 흡수 + redirect. App.tsx 의 import 만 제거, 페이지 파일은 보존.
import SellerOverviewPage from './pages/SellerOverviewPage';
import SellerQRGuidePage from './pages/SellerQRGuidePage';
import {
  SellerOverviewPharmacy,
  SellerOverviewBeauty,
  SellerOverviewMarket,
  MedicalOverviewPage,
} from './pages/seller';
import PartnerOverviewInfoPage from './pages/PartnerOverviewInfoPage';
// WO-O4O-NETURE-CHANNEL-PAGES-ABSORB-V1:
//   /o4o/channels/{type} 4 페이지 → 대응 /o4o/targets/{type} 안의 "채널 활용 안내" 섹션으로 흡수.
//   App.tsx 의 import 만 제거 후 4 route 를 Navigate redirect 로 교체.
//   기존 page component 파일 (pages/channel/*) 은 보존 (WO 명시).

// Test Guide Pages (o4o 공통 - 다중 서비스) — removed

// o4o Public Site Pages
import O4OMainPage from './pages/o4o/O4OMainPage';
// WO-O4O-NETURE-OTHER-TARGETS-ABSORB-V1: OtherTargetsPage → /o4o 메인 흡수 후 redirect.
//   기타 업종 안내는 메인 DetailEntrySection 의 7번째 카드로 흡수. App.tsx import 만 제거.
import SiteOperatorPage from './pages/o4o/SiteOperatorPage';
import {
  PharmacyTargetPage,
  ClinicTargetPage,
  SalonTargetPage,
  OpticalTargetPage,
  DentalTargetPage,
} from './pages/o4o/targets';
// WO-O4O-NETURE-APPLY-PAGE-CONSOLIDATION-V1:
//   /o4o/business-inquiry + /o4o/consultation → /o4o/apply 통합. 두 page component 파일은
//   보존 (deprecated), App.tsx 의 import 만 제거 후 redirect 로 처리.
import O4OApplyPage from './pages/o4o/O4OApplyPage';

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
// WO-O4O-AUTH-VERIFY-EMAIL-FRONTEND-PAGE-V1: 이메일 인증 결과 페이지
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import { RegisterPendingPage } from './pages/RegisterPendingPage';
// MyPage 3-split (WO-O4O-NETURE-MYPAGE-SPLIT-V1)
import MyPageHub from './pages/mypage/MyPageHub';
import MyProfilePage from './pages/mypage/MyProfilePage';
import MySettingsPage from './pages/mypage/MySettingsPage';
// WO-O4O-SUPPLIER-MYPAGE-CANONICAL-PROFILE-ALIGNMENT-V1
import MyBusinessProfilePage from './pages/mypage/MyBusinessProfilePage';
import PartnershipRequestListPage from './pages/partners/requests/PartnershipRequestListPage';
import PartnershipRequestDetailPage from './pages/partners/requests/PartnershipRequestDetailPage';
import PartnershipRequestCreatePage from './pages/partners/requests/PartnershipRequestCreatePage';
import PartnerInfoPage from './pages/PartnerInfoPage';
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
const SupplierProductsPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierProductsPage }))
);
const SupplierOrdersPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierOrdersPage }))
);
// WO-O4O-SUPPLIER-MYPAGE-PROFILE-REDIRECT-V1: SupplierProfilePage lazy import 제거 (라우트 → Navigate 전환)
const MyHandledProductsPage = lazy(() =>
  import('./pages/seller/MyHandledProductsPage')
);

// Supplier Market Trial (WO-O4O-MARKET-TRIAL-PHASE1-V1 + WO-MARKET-TRIAL-SUPPLIER-RESULTS-AND-FEEDBACK-V1)
const SupplierTrialCreatePage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierTrialCreatePage }))
);
const SupplierTrialListPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierTrialListPage }))
);
const SupplierTrialDetailPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierTrialDetailPage }))
);
const SupplierTrialEditPage = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierTrialEditPage }))
);

// Participant Market Trial (WO-NETURE-MARKET-TRIAL-PARTICIPANT-PAGES-V1)
const MarketTrialHubPage = lazy(() =>
  import('./pages/market-trial').then((m) => ({ default: m.MarketTrialHubPage }))
);
const MarketTrialDetailPage = lazy(() =>
  import('./pages/market-trial').then((m) => ({ default: m.MarketTrialDetailPage }))
);
const MyParticipationsPage = lazy(() =>
  import('./pages/market-trial').then((m) => ({ default: m.MyParticipationsPage }))
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
// WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1 (2026-05-23):
//   SignageContentHubPage 의 공급자 진입점 (/supplier/signage/content) 제거.
//   공급자는 O4O 내부 Producer 가 아니다 — Canonical 흐름은
//   "공급자 → 오프라인 전달 → Operator 등록 → HUB" 이다.
//   페이지 파일 자체는 유지 (Operator/Store 향후 진입 가능).

// Supplier Product Create
const SupplierProductCreatePage = lazy(() => import('./pages/supplier/SupplierProductCreatePage'));

// WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1: Import Assistant
const SupplierProductImportPage = lazy(() => import('./pages/supplier/SupplierProductImportPage'));

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
// WO-O4O-NETURE-BLOG-RETIRE-V1: Neture Blog 운영 대상 아님 — public Blog page/route 제거.
// Neture canonical 콘텐츠 채널은 Forum + Content + AI editor 로 유지.
// Store Owner Manage (WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1)
const StoreListingsPage = lazy(() => import('./pages/store/StoreListingsPage'));
const StoreProductLibraryPage = lazy(() => import('./pages/store/StoreProductLibraryPage'));

// WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 매장 경영자용 매장 상품 관리 (공통 패키지).
// 기존 StoreListingsPage(부분 기능)와 병행 운영 — 통합 판단은 후속 Phase.
import { StoreProductsManagerPage } from '@o4o/store-products-ui';
// Neture Event Offer — 공급자 현황 허브 (WO-O4O-EVENT-OFFER-NETURE-ROLE-UX-ALIGNMENT-V1)
const SupplierEventOfferPage = lazy(() => import('./pages/supplier/SupplierEventOfferPage'));

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
// WO-O4O-NETURE-ADMIN-MEMBER-HARD-DELETE-V1
const AdminMemberManagementPage = lazy(() => import('./pages/admin/AdminMemberManagementPage'));

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
// WO-NETURE-OPERATOR-PRODUCTS-UNIFIED-LIST-FINAL-V1: Products 영역 단일 통합
const AllRegisteredProductsPage = lazy(() => import('./pages/operator/AllRegisteredProductsPage'));
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
// WO-NETURE-CURATION-PHASE3-FULL-REMOVAL-V1: ProductCurationPage 완전 제거
const OperatorActionQueuePage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.OperatorActionQueuePage }))
);
// WO-O4O-NETURE-PRODUCT-APPROVAL-UI-V1
const OperatorProductApprovalPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.OperatorProductApprovalPage }))
);
// WO-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1 (Phase 5)
const ProductCandidateReviewPage = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.ProductCandidateReviewPage }))
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
// Operator Guide Contents (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1)
const OperatorGuideContentsPage = lazy(() => import('./pages/operator/OperatorGuideContentsPage'));
// WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1
const OperatorSupplierApprovalPage = lazy(() => import('./pages/operator/OperatorSupplierApprovalPage'));
// WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1
const OperatorContactMessagesPage = lazy(() => import('./pages/operator/OperatorContactMessagesPage'));

// Content Library (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1)
const ContentLibraryPage = lazy(() => import('./pages/library/ContentLibraryPage'));
// Resources (O4O 공통 구조 — /resources)
const NetureResourcesPage = lazy(() => import('./pages/resources/NetureResourcesPage'));

// Guide Pages (WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1) — 16 wrappers, public
const GuideHomePage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideHomePage })));
const GuideIntroPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideIntroPage })));
const GuideIntroStructurePage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideIntroStructurePage })));
const GuideIntroNeturePage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideIntroNeturePage })));
const GuideIntroOperationPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideIntroOperationPage })));
const GuideIntroConceptPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideIntroConceptPage })));
const GuideUsagePage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideUsagePage })));
const GuideFeaturesPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeaturesPage })));
const GuideFeatureSupplierOnboardingPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeatureSupplierOnboardingPage })));
const GuideFeatureProductRegistrationPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeatureProductRegistrationPage })));
const GuideFeatureB2BContentPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeatureB2BContentPage })));
const GuideFeatureEventOfferPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeatureEventOfferPage })));
const GuideFeatureMarketTrialPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeatureMarketTrialPage })));
const GuideFeaturePartnerProgramPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeaturePartnerProgramPage })));
const GuideFeatureForumResourcesPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeatureForumResourcesPage })));
const GuideFeatureCopilotDashboardPage = lazy(() => import('./pages/guide').then(m => ({ default: m.GuideFeatureCopilotDashboardPage })));

// Loading fallback
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}

// WO-O4O-NETURE-POSTLOGINREDIRECT-CANONICAL-ALIGNMENT-V1:
// 로그인 직후 1회 역할 기반 redirect 수행.
// / 또는 /login 경로에서만 동작. workspace 경로 early-exit.
// returnUrl은 LoginModal에서 처리하므로 여기서는 미개입.
function PostLoginRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wasAuthRef = useRef(isAuthenticated);
  const didRedirectRef = useRef(false);

  useEffect(() => {
    const justLoggedIn = !wasAuthRef.current && isAuthenticated;
    wasAuthRef.current = isAuthenticated;

    if (!isAuthenticated) {
      didRedirectRef.current = false;
      return;
    }
    if (!justLoggedIn && !didRedirectRef.current) return;
    if (isLoading || !user) return;
    if (didRedirectRef.current) return;

    // / 또는 /login 경로에서만 동작
    if (location.pathname !== '/' && location.pathname !== '/login') {
      didRedirectRef.current = true;
      return;
    }

    // workspace 경로 early-exit
    const WORKSPACE_PREFIXES = ['/supplier', '/operator', '/admin', '/partner', '/seller', '/account'];
    if (WORKSPACE_PREFIXES.some(p => location.pathname.startsWith(p))) {
      didRedirectRef.current = true;
      return;
    }

    const target = getNetureDashboardRoute(user.roles ?? []);
    didRedirectRef.current = true;
    if (target && target !== '/') navigate(target, { replace: true });
  }, [isAuthenticated, isLoading, user, navigate, location.pathname]);

  return null;
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

const ProtectedRoute = RoleGuard;

// WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1: 페이지별 메타 동적 적용 (브라우저/SNS 보조용)
function SeoWatcher() {
  const { pathname } = useLocation();
  usePageSeo({ registry: netureSeoRegistry, pathname, defaults: NETURE_SEO_DEFAULTS });
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <O4OErrorBoundary>
    <AuthProvider>
      <LoginModalProvider>
        <BrowserRouter>
          <SeoWatcher />
          <O4OToastProvider />
          <PostLoginRedirect />
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
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/register/pending" element={<RegisterPendingPage />} />
            <Route path="/qr/:slug" element={<QrLandingPage />} />

            {/* ================================================================
                Neture 메인 (NetureLayout)
                WO-O4O-NETURE-UI-REFACTORING-V1
            ================================================================ */}
            <Route element={<NetureLayout />}>
              <Route path="/" element={<CommunityPage />} />
              {/* MyPage 3-split (WO-O4O-NETURE-MYPAGE-SPLIT-V1) */}
              <Route path="/mypage" element={<MyPageHub />} />
              <Route path="/mypage/profile" element={<MyProfilePage />} />
              <Route path="/mypage/settings" element={<MySettingsPage />} />
              {/* WO-O4O-SUPPLIER-MYPAGE-CANONICAL-PROFILE-ALIGNMENT-V1: 사업자 정보 */}
              <Route path="/mypage/business-profile" element={<MyBusinessProfilePage />} />
              <Route path="/supplier" element={<SupplierLandingPage />} />
              <Route path="/partner" element={<PartnerLandingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<LegalPage slug="terms-of-service" title="이용약관" />} />
              <Route path="/privacy" element={<LegalPage slug="privacy-policy" title="개인정보처리방침" />} />

              {/* Forum — O4O 공통 구조 (WO-NETURE-HOME-COMMUNITY-PROMOTION-V1) */}
              <Route path="/forum" element={<ForumHubPage title="네뚜레 포럼" description="o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다" basePath="/forum" />} />
              <Route path="/forum/posts" element={<ForumPage title="네뚜레 포럼" description="o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다" />} />
              <Route path="/forum/write" element={<ForumWritePage />} />
              <Route path="/forum/post/:slug" element={<ForumPostPage />} />

              {/* Notices */}
              <Route path="/notices" element={<CommunityAnnouncementsPage />} />
              <Route path="/notices/:id" element={<CommunityAnnouncementDetailPage />} />

              {/* WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1 */}
              <Route path="/content" element={<ContentLibraryPage />} />
              <Route path="/resources" element={<NetureResourcesPage />} />

              {/* Market Trial Participant (WO-NETURE-MARKET-TRIAL-PARTICIPANT-PAGES-V1) */}
              <Route path="/market-trial" element={<MarketTrialHubPage />} />
              <Route path="/market-trial/my" element={<MyParticipationsPage />} />
              <Route path="/market-trial/:id" element={<MarketTrialDetailPage />} />

              {/* Guide — Neture 공개 이용 가이드 (WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1) */}
              <Route path="/guide" element={<GuideHomePage />} />
              <Route path="/guide/intro" element={<GuideIntroPage />} />
              <Route path="/guide/intro/structure" element={<GuideIntroStructurePage />} />
              <Route path="/guide/intro/neture" element={<GuideIntroNeturePage />} />
              <Route path="/guide/intro/operation" element={<GuideIntroOperationPage />} />
              <Route path="/guide/intro/concept" element={<GuideIntroConceptPage />} />
              <Route path="/guide/usage" element={<GuideUsagePage />} />
              <Route path="/guide/features" element={<GuideFeaturesPage />} />
              <Route path="/guide/features/supplier-onboarding" element={<GuideFeatureSupplierOnboardingPage />} />
              <Route path="/guide/features/product-registration" element={<GuideFeatureProductRegistrationPage />} />
              <Route path="/guide/features/b2b-content" element={<GuideFeatureB2BContentPage />} />
              <Route path="/guide/features/event-offer" element={<GuideFeatureEventOfferPage />} />
              <Route path="/guide/features/market-trial" element={<GuideFeatureMarketTrialPage />} />
              <Route path="/guide/features/partner-program" element={<GuideFeaturePartnerProgramPage />} />
              <Route path="/guide/features/forum-resources" element={<GuideFeatureForumResourcesPage />} />
              <Route path="/guide/features/copilot-dashboard" element={<GuideFeatureCopilotDashboardPage />} />

              {/* ── O4O 소개 영역 — WO-O4O-ABOUT-URL-SEMANTIC-ALIGNMENT-V1 ──
                  NetureLayout 통일: About 이동 후 레이아웃 이탈 방지
               */}
              <Route path="/o4o" element={<O4OMainPage />} />
              {/* WO-O4O-NETURE-CONCEPT-PAGES-DEPRECATE-V1: /o4o/intro → /o4o redirect (메인 흡수) */}
              <Route path="/o4o/intro" element={<Navigate to="/o4o" replace />} />
              {/* WO-O4O-NETURE-OTHER-TARGETS-ABSORB-V1: 메인 DetailEntrySection 7번째 카드 흡수 후 redirect */}
              <Route path="/o4o/other-targets" element={<Navigate to="/o4o" replace />} />
              <Route path="/o4o/site-operator" element={<SiteOperatorPage />} />
              <Route path="/o4o/targets/pharmacy" element={<PharmacyTargetPage />} />
              <Route path="/o4o/targets/clinic" element={<ClinicTargetPage />} />
              <Route path="/o4o/targets/salon" element={<SalonTargetPage />} />
              <Route path="/o4o/targets/optical" element={<OpticalTargetPage />} />
              <Route path="/o4o/targets/dental" element={<DentalTargetPage />} />
              {/* WO-O4O-NETURE-APPLY-PAGE-CONSOLIDATION-V1: 통합 진입 + 기존 2 경로 redirect */}
              <Route path="/o4o/apply" element={<O4OApplyPage />} />
              <Route path="/o4o/business-inquiry" element={<Navigate to="/o4o/apply" replace />} />
              <Route path="/o4o/consultation" element={<Navigate to="/o4o/apply" replace />} />
              {/* WO-O4O-NETURE-CONCEPT-PAGES-DEPRECATE-V1:
                  concept / principle / structure / services / channel-map → /o4o 메인으로 흡수 후 redirect.
                  페이지 파일은 보존 (App.tsx import 만 제거). */}
              <Route path="/o4o/concepts" element={<Navigate to="/o4o" replace />} />
              <Route path="/o4o/channel-map" element={<Navigate to="/o4o" replace />} />
              <Route path="/o4o/principles" element={<Navigate to="/o4o" replace />} />
              <Route path="/o4o/structure" element={<Navigate to="/o4o" replace />} />
              <Route path="/o4o/services" element={<Navigate to="/o4o" replace />} />
              {/* WO-O4O-NETURE-CHANNEL-PAGES-ABSORB-V1: targets/* 흡수 후 redirect */}
              <Route path="/o4o/channels/pharmacy" element={<Navigate to="/o4o/targets/pharmacy" replace />} />
              <Route path="/o4o/channels/optical" element={<Navigate to="/o4o/targets/optical" replace />} />
              <Route path="/o4o/channels/medical" element={<Navigate to="/o4o/targets/clinic" replace />} />
              <Route path="/o4o/channels/dental" element={<Navigate to="/o4o/targets/dental" replace />} />
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
              <Route path="/supplier/products/import-assistant" element={<SupplierProductImportPage />} />
              <Route path="/supplier/products/new" element={<SupplierProductCreatePage />} />
              <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
              <Route path="/supplier/library" element={<SupplierLibraryPage />} />
              <Route path="/supplier/library/new" element={<SupplierLibraryFormPage />} />
              <Route path="/supplier/library/:id/edit" element={<SupplierLibraryFormPage />} />
              <Route path="/supplier/partner-commissions" element={<SupplierPartnerCommissionsPage />} />
              {/* WO-NETURE-CSV-IMPORT-UI-V1 */}
              <Route path="/supplier/csv-import" element={<SupplierCsvImportPage />} />
              {/* WO-NETURE-B2B-CONTENT-MANAGEMENT-V1 */}
              <Route path="/supplier/b2b-content" element={<SupplierB2BContentPage />} />
              {/* WO-O4O-SUPPLIER-MYPAGE-PROFILE-REDIRECT-V1: /mypage/business-profile로 통합 */}
              <Route path="/supplier/profile" element={<Navigate to="/mypage/business-profile" replace />} />
              {/* WO-O4O-MARKET-TRIAL-PHASE1-V1 + WO-MARKET-TRIAL-SUPPLIER-RESULTS-AND-FEEDBACK-V1 */}
              {/* Event Offer 현황 — 공급자 지원 허브 (WO-O4O-EVENT-OFFER-NETURE-ROLE-UX-ALIGNMENT-V1) */}
              <Route path="/supplier/event-offers" element={<SupplierEventOfferPage />} />
              <Route path="/supplier/market-trial" element={<SupplierTrialListPage />} />
              <Route path="/supplier/market-trial/new" element={<SupplierTrialCreatePage />} />
              <Route path="/supplier/market-trial/:id" element={<SupplierTrialDetailPage />} />
              <Route path="/supplier/market-trial/:id/edit" element={<SupplierTrialEditPage />} />
              {/* WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1 (2026-05-23):
                  공급자가 Signage Hub 콘텐츠를 직접 탐색·복사하는 진입점 제거.
                  Canonical 흐름은 Operator 가 HUB 콘텐츠를 큐레이션하고 매장에 배포. */}
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
              {/* WO-O4O-NETURE-BLOG-RETIRE-V1: Neture Blog public route 제거 (canonical = Forum + Content + AI editor) */}
              <Route path="/store/cart" element={<StoreCartPage />} />
              <Route path="/store/orders" element={<StoreOrdersPage />} />
              <Route path="/store/orders/:id" element={<StoreOrderDetailPage />} />
              {/* Store Owner Manage (WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1) */}
              <Route path="/store/manage/products" element={<StoreListingsPage />} />
              <Route path="/store/manage/products/library" element={<StoreProductLibraryPage />} />
              {/* WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 공통 패키지 기반 풀 기능 페이지.
                  Backend requireStoreOwner(role_assignments)가 실제 게이트. */}
              <Route path="/store/my-products" element={<StoreProductsManagerPage />} />
              {/* removed: /store/event-offers — WO-O4O-EVENT-OFFER-NETURE-ROLE-UX-ALIGNMENT-V1 */}
            </Route>

            {/* ================================================================
                공통 영역 (MainLayout) — store/seller/partner-info/forum
                ※ /o4o/* 는 NetureLayout으로 이동 (WO-O4O-ABOUT-URL-SEMANTIC-ALIGNMENT-V1)
            ================================================================ */}
            <Route element={<MainLayout />}>
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

              {/* /forum, /forum/write, /forum/post/:slug — NetureLayout canonical (WO-NETURE-COMMUNITY-HUB-TEMPLATE-ADOPTION-V1) */}
              <Route path="/forum/service-update" element={<ForumPage boardSlug="service-update" />} />
              <Route path="/forum/service-update/new" element={<ForumWritePage />} />
              <Route path="/forum/service-update/:slug" element={<ForumPostPage />} />
            </Route>

            {/* ================================================================
                Admin Vault (/admin-vault)
            ================================================================ */}
            <Route element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}>
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
              {/* WO-O4O-NETURE-ADMIN-OPERATOR-URL-SEPARATION-V1: 가입 승인은 operator 업무 → /operator/applications */}
              <Route path="/admin/applications" element={<Navigate to="/operator/applications" replace />} />
              <Route path="/admin/community" element={<ForumManagementPage />} />
              <Route path="/admin/forum-delete-requests" element={<ForumDeleteRequestsPage />} />
              <Route path="/admin/forum-analytics" element={<ForumAnalyticsPage />} />
              {/* WO-NETURE-OPERATOR-SUPPLY-MENU-REMOVE-V1: /admin/supply 제거 */}
              <Route path="/admin/all-products" element={<Navigate to="/operator/all-registered-products" replace />} />
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
              {/* WO-CLEANUP-2: /admin/market-trial → /operator/market-trial redirect */}
              <Route path="/admin/market-trial" element={<Navigate to="/operator/market-trial" replace />} />
              <Route path="/admin/categories" element={<CategoryManagementPage />} />
              <Route path="/admin/brands" element={<BrandManagementPage />} />
              <Route path="/admin/product-cleanup" element={<ProductDataCleanupPage />} />
              <Route path="/admin/product-service-approvals" element={<ProductServiceApprovalPage />} />
              {/* WO-NETURE-CURATION-PHASE3-FULL-REMOVAL-V1: /admin/curation 라우트 제거 */}
              <Route path="/admin/actions" element={<OperatorActionQueuePage />} />
              {/* Admin-only 페이지 */}
              {/* WO-O4O-NETURE-ADMIN-MEMBER-HARD-DELETE-V1: admin 전용 완전삭제 관리 */}
              <Route path="/admin/members" element={<AdminMemberManagementPage />} />
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
              {/* WO-O4O-NETURE-MEMBER-MANAGEMENT-BULK-AND-ROUTE-ALIGNMENT-V1:
                  /operator/members 를 표준 경로로 추가. /operator/users 는 legacy alias 로 유지. */}
              <Route path="/operator/members" element={<UsersManagementPage />} />
              <Route path="/operator/members/:id" element={<UserDetailPage />} />
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
              {/* WO-NETURE-OPERATOR-PRODUCTS-UNIFIED-LIST-FINAL-V1: 제거된 메뉴 redirect */}
              <Route path="/operator/supply" element={<Navigate to="/operator/all-registered-products" replace />} />
              <Route path="/operator/all-products" element={<Navigate to="/operator/all-registered-products" replace />} />
              <Route path="/operator/all-registered-products" element={<AllRegisteredProductsPage />} />
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
              {/* Guide Contents (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1) */}
              <Route path="/operator/guide-contents" element={<OperatorGuideContentsPage />} />
              <Route path="/operator/analytics" element={<OperatorAnalyticsPage />} />
              <Route path="/operator/supplier-quality" element={<SupplierQualityPage />} />
              <Route path="/operator/category-mapping-rules" element={<CategoryMappingRulesPage />} />
              <Route path="/operator/market-trial" element={<MarketTrialApprovalsPage />} />
              <Route path="/operator/market-trial/:id" element={<MarketTrialApprovalDetailPage />} />
              <Route path="/operator/product-service-approvals" element={<ProductServiceApprovalPage />} />
              <Route path="/operator/product-approvals" element={<OperatorProductApprovalPage />} />
              {/* WO-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1 (Phase 5) */}
              <Route path="/operator/product-candidates" element={<ProductCandidateReviewPage />} />
              {/* WO-NETURE-CURATION-PHASE3-FULL-REMOVAL-V1: /operator/curation 라우트 제거 */}
              <Route path="/operator/actions" element={<OperatorActionQueuePage />} />
              {/* WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1: operator scope supplier activation */}
              <Route path="/operator/suppliers" element={<OperatorSupplierApprovalPage />} />
              {/* WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1: operator scope contact messages */}
              <Route path="/operator/contact-messages" element={<OperatorContactMessagesPage />} />
            </Route>

            {/* ================================================================
                레거시 리다이렉트 (기존 경로 → 신규 경로)
            ================================================================ */}
            {/* Workspace → 새 경로 */}
            <Route path="/workspace" element={<Navigate to="/" replace />} />
            <Route path="/workspace/suppliers" element={<Navigate to="/" replace />} />
            <Route path="/workspace/content" element={<Navigate to="/partner/contents" replace />} />

            {/* Supplier Dashboard 리다이렉트 */}
            <Route path="/workspace/supplier/dashboard" element={<Navigate to="/supplier" replace />} />
            <Route path="/workspace/supplier/products" element={<Navigate to="/supplier/products" replace />} />
            <Route path="/workspace/supplier/orders" element={<Navigate to="/supplier/orders" replace />} />
            <Route path="/workspace/supplier/requests" element={<Navigate to="/supplier/requests" replace />} />
            <Route path="/workspace/supplier/library" element={<Navigate to="/supplier/library" replace />} />
            <Route path="/workspace/supplier/profile" element={<Navigate to="/mypage/business-profile" replace />} />
            <Route path="/workspace/supplier/*" element={<Navigate to="/supplier" replace />} />

            {/* Partner Dashboard 리다이렉트 */}
            <Route path="/workspace/partner" element={<Navigate to="/partner/dashboard" replace />} />
            <Route path="/workspace/partner/collaboration" element={<Navigate to="/partner/links" replace />} />
            <Route path="/workspace/partner/promotions" element={<Navigate to="/partner/promotions" replace />} />
            <Route path="/workspace/partner/settlements" element={<Navigate to="/partner/settlements" replace />} />
            <Route path="/workspace/partner/recruiting-products" element={<Navigate to="/partner/stores" replace />} />
            <Route path="/workspace/partner/*" element={<Navigate to="/partner/dashboard" replace />} />

            {/* 기존 최상위 경로 리다이렉트 */}
            <Route path="/suppliers" element={<Navigate to="/" replace />} />
            <Route path="/partners/requests" element={<Navigate to="/workspace/partners/requests" replace />} />
            <Route path="/partners/info" element={<Navigate to="/workspace/partners/info" replace />} />
            <Route path="/platform/principles" element={<Navigate to="/o4o/principles" replace />} />
            {/* /content, /content/:id — NetureLayout 내 /content 라우트로 처리됨 (레거시 redirect 제거) */}
            <Route path="/my-content" element={<Navigate to="/workspace/my-content" replace />} />

            {/* Hub/Workspace 리다이렉트 — WO-O4O-ROLE-ROUTE-ISOLATION-V1 */}
            <Route path="/hub" element={<Navigate to="/workspace/hub" replace />} />
            {/* /admin은 AdminRoute가 직접 처리. 레거시 redirect 제거 */}
            <Route path="/workspace/admin" element={<Navigate to="/admin" replace />} />
            <Route path="/workspace/admin/*" element={<Navigate to="/admin" replace />} />
            <Route path="/workspace/operator" element={<Navigate to="/operator" replace />} />

            {/* Legacy supplier/partner 리다이렉트 */}
            <Route path="/supplier/dashboard" element={<Navigate to="/supplier" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LoginModalProvider>
    </AuthProvider>
    </O4OErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
