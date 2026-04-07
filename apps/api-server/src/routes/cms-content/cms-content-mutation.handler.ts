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

import { Router, Response } from 'express';
import type { DataSource } from 'typeorm';
import { CmsContent, ContentType, ContentStatus } from '@o4o-apps/cms-core';
import { requireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import logger from '../../utils/logger.js';
import { CmsContentService, StatusValidationError, StatusTransitionError } from './cms-content.service.js';
import type { ContentAuthorRole, ContentVisibilityScope } from './cms-content-utils.js';
import { VALID_CONTENT_TYPES } from './cms-content-utils.js';

/**
 * WO-O4O-GLYCOPHARM-OPERATOR-GUIDELINES-403-FIX-V1
 *
 * Authorize a CMS mutation request against a target serviceKey.
 *
 * Allowed:
 *   - platform:admin / platform:super_admin (any serviceKey)
 *   - `${serviceKey}:admin` or `${serviceKey}:operator` (only matching serviceKey)
 *
 * Returns { allowed, isPlatformAdmin } so callers can decide author_role / visibility_scope.
 * Checks JWT payload roles first, falls back to RoleAssignment table.
 */
async function authorizeCmsMutation(
  user: { id: string; roles?: string[] } | undefined,
  serviceKey: string | null | undefined,
): Promise<{ allowed: boolean; isPlatformAdmin: boolean }> {
  if (!user) return { allowed: false, isPlatformAdmin: false };

  const jwtRoles: string[] = user.roles || [];
  const platformRoleNames = ['platform:admin', 'platform:super_admin'];

  let isPlatformAdmin = jwtRoles.some((r) => platformRoleNames.includes(r));
  if (!isPlatformAdmin) {
    try {
      isPlatformAdmin = await roleAssignmentService.hasAnyRole(user.id, platformRoleNames);
    } catch (err) {
      logger.warn('[CMS] Platform admin RoleAssignment check failed:', (err as Error).message);
    }
  }

  if (isPlatformAdmin) return { allowed: true, isPlatformAdmin: true };

  // Service-scoped: requires serviceKey + matching service:operator|admin role
  if (!serviceKey) return { allowed: false, isPlatformAdmin: false };

  const allowedServiceRoles = [`${serviceKey}:admin`, `${serviceKey}:operator`];
  let hasServiceRole = jwtRoles.some((r) => allowedServiceRoles.includes(r));
  if (!hasServiceRole) {
    try {
      hasServiceRole = await roleAssignmentService.hasAnyRole(user.id, allowedServiceRoles);
    } catch (err) {
      logger.warn('[CMS] Service role RoleAssignment check failed:', (err as Error).message);
    }
  }

  return { allowed: hasServiceRole, isPlatformAdmin: false };
}

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

      // WO-O4O-GLYCOPHARM-OPERATOR-GUIDELINES-403-FIX-V1
      // Authorize against target serviceKey (allows platform admin OR ${serviceKey}:operator|admin)
      const { allowed, isPlatformAdmin } = await authorizeCmsMutation(user, serviceKey);
      if (!allowed) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin, service admin, or service operator privileges required for this serviceKey',
          },
        });
        return;
      }

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
  router.put('/contents/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
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

      // WO-O4O-GLYCOPHARM-OPERATOR-GUIDELINES-403-FIX-V1
      // Service-scoped authorization against the existing content's serviceKey.
      // Non-platform-admin callers cannot move content across services.
      const putAuth = await authorizeCmsMutation(req.user, content.serviceKey);
      if (!putAuth.allowed) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin, service admin, or service operator privileges required for this content',
          },
        });
        return;
      }
      // Non-platform-admins may not change serviceKey (would escape their scope)
      if (!putAuth.isPlatformAdmin && serviceKey !== undefined && serviceKey !== content.serviceKey) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot change serviceKey without platform admin role' },
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
  router.patch('/contents/:id/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // WO-O4O-GLYCOPHARM-OPERATOR-GUIDELINES-403-FIX-V1
      // Load existing content to authorize against its serviceKey before transitioning.
      const contentRepo = dataSource.getRepository(CmsContent);
      const existing = await contentRepo.findOne({ where: { id } });
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }
      const patchAuth = await authorizeCmsMutation(req.user, existing.serviceKey);
      if (!patchAuth.allowed) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin, service admin, or service operator privileges required for this content',
          },
        });
        return;
      }

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
