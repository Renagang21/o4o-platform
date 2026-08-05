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
 *
 * WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
 *   'platform:admin' 은 제거된 legacy 역할이다. 아래 거부 케이스들은
 *   해당 문자열이 다시 유입되더라도 bypass 되지 않음을 고정하는 보안 회귀 테스트이므로
 *   의도적으로 그대로 보존한다 (오직 platform:super_admin 만 bypass).
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
    // WO-KPA-A-BRANCH-CHAPTER-REMOVAL-PHASE4-DEAD-CODE-AND-DROP-V1:
    // kpa:branch_admin and kpa:branch_operator removed from KPA_SCOPE_CONFIG
    // WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1:
    // kpa:district_admin 도 제거. KPA에는 kpa-society 운영자/관리자만 존재.
    const allowedRoles = [
      'kpa:admin',
      'kpa:operator',
    ];

    it.each(allowedRoles)('role %s → allowed for kpa:operator scope', async (role) => {
      const guard = requireKpaScope('kpa:operator');
      const user = createMockUser({ roles: [role] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });
  });

  // WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1:
  //   'admin scope match' describe 블록(JWT scopes 배열 기반 허용 2 케이스)을 제거했다.
  //   guard 의 scope 분기 자체가 제거됐고, 인증 미들웨어가 req.user.scopes 를 채운 적이
  //   없어 프로덕션에서 성립한 적 없는 경로였다. 역할 기반 허용/거부 케이스는 그대로 유지.

  // WO-KPA-SCOPE-HIERARCHY-FIX-V1: kpa:admin ⊃ kpa:operator
  describe('scope hierarchy (admin ⊃ operator)', () => {
    it('kpa:admin role → passes kpa:operator scope', async () => {
      const guard = requireKpaScope('kpa:operator');
      const user = createMockUser({ roles: ['kpa:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(true);
    });

    it('kpa:operator role → denied for kpa:admin scope (403)', async () => {
      const guard = requireKpaScope('kpa:admin');
      const user = createMockUser({ roles: ['kpa:operator'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    // WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1
    // kpa:district_admin 제거 — legacy role은 admin/operator scope 모두에서 거부되어야 한다.
    it('kpa:district_admin role (legacy) → denied for kpa:admin scope (403)', async () => {
      const guard = requireKpaScope('kpa:admin');
      const user = createMockUser({ roles: ['kpa:district_admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
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
    it('platform:admin → denied (only super_admin bypasses)', async () => {
      const guard = requireNetureScope('neture:operator');
      const user = createMockUser({ roles: ['platform:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
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
    it('platform:admin → denied (only super_admin bypasses)', async () => {
      const guard = requireGlycopharmScope('glycopharm:admin');
      const user = createMockUser({ roles: ['platform:admin'] });
      const result = await executeGuard(guard, user);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
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
