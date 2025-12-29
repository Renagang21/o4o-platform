/**
 * Yaksa Forum Router
 *
 * 약사 포럼 라우터
 * Phase 9-B: Web Business Template 복제 검증
 *
 * Template Reference: cosmetics-products/CosmeticsProductsRouter.tsx
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for code splitting
const PostListPage = React.lazy(() => import('./PostListPage'));
const PostDetailPage = React.lazy(() => import('./PostDetailPage'));
const CategoryListPage = React.lazy(() => import('./CategoryListPage'));

const YaksaForumRouter: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <Routes>
        <Route index element={<PostListPage />} />
        <Route path=":postId" element={<PostDetailPage />} />
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="*" element={<Navigate to="/yaksa-forum" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default YaksaForumRouter;
