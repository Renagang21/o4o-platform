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
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts';
import MainLayout from './components/layouts/MainLayout';
import HomePage from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import SupplierListPage from './pages/suppliers/SupplierListPage';
import SupplierDetailPage from './pages/suppliers/SupplierDetailPage';
import PartnershipRequestListPage from './pages/partners/requests/PartnershipRequestListPage';
import PartnershipRequestDetailPage from './pages/partners/requests/PartnershipRequestDetailPage';
// PartnershipRequestCreatePage 제거됨 (WO-NETURE-EXTENSION-P1: 신청은 각 서비스에서 직접 처리)
import PartnersApplyPage from './pages/partners/PartnersApplyPage';
import PartnerInfoPage from './pages/PartnerInfoPage';
import ContentListPage from './pages/content/ContentListPage';
import ContentDetailPage from './pages/content/ContentDetailPage';

// Supplier Dashboard (WO-NETURE-SUPPLIER-DASHBOARD-P0)
import {
  SupplierDashboardLayout,
  SupplierDashboardPage,
  SellerRequestsPage,
  SellerRequestDetailPage,
  SupplierProductsPage,
  SupplierOrdersPage,
  SupplierContentsPage,
} from './pages/supplier';

// Content Editor (WO-CONTENT-EDITOR-V1)
import ContentEditorPage from './pages/supplier/content/ContentEditorPage';

// Partner Dashboard
import { PartnerOverviewPage } from './pages/partner/PartnerOverviewPage';
import { CollaborationPage } from './pages/partner/CollaborationPage';
import { PromotionsPage } from './pages/partner/PromotionsPage';
import { SettlementsPage } from './pages/partner/SettlementsPage';

// Admin Dashboard
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AiCardExplainPage from './pages/admin/AiCardExplainPage';
import AiCardReportPage from './pages/admin/AiCardReportPage';
import AiBusinessPackPage from './pages/admin/AiBusinessPackPage';
import AiOperationsPage from './pages/admin/AiOperationsPage';

// AI Admin Control Plane (WO-AI-ADMIN-CONTROL-PLANE-V1)
import { AiAdminDashboardPage, AiEnginesPage, AiPolicyPage } from './pages/admin/ai';

// Test Guide Pages
import {
  TestGuidePage,
  SupplierManualPage,
  PartnerManualPage,
  AdminManualPage,
  ContentEditorManualPage,
  // Service Manuals
  NetureServiceManualPage,
  KCosmeticsServiceManualPage,
  GlycoPharmServiceManualPage,
  GlucoseViewServiceManualPage,
  KpaSocietyServiceManualPage,
} from './pages/test-guide';

// Forum Pages (WO-NETURE-TEST-SECTIONS-V1)
import { ForumPage } from './pages/forum/ForumPage';
import { ForumWritePage } from './pages/forum/ForumWritePage';
import { ForumPostPage } from './pages/forum/ForumPostPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login - outside MainLayout */}
          <Route path="/login" element={<LoginPage />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/suppliers" element={<SupplierListPage />} />
            <Route path="/suppliers/:slug" element={<SupplierDetailPage />} />
            <Route path="/partners/requests" element={<PartnershipRequestListPage />} />
            {/* /partners/requests/create 제거됨 - 신청은 각 서비스에서 직접 */}
            <Route path="/partners/requests/:id" element={<PartnershipRequestDetailPage />} />
            <Route path="/partners/apply" element={<PartnersApplyPage />} />
            <Route path="/partners/info" element={<PartnerInfoPage />} />
            <Route path="/content" element={<ContentListPage />} />
            <Route path="/content/:id" element={<ContentDetailPage />} />

            {/* Test Guide */}
            <Route path="/test-guide" element={<TestGuidePage />} />
            <Route path="/test-guide/manual/supplier" element={<SupplierManualPage />} />
            <Route path="/test-guide/manual/partner" element={<PartnerManualPage />} />
            <Route path="/test-guide/manual/admin" element={<AdminManualPage />} />
            <Route path="/test-guide/manual/content-editor" element={<ContentEditorManualPage />} />
            {/* Service Manuals */}
            <Route path="/test-guide/service/neture" element={<NetureServiceManualPage />} />
            <Route path="/test-guide/service/k-cosmetics" element={<KCosmeticsServiceManualPage />} />
            <Route path="/test-guide/service/glycopharm" element={<GlycoPharmServiceManualPage />} />
            <Route path="/test-guide/service/glucoseview" element={<GlucoseViewServiceManualPage />} />
            <Route path="/test-guide/service/kpa-society" element={<KpaSocietyServiceManualPage />} />

            {/* Forum (WO-NETURE-TEST-SECTIONS-V1) */}
            <Route path="/forum/test-feedback" element={<ForumPage boardSlug="test-feedback" />} />
            <Route path="/forum/test-feedback/new" element={<ForumWritePage />} />
            <Route path="/forum/test-feedback/:slug" element={<ForumPostPage />} />
            <Route path="/forum/service-update" element={<ForumPage boardSlug="service-update" />} />
            <Route path="/forum/service-update/new" element={<ForumWritePage />} />
            <Route path="/forum/service-update/:slug" element={<ForumPostPage />} />
            <Route path="/forum/write" element={<ForumWritePage />} />
          </Route>

          {/* Supplier Dashboard (WO-NETURE-SUPPLIER-DASHBOARD-P0) */}
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

          {/* Partner Dashboard */}
          <Route path="/partner" element={<PartnerOverviewPage />} />
          <Route path="/partner/collaboration" element={<CollaborationPage />} />
          <Route path="/partner/promotions" element={<PromotionsPage />} />
          <Route path="/partner/settlements" element={<SettlementsPage />} />

          {/* Admin Dashboard */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/ai-card-rules" element={<AiCardExplainPage />} />
          <Route path="/admin/ai-card-report" element={<AiCardReportPage />} />
          <Route path="/admin/ai-business-pack" element={<AiBusinessPackPage />} />
          <Route path="/admin/ai-operations" element={<AiOperationsPage />} />

          {/* AI Admin Control Plane (WO-AI-ADMIN-CONTROL-PLANE-V1) */}
          <Route path="/admin/ai" element={<AiAdminDashboardPage />} />
          <Route path="/admin/ai/engines" element={<AiEnginesPage />} />
          <Route path="/admin/ai/policy" element={<AiPolicyPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
