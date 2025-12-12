/**
 * Cosmetics Sample Router
 *
 * 샘플 & 진열 관리 라우터
 * Phase 6-H: Cosmetics Sample & Display Extension
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for code splitting
const SampleDashboard = React.lazy(() => import('./SampleDashboard'));
const SampleTrackingPage = React.lazy(() => import('./SampleTrackingPage'));
const DisplayManagementPage = React.lazy(() => import('./DisplayManagementPage'));
const ConversionAnalyticsPage = React.lazy(() => import('./ConversionAnalyticsPage'));

const CosmeticsSampleRouter: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <Routes>
        <Route index element={<SampleDashboard />} />
        <Route path="tracking" element={<SampleTrackingPage />} />
        <Route path="display" element={<DisplayManagementPage />} />
        <Route path="analytics" element={<ConversionAnalyticsPage />} />
        <Route path="*" element={<Navigate to="/cosmetics-sample" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default CosmeticsSampleRouter;
