/** Community service operation uses only its own service membership and role. */
import { createSubdomainOperatorScope } from './subdomain-operator-scope.js';

const { config, guard } = createSubdomainOperatorScope('community', [
  'kpa', 'neture', 'cosmetics', 'pharmacy-hub', 'lms', 'lecture',
]);

export const COMMUNITY_SCOPE_CONFIG = config;
export const requireCommunityServiceScope = guard;
