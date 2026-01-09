/**
 * CMS Content Routes
 *
 * WO-P2-IMPLEMENT-CONTENT: Read-only API endpoints for CMS content
 * WO-P3-CMS-ADMIN-CRUD-P0: CRUD endpoints for admin content management
 * WO-P3-CMS-SLOT-MANAGEMENT-P1: Slot CRUD and content assignment
 * WO-P7-CMS-SLOT-LOCK-P1: Slot lock fields for edit restrictions
 *
 * Content Endpoints:
 * - GET /api/v1/cms/stats - Content statistics (for dashboards)
 * - GET /api/v1/cms/contents - List contents (with filters)
 * - POST /api/v1/cms/contents - Create new content (admin)
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
 */

import { Router, Request, Response } from 'express';
import { DataSource, In, IsNull, Not, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CmsContent, CmsContentSlot, ContentType, ContentStatus } from '@o4o-apps/cms-core';
import { optionalAuth, requireAdmin } from '../../middleware/auth.middleware.js';

/**
 * Create CMS Content routes
 */
export function createCmsContentRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /cms/stats
   * Get content statistics for dashboards
   *
   * Query params:
   * - serviceKey: Filter by service (glycopharm, kpa, glucoseview, etc.)
   * - organizationId: Filter by organization
   */
  router.get('/stats', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceKey, organizationId } = req.query;
      const contentRepo = dataSource.getRepository(CmsContent);

      // Build base where clause for scope
      const baseWhere: any = {};
      if (serviceKey) {
        baseWhere.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        baseWhere.organizationId = organizationId as string;
      }

      // Get counts by type
      const [
        heroTotal,
        heroActive,
        noticeTotal,
        noticeActive,
        newsTotal,
        newsActive,
        featuredTotal,
        featuredOperatorPicked,
        promoTotal,
        promoActive,
        eventTotal,
        eventActive,
      ] = await Promise.all([
        // Hero
        contentRepo.count({ where: { ...baseWhere, type: 'hero' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'hero', status: 'published' } }),
        // Notice
        contentRepo.count({ where: { ...baseWhere, type: 'notice' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'notice', status: 'published' } }),
        // News
        contentRepo.count({ where: { ...baseWhere, type: 'news' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'news', status: 'published' } }),
        // Featured
        contentRepo.count({ where: { ...baseWhere, type: 'featured' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'featured', isOperatorPicked: true } }),
        // Promo
        contentRepo.count({ where: { ...baseWhere, type: 'promo' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'promo', status: 'published' } }),
        // Event
        contentRepo.count({ where: { ...baseWhere, type: 'event' } }),
        contentRepo.count({ where: { ...baseWhere, type: 'event', status: 'published' } }),
      ]);

      // Calculate combined stats
      const eventNoticeTotal = noticeTotal + eventTotal;
      const eventNoticeActive = noticeActive + eventActive;

      res.json({
        success: true,
        data: {
          hero: { total: heroTotal, active: heroActive },
          notice: { total: noticeTotal, active: noticeActive },
          news: { total: newsTotal, active: newsActive },
          featured: { total: featuredTotal, operatorPicked: featuredOperatorPicked },
          promo: { total: promoTotal, active: promoActive },
          event: { total: eventTotal, active: eventActive },
          // Combined for Glycopharm dashboard compatibility
          eventNotice: { total: eventNoticeTotal, active: eventNoticeActive },
        },
        scope: {
          serviceKey: serviceKey || null,
          organizationId: organizationId || null,
        },
      });
    } catch (error: any) {
      console.error('Failed to get CMS content stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /cms/slots/:slotKey
   * Get content items assigned to a specific slot
   *
   * Query params:
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - activeOnly: Only show currently active slots (default: true)
   */
  router.get('/slots/:slotKey', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slotKey } = req.params;
      const { serviceKey, organizationId, activeOnly = 'true' } = req.query;

      const slotRepo = dataSource.getRepository(CmsContentSlot);
      const now = new Date();

      // Build where clause
      const where: any = { slotKey };
      if (serviceKey) {
        where.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        where.organizationId = organizationId as string;
      }
      if (activeOnly === 'true') {
        where.isActive = true;
      }

      // Get slots with content
      const slots = await slotRepo.find({
        where,
        relations: ['content'],
        order: { sortOrder: 'ASC' },
      });

      // Filter by time window if active
      const filteredSlots = activeOnly === 'true'
        ? slots.filter(slot => {
            const startsOk = !slot.startsAt || slot.startsAt <= now;
            const endsOk = !slot.endsAt || slot.endsAt >= now;
            const contentPublished = slot.content?.status === 'published';
            return startsOk && endsOk && contentPublished;
          })
        : slots;

      res.json({
        success: true,
        data: filteredSlots.map(slot => ({
          id: slot.id,
          slotKey: slot.slotKey,
          sortOrder: slot.sortOrder,
          isActive: slot.isActive,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          // Lock fields (WO-P7-CMS-SLOT-LOCK-P1)
          isLocked: slot.isLocked,
          lockedBy: slot.lockedBy,
          lockedReason: slot.lockedReason,
          lockedUntil: slot.lockedUntil,
          content: slot.content ? {
            id: slot.content.id,
            type: slot.content.type,
            title: slot.content.title,
            summary: slot.content.summary,
            imageUrl: slot.content.imageUrl,
            linkUrl: slot.content.linkUrl,
            linkText: slot.content.linkText,
            metadata: slot.content.metadata,
          } : null,
        })),
        meta: {
          slotKey,
          serviceKey: serviceKey || null,
          organizationId: organizationId || null,
          total: filteredSlots.length,
        },
      });
    } catch (error: any) {
      console.error('Failed to get CMS content slots:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /cms/contents
   * List content items with filters
   *
   * Query params:
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - type: Filter by content type (hero, notice, news, etc.)
   * - status: Filter by status (draft, published, archived)
   * - isPinned: Filter pinned items
   * - limit: Max items to return (default: 20)
   * - offset: Pagination offset (default: 0)
   */
  router.get('/contents', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        serviceKey,
        organizationId,
        type,
        status,
        isPinned,
        limit = '20',
        offset = '0',
      } = req.query;

      const contentRepo = dataSource.getRepository(CmsContent);

      // Build where clause
      const where: any = {};
      if (serviceKey) {
        where.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        where.organizationId = organizationId as string;
      }
      if (type) {
        where.type = type as ContentType;
      }
      if (status) {
        where.status = status as ContentStatus;
      }
      if (isPinned === 'true') {
        where.isPinned = true;
      }

      const [contents, total] = await contentRepo.findAndCount({
        where,
        order: { isPinned: 'DESC', sortOrder: 'ASC', createdAt: 'DESC' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      });

      res.json({
        success: true,
        data: contents.map(content => ({
          id: content.id,
          type: content.type,
          title: content.title,
          summary: content.summary,
          imageUrl: content.imageUrl,
          linkUrl: content.linkUrl,
          linkText: content.linkText,
          status: content.status,
          publishedAt: content.publishedAt,
          isPinned: content.isPinned,
          isOperatorPicked: content.isOperatorPicked,
          sortOrder: content.sortOrder,
          createdAt: content.createdAt,
        })),
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error: any) {
      console.error('Failed to list CMS contents:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /cms/contents/:id
   * Get single content by ID
   */
  router.get('/contents/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
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

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get CMS content:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /cms/contents
   * Create new content (admin only)
   */
  router.post('/contents', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        serviceKey,
        organizationId,
        type,
        title,
        summary,
        body,
        imageUrl,
        linkUrl,
        linkText,
        sortOrder = 0,
        isPinned = false,
        isOperatorPicked = false,
        metadata = {},
      } = req.body;

      // Validate required fields
      if (!type || !title) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'type and title are required' },
        });
        return;
      }

      // P0: Only hero and notice types allowed
      if (!['hero', 'notice'].includes(type)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Only hero and notice types are supported in P0' },
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
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        linkText: linkText || null,
        status: 'draft' as ContentStatus,
        sortOrder,
        isPinned,
        isOperatorPicked,
        metadata,
      });

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
        // P0: Only hero and notice types allowed
        if (!['hero', 'notice'].includes(type)) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Only hero and notice types are supported in P0' },
          });
          return;
        }
        content.type = type as ContentType;
      }
      if (title !== undefined) content.title = title;
      if (summary !== undefined) content.summary = summary;
      if (body !== undefined) content.body = body;
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
  router.patch('/contents/:id/status', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['draft', 'published', 'archived'].includes(status)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Valid status required: draft, published, or archived' },
        });
        return;
      }

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

      // Validate status transitions
      const currentStatus = content.status;
      const validTransitions: Record<string, string[]> = {
        draft: ['published', 'archived'],
        published: ['archived'],
        archived: [], // No transitions from archived
      };

      if (!validTransitions[currentStatus]?.includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition from ${currentStatus} to ${status}`,
          },
        });
        return;
      }

      // Update status
      content.status = status as ContentStatus;

      // Set publishedAt when publishing
      if (status === 'published' && !content.publishedAt) {
        content.publishedAt = new Date();
      }

      const updated = await contentRepo.save(content);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Failed to update CMS content status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  // =========================================================================
  // SLOT MANAGEMENT (WO-P3-CMS-SLOT-MANAGEMENT-P1)
  // =========================================================================

  /**
   * GET /cms/slots
   * List all slots with optional filters (admin only)
   *
   * Query params:
   * - serviceKey: Filter by service
   * - slotKey: Filter by specific slot key
   * - isActive: Filter by active status
   */
  router.get('/slots', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceKey, slotKey, isActive } = req.query;
      const slotRepo = dataSource.getRepository(CmsContentSlot);

      const where: any = {};
      if (serviceKey) {
        where.serviceKey = serviceKey as string;
      }
      if (slotKey) {
        where.slotKey = slotKey as string;
      }
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const slots = await slotRepo.find({
        where,
        relations: ['content'],
        order: { slotKey: 'ASC', sortOrder: 'ASC' },
      });

      // Group slots by slotKey for better organization
      const slotGroups: Record<string, typeof slots> = {};
      for (const slot of slots) {
        if (!slotGroups[slot.slotKey]) {
          slotGroups[slot.slotKey] = [];
        }
        slotGroups[slot.slotKey].push(slot);
      }

      res.json({
        success: true,
        data: slots.map(slot => ({
          id: slot.id,
          slotKey: slot.slotKey,
          serviceKey: slot.serviceKey,
          organizationId: slot.organizationId,
          contentId: slot.contentId,
          content: slot.content ? {
            id: slot.content.id,
            type: slot.content.type,
            title: slot.content.title,
            status: slot.content.status,
          } : null,
          sortOrder: slot.sortOrder,
          isActive: slot.isActive,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          // Lock fields (WO-P7-CMS-SLOT-LOCK-P1)
          isLocked: slot.isLocked,
          lockedBy: slot.lockedBy,
          lockedReason: slot.lockedReason,
          lockedUntil: slot.lockedUntil,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
        })),
        meta: {
          total: slots.length,
          slotKeys: Object.keys(slotGroups),
        },
      });
    } catch (error: any) {
      console.error('Failed to list CMS slots:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /cms/slots
   * Create a new slot (admin only)
   */
  router.post('/slots', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        slotKey,
        serviceKey,
        organizationId,
        contentId,
        sortOrder = 0,
        isActive = true,
        startsAt,
        endsAt,
      } = req.body;

      // Validate required fields
      if (!slotKey || !contentId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'slotKey and contentId are required' },
        });
        return;
      }

      // Verify content exists
      const contentRepo = dataSource.getRepository(CmsContent);
      const content = await contentRepo.findOne({ where: { id: contentId } });
      if (!content) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Content not found' },
        });
        return;
      }

      const slotRepo = dataSource.getRepository(CmsContentSlot);

      const slot = slotRepo.create({
        slotKey,
        serviceKey: serviceKey || null,
        organizationId: organizationId || null,
        contentId,
        sortOrder,
        isActive,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      });

      const saved = await slotRepo.save(slot);

      // Reload with content relation
      const result = await slotRepo.findOne({
        where: { id: saved.id },
        relations: ['content'],
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Failed to create CMS slot:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /cms/slots/:id
   * Update a slot (admin only)
   *
   * WO-P7-CMS-SLOT-LOCK-P1: Locked slots cannot be edited
   * Lock fields can only be modified by platform admins (future enhancement)
   */
  router.put('/slots/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        slotKey,
        serviceKey,
        contentId,
        sortOrder,
        isActive,
        startsAt,
        endsAt,
        // Lock fields - platform admin only
        isLocked,
        lockedBy,
        lockedReason,
        lockedUntil,
      } = req.body;

      const slotRepo = dataSource.getRepository(CmsContentSlot);

      const slot = await slotRepo.findOne({ where: { id } });
      if (!slot) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Slot not found' },
        });
        return;
      }

      // WO-P7-CMS-SLOT-LOCK-P1: Check if slot is locked
      // If locked, only allow lock field modifications (platform admin override)
      const isModifyingLockFields = isLocked !== undefined || lockedBy !== undefined ||
                                     lockedReason !== undefined || lockedUntil !== undefined;
      const isModifyingContentFields = slotKey !== undefined || serviceKey !== undefined ||
                                        contentId !== undefined || sortOrder !== undefined ||
                                        isActive !== undefined || startsAt !== undefined ||
                                        endsAt !== undefined;

      if (slot.isLocked && isModifyingContentFields && !isModifyingLockFields) {
        res.status(403).json({
          success: false,
          error: {
            code: 'SLOT_LOCKED',
            message: slot.lockedReason || 'This slot is locked and cannot be edited',
            lockedBy: slot.lockedBy,
            lockedUntil: slot.lockedUntil,
          },
        });
        return;
      }

      // Verify content if being changed
      if (contentId && contentId !== slot.contentId) {
        const contentRepo = dataSource.getRepository(CmsContent);
        const content = await contentRepo.findOne({ where: { id: contentId } });
        if (!content) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Content not found' },
          });
          return;
        }
        slot.contentId = contentId;
      }

      // Update fields
      if (slotKey !== undefined) slot.slotKey = slotKey;
      if (serviceKey !== undefined) slot.serviceKey = serviceKey;
      if (sortOrder !== undefined) slot.sortOrder = sortOrder;
      if (isActive !== undefined) slot.isActive = isActive;
      if (startsAt !== undefined) slot.startsAt = startsAt ? new Date(startsAt) : null;
      if (endsAt !== undefined) slot.endsAt = endsAt ? new Date(endsAt) : null;

      // Lock fields (platform admin)
      if (isLocked !== undefined) slot.isLocked = isLocked;
      if (lockedBy !== undefined) slot.lockedBy = lockedBy;
      if (lockedReason !== undefined) slot.lockedReason = lockedReason;
      if (lockedUntil !== undefined) slot.lockedUntil = lockedUntil ? new Date(lockedUntil) : null;

      await slotRepo.save(slot);

      // Reload with content relation
      const result = await slotRepo.findOne({
        where: { id: slot.id },
        relations: ['content'],
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Failed to update CMS slot:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * DELETE /cms/slots/:id
   * Delete a slot (admin only)
   *
   * WO-P7-CMS-SLOT-LOCK-P1: Locked slots cannot be deleted
   */
  router.delete('/slots/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const slotRepo = dataSource.getRepository(CmsContentSlot);

      const slot = await slotRepo.findOne({ where: { id } });
      if (!slot) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Slot not found' },
        });
        return;
      }

      // WO-P7-CMS-SLOT-LOCK-P1: Check if slot is locked
      if (slot.isLocked) {
        res.status(403).json({
          success: false,
          error: {
            code: 'SLOT_LOCKED',
            message: slot.lockedReason || 'This slot is locked and cannot be deleted',
            lockedBy: slot.lockedBy,
            lockedUntil: slot.lockedUntil,
          },
        });
        return;
      }

      await slotRepo.remove(slot);

      res.json({
        success: true,
        message: 'Slot deleted successfully',
      });
    } catch (error: any) {
      console.error('Failed to delete CMS slot:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /cms/slots/:slotKey/contents
   * Assign contents to a slot (admin only)
   *
   * This replaces all contents in a slot with the provided list.
   * Useful for reordering or bulk assignment.
   *
   * Body: {
   *   serviceKey?: string,
   *   contents: Array<{ contentId: string, sortOrder: number, isActive?: boolean, startsAt?: string, endsAt?: string }>
   * }
   */
  router.put('/slots/:slotKey/contents', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slotKey } = req.params;
      const { serviceKey, organizationId, contents } = req.body;

      if (!Array.isArray(contents)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'contents must be an array' },
        });
        return;
      }

      const slotRepo = dataSource.getRepository(CmsContentSlot);
      const contentRepo = dataSource.getRepository(CmsContent);

      // Validate all content IDs exist
      const contentIds = contents.map((c: any) => c.contentId);
      if (contentIds.length > 0) {
        const existingContents = await contentRepo.find({
          where: { id: In(contentIds) },
        });
        if (existingContents.length !== contentIds.length) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'One or more contents not found' },
          });
          return;
        }
      }

      // Build scope condition
      const scopeWhere: any = { slotKey };
      if (serviceKey) {
        scopeWhere.serviceKey = serviceKey;
      }
      if (organizationId) {
        scopeWhere.organizationId = organizationId;
      }

      // Delete existing slots for this slotKey/scope
      await slotRepo.delete(scopeWhere);

      // Create new slots
      const newSlots = contents.map((c: any, index: number) => {
        return slotRepo.create({
          slotKey,
          serviceKey: serviceKey || null,
          organizationId: organizationId || null,
          contentId: c.contentId,
          sortOrder: c.sortOrder ?? index,
          isActive: c.isActive ?? true,
          startsAt: c.startsAt ? new Date(c.startsAt) : null,
          endsAt: c.endsAt ? new Date(c.endsAt) : null,
        });
      });

      const savedSlots = await slotRepo.save(newSlots);

      // Reload with content relations
      const result = await slotRepo.find({
        where: scopeWhere,
        relations: ['content'],
        order: { sortOrder: 'ASC' },
      });

      res.json({
        success: true,
        data: result,
        meta: {
          slotKey,
          serviceKey: serviceKey || null,
          total: result.length,
        },
      });
    } catch (error: any) {
      console.error('Failed to assign contents to slot:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

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
