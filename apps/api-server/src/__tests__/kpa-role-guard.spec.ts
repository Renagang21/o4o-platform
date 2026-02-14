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

  // Verify the actual file contains the expected role list
  it('kpa.routes.ts contains frozen requireKpaScope role list', () => {
    const filePath = path.resolve(__dirname, '../routes/kpa/kpa.routes.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    // The exact pattern from the guard function
    for (const role of KPA_SCOPE_ALLOWED_ROLES) {
      expect(content).toContain(`'${role}'`);
    }

    // Verify platform:admin is NOT in the hasAnyServiceRole allowed list
    // Extract the requireKpaScope function body (up to next top-level function)
    const funcStart = content.indexOf('function requireKpaScope');
    const funcEnd = content.indexOf('\nfunction ', funcStart + 1);
    const scopeBlock = content.slice(funcStart, funcEnd > funcStart ? funcEnd : funcStart + 2000);

    // The first hasAnyServiceRole call is the allowed-role list
    const hasAnyCall = scopeBlock.match(
      /hasAnyServiceRole\(userRoles,\s*\[([\s\S]*?)\]\)/
    );
    expect(hasAnyCall).not.toBeNull();
    expect(hasAnyCall![1]).not.toContain('platform:');
  });

  // Verify denied service prefixes are checked
  it('kpa.routes.ts blocks other service prefixes', () => {
    const filePath = path.resolve(__dirname, '../routes/kpa/kpa.routes.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    const blockedPrefixes = ['platform:', 'neture:', 'glycopharm:', 'cosmetics:', 'glucoseview:'];
    for (const prefix of blockedPrefixes) {
      expect(content).toContain(`r.startsWith('${prefix}')`);
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

  // Verify the actual file contains the expected role list
  it('branch-admin-dashboard.controller.ts contains frozen isBranchOperator role list', () => {
    const filePath = path.resolve(
      __dirname,
      '../routes/kpa/controllers/branch-admin-dashboard.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    // Find the isBranchOperator function's hasAnyServiceRole call
    const funcBlock = content.slice(
      content.indexOf('function isBranchOperator'),
      content.indexOf('function isBranchOperator') + 600
    );
    const hasAnyCall = funcBlock.match(
      /hasAnyServiceRole\(roles,\s*\[([\s\S]*?)\]\)/
    );
    expect(hasAnyCall).not.toBeNull();

    // Verify all expected roles are present
    for (const role of BRANCH_ALLOWED_ROLES) {
      expect(hasAnyCall![1]).toContain(`'${role}'`);
    }

    // Verify platform:* is NOT in the allowed list
    expect(hasAnyCall![1]).not.toContain('platform:');
  });

  // Verify denied service prefixes are checked
  it('branch-admin-dashboard.controller.ts blocks other service prefixes', () => {
    const filePath = path.resolve(
      __dirname,
      '../routes/kpa/controllers/branch-admin-dashboard.controller.ts'
    );
    const content = fs.readFileSync(filePath, 'utf8');

    const blockedPrefixes = ['platform:', 'neture:', 'glycopharm:', 'cosmetics:', 'glucoseview:'];
    for (const prefix of blockedPrefixes) {
      expect(content).toContain(`r.startsWith('${prefix}')`);
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
