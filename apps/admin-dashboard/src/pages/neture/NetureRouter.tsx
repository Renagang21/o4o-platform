/**
 * Neture Admin Router
 *
 * Work Order: WO-NETURE-EXTENSION-P1
 * Phase D-3: Admin Dashboard에 Neture 서비스 등록
 *
 * 조회 전용 (Read-Only):
 * - Neture는 중앙 신청 시스템이 아님
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: Partners · Partnership Requests 화면 은퇴
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for code splitting
const ProductListPage = React.lazy(() => import('./ProductListPage'));
const ProductDetailPage = React.lazy(() => import('./ProductDetailPage'));
const SupplierListPage = React.lazy(() => import('./SupplierListPage'));
const CategoryListPage = React.lazy(() => import('./CategoryListPage'));
const BrandListPage = React.lazy(() => import('./BrandListPage'));

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

        {/* WO-O4O-FINAL-CODE-ONLY-RETIREMENT-CLOSURE-V1 §8: admin 전용 상품 승인 큐는 은퇴 (canonical = Neture operator 승인 콘솔) */}

        {/* Suppliers (WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1) */}
        <Route path="suppliers" element={<SupplierListPage />} />

        {/* Categories & Brands (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) */}
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="brands" element={<BrandListPage />} />

        {/* Default redirect */}
        <Route index element={<Navigate to="/neture/products" replace />} />
        <Route path="*" element={<Navigate to="/neture/products" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default NetureRouter;
