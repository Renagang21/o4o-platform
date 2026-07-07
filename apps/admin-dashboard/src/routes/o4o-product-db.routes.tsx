/**
 * O4O Product DB routes (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * 정부/공공데이터 기반 기본 상품 DB 조회 라우트. write/apply 없음.
 * 외곽 /* 라우트가 이미 requiredRoles=['admin'] 게이트를 적용한다.
 */

import { Route, Navigate } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

const ProductDbLayout = lazy(() => import('@/pages/o4o-product-db/ProductDbLayout'));
const ProductDbOverviewPage = lazy(() => import('@/pages/o4o-product-db/ProductDbOverviewPage'));
const ProductCandidatesPage = lazy(() => import('@/pages/o4o-product-db/ProductCandidatesPage'));
const ProductCandidateDetailPage = lazy(() => import('@/pages/o4o-product-db/ProductCandidateDetailPage'));
const ProductMastersPage = lazy(() => import('@/pages/o4o-product-db/ProductMastersPage'));
const ProductMasterDetailPage = lazy(() => import('@/pages/o4o-product-db/ProductMasterDetailPage'));
const DescriptionReviewPage = lazy(() => import('@/pages/o4o-product-db/DescriptionReviewPage'));
const DescriptionReviewDetailPage = lazy(() => import('@/pages/o4o-product-db/DescriptionReviewDetailPage'));
const DrugDescriptionDraftsPage = lazy(() => import('@/pages/o4o-product-db/DrugDescriptionDraftsPage'));
const DrugDescriptionDraftDetailPage = lazy(() => import('@/pages/o4o-product-db/DrugDescriptionDraftDetailPage'));
const ProductDbMaintenancePage = lazy(() => import('@/pages/o4o-product-db/ProductDbMaintenancePage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

export function O4OProductDbRoutes() {
  return [
    <Route
      key="/admin/o4o-product-db"
      path="/admin/o4o-product-db"
      element={
        <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
          <Suspense fallback={<PageLoader />}>
            <ProductDbLayout />
          </Suspense>
        </AdminProtectedRoute>
      }
    >
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="overview" element={<ProductDbOverviewPage />} />
      <Route path="candidates" element={<ProductCandidatesPage />} />
      <Route path="candidates/:id" element={<ProductCandidateDetailPage />} />
      <Route path="masters" element={<ProductMastersPage />} />
      <Route path="masters/:id" element={<ProductMasterDetailPage />} />
      <Route path="review" element={<DescriptionReviewPage />} />
      <Route path="review/:id" element={<DescriptionReviewDetailPage />} />
      <Route path="drug-description-drafts" element={<DrugDescriptionDraftsPage />} />
      <Route path="drug-description-drafts/:id" element={<DrugDescriptionDraftDetailPage />} />
      <Route path="maintenance" element={<ProductDbMaintenancePage />} />
    </Route>,
  ];
}
