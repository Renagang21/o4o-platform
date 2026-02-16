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
 *   kpa:admin    → glycopharm guard = 403
 *   neture:admin → kpa guard = 403
 *   neture:admin → glycopharm guard = 403
 *   glycopharm:admin → kpa guard = 403
 *   glycopharm:admin → neture guard = 403
 *   cosmetics:admin → all 3 guards = 403
 *   glucoseview:admin → all 3 guards = 403
 */

import { createServiceScopeGuard, KPA_SCOPE_CONFIG, NETURE_SCOPE_CONFIG, GLYCOPHARM_SCOPE_CONFIG } from '@o4o/security-core';
import { createMockUser, executeGuard } from './test-utils';

const requireKpaScope = createServiceScopeGuard(KPA_SCOPE_CONFIG);
const requireNetureScope = createServiceScopeGuard(NETURE_SCOPE_CONFIG);
const requireGlycopharmScope = createServiceScopeGuard(GLYCOPHARM_SCOPE_CONFIG);

// ─────────────────────────────────────────────────────
// Cross-Service Denial Matrix
// ─────────────────────────────────────────────────────

describe('Cross-Service Access Blocking', () => {
  describe('KPA guard blocks other services', () => {
    const guard = requireKpaScope('kpa:admin');

    const blockedRoles = [
      'neture:admin',
      'neture:operator',
      'glycopharm:admin',
      'glycopharm:operator',
      'cosmetics:admin',
      'glucoseview:admin',
      'platform:admin',       // KPA: platformBypass = false
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
      'kpa:branch_admin',
      'glycopharm:admin',
      'glycopharm:operator',
      'cosmetics:admin',
      'glucoseview:admin',
    ];

    it.each(blockedRoles)('%s → Neture guard = 403', async (role) => {
      const user = createMockUser({ roles: [role] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });

  describe('GlycoPharm guard blocks other services', () => {
    const guard = requireGlycopharmScope('glycopharm:admin');

    const blockedRoles = [
      'kpa:admin',
      'kpa:operator',
      'neture:admin',
      'neture:operator',
      'cosmetics:admin',
      'glucoseview:admin',
    ];

    it.each(blockedRoles)('%s → GlycoPharm guard = 403', async (role) => {
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

    it('GlycoPharm guard error mentions glycopharm:* requirement', async () => {
      const guard = requireGlycopharmScope('glycopharm:admin');
      const user = createMockUser({ roles: ['kpa:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.body.error.message).toContain('glycopharm');
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

    it('user with [kpa:admin, glycopharm:admin] → Neture guard denied', async () => {
      const guard = requireNetureScope('neture:admin');
      const user = createMockUser({ roles: ['kpa:admin', 'glycopharm:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
    });

    it('user with [kpa:admin, neture:admin] → GlycoPharm guard denied', async () => {
      const guard = requireGlycopharmScope('glycopharm:admin');
      const user = createMockUser({ roles: ['kpa:admin', 'neture:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
    });
  });
});
