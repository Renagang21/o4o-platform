/**
 * KPA-A Boundary Regression Test
 *
 * KPA-BOUNDARY-REGRESSION-TEST-V1
 *
 * Enforces KPA-A-C-BOUNDARY-MODEL-V1 invariants via static code analysis:
 * 3. KPA-a CMS: Must NOT use organizationId in queries (service-level, not org-level)
 * 4. KPA-a CMS: Soft delete via status='archived' (not hard delete)
 *
 * WO-KPA-A-BRANCH-CHAPTER-REMOVAL-PHASE4-DEAD-CODE-AND-DROP-V1:
 * Branch CMS (KPA-c) tests removed — branch controllers deleted.
 *
 * These tests detect boundary violations at CI time.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────
// Source file paths
// ─────────────────────────────────────────────────────

const KPA_ROUTES_PATH = path.resolve(
  __dirname,
  '../routes/kpa/kpa.routes.ts'
);

const kpaRoutes = fs.readFileSync(KPA_ROUTES_PATH, 'utf8');

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
    // Target the soft-delete route (/:id) specifically, NOT the hard-delete route (/:id/hard)
    // The hard-delete route legitimately uses repo.delete() — it is an intentional operator-only action
    const softDeleteBlock = extractRouteBlock(kpaRoutes, "newsRouter.delete('/:id',", '');
    expect(softDeleteBlock).not.toMatch(/[Rr]epo\.delete\s*\(/);
    expect(softDeleteBlock).not.toMatch(/\.delete\(\)\s*\.from\s*\(/);
    expect(softDeleteBlock).not.toMatch(/[Rr]epo\.remove\s*\(/);
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
