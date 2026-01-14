/**
 * Neture P0 - 유통 정보 플랫폼 Prototype
 *
 * Work Order: WO-NETURE-EXTENSION-P1
 * Phase: P0 (Read-Only Information Platform)
 *
 * HARD RULES:
 * - NO 주문/결제/정산
 * - NO 관리 콘솔
 * - NO 내부 메시지
 * - NO 신청 폼 (각 서비스에서 직접 처리)
 * - 읽기 전용 정보 플랫폼만
 *
 * Neture 책임 선언:
 * - Neture는 중앙 신청 시스템이 아님
 * - 신청/승인은 각 서비스(Glycopharm, Cosmetics 등)에서 처리
 * - 여기서는 정보 조회 + 외부 링크만 제공
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

// Test Guide Pages
import {
  TestGuidePage,
  SupplierManualPage,
  PartnerManualPage,
  AdminManualPage,
} from './pages/test-guide';

// Forum Pages (WO-NETURE-TEST-SECTIONS-V1)
import { ForumPage } from './pages/forum/ForumPage';

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

            {/* Forum (WO-NETURE-TEST-SECTIONS-V1) */}
            <Route path="/forum/test-feedback" element={<ForumPage boardSlug="test-feedback" />} />
            <Route path="/forum/service-update" element={<ForumPage boardSlug="service-update" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
