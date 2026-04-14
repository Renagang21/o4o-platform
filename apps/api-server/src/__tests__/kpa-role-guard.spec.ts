/**
 * KPA Role Guard Regression Test
 *
 * WO-KPA-ROLE-STATIC-REGRESSION-V1
 *
 * Validates that KPA role guards match KPA-ROLE-MATRIX-V1.md:
 * 1. requireKpaScope() allowed/denied roles
 * 2. Cross-service import isolation (KPA-a)
 *
 * WO-KPA-A-BRANCH-CHAPTER-REMOVAL-PHASE4-DEAD-CODE-AND-DROP-V1:
 * isBranchOperator (KPA-c) tests removed — branch controllers deleted.
 * kpa:branch_admin and kpa:branch_operator removed from allowed roles.
 *
 * These tests detect guard logic changes at CI time.
 */

import * as fs from 'fs';
import * as path from 'path';
import { hasAnyServiceRole, hasServiceRole } from '../utils/role.utils';

// ─────────────────────────────────────────────────────
// 1. hasAnyServiceRole — core utility used by all guards
// ─────────────────────────────────────────────────────

describe('hasAnyServiceRole (core utility)', () => {
  it('matches single role in list', () => {
    expect(hasAnyServiceRole(['kpa:admin'], ['kpa:admin', 'kpa:operator'])).toBe(true);
  });

  it('matches when user has multiple roles', () => {
    expect(hasAnyServiceRole(['kpa:pharmacist', 'kpa:operator'], ['kpa:admin', 'kpa:operator'])).toBe(true);
  });

  it('rejects when no match', () => {
    expect(hasAnyServiceRole(['kpa:pharmacist'], ['kpa:admin', 'kpa:operator'])).toBe(false);
  });

  it('rejects empty user roles', () => {
    expect(hasAnyServiceRole([], ['kpa:admin'])).toBe(false);
  });

  it('rejects empty allowed list', () => {
    expect(hasAnyServiceRole(['kpa:admin'], [])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// 2. requireKpaScope — KPA-a guard role matrix
//
// Frozen role list from KPA_SCOPE_CONFIG (security-core):
//   ALLOWED: kpa:admin, kpa:operator, kpa:district_admin
//   DENIED:  platform:*, legacy unprefixed, other services
// ─────────────────────────────────────────────────────

describe('requireKpaScope role matrix (KPA-a)', () => {
  // The exact role list used in requireKpaScope (kpa.routes.ts KPA_SCOPE_CONFIG)
  const KPA_SCOPE_ALLOWED_ROLES = [
    'kpa:admin',
    'kpa:operator',
    'kpa:district_admin',
  ];

  describe('ALLOWED roles', () => {
    it.each(KPA_SCOPE_ALLOWED_ROLES)('%s → allowed', (role) => {
      expect(hasAnyServiceRole([role], KPA_SCOPE_ALLOWED_ROLES)).toBe(true);
    });
  });

  describe('DENIED roles', () => {
    const deniedRoles = [
      'platform:admin',
      'platform:super_admin',
      'neture:admin',
      'glycopharm:admin',
      'cosmetics:admin',
      'glucoseview:admin',
      'admin',            // legacy
      'super_admin',      // legacy
      'operator',         // legacy
      'branch_admin',     // legacy
      'kpa:pharmacist',   // member, not operator
    ];

    it.each(deniedRoles)('%s → denied', (role) => {
      expect(hasAnyServiceRole([role], KPA_SCOPE_ALLOWED_ROLES)).toBe(false);
    });
  });

  // Verify kpa.routes.ts uses membership-aware guard with KPA_SCOPE_CONFIG
  it('kpa.routes.ts uses createMembershipScopeGuard(KPA_SCOPE_CONFIG)', () => {
    const filePath = path.resolve(__dirname, '../routes/kpa/kpa.routes.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    // Must import config from security-core
    expect(content).toContain(`from '@o4o/security-core'`);
    expect(content).toContain('createMembershipScopeGuard');
    expect(content).toContain('KPA_SCOPE_CONFIG');
  });

  // Verify KPA_SCOPE_CONFIG has correct allowed roles and platform bypass
  it('KPA_SCOPE_CONFIG contains frozen role list and blocks platform bypass', () => {
    const { KPA_SCOPE_CONFIG } = require('@o4o/security-core');

    // All expected roles must be in allowedRoles
    for (const role of KPA_SCOPE_ALLOWED_ROLES) {
      expect(KPA_SCOPE_CONFIG.allowedRoles).toContain(role);
    }

    // Platform bypass must be disabled (organizational isolation)
    expect(KPA_SCOPE_CONFIG.platformBypass).toBe(false);

    // Blocked service prefixes must include other services
    const expectedBlocked = ['neture', 'glycopharm', 'cosmetics', 'glucoseview'];
    for (const prefix of expectedBlocked) {
      expect(KPA_SCOPE_CONFIG.blockedServicePrefixes).toContain(prefix);
    }
  });
});

// ─────────────────────────────────────────────────────
// 3. Cross-Service Import Isolation
//
// KPA-a (kpa.routes.ts) must NOT import branch entities
// ─────────────────────────────────────────────────────

describe('Cross-Service Isolation', () => {
  it('kpa.routes.ts does NOT statically import branch entities', () => {
    const filePath = path.resolve(__dirname, '../routes/kpa/kpa.routes.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract only static import lines (top-level import statements)
    const staticImports = content
      .split('\n')
      .filter((line) => /^\s*import\s/.test(line))
      .join('\n');

    // These branch entities must NEVER be statically imported in KPA-a routes
    // Dynamic imports (await import()) in runtime handlers are allowed
    expect(staticImports).not.toContain('KpaBranchNews');
    expect(staticImports).not.toContain('KpaBranchOfficer');
    expect(staticImports).not.toContain('KpaBranchDoc');
    expect(staticImports).not.toContain('kpa-branch-news');
    expect(staticImports).not.toContain('kpa-branch-officer');
    expect(staticImports).not.toContain('kpa-branch-doc');
  });
});
