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

// WO-O4O-BRANCH-ADMIN-DASHBOARD-CONTROLLER-SPLIT-V1: handlers were split into separate files
const BRANCH_QUERY_HANDLERS_PATH = path.resolve(
  __dirname,
  '../routes/kpa/controllers/branch-admin-dashboard.query-handlers.ts'
);
const BRANCH_MUTATION_HANDLERS_PATH = path.resolve(
  __dirname,
  '../routes/kpa/controllers/branch-admin-dashboard.mutation-handlers.ts'
);

const KPA_ROUTES_PATH = path.resolve(
  __dirname,
  '../routes/kpa/kpa.routes.ts'
);

// Read source files once — combine controller + handlers for boundary analysis
const branchControllerOnly = fs.readFileSync(BRANCH_CONTROLLER_PATH, 'utf8');
const branchQueryHandlers = fs.readFileSync(BRANCH_QUERY_HANDLERS_PATH, 'utf8');
const branchMutationHandlers = fs.readFileSync(BRANCH_MUTATION_HANDLERS_PATH, 'utf8');
const branchController = branchControllerOnly + '\n' + branchQueryHandlers + '\n' + branchMutationHandlers;
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
    // After controller split, delete logic lives in createDelete*Handler functions
    // in the mutation-handlers file. Each must set is_deleted = true.
    const deleteHandlerBlocks = branchMutationHandlers.split(/export function createDelete\w+Handler/);
    const deleteHandlers = deleteHandlerBlocks.slice(1);

    expect(deleteHandlers.length).toBeGreaterThan(0);

    for (const handler of deleteHandlers) {
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
  // After controller split, query logic lives in handler factory functions.
  // Extract handler blocks from the split handler files.
  it('news list query filters is_deleted', () => {
    const block = extractRouteBlock(branchQueryHandlers, 'createListNewsHandler', '');
    expect(block).toContain('is_deleted');
  });

  it('officers list query filters is_deleted', () => {
    const block = extractRouteBlock(branchQueryHandlers, 'createListOfficersHandler', '');
    expect(block).toContain('is_deleted');
  });

  it('docs list query filters is_deleted', () => {
    const block = extractRouteBlock(branchQueryHandlers, 'createListDocsHandler', '');
    expect(block).toContain('is_deleted');
  });

  it('news single-item query filters is_deleted', () => {
    const block = extractRouteBlock(branchMutationHandlers, 'createUpdateNewsHandler', '');
    expect(block).toContain('is_deleted');
  });

  it('officers single-item query filters is_deleted', () => {
    const block = extractRouteBlock(branchMutationHandlers, 'createUpdateOfficerHandler', '');
    expect(block).toContain('is_deleted');
  });

  it('docs single-item query filters is_deleted', () => {
    const block = extractRouteBlock(branchMutationHandlers, 'createUpdateDocHandler', '');
    expect(block).toContain('is_deleted');
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
    expect(cmsSection).toContain("sks: KPA_SERVICE_KEYS");
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
    // After split, getUserOrganizationId is used in query & mutation handlers
    const combined = branchQueryHandlers + branchMutationHandlers;
    expect(combined).toContain('getUserOrganizationId');
  });

  it('does NOT use req.body.organizationId or req.params.organizationId for scoping', () => {
    // organizationId should never be taken from client input for DB queries
    const combined = branchQueryHandlers + branchMutationHandlers;
    expect(combined).not.toContain('req.body.organizationId');
    expect(combined).not.toContain('req.body.organization_id');
    expect(combined).not.toContain('req.params.organizationId');
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
