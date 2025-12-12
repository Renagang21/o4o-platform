/**
 * Cosmetics Supplier Router
 *
 * 공급사 관리 라우팅
 *
 * Phase 6-G: Cosmetics Supplier Extension
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages
const CosmeticsSupplierDashboard = React.lazy(
  () => import('./CosmeticsSupplierDashboard')
);
const CosmeticsSupplierApprovals = React.lazy(
  () => import('./CosmeticsSupplierApprovals')
);
const CosmeticsSupplierPricePolicies = React.lazy(
  () => import('./CosmeticsSupplierPricePolicies')
);
const CosmeticsSupplierSamples = React.lazy(
  () => import('./CosmeticsSupplierSamples')
);
const CosmeticsSupplierCampaigns = React.lazy(
  () => import('./CosmeticsSupplierCampaigns')
);

const CosmeticsSupplierRouter: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<CosmeticsSupplierDashboard />} />
        <Route path="/approvals" element={<CosmeticsSupplierApprovals />} />
        <Route path="/price-policies" element={<CosmeticsSupplierPricePolicies />} />
        <Route path="/samples" element={<CosmeticsSupplierSamples />} />
        <Route path="/campaigns" element={<CosmeticsSupplierCampaigns />} />
        <Route path="*" element={<Navigate to="/cosmetics-supplier" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default CosmeticsSupplierRouter;
