/**
 * CMS Content Routes — Facade
 *
 * WO-P2-IMPLEMENT-CONTENT: Read-only API endpoints for CMS content
 * WO-P3-CMS-ADMIN-CRUD-P0: CRUD endpoints for admin content management
 * WO-P3-CMS-SLOT-MANAGEMENT-P1: Slot CRUD and content assignment
 * WO-P7-CMS-SLOT-LOCK-P1: Slot lock fields for edit restrictions
 * WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: author_role, visibility_scope
 * WO-O4O-SUPPLIER-CONTENT-REMOVAL-V1: supplier content endpoint 제거
 * WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1: Facade — sub-handlers compose
 *
 * Content Endpoints:
 * - GET /api/v1/cms/stats - Content statistics (for dashboards)
 * - GET /api/v1/cms/contents - List contents (with filters, including authorRole)
 * - POST /api/v1/cms/contents - Create new content (admin / service_admin)
 * - GET /api/v1/cms/contents/:id - Get single content
 * - PUT /api/v1/cms/contents/:id - Update content (admin)
 * - PATCH /api/v1/cms/contents/:id/status - Change status (admin)
 *
 * Slot Endpoints:
 * - GET /api/v1/cms/slots - List all slots (admin)
 * - GET /api/v1/cms/slots/:slotKey - Get content by slot key (public)
 * - POST /api/v1/cms/slots - Create slot (admin)
 * - PUT /api/v1/cms/slots/:id - Update slot (admin)
 * - DELETE /api/v1/cms/slots/:id - Delete slot (admin)
 * - PUT /api/v1/cms/slots/:slotKey/contents - Assign contents to slot (admin)
 *
 * Mount: /api/v1/cms (in main.ts)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { CmsContentService } from './cms-content.service.js';
import { createCmsContentQueryRoutes } from './cms-content-query.handler.js';
import { createCmsContentSlotRoutes } from './cms-content-slot.handler.js';
import { createCmsContentMutationRoutes } from './cms-content-mutation.handler.js';

/**
 * Create CMS Content routes
 */
export function createCmsContentRoutes(dataSource: DataSource): Router {
  const router = Router();

  // WO-O4O-CMS-TRANSITION-CENTRALIZATION-V1: centralized status transition service
  const cmsContentService = new CmsContentService(dataSource);

  // Content read endpoints (GET /stats, GET /contents, GET /contents/:id)
  router.use('/', createCmsContentQueryRoutes({ dataSource }));

  // Slot management endpoints (GET/POST/PUT/DELETE /slots/*)
  router.use('/', createCmsContentSlotRoutes({ dataSource }));

  // Content write endpoints (POST /contents, PUT /contents/:id, PATCH /contents/:id/status)
  router.use('/', createCmsContentMutationRoutes({ dataSource, cmsContentService }));

  /**
   * GET /cms/health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response): void => {
    res.json({
      status: 'ok',
      service: 'cms-content',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
