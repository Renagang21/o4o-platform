/**
 * Cross-Service Access Blocking Tests
 *
 * WO-PLATFORM-SECURITY-TEST-HARNESS-V1 — Phase 3
 *
 * Validates that service-prefixed roles from one service
 * are DENIED by another service's scope guard.
 *
 * Matrix:
 *   kpa:admin    → neture guard = 403
 *   neture:admin → kpa guard = 403
 *   cosmetics:admin → all 3 guards = 403
 *   nonexistent-service:admin → all 3 guards = 403
 */

import { createServiceScopeGuard, KPA_SCOPE_CONFIG, NETURE_SCOPE_CONFIG } from '@o4o/security-core';
import { createMockUser, executeGuard } from './test-utils';

const requireKpaScope = createServiceScopeGuard(KPA_SCOPE_CONFIG);
const requireNetureScope = createServiceScopeGuard(NETURE_SCOPE_CONFIG);

// ─────────────────────────────────────────────────────
// Cross-Service Denial Matrix
// ─────────────────────────────────────────────────────

describe('Cross-Service Access Blocking', () => {
  describe('KPA guard blocks other services', () => {
    const guard = requireKpaScope('kpa:admin');

    const blockedRoles = [
      'neture:admin',
      'neture:operator',
      'cosmetics:admin',
      'nonexistent-service:admin',
      // WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
      //   'platform:admin' 은 제거된 legacy 역할이다. 문자열이 다시 유입되더라도
      //   거부돼야 하므로 거부 회귀 케이스로 의도적으로 보존한다.
      'platform:admin',       // KPA: platformBypass = false (제거된 legacy 역할)
      'platform:super_admin', // KPA: platformBypass = false
    ];

    it.each(blockedRoles)('%s → KPA guard = 403', async (role) => {
      const user = createMockUser({ roles: [role] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });

  describe('Neture guard blocks other services', () => {
    const guard = requireNetureScope('neture:admin');

    const blockedRoles = [
      'kpa:admin',
      'kpa:operator',
      'kpa:store_owner',
      'cosmetics:admin',
      'nonexistent-service:admin',
    ];

    it.each(blockedRoles)('%s → Neture guard = 403', async (role) => {
      const user = createMockUser({ roles: [role] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });


  // ─────────────────────────────────────────────────────
  // Verify error message contains service context
  // ─────────────────────────────────────────────────────

  describe('error messages include service context', () => {
    it('KPA guard error mentions kpa:* requirement', async () => {
      const guard = requireKpaScope('kpa:admin');
      const user = createMockUser({ roles: ['neture:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.body.error.message).toContain('kpa');
    });

    it('Neture guard error mentions neture:* requirement', async () => {
      const guard = requireNetureScope('neture:admin');
      const user = createMockUser({ roles: ['kpa:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.body.error.message).toContain('neture');
    });

  });

  // ─────────────────────────────────────────────────────
  // Multi-role scenarios: cross-service role should not leak
  // ─────────────────────────────────────────────────────

  describe('multi-role: cross-service role does not grant access', () => {
    it('user with [neture:admin, cosmetics:admin] → KPA guard denied', async () => {
      const guard = requireKpaScope('kpa:admin');
      const user = createMockUser({ roles: ['neture:admin', 'cosmetics:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
    });

  });
});
