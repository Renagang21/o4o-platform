/**
 * WO-O4O-GUIDE-CLIENT-EXTRACTION-V1: thin wrapper over @o4o/shared-space-ui guide-client.
 *
 * 기존 페이지의 import 경로를 보존하기 위해 동일 함수 이름으로 re-export 한다.
 * 실제 구현은 createGuideClient 가 책임지며, KPA AuthContext 의 getAccessToken 만 주입한다.
 */

import { createGuideClient } from '@o4o/shared-space-ui';
import { getAccessToken } from '../contexts/AuthContext';

const client = createGuideClient({ getAccessToken });

export const fetchGuidePageContent = client.fetchGuidePageContent;
export const clearGuidePageCache = client.clearGuidePageCache;
export const saveGuideContent = client.saveGuideContent;

/** GuideEditableSection 등 client 인스턴스 자체가 필요한 곳에서 사용 */
export { client as guideClient };
