/**
 * KPA Society 공개 푸터 법정정보 loader
 * WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1
 * WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1: 공통 factory 사용(중복 제거).
 *
 * module-level const → useEffect dep 안정(인라인 arrow 아님).
 * public endpoint 이므로 인증 없이 plain fetch (KPA 의 public 호출 관례 — signageV2 등과 동일).
 * 미설정/비활성/오류 → null (푸터는 법정정보 영역만 비표시). 동작 불변.
 */
import { createFooterLegalLoader } from '@o4o/shared-space-ui';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const loadFooterLegal = createFooterLegalLoader(async (path) => {
  const res = await fetch(`${API_BASE}/api/v1${path}`);
  return res.ok ? res.json() : null;
});
