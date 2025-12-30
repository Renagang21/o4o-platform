/**
 * Dropshipping Offers Router
 *
 * 드롭쉬핑 오퍼 라우터
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 Generator 입력 정의를 수정하고 재생성하세요.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for code splitting
const OfferListPage = React.lazy(() => import('./OfferListPage'));
const OfferDetailPage = React.lazy(() => import('./OfferDetailPage'));

const DropshippingOffersRouter: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <Routes>
        <Route index element={<OfferListPage />} />
        <Route path=":offerId" element={<OfferDetailPage />} />
        <Route path="*" element={<Navigate to="/dropshipping-offers" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default DropshippingOffersRouter;
