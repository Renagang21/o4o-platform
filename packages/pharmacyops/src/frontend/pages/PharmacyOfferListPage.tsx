/**
 * PharmacyOfferListPage
 *
 * 약국용 도매 Offer 목록 페이지
 *
 * @package @o4o/pharmacyops
 */

import React from 'react';

export const PharmacyOfferListPage: React.FC = () => {
  return (
    <div className="pharmacy-offer-list-page">
      <h1>도매 Offer</h1>
      <p>PharmacyOps Offer List - Coming Soon</p>

      {/* TODO: Task 4에서 구현 */}
      {/*
        - 의약품 검색/필터
        - 공급자 유형 필터 (도매, 제조사)
        - 가격 범위 필터
        - 재고 있는 것만 필터
        - 콜드체인 지원 필터
        - 배송 소요일 필터
        - Offer 목록 테이블 (가격, 재고, 최소주문량, 배송)
        - 가격 비교 기능
        - 주문 버튼
      */}
    </div>
  );
};

export default PharmacyOfferListPage;
