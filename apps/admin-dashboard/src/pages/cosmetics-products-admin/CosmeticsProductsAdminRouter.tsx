/**
 * Cosmetics Products Admin Router
 *
 * 화장품 제품 관리 라우터
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const ProductCreatePage = React.lazy(() => import('./ProductCreatePage'));
const ProductEditPage = React.lazy(() => import('./ProductEditPage'));
const ProductStatusPage = React.lazy(() => import('./ProductStatusPage'));

const CosmeticsProductsAdminRouter: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <Routes>
        <Route path="create" element={<ProductCreatePage />} />
        <Route path=":productId/edit" element={<ProductEditPage />} />
        <Route path=":productId/status" element={<ProductStatusPage />} />
        <Route path="*" element={<Navigate to="/cosmetics-products" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default CosmeticsProductsAdminRouter;
