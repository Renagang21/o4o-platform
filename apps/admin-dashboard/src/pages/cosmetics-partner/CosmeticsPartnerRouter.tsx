/**
 * Cosmetics Partner Router
 *
 * Main router for Cosmetics Partner Extension pages
 * - Dashboard: 파트너 대시보드
 * - Links: 추천 링크 관리
 * - Routines: 스킨케어 루틴 관리
 * - Earnings: 수익 및 정산 관리
 * - AI Tools: AI 루틴/설명 생성기 (Phase 6-F)
 * - Storefront: 스토어프론트/QR/단축링크 (Phase 6-F)
 * - Campaigns: 캠페인/소셜 콘텐츠 (Phase 6-F)
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load pages
const CosmeticsPartnerDashboard = lazy(() => import('./CosmeticsPartnerDashboard'));
const CosmeticsPartnerLinks = lazy(() => import('./CosmeticsPartnerLinks'));
const CosmeticsPartnerRoutines = lazy(() => import('./CosmeticsPartnerRoutines'));
const CosmeticsPartnerEarnings = lazy(() => import('./CosmeticsPartnerEarnings'));

// Phase 6-F: Influencer Tools
const CosmeticsPartnerAITools = lazy(() => import('./CosmeticsPartnerAITools'));
const CosmeticsPartnerStorefront = lazy(() => import('./CosmeticsPartnerStorefront'));
const CosmeticsPartnerCampaigns = lazy(() => import('./CosmeticsPartnerCampaigns'));

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
        {/* Phase 6-F: Influencer Tools */}
        <Route path="ai-tools" element={<CosmeticsPartnerAITools />} />
        <Route path="storefront" element={<CosmeticsPartnerStorefront />} />
        <Route path="campaigns" element={<CosmeticsPartnerCampaigns />} />
        <Route path="*" element={<CosmeticsPartnerDashboard />} />
      </Routes>
    </Suspense>
  );
};

export default CosmeticsPartnerRouter;
