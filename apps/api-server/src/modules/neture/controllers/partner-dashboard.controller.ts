/**
 * PartnerDashboardController — WO-O4O-NETURE-PARTNER-CONTROLLER-SPLIT-V1
 * Extracted from partner.controller.ts
 *
 * Routes:
 *   POST  /partner/dashboard/items
 *   GET   /partner/dashboard/items
 *   PATCH /partner/dashboard/items/:id
 *   GET   /partner/dashboard/summary
 *   GET   /partner/contents
 *   POST  /partner/dashboard/items/:itemId/contents
 *   DELETE /partner/dashboard/items/:itemId/contents/:linkId
 *   GET   /partner/dashboard/items/:itemId/contents
 *   PATCH /partner/dashboard/items/:itemId/contents/reorder
 *   PATCH /partner/dashboard/items/:itemId/contents/:linkId/primary
 */
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import type { PartnerService } from '../services/partner.service.js';
import type { NetureService } from '../neture.service.js';
import { GlycopharmRepository } from '../../../routes/glycopharm/repositories/glycopharm.repository.js';
import type { GlycopharmProduct } from '../../../routes/glycopharm/entities/glycopharm-product.entity.js';
import { NeturePartnerDashboardItem } from '../entities/NeturePartnerDashboardItem.entity.js';
import { NeturePartnerDashboardItemContent } from '../entities/NeturePartnerDashboardItemContent.entity.js';
import logger from '../../../utils/logger.js';

