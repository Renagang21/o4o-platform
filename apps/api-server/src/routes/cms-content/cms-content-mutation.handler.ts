/**
 * CMS Content Mutation Handler — Content create, update, status transition
 *
 * WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1
 * Extracted from cms-content.routes.ts
 *
 * WO-P3-CMS-ADMIN-CRUD-P0: CRUD endpoints for admin content management
 * WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: author_role, visibility_scope
 * WO-O4O-CMS-TRANSITION-CENTRALIZATION-V1: Centralized status transition
 *
 * Endpoints:
 *   POST  /contents           — Create new content (admin / service_admin)
 *   PUT   /contents/:id       — Update content (admin)
 *   PATCH /contents/:id/status — Change status (admin)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { CmsContent, ContentType, ContentStatus } from '@o4o-apps/cms-core';
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import logger from '../../utils/logger.js';
import { CmsContentService, StatusValidationError, StatusTransitionError } from './cms-content.service.js';
import type { ContentAuthorRole, ContentVisibilityScope } from './cms-content-utils.js';
import { VALID_CONTENT_TYPES } from './cms-content-utils.js';

export function createCmsContentMutationRoutes(deps: {
  dataSource: DataSource;
  cmsContentService: CmsContentService;
}): Router {
  const router = Router();
  const { dataSource, cmsContentService } = deps;

  /**
   * POST /cms/contents
   * Create new content (admin or service_admin)
   *
   * WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1:
   * - Admin: author_role='admin', any visibility_scope
   * - Service admin (e.g. glycopharm:admin): author_role='service_admin', visibility_scope='service'
   */
  router.post('/contents', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      // Determine caller's author_role
      const userRoles: string[] = user.roles || [];
      let isPlatformAdmin = userRoles.some((r: string) =>
        r === 'platform:admin' || r === 'platform:super_admin' || r === 'admin' || r === 'super_admin'
      );

      if (!isPlatformAdmin) {
        try {
          isPlatformAdmin = await roleAssignmentService.hasAnyRole(user.id, ['platform:admin', 'platform:super_admin']);
        } catch (err) {
          logger.warn('[CMS] Platform admin RoleAssignment check failed, skipping:', (err as Error).message);
        }
      }

      // Check service admin roles (e.g., glycopharm:admin, kpa:admin)
      const serviceAdminMatch = userRoles.find((r: string) => r.endsWith(':admin') && !r.startsWith('platform:'));
      const isServiceAdminByRole = !!serviceAdminMatch;

      if (!isPlatformAdmin && !isServiceAdminByRole) {
        // Also check RoleAssignment table for service admin roles
        let hasServiceAdmin = false;
        try {
          const activeRoles = await roleAssignmentService.getActiveRoles(user.id);
          hasServiceAdmin = activeRoles.some(a => a.role.endsWith(':admin') && !a.role.startsWith('platform:'));
        } catch (err) {
          logger.warn('[CMS] Service admin RoleAssignment check failed, skipping:', (err as Error).message);
        }

        if (!hasServiceAdmin) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Admin or service admin privileges required' },
          });
          return;
        }
      }

      const {
        serviceKey,
        organizationId,
        type,
        title,
        summary,
        body,
        bodyBlocks,
        attachments,
        imageUrl,
        linkUrl,
        linkText,
        sortOrder = 0,
        isPinned = false,
        isOperatorPicked = false,
        metadata = {},
        visibilityScope: reqVisibilityScope,
      } = req.body;

      // Validate required fields
      if (!type || !title) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'type and title are required' },
        });
        return;
      }

      // Supported content types
      if (!VALID_CONTENT_TYPES.includes(type)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Supported types: ${VALID_CONTENT_TYPES.join(', ')}` },
        });
        return;
      }

      // Determine author_role and visibility_scope
      const authorRole: ContentAuthorRole = isPlatformAdmin ? 'admin' : 'service_admin';
      const visibilityScope: ContentVisibilityScope = isPlatformAdmin
        ? (reqVisibilityScope || 'platform')
        : 'service';

      // Service admin must provide serviceKey
      if (!isPlatformAdmin && !serviceKey) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'serviceKey is required for service admin content' },
        });
        return;
      }

      const contentRepo = dataSource.getRepository(CmsContent);

      const content = contentRepo.create({
        serviceKey: serviceKey || null,
        organizationId: organizationId || null,
        type: type as ContentType,
        title,
        summary: summary || null,
        body: body || null,
        bodyBlocks: bodyBlocks || null,
        attachments: attachments || null,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        linkText: linkText || null,
        status: 'draft' as ContentStatus,
        sortOrder,
        isPinned,
        isOperatorPicked,
        metadata: { ...metadata, creatorType: authorRole === 'admin' ? 'operator' : 'operator' },
        createdBy: user.id,
      } as any);

      // Set new fields after create (until cms-core types are rebuilt)
      (content as any).authorRole = authorRole;
      (content as any).visibilityScope = visibilityScope;

      const saved = await contentRepo.save(content);

      res.status(201).json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      console.error('Failed to create CMS content:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /cms/contents/:id
   * Update content (admin only)
   */
  router.put('/contents/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        serviceKey,
        type,
        title,
        summary,
        body,
        bodyBlocks,
        attachments,
        imageUrl,
        linkUrl,
        linkText,
        sortOrder,
        isPinned,
        isOperatorPicked,
        metadata,
      } = req.body;

      const contentRepo = dataSource.getRepository(CmsContent);

      const content = await contentRepo.findOne({
        where: { id },
      });

      if (!content) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }

      // Update fields if provided
      if (serviceKey !== undefined) content.serviceKey = serviceKey;
      if (type !== undefined) {
        // Supported content types
        if (!VALID_CONTENT_TYPES.includes(type)) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: `Supported types: ${VALID_CONTENT_TYPES.join(', ')}` },
          });
          return;
        }
        content.type = type as ContentType;
      }
      if (title !== undefined) content.title = title;
      if (summary !== undefined) content.summary = summary;
      if (body !== undefined) content.body = body;
      if (bodyBlocks !== undefined) (content as any).bodyBlocks = bodyBlocks;
      if (attachments !== undefined) (content as any).attachments = attachments;
      if (imageUrl !== undefined) content.imageUrl = imageUrl;
      if (linkUrl !== undefined) content.linkUrl = linkUrl;
      if (linkText !== undefined) content.linkText = linkText;
      if (sortOrder !== undefined) content.sortOrder = sortOrder;
      if (isPinned !== undefined) content.isPinned = isPinned;
      if (isOperatorPicked !== undefined) content.isOperatorPicked = isOperatorPicked;
      if (metadata !== undefined) content.metadata = metadata;

      const updated = await contentRepo.save(content);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Failed to update CMS content:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PATCH /cms/contents/:id/status
   * Change content status (admin only)
   *
   * Allowed transitions:
   * - draft -> published (sets publishedAt)
   * - published -> archived
   * - draft -> archived
   */
  // WO-O4O-CMS-TRANSITION-CENTRALIZATION-V1: delegated to CmsContentService
  router.patch('/contents/:id/status', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await cmsContentService.transitionContentStatus(id, status);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      if (error instanceof StatusValidationError) {
        res.status(400).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
        return;
      }
      if (error instanceof StatusTransitionError) {
        res.status(400).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
        return;
      }
      console.error('Failed to update CMS content status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
