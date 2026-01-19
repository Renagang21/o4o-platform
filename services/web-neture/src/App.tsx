/**
 * Neture - 유통 정보 플랫폼
 *
 * Work Orders:
 * - WO-NETURE-EXTENSION-P1~P5: 표현 계층 (Read-Only Information)
 * - WO-NETURE-SUPPLIER-DASHBOARD-P0: 실행 계층 (Supplier Actions)
 *
 * Phase: P0 (Read-Only + Supplier Execution)
 *
 * HARD RULES:
 * - NO 주문/결제/정산 (P1 이후)
 * - NO 관리자 승인 (공급자만 승인 주체)
 * - NO 내부 메시지
 * - 일반 사용자/판매자: 읽기 전용 정보 플랫폼
 * - 공급자: 신청 승인/거절 실행 가능
 *
 * Neture 책임 선언:
 * - Neture는 공급자 통합 운영 대시보드
 * - 신청 생성은 각 서비스에서 처리
 * - 신청 승인/거절은 공급자가 Neture에서 처리
 *
 * Code Splitting:
 * - Heavy pages (Admin, Supplier, Operator) are lazy loaded
 * - Content Editor (TipTap) is lazy loaded
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts';
import MainLayout from './components/layouts/MainLayout';

// Core pages (always loaded)
import HomePage from './pages/HomePage';
import O4OIntroPage from './pages/O4OIntroPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RegisterPendingPage } from './pages/RegisterPendingPage';
import SupplierListPage from './pages/suppliers/SupplierListPage';
import SupplierDetailPage from './pages/suppliers/SupplierDetailPage';
import PartnershipRequestListPage from './pages/partners/requests/PartnershipRequestListPage';
import PartnershipRequestDetailPage from './pages/partners/requests/PartnershipRequestDetailPage';
import PartnersApplyPage from './pages/partners/PartnersApplyPage';
import PartnerInfoPage from './pages/PartnerInfoPage';
import PlatformPrinciplesPage from './pages/PlatformPrinciplesPage';
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
import ContentListPage from './pages/content/ContentListPage';
import ContentDetailPage from './pages/content/ContentDetailPage';

// Test Guide Pages (always loaded - lightweight)
import {
  TestGuidePage,
  SupplierManualPage,
  PartnerManualPage,
  AdminManualPage,
  ContentEditorManualPage,
  NetureServiceManualPage,
  KCosmeticsServiceManualPage,
  GlycoPharmServiceManualPage,
  GlucoseViewServiceManualPage,
  KpaSocietyServiceManualPage,
} from './pages/test-guide';

// Forum Pages (always loaded)
import { ForumPage } from './pages/forum/ForumPage';
import { ForumWritePage } from './pages/forum/ForumWritePage';
import { ForumPostPage } from './pages/forum/ForumPostPage';

// ============================================================================
// Lazy loaded pages (heavy / rarely accessed)
// ============================================================================

// Supplier Dashboard
const SupplierDashboardLayout = lazy(() =>
  import('./pages/supplier').then((m) => ({ default: m.SupplierDashboardLayout }))
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

// Content Editor (TipTap - heavy)
const ContentEditorPage = lazy(() => import('./pages/supplier/content/ContentEditorPage'));

// Partner Dashboard
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

// Operator Dashboard
const OperatorDashboard = lazy(() =>
  import('./pages/operator').then((m) => ({ default: m.OperatorDashboard }))
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

// Loading fallback
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            {/* Login & Register - outside MainLayout */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register/pending" element={<RegisterPendingPage />} />

            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              {/* O4O Platform Introduction (WO-NETURE-O4O-INTRO-PAGE-IMPLEMENTATION-V1) */}
              <Route path="/o4o" element={<O4OIntroPage />} />
              <Route path="/suppliers" element={<SupplierListPage />} />
              <Route path="/suppliers/:slug" element={<SupplierDetailPage />} />
              <Route path="/partners/requests" element={<PartnershipRequestListPage />} />
              <Route path="/partners/requests/:id" element={<PartnershipRequestDetailPage />} />
              <Route path="/partners/apply" element={<PartnersApplyPage />} />
              <Route path="/partners/info" element={<PartnerInfoPage />} />
              {/* Platform Principles (WO-NETURE-PHARMA-LEGAL-JUDGMENT-V1) */}
              <Route path="/platform/principles" element={<PlatformPrinciplesPage />} />
              {/* Seller Overview (WO-NETURE-SELLER-OVERVIEW-PAGE-V1) */}
              <Route path="/seller/overview" element={<SellerOverviewPage />} />
              {/* Seller QR Guide (WO-NETURE-O4O-SELLER-ENABLEMENT-MASTER-V1 > Track A) */}
              <Route path="/seller/qr-guide" element={<SellerQRGuidePage />} />
              {/* Seller Overview by Industry (WO-NETURE-O4O-SELLER-ENABLEMENT-MASTER-V1 > Track B) */}
              <Route path="/seller/overview/pharmacy" element={<SellerOverviewPharmacy />} />
              <Route path="/seller/overview/beauty" element={<SellerOverviewBeauty />} />
              <Route path="/seller/overview/market" element={<SellerOverviewMarket />} />
              {/* Medical Overview (WO-NETURE-O4O-MEDICAL-OVERVIEW-V1) */}
              <Route path="/seller/overview/medical" element={<MedicalOverviewPage />} />
              {/* Partner Overview Info (WO-NETURE-O4O-SELLER-ENABLEMENT-MASTER-V1 > Track C) */}
              <Route path="/partner/overview-info" element={<PartnerOverviewInfoPage />} />
              {/* Channel Explanation Pages */}
              <Route path="/channel/structure" element={<ChannelSalesStructurePage />} />
              <Route path="/channel/dental" element={<DentalChannelExplanationPage />} />
              <Route path="/channel/pharmacy" element={<PharmacyChannelExplanationPage />} />
              <Route path="/channel/optical" element={<OpticalChannelExplanationPage />} />
              <Route path="/channel/medical" element={<MedicalChannelExplanationPage />} />
              <Route path="/content" element={<ContentListPage />} />
              <Route path="/content/:id" element={<ContentDetailPage />} />

              {/* Test Guide */}
              <Route path="/test-guide" element={<TestGuidePage />} />
              <Route path="/test-guide/manual/supplier" element={<SupplierManualPage />} />
              <Route path="/test-guide/manual/partner" element={<PartnerManualPage />} />
              <Route path="/test-guide/manual/admin" element={<AdminManualPage />} />
              <Route path="/test-guide/manual/content-editor" element={<ContentEditorManualPage />} />
              <Route path="/test-guide/service/neture" element={<NetureServiceManualPage />} />
              <Route path="/test-guide/service/k-cosmetics" element={<KCosmeticsServiceManualPage />} />
              <Route path="/test-guide/service/glycopharm" element={<GlycoPharmServiceManualPage />} />
              <Route path="/test-guide/service/glucoseview" element={<GlucoseViewServiceManualPage />} />
              <Route path="/test-guide/service/kpa-society" element={<KpaSocietyServiceManualPage />} />

              {/* Forum (WO-NETURE-TEST-SECTIONS-V1) */}
              <Route path="/forum" element={<ForumPage />} />
              <Route path="/forum/test-feedback" element={<ForumPage boardSlug="test-feedback" />} />
              <Route path="/forum/test-feedback/new" element={<ForumWritePage />} />
              <Route path="/forum/test-feedback/:slug" element={<ForumPostPage />} />
              <Route path="/forum/service-update" element={<ForumPage boardSlug="service-update" />} />
              <Route path="/forum/service-update/new" element={<ForumWritePage />} />
              <Route path="/forum/service-update/:slug" element={<ForumPostPage />} />
              <Route path="/forum/write" element={<ForumWritePage />} />
            </Route>

            {/* Supplier Dashboard (WO-NETURE-SUPPLIER-DASHBOARD-P0) - Lazy */}
            <Route element={<SupplierDashboardLayout />}>
              <Route path="/supplier/dashboard" element={<SupplierDashboardPage />} />
              <Route path="/supplier/requests" element={<SellerRequestsPage />} />
              <Route path="/supplier/requests/:id" element={<SellerRequestDetailPage />} />
              <Route path="/supplier/products" element={<SupplierProductsPage />} />
              <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
              <Route path="/supplier/contents" element={<SupplierContentsPage />} />
              <Route path="/supplier/contents/new" element={<ContentEditorPage />} />
              <Route path="/supplier/contents/:id/edit" element={<ContentEditorPage />} />
            </Route>

            {/* Partner Dashboard - Lazy */}
            <Route path="/partner" element={<PartnerOverviewPage />} />
            <Route path="/partner/collaboration" element={<CollaborationPage />} />
            <Route path="/partner/promotions" element={<PromotionsPage />} />
            <Route path="/partner/settlements" element={<SettlementsPage />} />

            {/* Admin Dashboard - Lazy */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/ai-card-rules" element={<AiCardExplainPage />} />
            <Route path="/admin/ai-card-report" element={<AiCardReportPage />} />
            <Route path="/admin/ai-business-pack" element={<AiBusinessPackPage />} />
            <Route path="/admin/ai-operations" element={<AiOperationsPage />} />

            {/* AI Admin Control Plane - Lazy */}
            <Route path="/admin/ai" element={<AiAdminDashboardPage />} />
            <Route path="/admin/ai/engines" element={<AiEnginesPage />} />
            <Route path="/admin/ai/policy" element={<AiPolicyPage />} />
            <Route path="/admin/ai/asset-quality" element={<AssetQualityPage />} />
            <Route path="/admin/ai/cost" element={<AiCostPage />} />
            <Route path="/admin/ai/context-assets" element={<ContextAssetListPage />} />
            <Route path="/admin/ai/context-assets/new" element={<ContextAssetFormPage />} />
            <Route path="/admin/ai/context-assets/:id/edit" element={<ContextAssetFormPage />} />
            <Route path="/admin/ai/composition-rules" element={<AnswerCompositionRulesPage />} />

            {/* Admin Settings - Lazy */}
            <Route path="/admin/settings/email" element={<EmailSettingsPage />} />

            {/* Operator Dashboard - Lazy */}
            <Route path="/operator" element={<OperatorDashboard />} />
            <Route path="/operator/ai-report" element={<OperatorAiReportPage />} />
            <Route path="/operator/settings/notifications" element={<EmailNotificationSettingsPage />} />
            <Route path="/operator/registrations" element={<RegistrationRequestsPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
