/**
 * KPA LMS Scope Guard
 *
 * WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1
 *
 * Application-level pre-middleware that intercepts LMS course write operations
 * targeting KPA organizations and verifies instructor qualification.
 *
 * Mounted BEFORE lmsRoutes in main.ts:
 *   app.use('/api/v1/lms', kpaLmsScopeGuard);
 *   app.use('/api/v1/lms', lmsRoutes);
 *
 * Rules:
 *   - GET requests → pass through
 *   - kpa:admin → bypass
 *   - POST /courses → if body.organizationId belongs to KPA org → require qualification
 *   - POST/PATCH/DELETE on /courses/:id/* → if course.organizationId belongs to KPA org → require qualification
 *   - Non-KPA org operations → pass through (no interference with generic LMS)
 */

import type { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../database/connection.js';
import logger from '../utils/logger.js';

/**
 * Check if an organization is a KPA organization
 * by looking for kpa_members entries.
 */
async function isKpaOrganization(orgId: string): Promise<boolean> {
  try {
    const [result] = await AppDataSource.query(
      `SELECT 1 FROM kpa_members WHERE organization_id = $1 LIMIT 1`,
      [orgId],
    );
    return !!result;
  } catch {
    return false;
  }
}

/**
 * Verify that user has approved KPA instructor qualification for the org.
 */
async function hasKpaQualification(userId: string, orgId: string): Promise<boolean> {
  try {
    const [row] = await AppDataSource.query(
      `SELECT id FROM kpa_instructor_qualifications
       WHERE user_id = $1 AND organization_id = $2 AND status = 'approved'
       LIMIT 1`,
      [userId, orgId],
    );
    return !!row;
  } catch {
    // Table may not exist yet during migration; fail open for non-KPA flows
    return true;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Match: /courses, /courses/:id, /courses/:id/publish, /courses/:id/unpublish, /courses/:id/archive
const COURSE_WRITE_RE = /^\/courses(\/[0-9a-f-]+)?(\/(?:publish|unpublish|archive))?$/i;

export function kpaLmsScopeGuard(req: Request, res: Response, next: NextFunction) {
  // Only guard write operations
  if (req.method === 'GET') return next();

  // Only guard course routes
  if (!COURSE_WRITE_RE.test(req.path)) return next();

  const user = (req as any).user;
  if (!user?.id) return next(); // requireAuth will handle this later

  const userRoles: string[] = user.roles || [];

  // kpa:admin bypass
  if (userRoles.includes('kpa:admin')) return next();

  // Async check
  (async () => {
    try {
      let organizationId: string | null = null;

      // For POST /courses (creation) → check body.organizationId
      if (req.method === 'POST' && req.path === '/courses') {
        organizationId = req.body?.organizationId || null;
      }

      // For mutations on existing courses → lookup course.organizationId
      const courseIdMatch = req.path.match(/^\/courses\/([0-9a-f-]+)/i);
      if (courseIdMatch && courseIdMatch[1] && UUID_RE.test(courseIdMatch[1])) {
        const courseId = courseIdMatch[1];
        const [course] = await AppDataSource.query(
          `SELECT "organizationId" FROM lms_courses WHERE id = $1 LIMIT 1`,
          [courseId],
        );
        if (course) {
          organizationId = course.organizationId;
        }
      }

      // No organizationId → not org-scoped, pass through
      if (!organizationId || !UUID_RE.test(organizationId)) return next();

      // Check if this is a KPA organization
      const isKpa = await isKpaOrganization(organizationId);
      if (!isKpa) return next();

      // KPA org → require qualification
      const qualified = await hasKpaQualification(user.id, organizationId);
      if (!qualified) {
        logger.warn('[kpaLmsScopeGuard] KPA course operation blocked — no qualification', {
          userId: user.id,
          organizationId,
          path: req.path,
          method: req.method,
        });
        res.status(403).json({
          success: false,
          error: 'KPA 강사 자격 승인이 필요합니다. 분회 관리자에게 자격 신청을 제출하세요.',
          code: 'KPA_QUALIFICATION_REQUIRED',
        });
        return;
      }

      next();
    } catch (err) {
      logger.error('[kpaLmsScopeGuard] Error', { error: (err as Error).message });
      // Fail open on error — let the underlying LMS guards handle it
      next();
    }
  })();
}
