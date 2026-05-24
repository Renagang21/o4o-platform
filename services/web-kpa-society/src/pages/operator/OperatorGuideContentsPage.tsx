/**
 * OperatorGuideContentsPage — /operator/guide-contents (KPA-Society)
 *
 * WO-O4O-OPERATOR-COPY-PASTE-WRAPPER-CONSOLIDATION-V1:
 *   기존 24-line 복사본을 GuideContentsConsolePage thin wrapper 로 정합.
 * 선행: WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1 (canonical 모듈).
 */

import { GuideContentsConsolePage } from '@o4o/operator-core-ui/modules/guide-contents';
import { guideClient } from '../../api/guideContent';

export default function OperatorGuideContentsPage() {
  return <GuideContentsConsolePage serviceKey="kpa-society" client={guideClient} />;
}
