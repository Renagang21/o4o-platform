/**
 * RecruitmentExposureApprovalPage (K-Cosmetics) — 판매자 모집 노출 승인
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1
 *
 * k-cosmetics serviceKey 로 고정된 per-service proxy(/api/v1/cosmetics/operator/recruitment-exposure)를
 * 자기 서비스 operator scope(cosmetics:operator)로 호출.
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   조회 · 필터 · URL sync · 승인/반려 셸을 @o4o/operator-core-ui 공통 페이지로 수렴.
 *   서비스는 HTTP client adapter + audienceLabel 만 주입한다 (endpoint·payload 불변).
 */
import { OperatorRecruitmentExposurePage } from '@o4o/operator-core-ui/modules/recruitment-exposure';
import type { RecruitmentExposureClient } from '@o4o/operator-core-ui/modules/recruitment-exposure';
import { api } from '../../lib/apiClient';

const BASE = '/cosmetics/operator/recruitment-exposure';

const client: RecruitmentExposureClient = {
  list: async (exposureStatus) => {
    const qs = exposureStatus ? `?exposureStatus=${exposureStatus}` : '';
    const res = await api.get(`${BASE}${qs}`);
    return res.data?.data ?? [];
  },
  decide: async (id, action, note) => {
    await api.patch(`${BASE}/${id}/${action}`, { note });
  },
};

export default function RecruitmentExposureApprovalPage() {
  return <OperatorRecruitmentExposurePage client={client} audienceLabel="매장 사용자" />;
}
