/**
 * PharmacySettlementListPage
 *
 * 약국 정산(구매 내역) 목록 페이지
 *
 * @package @o4o/pharmacyops
 */

import React from 'react';

export const PharmacySettlementListPage: React.FC = () => {
  return (
    <div className="pharmacy-settlement-list-page">
      <h1>구매 내역</h1>
      <p>PharmacyOps Settlement List - Coming Soon</p>

      {/* TODO: Task 8에서 구현 */}
      {/*
        - 정산 요약 카드 (총 구매액, 미결제 금액, 이번 달 구매액)
        - 정산 상태 필터 (진행중, 마감, 결제대기, 결제완료, 분쟁)
        - 기간 필터
        - 공급자 필터
        - 정산 목록 테이블
        - 공급자별 구매 통계
        - 월별 구매 차트
        - Excel 다운로드
        - 페이지네이션
      */}
    </div>
  );
};

export default PharmacySettlementListPage;
