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
// WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P2): 매장 신규 상품 등록 요청 검토·승인
const StoreProductRequestsPage = lazy(() => import('@/pages/o4o-product-db/StoreProductRequestsPage'));
const ProductMastersPage = lazy(() => import('@/pages/o4o-product-db/ProductMastersPage'));
// WO-O4O-ADMIN-PRODUCT-MASTER-MANUAL-REGISTRATION-UI-V1: 관리자 수동 상품 등록
const ProductMasterCreatePage = lazy(() => import('@/pages/o4o-product-db/ProductMasterCreatePage'));
const ProductMasterDetailPage = lazy(() => import('@/pages/o4o-product-db/ProductMasterDetailPage'));
const ImageQualityPage = lazy(() => import('@/pages/o4o-product-db/ImageQualityPage'));
// WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1: 공급자 매장용 설명서 최소 검수 큐
const SupplierStoreDescriptionReviewPage = lazy(() => import('@/pages/o4o-product-db/SupplierStoreDescriptionReviewPage'));
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
      {/* WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P2) */}
      <Route path="store-requests" element={<StoreProductRequestsPage />} />
      <Route path="masters" element={<ProductMastersPage />} />
      <Route path="masters/new" element={<ProductMasterCreatePage />} />
      <Route path="masters/:id" element={<ProductMasterDetailPage />} />
      {/* WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1 */}
      <Route path="supplier-store-descriptions" element={<SupplierStoreDescriptionReviewPage />} />
      {/* 설명서 검토 워크플로우 제거 (WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1).
          북마크/딥링크 호환을 위해 기존 경로는 기본 상품 목록으로 리다이렉트한다. */}
      <Route path="review" element={<Navigate to="../masters" replace />} />
      <Route path="review/:id" element={<Navigate to="../../masters" replace />} />
      <Route path="drug-description-drafts" element={<Navigate to="../masters" replace />} />
      <Route path="drug-description-drafts/:id" element={<Navigate to="../../masters" replace />} />
      <Route path="description-dashboard" element={<Navigate to="../masters" replace />} />
      <Route path="description-review-queue" element={<Navigate to="../masters" replace />} />
      <Route path="description-status" element={<Navigate to="../masters" replace />} />
      <Route path="image-quality" element={<ImageQualityPage />} />
      <Route path="maintenance" element={<ProductDbMaintenancePage />} />
    </Route>,
  ];
}
