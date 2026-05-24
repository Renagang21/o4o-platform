/**
 * OperatorResourcesPage — /operator/resources (K-Cosmetics)
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1:
 *   KPA/GP/K-Cos 3 service 공통 OperatorResourcesConsolePage wrapper 사용.
 * 선행: WO-O4O-KCOS-RESOURCES-BACKEND-V1 (cosmetics_contents backend 도입).
 */

import { OperatorResourcesConsolePage } from '@o4o/operator-core-ui/modules/resources';
import { kCosResourcesApi } from '@/api/resources';

export default function OperatorResourcesPage() {
  return (
    <OperatorResourcesConsolePage
      serviceKey="k-cosmetics"
      client={kCosResourcesApi}
    />
  );
}
