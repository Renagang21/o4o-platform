/**
 * Pharmacy-Hub Admin — 법정정보·약관 설정 wrapper
 *
 * WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SETTINGS-ADOPTION-V1 (최초 채택)
 * WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1
 *   → `/operator/settings/legal` 에서 `/admin/settings/legal-terms` 로 이동.
 *     저장이 `{service}:admin` 권한인 화면이므로 다른 4서비스와 동일하게 관리자 영역에 둔다
 *     (K-Cosmetics·GlycoPharm·Neture `/admin/settings/legal-terms`, KPA `/admin/settings/legal`).
 *
 * Neture / GlycoPharm / K-Cosmetics / KPA 와 동일하게 공통 컴포넌트
 * `@o4o/operator-core-ui/modules/service-legal` 에 serviceKey + api 어댑터만 주입한다.
 * 어댑터 본체는 lib/serviceLegalClient.ts 가 소유한다(관리자 대시보드와 공유).
 *
 * 탭 범위: 전체(profile · policies · status).
 */

import { ServiceLegalSettingsPage as SharedServiceLegalSettingsPage } from '@o4o/operator-core-ui/modules/service-legal';
import { legalApi } from '../../lib/serviceLegalClient';
import { SERVICE_KEY } from '../../config/service';

export default function ServiceLegalSettingsPage() {
  return (
    <SharedServiceLegalSettingsPage
      serviceKey={SERVICE_KEY}
      api={legalApi}
      title="서비스 설정 — 법정정보·약관"
    />
  );
}
