/**
 * Neture Admin Router
 *
 * Work Order: WO-NETURE-EXTENSION-P1
 * Phase D-3: Admin Dashboard에 Neture 서비스 등록
 *
 * 조회 전용 (Read-Only):
 * - Partnership Requests: 조회만 가능 (승인/거절은 각 서비스에서 처리)
 * - Neture는 중앙 신청 시스템이 아님
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for code splitting
const ProductListPage = React.lazy(() => import('./ProductListPage'));
const ProductDetailPage = React.lazy(() => import('./ProductDetailPage'));
const PartnerListPage = React.lazy(() => import('./PartnerListPage'));
const PartnerDetailPage = React.lazy(() => import('./PartnerDetailPage'));
const PartnershipRequestListPage = React.lazy(() => import('./PartnershipRequestListPage'));
const PartnershipRequestDetailPage = React.lazy(() => import('./PartnershipRequestDetailPage'));

const NetureRouter: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <Routes>
        {/* Products */}
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />

        {/* Partners */}
        <Route path="partners" element={<PartnerListPage />} />
        <Route path="partners/:partnerId" element={<PartnerDetailPage />} />

        {/* Partnership Requests */}
        <Route path="partnership-requests" element={<PartnershipRequestListPage />} />
        <Route path="partnership-requests/:id" element={<PartnershipRequestDetailPage />} />

        {/* Default redirect */}
        <Route index element={<Navigate to="/neture/products" replace />} />
        <Route path="*" element={<Navigate to="/neture/products" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default NetureRouter;