export function createPartnerDashboardController(deps: {
  dataSource: DataSource;
  partnerService: PartnerService;
  netureService: NetureService;
  requireActivePartner: RequestHandler;
  requireLinkedPartner: RequestHandler;
}): Router {
  const router = Router();
  const { dataSource, partnerService, netureService, requireActivePartner, requireLinkedPartner } = deps;

  // ==================== Partner Dashboard (WO-PARTNER-DASHBOARD-PHASE1-V1) ====================

  /**
   * POST /partner/dashboard/items
   * Add a product to partner's dashboard
   */
  router.post('/partner/dashboard/items', requireAuth, requireActivePartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { productId, serviceId } = req.body;
      if (!productId) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'productId is required' });
      }

      const repo = dataSource.getRepository(NeturePartnerDashboardItem);

      // Check duplicate
      const existing = await repo.findOne({
        where: { partnerUserId: userId, productId },
      });

      if (existing) {
        return res.json({ success: true, already_exists: true, data: existing });
      }

      const item = repo.create({
        partnerUserId: userId,
        productId,
        serviceId: serviceId || 'glycopharm',
        status: 'active',
      });

      const saved = await repo.save(item);

      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      logger.error('[Neture API] Error adding partner dashboard item:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to add dashboard item' });
    }
  });

  /**
   * GET /partner/dashboard/items
   * Get partner's dashboard items with product details
   */
  router.get('/partner/dashboard/items', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const repo = dataSource.getRepository(NeturePartnerDashboardItem);
      const items = await repo.find({
        where: { partnerUserId: userId },
        order: { createdAt: 'DESC' },
      });

      if (items.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Batch-fetch product details
      const productIds = items.map((item) => item.productId);
      const glycopharmRepo = new GlycopharmRepository(dataSource);
      const productMap = new Map<string, GlycopharmProduct>();

      for (const id of productIds) {
        const product = await glycopharmRepo.findProductById(id);
        if (product) {
          productMap.set(id, product);
        }
      }

      // Batch-fetch content link counts (WO-PARTNER-CONTENT-LINK-PHASE1-V1)
      const itemIds = items.map((item) => item.id);
      const contentCountMap = await partnerService.getDashboardItemContentCounts(itemIds);

      // Batch-fetch primary content info (WO-PARTNER-CONTENT-PRESENTATION-PHASE3-V1)
      const primaryContentMap = await partnerService.getDashboardItemPrimaryContents(itemIds);

      const data = items.map((item) => {
        const product = productMap.get(item.productId);
        const primaryContent = primaryContentMap.get(item.id) || null;
        return {
          id: item.id,
          productId: item.productId,
          productName: product?.name || '(삭제된 제품)',
          category: product?.category || 'other',
          price: product ? Number(product.price) : 0,
          pharmacyName: product?.pharmacy?.name,
          serviceId: item.serviceId,
          status: item.status,
          contentCount: contentCountMap.get(item.id) || 0,
          primaryContent,
          createdAt: item.createdAt.toISOString(),
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner dashboard items:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard items' });
    }
  });

  /**
   * PATCH /partner/dashboard/items/:id
   * Toggle status of a partner dashboard item
   * WO-PARTNER-DASHBOARD-UX-PHASE2-V1
   */
  router.patch('/partner/dashboard/items/:id', requireAuth, requireActivePartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'status must be "active" or "inactive"' });
      }

      const repo = dataSource.getRepository(NeturePartnerDashboardItem);
      const item = await repo.findOne({ where: { id, partnerUserId: userId } });

      if (!item) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
      }

      item.status = status;
      const updated = await repo.save(item);

      res.json({ success: true, data: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() } });
    } catch (error) {
      logger.error('[Neture API] Error updating partner dashboard item:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update dashboard item' });
    }
  });

  /**
   * GET /partner/dashboard/summary
   * Get partner dashboard summary
   */
  router.get('/partner/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const summary = await netureService.getPartnerDashboardSummary(userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner dashboard summary:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch partner dashboard summary',
      });
    }
  });

  // ==================== Partner Contents (WO-PARTNER-CONTENT-LINK-PHASE1-V1) ====================

  /**
   * GET /partner/contents
   * Browse available content (CMS + supplier) for partners
   */
  router.get('/partner/contents', requireAuth, requireLinkedPartner, async (req: Request, res: Response) => {
    try {
      const source = (req.query.source as string) || 'all';

      const results: Array<{ id: string; title: string; summary: string | null; type: string; source: string; imageUrl: string | null; createdAt: string }> = [];

      // CMS contents
      if (source === 'all' || source === 'cms') {
        const cmsResults = await partnerService.browseCmsContents();
        results.push(...cmsResults);
      }

      res.json({ success: true, data: results });
    } catch (error) {
      logger.error('[Neture API] Error browsing partner contents:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to browse contents' });
    }
  });

  /**
   * POST /partner/dashboard/items/:itemId/contents
   * Link content to a dashboard item
   */
  router.post('/partner/dashboard/items/:itemId/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { itemId } = req.params;
      const { contentId, contentSource } = req.body;

      if (!contentId || !contentSource || !['cms'].includes(contentSource)) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'contentId and contentSource (cms) are required' });
      }

      // Ownership check
      const itemRepo = dataSource.getRepository(NeturePartnerDashboardItem);
      const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
      if (!item) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
      }

      const linkRepo = dataSource.getRepository(NeturePartnerDashboardItemContent);

      // Duplicate check
      const existing = await linkRepo.findOne({
        where: { dashboardItemId: itemId, contentId, contentSource },
      });
      if (existing) {
        return res.json({ success: true, already_linked: true, data: existing });
      }

      const link = linkRepo.create({ dashboardItemId: itemId, contentId, contentSource });
      const saved = await linkRepo.save(link);

      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      logger.error('[Neture API] Error linking content:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to link content' });
    }
  });

  /**
   * DELETE /partner/dashboard/items/:itemId/contents/:linkId
   * Unlink content from a dashboard item
   */
  router.delete('/partner/dashboard/items/:itemId/contents/:linkId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { itemId, linkId } = req.params;

      // Ownership check
      const itemRepo = dataSource.getRepository(NeturePartnerDashboardItem);
      const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
      if (!item) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
      }

      const linkRepo = dataSource.getRepository(NeturePartnerDashboardItemContent);
      const link = await linkRepo.findOne({ where: { id: linkId, dashboardItemId: itemId } });
      if (!link) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content link not found' });
      }

      await linkRepo.remove(link);
      res.json({ success: true });
    } catch (error) {
      logger.error('[Neture API] Error unlinking content:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to unlink content' });
    }
  });

  /**
   * GET /partner/dashboard/items/:itemId/contents
   * Get linked contents for a dashboard item
   */
  router.get('/partner/dashboard/items/:itemId/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { itemId } = req.params;

      // Ownership check
      const itemRepo = dataSource.getRepository(NeturePartnerDashboardItem);
      const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
      if (!item) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
      }

      const linkRepo = dataSource.getRepository(NeturePartnerDashboardItemContent);
      const links = await linkRepo.find({
        where: { dashboardItemId: itemId },
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });

      if (links.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Batch-fetch content details
      const cmsIds = links.filter((l) => l.contentSource === 'cms').map((l) => l.contentId);
      const contentMap = await partnerService.getCmsContentDetails(cmsIds);

      const data = links.map((link) => {
        const detail = contentMap.get(`${link.contentSource}:${link.contentId}`);
        return {
          linkId: link.id,
          contentId: link.contentId,
          contentSource: link.contentSource,
          title: detail?.title || '(삭제된 콘텐츠)',
          type: detail?.type || 'unknown',
          summary: detail?.summary || null,
          imageUrl: detail?.imageUrl || null,
          sortOrder: link.sortOrder,
          isPrimary: link.isPrimary,
          createdAt: detail?.createdAt || link.createdAt.toISOString(),
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching linked contents:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch linked contents' });
    }
  });

  /**
   * PATCH /partner/dashboard/items/:itemId/contents/reorder
   * Reorder linked contents
   * WO-PARTNER-CONTENT-ORDER-PHASE2-V1
   */
  router.patch('/partner/dashboard/items/:itemId/contents/reorder', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { itemId } = req.params;
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'orderedIds array is required' });
      }

      // Ownership check
      const itemRepo = dataSource.getRepository(NeturePartnerDashboardItem);
      const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
      if (!item) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
      }

      const linkRepo = dataSource.getRepository(NeturePartnerDashboardItemContent);
      const links = await linkRepo.find({ where: { dashboardItemId: itemId } });
      const linkMap = new Map(links.map((l) => [l.id, l]));

      // Validate all IDs belong to this item
      for (const id of orderedIds) {
        if (!linkMap.has(id)) {
          return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: `Link ID ${id} not found for this item` });
        }
      }

      // Update sort_order
      for (let i = 0; i < orderedIds.length; i++) {
        const link = linkMap.get(orderedIds[i])!;
        link.sortOrder = i;
      }
      await linkRepo.save(links);

      res.json({ success: true });
    } catch (error) {
      logger.error('[Neture API] Error reordering contents:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reorder contents' });
    }
  });

  /**
   * PATCH /partner/dashboard/items/:itemId/contents/:linkId/primary
   * Set a content link as primary
   * WO-PARTNER-CONTENT-ORDER-PHASE2-V1
   */
  router.patch('/partner/dashboard/items/:itemId/contents/:linkId/primary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { itemId, linkId } = req.params;

      // Ownership check
      const itemRepo = dataSource.getRepository(NeturePartnerDashboardItem);
      const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
      if (!item) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
      }

      const linkRepo = dataSource.getRepository(NeturePartnerDashboardItemContent);

      // Unset all primary for this item
      await linkRepo.update({ dashboardItemId: itemId }, { isPrimary: false });

      // Set target as primary
      const link = await linkRepo.findOne({ where: { id: linkId, dashboardItemId: itemId } });
      if (!link) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content link not found' });
      }

      link.isPrimary = true;
      await linkRepo.save(link);

      res.json({ success: true, data: { linkId: link.id, isPrimary: true } });
    } catch (error) {
      logger.error('[Neture API] Error setting primary content:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to set primary content' });
    }
  });

  return router;
}
