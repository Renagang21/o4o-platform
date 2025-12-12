/**
 * PharmacyOrderListPage
 *
 * 약국 주문 목록 페이지
 *
 * @package @o4o/pharmacyops
 */

import React from 'react';

export const PharmacyOrderListPage: React.FC = () => {
  return (
    <div className="pharmacy-order-list-page">
      <h1>주문 관리</h1>
      <p>PharmacyOps Order List - Coming Soon</p>

      {/* TODO: Task 5에서 구현 */}
      {/*
        - 주문 상태 필터 (대기, 확인, 준비중, 배송중, 완료, 취소)
        - 결제 상태 필터
        - 기간 필터
        - 공급자 필터
        - 주문 목록 테이블
        - 주문 상세 링크
        - 주문 취소 버튼
        - 재주문 버튼
        - 페이지네이션
      */}
    </div>
  );
};

export default PharmacyOrderListPage;
