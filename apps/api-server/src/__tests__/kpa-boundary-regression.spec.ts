/**
 * KPA-A-C Boundary Regression Test
 *
 * KPA-BOUNDARY-REGRESSION-TEST-V1
 *
 * Enforces KPA-A-C-BOUNDARY-MODEL-V1 invariants via static code analysis:
 * 1. Branch CMS (KPA-c): Hard delete forbidden — only soft delete (is_deleted=true)
 * 2. Branch CMS (KPA-c): All queries must filter is_deleted=false
 * 3. KPA-a CMS: Must NOT use organizationId in queries (service-level, not org-level)
 * 4. KPA-a CMS: Soft delete via status='archived' (not hard delete)
 * 5. Branch CMS: organizationId must come from getUserOrganizationId (server-enforced)
 *
 * These tests detect boundary violations at CI time.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────
// Source file paths
// ─────────────────────────────────────────────────────

const BRANCH_CONTROLLER_PATH = path.resolve(
  __dirname,
  '../routes/kpa/controllers/branch-admin-dashboard.controller.ts'
);

const KPA_ROUTES_PATH = path.resolve(
  __dirname,
  '../routes/kpa/kpa.routes.ts'
);

// Read source files once
const branchController = fs.readFileSync(BRANCH_CONTROLLER_PATH, 'utf8');
const kpaRoutes = fs.readFileSync(KPA_ROUTES_PATH, 'utf8');

// ─────────────────────────────────────────────────────
// 1. Branch CMS Hard Delete Prevention
//
// branch-admin-dashboard.controller.ts must NEVER call
// repo.delete() or repo.remove() — only repo.save()
// with is_deleted=true for soft delete.
// ─────────────────────────────────────────────────────

describe('KPA-c Branch CMS: Hard Delete Prevention', () => {
  it('does not call repo.delete() on any branch entity', () => {
    // Match patterns like: repo.delete(, xxxRepo.delete(
    const deleteCallPattern = /\brepo\.delete\s*\(/g;
    const matches = branchController.match(deleteCallPattern);
    expect(matches).toBeNull();
  });

  it('does not call repo.remove() on any branch entity', () => {
    const removeCallPattern = /\brepo\.remove\s*\(/g;
    const matches = branchController.match(removeCallPattern);
    expect(matches).toBeNull();
  });

  it('does not call .delete().from() (QueryBuilder hard delete)', () => {
    const qbDeletePattern = /\.delete\(\)\s*\.from\(/g;
    const matches = branchController.match(qbDeletePattern);
    expect(matches).toBeNull();
  });

  it('uses is_deleted=true for all delete routes', () => {
    // Every DELETE route handler must set is_deleted = true
    const deleteRouteBlocks = branchController.split(/router\.delete\s*\(/);
    // First element is before any DELETE route, skip it
    const deleteHandlers = deleteRouteBlocks.slice(1);

    expect(deleteHandlers.length).toBeGreaterThan(0);

    for (const handler of deleteHandlers) {
      // Each handler block (up to next route) must contain is_deleted = true
      // Auth boilerplate ~600 chars, so need ~2000 to reach query logic
      const handlerBlock = handler.slice(0, 2000);
      expect(handlerBlock).toContain('is_deleted');
    }
  });
});

// ─────────────────────────────────────────────────────
// 2. Branch CMS: is_deleted Filter Enforcement
//
// All read queries on branch entities must include
// is_deleted: false or is_deleted = false
// ─────────────────────────────────────────────────────

describe('KPA-c Branch CMS: is_deleted Filter Enforcement', () => {
  it('news list query filters is_deleted', () => {
    // Look for the GET news list handler that uses createQueryBuilder
    const newsListBlock = extractRouteBlock(branchController, "'/news'", 'router.get');
    expect(newsListBlock).toContain('is_deleted');
  });

  it('officers list query filters is_deleted', () => {
    // Officers use repo.find() with where condition
    const officerBlock = extractRouteBlock(branchController, "'/officers'", 'router.get');
    expect(officerBlock).toContain('is_deleted');
  });

  it('docs list query filters is_deleted', () => {
    const docsBlock = extractRouteBlock(branchController, "'/docs'", 'router.get');
    expect(docsBlock).toContain('is_deleted');
  });

  it('news single-item query filters is_deleted', () => {
    // PATCH/DELETE routes findOne with is_deleted: false
    const updateBlock = extractRouteBlock(branchController, "'/news/:id'", 'router.patch');
    expect(updateBlock).toContain('is_deleted');
  });

  it('officers single-item query filters is_deleted', () => {
    const updateBlock = extractRouteBlock(branchController, "'/officers/:id'", 'router.patch');
    expect(updateBlock).toContain('is_deleted');
  });

  it('docs single-item query filters is_deleted', () => {
    const updateBlock = extractRouteBlock(branchController, "'/docs/:id'", 'router.patch');
    expect(updateBlock).toContain('is_deleted');
  });
});

// ─────────────────────────────────────────────────────
// 3. KPA-a CMS: organizationId Prohibition
//
// KPA-a CMS (in kpa.routes.ts) is service-level content.
// It must scope by serviceKey, NOT organizationId.
// ─────────────────────────────────────────────────────

describe('KPA-a CMS: organizationId Prohibition', () => {
  // Extract only the CMS/news section of kpa.routes.ts
  const cmsSection = (() => {
    const start = kpaRoutes.indexOf("const KPA_SERVICE_KEY");
    const end = kpaRoutes.indexOf("return router", start);
    return kpaRoutes.slice(start, end > start ? end : start + 5000);
  })();

  it('CMS queries scope by serviceKey', () => {
    expect(cmsSection).toContain('serviceKey');
    expect(cmsSection).toContain("sk: KPA_SERVICE_KEY");
  });

  it('CMS queries do NOT use organizationId', () => {
    // organizationId must not appear in CMS query conditions
    // (it may appear in audit log metadata, which is acceptable)
    const queryLines = cmsSection.split('\n').filter(line =>
      line.includes('.where(') ||
      line.includes('.andWhere(') ||
      line.includes('where:') ||
      line.includes('findOne(')
    );

    for (const line of queryLines) {
      expect(line).not.toContain('organizationId');
      expect(line).not.toContain('organization_id');
    }
  });

  it('CMS create does NOT set organizationId on entity', () => {
    const createBlock = extractRouteBlock(cmsSection, "newsRouter.post", '');
    expect(createBlock).not.toMatch(/organizationId|organization_id/);
  });
});

// ─────────────────────────────────────────────────────
// 4. KPA-a CMS: Soft Delete via status='archived'
// ─────────────────────────────────────────────────────

describe('KPA-a CMS: Soft Delete Enforcement', () => {
  it('CMS delete route uses status=archived, not hard delete', () => {
    const deleteBlock = extractRouteBlock(kpaRoutes, "newsRouter.delete", '');
    expect(deleteBlock).toContain("'archived'");
  });

  it('CMS delete route does NOT call repo.delete() or repo.remove()', () => {
    const deleteBlock = extractRouteBlock(kpaRoutes, "newsRouter.delete", '');
    // Check for DB delete operations (repo.delete, .delete().from), NOT Express route definition
    expect(deleteBlock).not.toMatch(/[Rr]epo\.delete\s*\(/);
    expect(deleteBlock).not.toMatch(/\.delete\(\)\s*\.from\s*\(/);
    expect(deleteBlock).not.toMatch(/[Rr]epo\.remove\s*\(/);
  });
});

// ─────────────────────────────────────────────────────
// 5. Branch CMS: Server-Enforced Organization Isolation
// ─────────────────────────────────────────────────────

describe('KPA-c Branch CMS: Organization Isolation', () => {
  it('uses getUserOrganizationId for org scoping', () => {
    expect(branchController).toContain('getUserOrganizationId');
  });

  it('does NOT use req.body.organizationId or req.params.organizationId for scoping', () => {
    // organizationId should never be taken from client input for DB queries
    expect(branchController).not.toContain('req.body.organizationId');
    expect(branchController).not.toContain('req.body.organization_id');
    expect(branchController).not.toContain('req.params.organizationId');
  });
});

// ─────────────────────────────────────────────────────
// Utility: Extract a route handler block from source
// ─────────────────────────────────────────────────────

function extractRouteBlock(source: string, routePattern: string, methodPrefix: string): string {
  let idx: number;

  if (methodPrefix) {
    // Find the specific method+route combo (e.g., "router.patch('/news/:id'")
    const combo = `${methodPrefix}(\n    ${routePattern}`;
    idx = source.indexOf(combo);
    if (idx === -1) {
      // Fallback: find method prefix then route pattern nearby
      const methodIdx = source.indexOf(`${methodPrefix}(`);
      idx = methodIdx !== -1 ? source.indexOf(routePattern, methodIdx) : -1;
    }
  } else {
    idx = source.indexOf(routePattern);
  }

  if (idx === -1) return '';

  // Extract ~2500 chars from match point — enough to cover auth boilerplate + query logic
  return source.slice(idx, idx + 2500);
}
