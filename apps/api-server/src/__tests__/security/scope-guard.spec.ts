/**
 * Scope Guard Verification Tests
 *
 * WO-PLATFORM-SECURITY-TEST-HARNESS-V1 — Phase 2
 *
 * Tests createServiceScopeGuard with all 3 service configs (KPA, Neture, GlycoPharm).
 * Validates:
 * - Allowed roles pass through (next() called)
 * - Denied roles get 403
 * - Unauthenticated requests get 401
 * - Scope-level role mapping (Neture hierarchy)
 * - Platform bypass behavior per config
 */

import { createServiceScopeGuard, KPA_SCOPE_CONFIG, NETURE_SCOPE_CONFIG, GLYCOPHARM_SCOPE_CONFIG } from '@o4o/security-core';
import { createMockUser, executeGuard } from './test-utils';

// ─────────────────────────────────────────────────────
// 1. KPA Scope Guard
// ─────────────────────────────────────────────────────

describe('KPA Scope Guard', () => {
  const requireKpaScope = createServiceScopeGuard(KPA_SCOPE_CONFIG);

  describe('unauthenticated', () => {
    it('returns 401 when no user', async () => {
      const guard = requireKpaScope('kpa:admin');
      const result = await executeGuard(guard);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('allowed roles', () => {
    const allowedRoles = [
      'kpa:admin',
      'kpa:operator',
      'kpa:district_admin',
      'kpa:branch_admin',
      'kpa:branch_operator',
    ];

    it.each(allowedRoles)('role %s → allowed for kpa:operator scope', async (role) => {
      const guard = requireKpaScope('kpa:operator');
      const user = createMockUser({ roles: [role] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });
  });

  describe('admin scope match', () => {
    it('kpa:admin scope in JWT scopes → allowed', async () => {
      const guard = requireKpaScope('kpa:operator');
      const user = createMockUser({ scopes: ['kpa:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('exact scope match in JWT scopes → allowed', async () => {
      const guard = requireKpaScope('kpa:operator');
      const user = createMockUser({ scopes: ['kpa:operator'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });
  });

  describe('platform bypass DISABLED', () => {
    it('platform:admin → denied (403)', async () => {
      const guard = requireKpaScope('kpa:admin');
      const user = createMockUser({ roles: ['platform:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it('platform:super_admin → denied (403)', async () => {
      const guard = requireKpaScope('kpa:admin');
      const user = createMockUser({ roles: ['platform:super_admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });

  describe('unknown roles → default deny', () => {
    it('random role → denied', async () => {
      const guard = requireKpaScope('kpa:admin');
      const user = createMockUser({ roles: ['kpa:pharmacist'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it('empty roles → denied', async () => {
      const guard = requireKpaScope('kpa:admin');
      const user = createMockUser({ roles: [] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });
});

// ─────────────────────────────────────────────────────
// 2. Neture Scope Guard (with scopeRoleMapping)
// ─────────────────────────────────────────────────────

describe('Neture Scope Guard', () => {
  const requireNetureScope = createServiceScopeGuard(NETURE_SCOPE_CONFIG);

  describe('unauthenticated', () => {
    it('returns 401 when no user', async () => {
      const guard = requireNetureScope('neture:admin');
      const result = await executeGuard(guard);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('scope-level role mapping hierarchy', () => {
    // neture:admin → only neture:admin
    it('neture:admin scope → neture:admin allowed', async () => {
      const guard = requireNetureScope('neture:admin');
      const user = createMockUser({ roles: ['neture:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('neture:admin scope → neture:operator denied', async () => {
      const guard = requireNetureScope('neture:admin');
      const user = createMockUser({ roles: ['neture:operator'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
    });

    // neture:operator → neture:operator OR neture:admin
    it('neture:operator scope → neture:operator allowed', async () => {
      const guard = requireNetureScope('neture:operator');
      const user = createMockUser({ roles: ['neture:operator'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('neture:operator scope → neture:admin allowed (hierarchy)', async () => {
      const guard = requireNetureScope('neture:operator');
      const user = createMockUser({ roles: ['neture:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    // neture:supplier → neture:supplier OR neture:admin
    it('neture:supplier scope → neture:supplier allowed', async () => {
      const guard = requireNetureScope('neture:supplier');
      const user = createMockUser({ roles: ['neture:supplier'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('neture:supplier scope → neture:admin allowed (hierarchy)', async () => {
      const guard = requireNetureScope('neture:supplier');
      const user = createMockUser({ roles: ['neture:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('neture:supplier scope → neture:operator denied (no cross)', async () => {
      const guard = requireNetureScope('neture:supplier');
      const user = createMockUser({ roles: ['neture:operator'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
    });

    // neture:partner → neture:partner OR neture:admin
    it('neture:partner scope → neture:partner allowed', async () => {
      const guard = requireNetureScope('neture:partner');
      const user = createMockUser({ roles: ['neture:partner'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('neture:partner scope → neture:admin allowed (hierarchy)', async () => {
      const guard = requireNetureScope('neture:partner');
      const user = createMockUser({ roles: ['neture:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });
  });

  describe('platform bypass ENABLED', () => {
    it('platform:admin → allowed', async () => {
      const guard = requireNetureScope('neture:operator');
      const user = createMockUser({ roles: ['platform:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('platform:super_admin → allowed', async () => {
      const guard = requireNetureScope('neture:operator');
      const user = createMockUser({ roles: ['platform:super_admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────
// 3. GlycoPharm Scope Guard
// ─────────────────────────────────────────────────────

describe('GlycoPharm Scope Guard', () => {
  const requireGlycopharmScope = createServiceScopeGuard(GLYCOPHARM_SCOPE_CONFIG);

  describe('unauthenticated', () => {
    it('returns 401 when no user', async () => {
      const guard = requireGlycopharmScope('glycopharm:admin');
      const result = await executeGuard(guard);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('allowed roles', () => {
    it('glycopharm:admin → allowed', async () => {
      const guard = requireGlycopharmScope('glycopharm:admin');
      const user = createMockUser({ roles: ['glycopharm:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('glycopharm:operator → allowed', async () => {
      const guard = requireGlycopharmScope('glycopharm:operator');
      const user = createMockUser({ roles: ['glycopharm:operator'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });
  });

  describe('platform bypass ENABLED', () => {
    it('platform:admin → allowed', async () => {
      const guard = requireGlycopharmScope('glycopharm:admin');
      const user = createMockUser({ roles: ['platform:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('platform:super_admin → allowed', async () => {
      const guard = requireGlycopharmScope('glycopharm:operator');
      const user = createMockUser({ roles: ['platform:super_admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });
  });

  describe('denied roles', () => {
    it('glycopharm:pharmacist (non-operator) → denied', async () => {
      const guard = requireGlycopharmScope('glycopharm:admin');
      const user = createMockUser({ roles: ['glycopharm:pharmacist'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });
});
