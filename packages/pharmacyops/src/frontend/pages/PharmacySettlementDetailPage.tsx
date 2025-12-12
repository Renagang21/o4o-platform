/**
 * PharmacySettlementDetailPage
 *
 * 약국 정산 상세 페이지
 *
 * @package @o4o/pharmacyops
 */

import React from 'react';

export const PharmacySettlementDetailPage: React.FC = () => {
  return (
    <div className="pharmacy-settlement-detail-page">
      <h1>정산 상세</h1>
      <p>PharmacyOps Settlement Detail - Coming Soon</p>

      {/* TODO: Task 8에서 구현 */}
      {/*
        - 정산 기본 정보 (정산번호, 공급자, 기간)
        - 정산 상태
        - 금액 상세 (주문금액, 할인액, 플랫폼 수수료, 순결제액)
        - 포함된 주문 목록
        - 결제 정보 (결제일, 결제방법, 참조번호)
        - 결제 기한
        - PDF 다운로드
        - 분쟁 신청 (필요시)
      */}
    </div>
  );
};

export default PharmacySettlementDetailPage;
