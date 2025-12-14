/**
 * StorefrontRouter - Storefront Routes
 *
 * Phase 7-I: Storefront & QR Landing UI
 *
 * Routes:
 * - /storefront/:slug - Home page
 * - /storefront/:slug/products - Product list
 * - /storefront/:slug/products/:id - Product detail
 * - /storefront/:slug/routines/:id - Routine detail
 * - /storefront/qr/:slug - QR landing page
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load pages
const StorefrontHome = lazy(() => import('./StorefrontHome'));
const StorefrontProducts = lazy(() => import('./StorefrontProducts'));
const StorefrontProductDetailPage = lazy(() => import('./StorefrontProductDetailPage'));
const StorefrontRoutineDetailPage = lazy(() => import('./StorefrontRoutineDetailPage'));
const QrLandingPage = lazy(() => import('./QrLandingPage'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
  </div>
);

/**
 * StorefrontRouter Component
 */
const StorefrontRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* QR Landing - Special entry point */}
        <Route path="qr/:slug" element={<QrLandingPage />} />

        {/* Partner Storefront Routes */}
        <Route path=":slug" element={<StorefrontHome />} />
        <Route path=":slug/products" element={<StorefrontProducts />} />
        <Route path=":slug/products/:id" element={<StorefrontProductDetailPage />} />
        <Route path=":slug/routines/:id" element={<StorefrontRoutineDetailPage />} />

        {/* Fallback */}
        <Route path="*" element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h2>
              <p className="text-sm text-gray-500">요청하신 스토어프론트 페이지가 존재하지 않습니다.</p>
            </div>
          </div>
        } />
      </Routes>
    </Suspense>
  );
};

export default StorefrontRouter;
