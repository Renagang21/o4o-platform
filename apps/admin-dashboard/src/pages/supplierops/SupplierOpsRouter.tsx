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
const Products = lazy(() => import('./pages/Products'));
const ProductSearchPage = lazy(() => import('./pages/ProductSearchPage'));
const ProductCreatePage = lazy(() => import('./pages/ProductCreatePage'));
const BulkImportPage = lazy(() => import('./pages/BulkImportPage'));
const Offers = lazy(() => import('./pages/Offers'));
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
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductSearchPage />} />
        <Route path="products/create" element={<ProductCreatePage />} />
        <Route path="products/bulk-import" element={<BulkImportPage />} />
        <Route path="offers" element={<Offers />} />
        <Route path="offers/new" element={<Offers />} />
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
