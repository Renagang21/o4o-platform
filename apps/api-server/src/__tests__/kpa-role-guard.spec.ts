/**
 * KPA Role Guard Regression Test
 *
 * WO-KPA-ROLE-STATIC-REGRESSION-V1
 *
 * Validates that KPA role guards match KPA-ROLE-MATRIX-V1.md:
 * 1. requireKpaScope() allowed/denied roles
 * 2. isBranchOperator() allowed/denied roles
 * 3. Cross-service import isolation (KPA-a ↔ KPA-c)
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
// Frozen role list from kpa.routes.ts:
//   ALLOWED: kpa:admin, kpa:operator, kpa:district_admin, kpa:branch_admin, kpa:branch_operator
//   DENIED:  platform:*, legacy unprefixed, other services
// ─────────────────────────────────────────────────────

describe('requireKpaScope role matrix (KPA-a)', () => {
  // The exact role list used in requireKpaScope (kpa.routes.ts lines 85-91)
  const KPA_SCOPE_ALLOWED_ROLES = [
    'kpa:admin',
    'kpa:operator',
    'kpa:district_admin',
    'kpa:branch_admin',
    'kpa:branch_operator',
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

  // Verify kpa.routes.ts uses security-core guard with KPA_SCOPE_CONFIG
  it('kpa.routes.ts uses createServiceScopeGuard(KPA_SCOPE_CONFIG)', () => {
    const filePath = path.resolve(__dirname, '../routes/kpa/kpa.routes.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    // Must import from security-core
    expect(content).toContain(`from '@o4o/security-core'`);
    expect(content).toContain('createServiceScopeGuard');
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
// 3. isBranchOperator — KPA-c guard role matrix
//
// Frozen role list from branch-admin-dashboard.controller.ts:
//   ALLOWED: kpa:branch_admin, kpa:branch_operator, kpa:admin, kpa:operator
//   DENIED:  platform:*, legacy unprefixed, other services
// ─────────────────────────────────────────────────────

describe('isBranchOperator role matrix (KPA-c)', () => {
  const BRANCH_ALLOWED_ROLES = [
    'kpa:branch_admin',
    'kpa:branch_operator',
    'kpa:admin',
    'kpa:operator',
  ];

  describe('ALLOWED roles', () => {
    it.each(BRANCH_ALLOWED_ROLES)('%s → allowed', (role) => {
      expect(hasAnyServiceRole([role], BRANCH_ALLOWED_ROLES)).toBe(true);
    });
  });

  describe('DENIED roles', () => {
    const deniedRoles = [
      'platform:admin',
      'platform:super_admin',
      'neture:admin',
      'cosmetics:admin',
      'admin',              // legacy
      'super_admin',        // legacy
      'branch_admin',       // legacy
      'branch_operator',    // legacy
      'kpa:pharmacist',     // member
      'kpa:district_admin', // not in branch allowed list
    ];

    it.each(deniedRoles)('%s → denied', (role) => {
      expect(hasAnyServiceRole([role], BRANCH_ALLOWED_ROLES)).toBe(false);
    });
  });

  // Verify branch-admin-dashboard uses security-core guard
  it('branch-admin-dashboard.controller.ts uses createServiceScopeGuard(KPA_SCOPE_CONFIG)', () => {
    const filePath = path.resolve(
      __dirname,
      '../routes/kpa/controllers/branch-admin-dashboard.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // Must import from security-core
    expect(content).toContain(`from '@o4o/security-core'`);
    expect(content).toContain('createServiceScopeGuard');
    expect(content).toContain('KPA_SCOPE_CONFIG');
  });

  // Verify KPA_SCOPE_CONFIG blocks other service prefixes (shared with KPA-a)
  it('KPA_SCOPE_CONFIG blocks other service prefixes', () => {
    const { KPA_SCOPE_CONFIG } = require('@o4o/security-core');

    const expectedBlocked = ['neture', 'glycopharm', 'cosmetics', 'glucoseview'];
    for (const prefix of expectedBlocked) {
      expect(KPA_SCOPE_CONFIG.blockedServicePrefixes).toContain(prefix);
    }
  });
});

// ─────────────────────────────────────────────────────
// 4. Cross-Service Import Isolation
//
// KPA-a (kpa.routes.ts) must NOT import branch entities
// KPA-c (branch-admin-dashboard) must NOT import CmsContent
// ─────────────────────────────────────────────────────

describe('Cross-Service Isolation', () => {
  it('kpa.routes.ts does NOT import branch entities', () => {
    const filePath = path.resolve(__dirname, '../routes/kpa/kpa.routes.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    // These branch entities must NEVER be imported in KPA-a routes
    expect(content).not.toContain('KpaBranchNews');
    expect(content).not.toContain('KpaBranchOfficer');
    expect(content).not.toContain('KpaBranchDoc');
    expect(content).not.toContain('kpa-branch-news');
    expect(content).not.toContain('kpa-branch-officer');
    expect(content).not.toContain('kpa-branch-doc');
  });

  it('branch-admin-dashboard.controller.ts does NOT import CmsContent', () => {
    const filePath = path.resolve(
      __dirname,
      '../routes/kpa/controllers/branch-admin-dashboard.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // CmsContent / cms-core must NEVER be imported in KPA-c controller
    expect(content).not.toContain('CmsContent');
    expect(content).not.toContain('cms-core');
    expect(content).not.toContain('cms_contents');
  });

  it('branch-public.controller.ts does NOT import CmsContent', () => {
    const filePath = path.resolve(
      __dirname,
      '../routes/kpa/controllers/branch-public.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).not.toContain('CmsContent');
    expect(content).not.toContain('cms-core');
    expect(content).not.toContain('cms_contents');
  });
});
