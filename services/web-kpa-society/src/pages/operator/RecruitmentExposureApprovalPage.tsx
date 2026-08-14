/**
 * RecruitmentExposureApprovalPage (KPA) — 판매자 모집 노출 승인
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1
 *
 * kpa-society serviceKey 로 고정된 per-service proxy(/api/v1/kpa/operator/recruitment-exposure)를
 * 자기 서비스 operator scope(kpa:operator)로 호출.
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   조회 · 필터 · URL sync · 승인/반려 셸을 @o4o/operator-core-ui 공통 페이지로 수렴.
 *   서비스는 HTTP client adapter + audienceLabel 만 주입한다 (endpoint·payload 불변).
 *   자체 빨간 오류 패널은 공통 LoadError 로, 처리 실패 toast 는 공통 셸로 흡수됐다.
 */
import { OperatorRecruitmentExposurePage } from '@o4o/operator-core-ui/modules/recruitment-exposure';
import type {
  RecruitmentExposureClient,
  RecruitmentExposureItem,
} from '@o4o/operator-core-ui/modules/recruitment-exposure';
import { apiClient } from '../../api/client';

const BASE = '/operator/recruitment-exposure';

const client: RecruitmentExposureClient = {
  list: async (exposureStatus) => {
    const qs = exposureStatus ? `?exposureStatus=${exposureStatus}` : '';
    const res = await apiClient.get<{ success: boolean; data: RecruitmentExposureItem[] }>(
      `${BASE}${qs}`,
    );
    return res?.data ?? [];
  },
  decide: async (id, action, note) => {
    await apiClient.patch(`${BASE}/${id}/${action}`, { note });
  },
};

export default function RecruitmentExposureApprovalPage() {
  return <OperatorRecruitmentExposurePage client={client} audienceLabel="매장/약국 사용자" />;
}
