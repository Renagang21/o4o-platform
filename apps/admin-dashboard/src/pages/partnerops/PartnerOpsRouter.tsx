/**
 * PartnerOps Router
 *
 * WO-O4O-PARTNEROPS-AFFILIATE-SURFACE-RETIRE-OR-GUIDE-V1:
 *   `/partnerops/*` 전 경로를 단일 안내 화면(`PartnerOpsGuidePage`)으로 통합했다.
 *   backend route 가 마운트돼 있지 않아 기존 화면 6개는 조회 실패 카드만 노출했고,
 *   전통 affiliate 수익·전환·자동 정산은 현재 O4O 방향과 맞지 않는다.
 *   판정 근거: docs/checks/CHECK-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1.md
 *
 *   기존 페이지(Dashboard · Profile · Routines · Links · Conversions · Settlement)와
 *   `components/PartnerOpsLoadError` 는 참조 0건이 되어 제거했다.
 *   route 자체(app manifest · AppRouteGuard · AdminProtectedRoute)는 그대로 유지한다 —
 *   경로를 없애면 기존 링크가 404 가 되어 "왜 사라졌는지" 를 알 수 없다.
 *
 *   이 라우터가 연결하는 화면은 API 를 호출하지 않는다.
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PartnerOpsGuidePage from './PartnerOpsGuidePage';

const PartnerOpsRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<PartnerOpsGuidePage />} />
    </Routes>
  );
};

export default PartnerOpsRouter;
