/**
 * GlycoPharm 공개 푸터 법정정보 loader
 * WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1
 * WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1: 공통 factory 사용(중복 제거).
 *
 * module-level const → useEffect dep 안정(인라인 arrow 아님).
 * 미설정/비활성/오류 → null (푸터는 법정정보 영역만 비표시). 동작 불변.
 */
import { createFooterLegalLoader } from '@o4o/shared-space-ui';
import { api } from './apiClient';

export const loadFooterLegal = createFooterLegalLoader(async (path) => (await api.get(path)).data);
