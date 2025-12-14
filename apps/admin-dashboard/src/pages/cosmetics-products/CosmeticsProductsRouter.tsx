/**
 * Cosmetics Products Router
 *
 * Products & Brands 라우터
 * Phase 7-H: Cosmetics Products/Brands/Routines UI Redesign (AG Design System)
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for code splitting
const ProductListPage = React.lazy(() => import('./ProductListPage'));
const ProductDetailPage = React.lazy(() => import('./ProductDetailPage'));
const BrandListPage = React.lazy(() => import('./BrandListPage'));
const BrandDetailPage = React.lazy(() => import('./BrandDetailPage'));

const CosmeticsProductsRouter: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      }
    >
      <Routes>
        <Route index element={<ProductListPage />} />
        <Route path=":productId" element={<ProductDetailPage />} />
        <Route path="brands" element={<BrandListPage />} />
        <Route path="brands/:brandId" element={<BrandDetailPage />} />
        <Route path="*" element={<Navigate to="/cosmetics-products" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default CosmeticsProductsRouter;
