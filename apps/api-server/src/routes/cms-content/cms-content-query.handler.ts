/**
 * CMS Content Query Handler — Read-only content endpoints
 *
 * WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1
 * Extracted from cms-content.routes.ts
 *
 * Endpoints:
 *   GET /stats       — Content statistics (for dashboards)
 *   GET /contents    — List contents (with filters, including authorRole)
 *   GET /contents/:id — Get single content
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { CmsContent, ContentType, ContentStatus } from '@o4o-apps/cms-core';
import { optionalAuth } from '../../middleware/auth.middleware.js';

export function createCmsContentQueryRoutes(deps: {
  dataSource: DataSource;
}): Router {
  const router = Router();
  const { dataSource } = deps;

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

      // WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: pending count across all types
      const pendingTotal = await contentRepo.count({
        where: { ...baseWhere, status: 'pending' as any },
      });

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
          // WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1
          pendingApproval: pendingTotal,
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
   * GET /cms/contents
   * List content items with filters
   *
   * Query params:
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - type: Filter by content type (hero, notice, news, etc.)
   * - status: Filter by status (draft, published, archived)
   * - isPinned: Filter pinned items
   * - authorRole: Filter by author role (admin, service_admin, supplier, community)
   * - visibilityScope: Filter by visibility scope (platform, service, organization)
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
        authorRole,
        visibilityScope,
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
      // WO-O4O-CMS-PUBLIC-VISIBILITY-HARDENING-V1:
      // 비인증 사용자는 published만 조회 가능
      if (!(req as any).user) {
        where.status = 'published';
      } else if (status) {
        where.status = status as ContentStatus;
      }
      if (isPinned === 'true') {
        where.isPinned = true;
      }
      // WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: author_role + visibility_scope filters
      if (authorRole) {
        where.authorRole = authorRole as string;
      }
      if (visibilityScope) {
        where.visibilityScope = visibilityScope as string;
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
          authorRole: (content as any).authorRole ?? 'admin',
          visibilityScope: (content as any).visibilityScope ?? 'platform',
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

      // WO-O4O-CMS-PUBLIC-VISIBILITY-HARDENING-V1:
      // 비인증 사용자에게 미게시 콘텐츠는 404 반환 (존재 노출 방지)
      if (!content || (!(req as any).user && content.status !== 'published')) {
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

  return router;
}
