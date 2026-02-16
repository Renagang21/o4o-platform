/**
 * Legacy Role Blocking Tests
 *
 * WO-PLATFORM-SECURITY-TEST-HARNESS-V1 — Phase 4
 *
 * Validates that unprefixed legacy roles (e.g., 'admin', 'operator')
 * are detected, logged, and DENIED by all service scope guards.
 *
 * Security model:
 *   Legacy role detected → console.warn [ROLE_MIGRATION] + 403
 *   Error message instructs user to use service:* prefixed roles
 */

import { createServiceScopeGuard, KPA_SCOPE_CONFIG, NETURE_SCOPE_CONFIG, GLYCOPHARM_SCOPE_CONFIG } from '@o4o/security-core';
import { createMockUser, executeGuard } from './test-utils';

const requireKpaScope = createServiceScopeGuard(KPA_SCOPE_CONFIG);
const requireNetureScope = createServiceScopeGuard(NETURE_SCOPE_CONFIG);
const requireGlycopharmScope = createServiceScopeGuard(GLYCOPHARM_SCOPE_CONFIG);

// ─────────────────────────────────────────────────────
// KPA Legacy Roles
// ─────────────────────────────────────────────────────

describe('KPA Legacy Role Denial', () => {
  const kpaLegacyRoles = [
    'admin',
    'super_admin',
    'operator',
    'district_admin',
    'branch_admin',
    'branch_operator',
  ];

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it.each(kpaLegacyRoles)('legacy "%s" → KPA guard 403 + warn log', async (role) => {
    const guard = requireKpaScope('kpa:admin');
    const user = createMockUser({ roles: [role] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.body.error.message).toContain('Legacy roles are no longer supported');
    expect(result.body.error.message).toContain('kpa:*');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ROLE_MIGRATION]')
    );
  });
});

// ─────────────────────────────────────────────────────
// Neture Legacy Roles
// ─────────────────────────────────────────────────────

describe('Neture Legacy Role Denial', () => {
  const netureLegacyRoles = [
    'admin',
    'super_admin',
    'operator',
    'manager',
    'seller',
    'supplier',
    'partner',
  ];

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it.each(netureLegacyRoles)('legacy "%s" → Neture guard 403 + warn log', async (role) => {
    const guard = requireNetureScope('neture:admin');
    const user = createMockUser({ roles: [role] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.body.error.message).toContain('Legacy roles are no longer supported');
    expect(result.body.error.message).toContain('neture:*');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ROLE_MIGRATION]')
    );
  });
});

// ─────────────────────────────────────────────────────
// GlycoPharm Legacy Roles
// ─────────────────────────────────────────────────────

describe('GlycoPharm Legacy Role Denial', () => {
  const glycopharmLegacyRoles = [
    'admin',
    'super_admin',
    'operator',
    'administrator',
  ];

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it.each(glycopharmLegacyRoles)('legacy "%s" → GlycoPharm guard 403 + warn log', async (role) => {
    const guard = requireGlycopharmScope('glycopharm:admin');
    const user = createMockUser({ roles: [role] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.body.error.message).toContain('Legacy roles are no longer supported');
    expect(result.body.error.message).toContain('glycopharm:*');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ROLE_MIGRATION]')
    );
  });
});

// ─────────────────────────────────────────────────────
// Legacy + Service Role combination
// ─────────────────────────────────────────────────────

describe('Legacy role takes priority over no-role', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('user with both legacy "admin" and valid service role → allowed (service role wins at Priority 1)', async () => {
    const guard = requireKpaScope('kpa:admin');
    const user = createMockUser({ roles: ['admin', 'kpa:admin'] });
    const result = await executeGuard(guard, user);

    // Service-prefixed role is checked at Priority 1, before legacy check
    expect(result.allowed).toBe(true);
  });

  it('user with only legacy "admin" (no service role) → denied with legacy message', async () => {
    const guard = requireKpaScope('kpa:admin');
    const user = createMockUser({ roles: ['admin'] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(false);
    expect(result.body.error.message).toContain('Legacy roles are no longer supported');
  });
});

// ─────────────────────────────────────────────────────
// Warn log format verification
// ─────────────────────────────────────────────────────

describe('Legacy role warn log format', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('log contains user ID, role, and service context', async () => {
    const guard = requireKpaScope('kpa:admin');
    const user = createMockUser({ id: 'user-legacy-test', roles: ['admin'] });
    await executeGuard(guard, user);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[ROLE_MIGRATION\].*"admin".*user-legacy-test.*kpa/)
    );
  });
});
