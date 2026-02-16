/**
 * Pharmacy Isolation Tests
 *
 * WO-PLATFORM-SECURITY-TEST-HARNESS-V1 — Phase 5
 *
 * Validates that Care pharmacy context middleware correctly:
 * - Denies unauthenticated requests (401)
 * - Grants admin global access (pharmacyId = null)
 * - Resolves pharmacy from user lookup
 * - Denies users with no pharmacy (403 NO_PHARMACY)
 */

import type { DataSource } from 'typeorm';
import { createPharmacyContextMiddleware } from '../../modules/care/care-pharmacy-context.middleware';
import type { PharmacyContextRequest } from '../../modules/care/care-pharmacy-context.middleware';
import { createMockUser, createMockRequest, createMockResponse, createMockNext } from './test-utils';

/** Create a mock DataSource that returns configurable query results */
function createMockDataSource(queryResults: any[] | null = null, shouldThrow = false): DataSource {
  return {
    query: jest.fn().mockImplementation(() => {
      if (shouldThrow) throw new Error('DB error');
      return Promise.resolve(queryResults);
    }),
  } as any;
}

// ─────────────────────────────────────────────────────
// Pharmacy Context Middleware
// ─────────────────────────────────────────────────────

describe('Pharmacy Context Middleware', () => {
  describe('unauthenticated', () => {
    it('returns 401 when no user', async () => {
      const ds = createMockDataSource();
      const middleware = createPharmacyContextMiddleware(ds);

      const req = createMockRequest(); // no user
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('admin bypass (pharmacyId = null)', () => {
    const adminRoles = [
      ['glycopharm:admin'],
      ['platform:admin'],
      ['platform:super_admin'],
    ];

    it.each(adminRoles)('roles %j → pharmacyId = null (global access)', async (roles) => {
      const ds = createMockDataSource();
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ roles });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
      expect((req as PharmacyContextRequest).pharmacyId).toBeNull();
      // Should NOT query DB for admin
      expect(ds.query).not.toHaveBeenCalled();
    });
  });

  describe('pharmacy resolution', () => {
    it('user with active pharmacy → pharmacyId set', async () => {
      const pharmacyId = 'pharmacy-001';
      const ds = createMockDataSource([{ id: pharmacyId }]);
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ id: 'pharmacist-user', roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
      expect((req as PharmacyContextRequest).pharmacyId).toBe(pharmacyId);
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('created_by_user_id'),
        ['pharmacist-user']
      );
    });

    it('user with no pharmacy → 403 NO_PHARMACY', async () => {
      const ds = createMockDataSource([]); // empty result
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ id: 'orphan-user', roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('NO_PHARMACY');
    });

    it('DB query returns null → 403 NO_PHARMACY', async () => {
      const ds = createMockDataSource(null); // null result
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DB error handling', () => {
    it('database error → 500', async () => {
      const ds = createMockDataSource(null, true); // throws
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(false);
      expect(res.statusCode).toBe(500);
      expect(res.body.error.code).toBe('PHARMACY_LOOKUP_ERROR');
    });
  });

  describe('pharmacy isolation: non-admin cannot get global access', () => {
    it('glycopharm:operator → must have specific pharmacyId, not null', async () => {
      const pharmacyId = 'pharmacy-specific';
      const ds = createMockDataSource([{ id: pharmacyId }]);
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
      // Non-admin MUST get a specific pharmacy ID, never null
      expect((req as PharmacyContextRequest).pharmacyId).not.toBeNull();
      expect((req as PharmacyContextRequest).pharmacyId).toBe(pharmacyId);
    });
  });
});
