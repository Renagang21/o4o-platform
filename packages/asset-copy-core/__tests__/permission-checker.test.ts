/**
 * Track A — Permission Edge Cases
 * Track E — Cross-Service Isolation
 *
 * WO-O4O-ASSET-COPY-CORE-TEST-HARDENING-V1
 */

import { DefaultPermissionChecker } from '../src/interfaces/permission-checker.interface.js';
import type { PermissionChecker } from '../src/interfaces/permission-checker.interface.js';

describe('DefaultPermissionChecker', () => {
  let checker: DefaultPermissionChecker;

  beforeEach(() => {
    checker = new DefaultPermissionChecker();
  });

  // ── Track A1 ──────────────────────────────────────────

  describe('A1: allowedRoles intersection', () => {
    it('userRoles ⊂ allowedRoles → PASS', () => {
      const result = checker.hasAnyRole(
        ['kpa:admin'],
        ['kpa:admin', 'kpa:operator'],
      );
      expect(result).toBe(true);
    });

    it('userRoles ∩ allowedRoles ≠ ∅ → PASS', () => {
      const result = checker.hasAnyRole(
        ['kpa:admin', 'extra:role'],
        ['kpa:admin', 'kpa:operator'],
      );
      expect(result).toBe(true);
    });

    it('userRoles ∩ allowedRoles = ∅ → FORBIDDEN', () => {
      const result = checker.hasAnyRole(
        ['kpa:member'],
        ['kpa:admin', 'kpa:operator'],
      );
      expect(result).toBe(false);
    });

    it('multiple matching roles → PASS', () => {
      const result = checker.hasAnyRole(
        ['kpa:admin', 'kpa:operator'],
        ['kpa:admin', 'kpa:operator'],
      );
      expect(result).toBe(true);
    });
  });

  // ── Track A2 ──────────────────────────────────────────

  describe('A2: empty allowedRoles', () => {
    it('empty allowedRoles → always reject', () => {
      const result = checker.hasAnyRole(['kpa:admin', 'kpa:operator'], []);
      expect(result).toBe(false);
    });

    it('both empty → reject', () => {
      const result = checker.hasAnyRole([], []);
      expect(result).toBe(false);
    });
  });

  // ── Track A3 ──────────────────────────────────────────

  describe('A3: empty/undefined userRoles', () => {
    it('empty userRoles → FORBIDDEN', () => {
      const result = checker.hasAnyRole([], ['kpa:admin']);
      expect(result).toBe(false);
    });
  });

  // ── Track E1 ──────────────────────────────────────────

  describe('E1: Cross-Service Isolation', () => {
    it('KPA role → Neture allowedRoles → FORBIDDEN', () => {
      const result = checker.hasAnyRole(
        ['kpa:admin', 'kpa:operator'],
        ['neture:admin', 'neture:supplier'],
      );
      expect(result).toBe(false);
    });

    it('Neture role → KPA allowedRoles → FORBIDDEN', () => {
      const result = checker.hasAnyRole(
        ['neture:admin'],
        ['kpa:admin', 'kpa:operator', 'kpa:branch_admin'],
      );
      expect(result).toBe(false);
    });

    it('Cosmetics role → KPA allowedRoles → FORBIDDEN', () => {
      const result = checker.hasAnyRole(
        ['cosmetics:seller'],
        ['kpa:admin', 'kpa:operator'],
      );
      expect(result).toBe(false);
    });
  });

  // ── Track E2 ──────────────────────────────────────────

  describe('E2: Multi-role user', () => {
    it('user with both KPA and Neture roles passes KPA allowedRoles', () => {
      const result = checker.hasAnyRole(
        ['kpa:admin', 'neture:supplier'],
        ['kpa:admin', 'kpa:operator'],
      );
      expect(result).toBe(true);
    });

    it('user with both KPA and Neture roles passes Neture allowedRoles', () => {
      const result = checker.hasAnyRole(
        ['kpa:admin', 'neture:supplier'],
        ['neture:admin', 'neture:supplier'],
      );
      expect(result).toBe(true);
    });
  });
});

// ── Custom PermissionChecker injection ──────────────────

describe('Custom PermissionChecker', () => {
  it('hierarchical checker can be injected', () => {
    const hierarchical: PermissionChecker = {
      hasAnyRole(userRoles: string[], allowedRoles: string[]): boolean {
        // Hierarchical: admin includes operator
        const expandedRoles = userRoles.flatMap((role) => {
          if (role.endsWith(':admin')) {
            const prefix = role.replace(':admin', '');
            return [role, `${prefix}:operator`];
          }
          return [role];
        });
        return expandedRoles.some((r) => allowedRoles.includes(r));
      },
    };

    // kpa:admin should match kpa:operator via hierarchy
    expect(hierarchical.hasAnyRole(['kpa:admin'], ['kpa:operator'])).toBe(true);
    // kpa:member should NOT match kpa:operator
    expect(hierarchical.hasAnyRole(['kpa:member'], ['kpa:operator'])).toBe(false);
  });
});
