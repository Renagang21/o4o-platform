/**
 * CMS Content Routes
 *
 * WO-P2-IMPLEMENT-CONTENT: Read-only API endpoints for CMS content
 *
 * Endpoints:
 * - GET /api/v1/cms/stats - Content statistics (for dashboards)
 * - GET /api/v1/cms/slots/:slotKey - Get content by slot key
 * - GET /api/v1/cms/contents - List contents (with filters)
 */

import { Router, Request, Response } from 'express';
import { DataSource, In, IsNull, Not, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CmsContent, CmsContentSlot, ContentType, ContentStatus } from '@o4o-apps/cms-core';
import { optionalAuth } from '../../middleware/auth.middleware.js';

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
