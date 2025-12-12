/**
 * PharmacyDispatchListPage
 *
 * 약국 배송 목록 페이지
 *
 * @package @o4o/pharmacyops
 */

import React from 'react';

export const PharmacyDispatchListPage: React.FC = () => {
  return (
    <div className="pharmacy-dispatch-list-page">
      <h1>배송 조회</h1>
      <p>PharmacyOps Dispatch List - Coming Soon</p>

      {/* TODO: Task 7에서 구현 */}
      {/*
        - 배송 상태 필터 (대기, 준비중, 발송, 배송중, 도착예정, 완료, 실패)
        - 콜드체인 필터
        - 마약류 필터
        - 기간 필터
        - 배송 목록 테이블
        - 운송장 번호 검색
        - 배송 추적 링크
        - 오늘 도착 예정 목록
        - 페이지네이션
      */}
    </div>
  );
};

export default PharmacyDispatchListPage;
