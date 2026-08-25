/**
 * OperatorGuideContentsPage — /operator/guide-contents (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#96)
 *
 * 화면 본체는 공통 @o4o/operator-core-ui GuideContentsConsolePage 다
 * (KPA-Society · GlycoPharm · K-Cosmetics · Neture 4서비스가 이미 같은 화면을 쓴다).
 * 여기서는 serviceKey 와 client 만 넘긴다 — 공통 화면에 서비스 분기를 넣지 않고
 * PH 전용 콘솔 사본도 만들지 않는다.
 */

import { GuideContentsConsolePage } from '@o4o/operator-core-ui/modules/guide-contents';
import { guideClient } from '../../api/guideContent';

export default function OperatorGuideContentsPage() {
  return <GuideContentsConsolePage serviceKey="pharmacy-hub" client={guideClient} />;
}
