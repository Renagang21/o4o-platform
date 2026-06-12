/**
 * KPA Society 공개 푸터 법정정보 loader
 * WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1
 *
 * module-level stable 함수(컴포넌트 useEffect dep 안정화 — 인라인 arrow 금지).
 * public endpoint 이므로 인증 없이 plain fetch (KPA 의 public 호출 관례 — signageV2 등과 동일).
 * 미설정/비활성/오류 → null (푸터는 법정정보 영역만 비표시).
 */
import type { PublicLegalProfileDto } from '@o4o/shared-space-ui';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function loadFooterLegal(serviceKey: string): Promise<PublicLegalProfileDto | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/services/${serviceKey}/footer-legal`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}
