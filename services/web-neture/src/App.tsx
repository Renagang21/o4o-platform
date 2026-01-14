/**
 * Neture P0 - 유통 정보 플랫폼 Prototype
 *
 * Work Order: WO-NETURE-CORE-V1
 * Phase: P0 (Read-Only Information Platform)
 *
 * HARD RULES:
 * - NO 주문/결제/정산
 * - NO 관리 콘솔
 * - NO 내부 메시지
 * - 읽기 전용 정보 플랫폼만
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
import PartnershipRequestCreatePage from './pages/partners/requests/PartnershipRequestCreatePage';
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
            <Route path="/partners/requests/new" element={<PartnershipRequestCreatePage />} />
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
