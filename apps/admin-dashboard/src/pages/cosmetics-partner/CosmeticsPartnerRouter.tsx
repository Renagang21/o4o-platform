/**
 * Cosmetics Partner Router
 *
 * Main router for Cosmetics Partner Extension pages
 * - Dashboard: 파트너 대시보드
 * - Links: 추천 링크 관리
 * - Routines: 스킨케어 루틴 관리
 * - Earnings: 수익 및 정산 관리
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load pages
const CosmeticsPartnerDashboard = lazy(() => import('./CosmeticsPartnerDashboard'));
const CosmeticsPartnerLinks = lazy(() => import('./CosmeticsPartnerLinks'));
const CosmeticsPartnerRoutines = lazy(() => import('./CosmeticsPartnerRoutines'));
const CosmeticsPartnerEarnings = lazy(() => import('./CosmeticsPartnerEarnings'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
  </div>
);

/**
 * Cosmetics Partner Router Component
 */
const CosmeticsPartnerRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="dashboard" element={<CosmeticsPartnerDashboard />} />
        <Route path="links" element={<CosmeticsPartnerLinks />} />
        <Route path="routines" element={<CosmeticsPartnerRoutines />} />
        <Route path="earnings" element={<CosmeticsPartnerEarnings />} />
        <Route path="*" element={<CosmeticsPartnerDashboard />} />
      </Routes>
    </Suspense>
  );
};

export default CosmeticsPartnerRouter;
