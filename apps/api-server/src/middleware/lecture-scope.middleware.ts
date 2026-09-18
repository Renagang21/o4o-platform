/**
 * O4O Lecture Service Scope Guard — Phase 1 Foundation.
 * 일반 학습자는 role이 아니라 service_memberships(service_key='lecture')로 판정한다.
 */
import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

export const LECTURE_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'lecture',
  allowedRoles: ['lecture:admin', 'lecture:operator', 'lecture:instructor'],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'neture', 'cosmetics', 'pharmacy-hub', 'lms'],
  scopeRoleMapping: {
    'lecture:admin': ['lecture:admin'],
    'lecture:operator': ['lecture:operator', 'lecture:admin'],
    'lecture:instructor': ['lecture:instructor'],
  },
};

export const requireLectureScope = createMembershipScopeGuard(LECTURE_SCOPE_CONFIG);
