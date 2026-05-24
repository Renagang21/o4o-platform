/**
 * OperatorResourcesPage — /operator/resources (KPA-Society)
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1:
 *   725-line 복사본을 OperatorResourcesConsolePage thin wrapper 로 정합.
 * 선행: WO-KPA-OPERATOR-RESOURCES-MANAGEMENT-MENU-V1 (canonical 1세대 KPA 구현).
 *
 * KPA 의 policyBanner 는 "kpa_contents 기반" 으로 service-specific 문구 유지.
 */

import { OperatorResourcesConsolePage } from '@o4o/operator-core-ui/modules/resources';
import { resourcesApi } from '../../api/resources';

export default function OperatorResourcesPage() {
  return (
    <OperatorResourcesConsolePage
      serviceKey="kpa-society"
      client={resourcesApi}
      policyBanner="숨김 처리한 자료는 사용자 자료실에서 보이지 않습니다. 삭제는 즉시 자료실에서 제거됩니다(soft delete)."
    />
  );
}
