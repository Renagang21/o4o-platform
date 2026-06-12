/**
 * Neture 공개 푸터 법정정보 loader
 * WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1
 *
 * module-level stable 함수(컴포넌트 useEffect dep 안정화 — 인라인 arrow 금지).
 * 미설정/비활성/오류 → null (푸터는 법정정보 영역만 비표시).
 * 하드코딩 법정정보(사업자등록번호 등) 제거 후 본 API 값으로만 표시.
 */
import { api } from './apiClient';
import type { PublicLegalProfileDto } from '@o4o/shared-space-ui';

export async function loadFooterLegal(serviceKey: string): Promise<PublicLegalProfileDto | null> {
  try {
    const res = await api.get(`/public/services/${serviceKey}/footer-legal`);
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}
