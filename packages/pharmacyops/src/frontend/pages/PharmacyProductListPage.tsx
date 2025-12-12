/**
 * PharmacyProductListPage
 *
 * 약국용 의약품 목록 페이지
 *
 * @package @o4o/pharmacyops
 */

import React from 'react';

export const PharmacyProductListPage: React.FC = () => {
  return (
    <div className="pharmacy-product-list-page">
      <h1>의약품 목록</h1>
      <p>PharmacyOps Product List - Coming Soon</p>

      {/* TODO: Task 3에서 구현 */}
      {/*
        - 검색 필터 (약품명, 코드, 성분명)
        - 카테고리 필터 (OTC, ETC, 의약외품)
        - 제조사 필터
        - 의약품 목록 테이블
        - 페이지네이션
        - Offer 연결 (유효한 Offer 수, 최저가 표시)
      */}
    </div>
  );
};

export default PharmacyProductListPage;
