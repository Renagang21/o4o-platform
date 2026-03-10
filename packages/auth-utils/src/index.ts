export type { ApiUser, ParsedAuthResponse, RoleMap } from './types.js';
export { parseAuthResponse } from './parseAuthResponse.js';
export { mapApiRoles } from './mapApiRoles.js';
export { normalizeUser } from './normalizeUser.js';
export { AUTH_ERROR_MESSAGES, resolveAuthError } from './errorMessages.js';
export { ROLE_PRIORITY } from './rolePriority.js';
export { ROLE_DASHBOARD_MAP } from './roleDashboardMap.js';
export { getPrimaryDashboardRoute } from './getPrimaryDashboardRoute.js';
export { hasRole, hasAnyRole } from './hasRole.js';
