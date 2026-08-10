/**
 * SupplierOps Router
 *
 * Main router for SupplierOps app pages
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
/**
 * 공급자 상품 목록·검색·등록 (WO-O4O-SUPPLIEROPS-PRODUCT-CREATE-LEGACY-UI-GUIDE-V1)
 *
 * 기존 `Products` 는 setTimeout 기반 데모 데이터였고,
 * `ProductCreatePage` → `SupplierProductForm` 의 저장은 backend 에 없는
 * `/api/vendor/products` 로 갔다(admin 오리진 → index.html 200 위장 실패).
 * 상품 등록 canonical 원장은 Neture 공급자 화면이므로 세 경로를 안내 화면으로 교체했다.
 * 근거: docs/checks/CHECK-O4O-ADMIN-VENDOR-APIREQUEST-SAME-ORIGIN-FIX-V1.md
 */
const SupplierOpsProductGuidePage = lazy(() => import('./pages/SupplierOpsProductGuidePage'));
const BulkImportPage = lazy(() => import('./pages/BulkImportPage'));
const Orders = lazy(() => import('./pages/Orders'));
const Settlement = lazy(() => import('./pages/Settlement'));
// Marketing Materials (WO-O4O-SUPPLIER-CONTENT-SUBMISSION-PHASE1-V1)
const MarketingMaterials = lazy(() => import('./pages/MarketingMaterials'));
const MarketingMaterialsCreate = lazy(() => import('./pages/MarketingMaterialsCreate'));
// Signage Report (WO-O4O-SIGNAGE-SUPPLIER-REPORT-UI-V1)
const SignageReport = lazy(() => import('./pages/SignageReport'));
// Signage Campaign Request (WO-O4O-SIGNAGE-SUPPLIER-CAMPAIGN-REQUEST-V1)
const CampaignRequestPage = lazy(() => import('./pages/CampaignRequestPage'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * SupplierOps Router Component
 */
const SupplierOpsRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        {/* 세 경로 모두 안내 화면 — WO-O4O-SUPPLIEROPS-PRODUCT-CREATE-LEGACY-UI-GUIDE-V1 */}
        <Route path="products" element={<SupplierOpsProductGuidePage />} />
        <Route path="products/new" element={<SupplierOpsProductGuidePage />} />
        <Route path="products/create" element={<SupplierOpsProductGuidePage />} />
        {/* 대량 등록은 canonical API(/neture/supplier/csv-import/upload)를 사용하므로 유지 */}
        <Route path="products/bulk-import" element={<BulkImportPage />} />
        {/* /supplierops/offers — 공급자 상품 보강은 neture.co.kr/supplier/products 에서 이용 */}
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<Orders />} />
        <Route path="settlement" element={<Settlement />} />
        {/* Marketing Materials (WO-O4O-SUPPLIER-CONTENT-SUBMISSION-PHASE1-V1) */}
        <Route path="marketing-materials" element={<MarketingMaterials />} />
        <Route path="marketing-materials/new" element={<MarketingMaterialsCreate />} />
        {/* Signage Report (WO-O4O-SIGNAGE-SUPPLIER-REPORT-UI-V1) */}
        <Route path="signage-reports" element={<SignageReport />} />
        {/* Signage Campaign Request (WO-O4O-SIGNAGE-SUPPLIER-CAMPAIGN-REQUEST-V1) */}
        <Route path="signage-campaign-requests" element={<CampaignRequestPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
};

export default SupplierOpsRouter;
