/**
 * WO-O4O-GUIDE-CLIENT-EXTRACTION-V1: thin wrapper over @o4o/shared-space-ui guide-client.
 */

import { createGuideClient } from '@o4o/shared-space-ui';
import { getAccessToken } from '../contexts/AuthContext';

const client = createGuideClient({ getAccessToken });

export const fetchGuidePageContent = client.fetchGuidePageContent;
export const clearGuidePageCache = client.clearGuidePageCache;
export const saveGuideContent = client.saveGuideContent;

export { client as guideClient };
