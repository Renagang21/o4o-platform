/**
 * Legacy Role Blocking Tests
 *
 * WO-OPERATOR-ROLE-CLEANUP-V1 — Updated
 *
 * After WO-OPERATOR-ROLE-CLEANUP-V1, legacy detection logic was removed from
 * the scope guard. Unprefixed roles (e.g., 'admin', 'operator') are now
 * treated as unknown roles — they simply fail the standard role check
 * and get a generic 403 denial.
 *
 * The DB migration removes all unprefixed roles from production,
 * so special detection is no longer needed.
 */

import { createServiceScopeGuard, KPA_SCOPE_CONFIG, NETURE_SCOPE_CONFIG, GLYCOPHARM_SCOPE_CONFIG } from '@o4o/security-core';
import { createMockUser, executeGuard } from './test-utils';

const requireKpaScope = createServiceScopeGuard(KPA_SCOPE_CONFIG);
const requireNetureScope = createServiceScopeGuard(NETURE_SCOPE_CONFIG);
const requireGlycopharmScope = createServiceScopeGuard(GLYCOPHARM_SCOPE_CONFIG);

// ─────────────────────────────────────────────────────
// KPA Legacy Roles → Standard Denial
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

  it.each(kpaLegacyRoles)('unprefixed "%s" → KPA guard 403 (standard denial)', async (role) => {
    const guard = requireKpaScope('kpa:admin');
    const user = createMockUser({ roles: [role] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────
// Neture Legacy Roles → Standard Denial
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

  it.each(netureLegacyRoles)('unprefixed "%s" → Neture guard 403 (standard denial)', async (role) => {
    const guard = requireNetureScope('neture:admin');
    const user = createMockUser({ roles: [role] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────
// GlycoPharm Legacy Roles → Standard Denial
// ─────────────────────────────────────────────────────

describe('GlycoPharm Legacy Role Denial', () => {
  const glycopharmLegacyRoles = [
    'admin',
    'super_admin',
    'operator',
    'administrator',
  ];

  it.each(glycopharmLegacyRoles)('unprefixed "%s" → GlycoPharm guard 403 (standard denial)', async (role) => {
    const guard = requireGlycopharmScope('glycopharm:admin');
    const user = createMockUser({ roles: [role] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────
// Legacy + Service Role combination
// ─────────────────────────────────────────────────────

describe('Unprefixed role with valid service role', () => {
  it('user with both unprefixed "admin" and valid service role → allowed (service role matches)', async () => {
    const guard = requireKpaScope('kpa:admin');
    const user = createMockUser({ roles: ['admin', 'kpa:admin'] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(true);
  });

  it('user with only unprefixed "admin" (no service role) → denied', async () => {
    const guard = requireKpaScope('kpa:admin');
    const user = createMockUser({ roles: ['admin'] });
    const result = await executeGuard(guard, user);

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
  });
});
