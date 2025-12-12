/**
 * Cosmetics Partner Router
 *
 * Main router for Cosmetics Partner Extension pages
 * - Dashboard: 파트너 대시보드
 * - Links: 추천 링크 관리
 * - Routines: 스킨케어 루틴 관리
 * - Earnings: 수익 및 정산 관리
 * - Commission Policies: 커미션 정책 관리
 *
 * Phase 6-E: Nested routes with PartnerLayout
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import PartnerLayout from '../../components/partner/PartnerLayout';

// Lazy load pages
const CosmeticsPartnerDashboard = lazy(() => import('./CosmeticsPartnerDashboard'));
const CosmeticsPartnerLinks = lazy(() => import('./CosmeticsPartnerLinks'));
const CosmeticsPartnerRoutines = lazy(() => import('./CosmeticsPartnerRoutines'));
const CosmeticsPartnerEarnings = lazy(() => import('./CosmeticsPartnerEarnings'));
const CosmeticsPartnerCommissionPolicies = lazy(() => import('./CosmeticsPartnerCommissionPolicies'));

// Loading component - Skeleton style
const PageLoader: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
      ))}
    </div>
    <div className="h-64 bg-gray-200 rounded-lg"></div>
  </div>
);

/**
 * Cosmetics Partner Router Component
 *
 * Uses nested routes with PartnerLayout for consistent UI
 */
const CosmeticsPartnerRouter: React.FC = () => {
  return (
    <Routes>
      <Route element={<PartnerLayout />}>
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <CosmeticsPartnerDashboard />
            </Suspense>
          }
        />
        <Route
          path="links"
          element={
            <Suspense fallback={<PageLoader />}>
              <CosmeticsPartnerLinks />
            </Suspense>
          }
        />
        <Route
          path="routines"
          element={
            <Suspense fallback={<PageLoader />}>
              <CosmeticsPartnerRoutines />
            </Suspense>
          }
        />
        <Route
          path="earnings"
          element={
            <Suspense fallback={<PageLoader />}>
              <CosmeticsPartnerEarnings />
            </Suspense>
          }
        />
        <Route
          path="commission-policies"
          element={
            <Suspense fallback={<PageLoader />}>
              <CosmeticsPartnerCommissionPolicies />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <CosmeticsPartnerDashboard />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
};

export default CosmeticsPartnerRouter;
