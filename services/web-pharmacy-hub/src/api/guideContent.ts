/**
 * Pharmacy-Hub Guide 콘텐츠 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#96)
 *
 * 선행: WO-O4O-GUIDE-CLIENT-EXTRACTION-V1 — 공통 @o4o/shared-space-ui guide-client
 * 위의 thin wrapper 다 (KPA-Society · GlycoPharm · K-Cosmetics · Neture 4서비스 동일).
 * 신규 endpoint·table 0, PH 전용 분기 0 — 서비스 경계는 serviceKey 로만 건다.
 */

import { createGuideClient } from '@o4o/shared-space-ui';
import { getAccessToken } from '@o4o/auth-client';

const client = createGuideClient({ getAccessToken });

export const fetchGuidePageContent = client.fetchGuidePageContent;
export const clearGuidePageCache = client.clearGuidePageCache;
export const saveGuideContent = client.saveGuideContent;

export { client as guideClient };
