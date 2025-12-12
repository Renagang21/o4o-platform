/**
 * PharmacyDispatchDetailPage
 *
 * 약국 배송 상세 페이지
 *
 * @package @o4o/pharmacyops
 */

import React from 'react';

export const PharmacyDispatchDetailPage: React.FC = () => {
  return (
    <div className="pharmacy-dispatch-detail-page">
      <h1>배송 상세</h1>
      <p>PharmacyOps Dispatch Detail - Coming Soon</p>

      {/* TODO: Task 7에서 구현 */}
      {/*
        - 배송 기본 정보 (배송번호, 주문번호, 상태)
        - 배송사 정보 (배송사, 운송장번호)
        - 운전자 정보 (이름, 연락처, 차량번호)
        - 예상 도착 시간
        - 배송 상태 타임라인
        - 온도 관리 정보 (콜드체인인 경우)
        - 온도 로그 차트
        - 마약류 관리 번호 (마약류인 경우)
        - 수령 확인 폼 (수령자 서명)
        - 배송 추적 외부 링크
      */}
    </div>
  );
};

export default PharmacyDispatchDetailPage;
