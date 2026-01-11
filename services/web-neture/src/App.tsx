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
import MainLayout from './components/layouts/MainLayout';
import HomePage from './pages/HomePage';
import SupplierListPage from './pages/suppliers/SupplierListPage';
import SupplierDetailPage from './pages/suppliers/SupplierDetailPage';
import PartnershipRequestListPage from './pages/partners/requests/PartnershipRequestListPage';
import PartnershipRequestDetailPage from './pages/partners/requests/PartnershipRequestDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/suppliers" element={<SupplierListPage />} />
          <Route path="/suppliers/:slug" element={<SupplierDetailPage />} />
          <Route path="/partners/requests" element={<PartnershipRequestListPage />} />
          <Route path="/partners/requests/:id" element={<PartnershipRequestDetailPage />} />
          <Route path="/content" element={<div className="max-w-7xl mx-auto px-4 py-16"><h1 className="text-3xl font-bold">콘텐츠 (준비 중)</h1></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
