/**
 * Pharmacy Isolation Tests
 *
 * WO-PLATFORM-SECURITY-TEST-HARNESS-V1 — Phase 5
 * WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1 — error code granularity
 *
 * Validates that Care pharmacy context middleware correctly:
 * - Denies unauthenticated requests (401)
 * - Grants admin global access (pharmacyId = null)
 * - Resolves pharmacy from org + enrollment lookup (2-step)
 * - Returns GLYCOPHARM_ORG_NOT_FOUND when no org exists
 * - Returns GLYCOPHARM_ORG_INACTIVE when org is inactive
 * - Returns GLYCOPHARM_NOT_ENROLLED when no glycopharm enrollment
 * - Returns PHARMACY_LOOKUP_ERROR on DB failure
 */

import type { DataSource } from 'typeorm';
import { createPharmacyContextMiddleware } from '../../modules/care/care-pharmacy-context.middleware';
import type { PharmacyContextRequest } from '../../modules/care/care-pharmacy-context.middleware';
import { createMockUser, createMockRequest, createMockResponse, createMockNext } from './test-utils';

/**
 * Create a mock DataSource that returns sequential query results.
 * Each call to query() returns the next item in the results array.
 */
function createMockDataSource(
  queryResults: Array<any[] | null> = [],
  shouldThrow = false,
): DataSource {
  let callIndex = 0;
  return {
    query: jest.fn().mockImplementation(() => {
      if (shouldThrow) throw new Error('DB error');
      const result = queryResults[callIndex] ?? [];
      callIndex++;
      return Promise.resolve(result);
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

  describe('pharmacy resolution (2-step)', () => {
    it('user with active org + enrollment → pharmacyId set', async () => {
      const pharmacyId = 'pharmacy-001';
      // Query 1: org lookup → found + active
      // Query 2: enrollment lookup → found
      const ds = createMockDataSource([
        [{ id: pharmacyId, isActive: true }],
        [{ id: 'enrollment-001' }],
      ]);
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ id: 'pharmacist-user', roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
      expect((req as PharmacyContextRequest).pharmacyId).toBe(pharmacyId);
      // Should have made 2 DB queries
      expect(ds.query).toHaveBeenCalledTimes(2);
      expect(ds.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('created_by_user_id'),
        ['pharmacist-user']
      );
      expect(ds.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('organization_service_enrollments'),
        [pharmacyId]
      );
    });

    it('user with no org → 403 GLYCOPHARM_ORG_NOT_FOUND', async () => {
      // Query 1: org lookup → empty
      const ds = createMockDataSource([[]]);
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ id: 'orphan-user', roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('GLYCOPHARM_ORG_NOT_FOUND');
      // Should have made only 1 query (stopped at step A)
      expect(ds.query).toHaveBeenCalledTimes(1);
    });

    it('user with inactive org → 403 GLYCOPHARM_ORG_INACTIVE', async () => {
      // Query 1: org lookup → found but inactive
      const ds = createMockDataSource([
        [{ id: 'org-inactive', isActive: false }],
      ]);
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('GLYCOPHARM_ORG_INACTIVE');
      // Should have made only 1 query (stopped at step A)
      expect(ds.query).toHaveBeenCalledTimes(1);
    });

    it('user with active org but no enrollment → 403 GLYCOPHARM_NOT_ENROLLED', async () => {
      // Query 1: org lookup → found + active
      // Query 2: enrollment lookup → empty
      const ds = createMockDataSource([
        [{ id: 'org-no-enroll', isActive: true }],
        [],
      ]);
      const middleware = createPharmacyContextMiddleware(ds);

      const user = createMockUser({ roles: ['glycopharm:operator'] });
      const req = createMockRequest(user);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('GLYCOPHARM_NOT_ENROLLED');
      // Should have made 2 queries
      expect(ds.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('DB error handling', () => {
    it('database error → 500', async () => {
      const ds = createMockDataSource([], true); // throws
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
      const ds = createMockDataSource([
        [{ id: pharmacyId, isActive: true }],
        [{ id: 'enrollment-specific' }],
      ]);
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
