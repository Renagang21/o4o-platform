/**
 * PartnerController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes:
 *   partner/recruiting-products, partner/recruitments, partner/applications/*,
 *   partner/dashboard/*, partner/contents, partner/contracts/*,
 *   partner/commissions/*, partner/product-pool, partner/referral-links,
 *   partner/settlements/*,
 *   admin/partners/*, admin/partner-settlements/*
 *
 * Mounted at `/` prefix (NOT `/partner`!) because routes have mixed prefixes.
 */
import crypto from 'node:crypto';
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import {
  createRequireActivePartner,
  createRequireLinkedPartner,
  createRequireActiveSupplier,
} from '../middleware/neture-identity.middleware.js';
import type { PartnerRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { PartnerService } from '../services/partner.service.js';
import { PartnerCommissionService } from '../services/partner-commission.service.js';
import { NetureService } from '../neture.service.js';
import { GlycopharmRepository } from '../../../routes/glycopharm/repositories/glycopharm.repository.js';
import type { GlycopharmProduct } from '../../../routes/glycopharm/entities/glycopharm-product.entity.js';
import { NeturePartnerDashboardItem } from '../entities/NeturePartnerDashboardItem.entity.js';
import { NeturePartnerDashboardItemContent } from '../entities/NeturePartnerDashboardItemContent.entity.js';
import { RecruitmentStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';

export function createPartnerController(dataSource: DataSource): Router {
  const router = Router();
  const partnerService = new PartnerService(dataSource);
  const netureService = new NetureService();
  const commissionService = new PartnerCommissionService(dataSource);
  const requireActivePartner = createRequireActivePartner(dataSource);
  const requireLinkedPartner = createRequireLinkedPartner(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);

  // ==================== Recruiting Products (WO-PARTNER-RECRUIT-PHASE1-V1) ====================

  /**
   * GET /partner/recruiting-products
   * Get products marked for partner recruiting (public, no auth)
   */
  router.get('/partner/recruiting-products', async (_req: Request, res: Response) => {
    try {
      const glycopharmRepo = new GlycopharmRepository(dataSource);
      const products = await glycopharmRepo.findPartnerRecruitingProducts();

      const data = products.map((p) => ({
        id: p.id,
        pharmacy_id: p.pharmacy_id,
        pharmacy_name: p.pharmacy?.name,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: Number(p.price),
        sale_price: p.sale_price ? Number(p.sale_price) : undefined,
        stock_quantity: p.stock_quantity,
        status: p.status,
        is_featured: p.is_featured,
        is_partner_recruiting: p.is_partner_recruiting,
        created_at: p.created_at.toISOString(),
      }));

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching recruiting products:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch recruiting products',
      });
    }
  });

  // ==================== Partner Recruitment API (WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1) ====================

  /**
   * GET /partner/recruitments
   * 파트너 모집 목록 조회 (public)
   */
  router.get('/partner/recruitments', async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const filters: { status?: RecruitmentStatus } = {};
      if (status && typeof status === 'string') {
        filters.status = status as RecruitmentStatus;
      }

      const data = await netureService.getPartnerRecruitments(filters);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner recruitments:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner recruitments' });
    }
  });

  /**
   * POST /partner/applications
   * 파트너 신청 (requires auth)
   */
  router.post('/partner/applications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { recruitmentId } = req.body;
      if (!recruitmentId) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'recruitmentId is required' });
      }

      const partnerName = req.user?.name || '';
      const result = await netureService.createPartnerApplication(recruitmentId, userId, partnerName);

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'RECRUITMENT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '모집 공고를 찾을 수 없습니다.' });
      }
      if (msg === 'RECRUITMENT_CLOSED') {
        return res.status(400).json({ success: false, error: 'RECRUITMENT_CLOSED', message: '마감된 모집입니다.' });
      }
      if (msg === 'DUPLICATE_APPLICATION') {
        return res.status(409).json({ success: false, error: 'DUPLICATE_APPLICATION', message: '이미 신청한 모집입니다.' });
      }
      logger.error('[Neture API] Error creating partner application:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create application' });
    }
  });

  /**
   * POST /partner/applications/:id/approve
   * 파트너 신청 승인 (모집 주체 판매자)
   */
  router.post('/partner/applications/:id/approve', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { id } = req.params;
      const result = await netureService.approvePartnerApplication(id, userId);

      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'APPLICATION_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
      }
      if (msg === 'INVALID_STATUS') {
        return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
      }
      if (msg === 'NOT_RECRUITMENT_OWNER') {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: '모집 주체만 승인할 수 있습니다.' });
      }
      if (msg === 'ACTIVE_CONTRACT_EXISTS') {
        return res.status(409).json({ success: false, error: 'CONFLICT', message: '이미 활성 계약이 존재합니다.' });
      }
      logger.error('[Neture API] Error approving partner application:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to approve application' });
    }
  });

  /**
   * POST /partner/applications/:id/reject
   * 파트너 신청 거절 (모집 주체 판매자)
   */
  router.post('/partner/applications/:id/reject', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { id } = req.params;
      const { reason } = req.body;
      const result = await netureService.rejectPartnerApplication(id, userId, reason);

      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'APPLICATION_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
      }
      if (msg === 'INVALID_STATUS') {
        return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
      }
      if (msg === 'NOT_RECRUITMENT_OWNER') {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: '모집 주체만 거절할 수 있습니다.' });
      }
      logger.error('[Neture API] Error rejecting partner application:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reject application' });
    }
  });

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

  // ==================== Partner Contracts ====================

  /**
   * GET /partner/contracts
   * Partner 계약 목록 조회
   * Query: ?status=active|terminated|expired
   */
  router.get('/partner/contracts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { status } = req.query;
      const contracts = await netureService.getPartnerContracts(userId, status as string | undefined);
      res.json({ success: true, data: contracts });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner contracts:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
    }
  });

  /**
   * POST /partner/contracts/:id/terminate
   * Partner가 계약 해지
   */
  router.post('/partner/contracts/:id/terminate', requireAuth, requireActivePartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { id } = req.params;
      const result = await netureService.terminateContract(id, userId, 'partner');
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'CONTRACT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '계약을 찾을 수 없습니다.' });
      }
      if (msg === 'CONTRACT_NOT_ACTIVE') {
        return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '활성 상태의 계약만 해지할 수 있습니다.' });
      }
      logger.error('[Neture API] Error terminating contract (partner):', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to terminate contract' });
    }
  });

  // ==================== Partner Commission Engine (WO-O4O-PARTNER-COMMISSION-ENGINE-V1) ====================

  /**
   * GET /partner/commissions/kpi
   * 파트너 커미션 KPI (대시보드용)
   * NOTE: /kpi must be registered BEFORE /:id
   */
  router.get('/partner/commissions/kpi', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const result = await commissionService.getPartnerKpi(partnerId);
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching partner commission KPI:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner commission KPI' });
    }
  });

  /**
   * GET /partner/commissions
   * 파트너 커미션 목록 (페이지네이션 + 상태 필터)
   */
  router.get('/partner/commissions', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;
      const result = await commissionService.getPartnerCommissions(partnerId, { page, limit, status });
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching partner commissions:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner commissions' });
    }
  });

  /**
   * GET /partner/commissions/:id
   * 파트너 커미션 상세 (연결 주문 항목 포함)
   */
  router.get('/partner/commissions/:id', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const commissionId = req.params.id;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commissionId)) {
        return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid commission ID format' });
      }

      const result = await commissionService.getPartnerCommissionDetail(commissionId, partnerId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Commission not found' });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching partner commission detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner commission detail' });
    }
  });

  // ==================== Partner Affiliate (WO-O4O-PARTNER-HUB-CORE-V1) ====================

  /**
   * GET /partner/product-pool
   * 커미션 정책이 설정된 제품 목록 (파트너 홍보 가능 제품)
   */
  router.get('/partner/product-pool', requireAuth, requireLinkedPartner as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rows = await partnerService.getProductPool();
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Neture API] Error fetching product pool:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /partner/referral-links
   * Affiliate 링크 생성
   */
  router.post('/partner/referral-links', requireAuth, requireActivePartner as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'product_id required' });
      }

      // V2: Resolve offer → supplier_id + slugs
      const offer = await partnerService.resolveOfferForReferral(product_id);

      if (!offer) {
        return res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND' });
      }

      const buildUrl = (token: string) =>
        `/store/${offer.store_slug}/product/${offer.product_slug}?ref=${token}`;

      // Check if referral already exists for this (partner, product)
      const existing = await partnerService.findExistingReferral(partnerId, product_id);

      if (existing) {
        return res.json({ success: true, data: { referral_url: buildUrl(existing.referral_token), referral_token: existing.referral_token, product_id } });
      }

      // Generate unique 8-char token
      const referralToken = crypto.randomBytes(4).toString('hex');

      // V2: store_id = supplier_id (자동)
      await partnerService.createReferral(partnerId, offer.supplier_id, product_id, referralToken);

      res.status(201).json({ success: true, data: { referral_url: buildUrl(referralToken), referral_token: referralToken, product_id } });
    } catch (error: any) {
      // Handle token collision (retry once)
      if (error?.code === '23505') {
        try {
          const retryToken = crypto.randomBytes(5).toString('hex').slice(0, 8);
          const partnerId = (req as PartnerRequest).partnerId;
          const { product_id } = req.body;

          const [retryOffer] = await dataSource.query(
            `SELECT spo.slug AS product_slug, spo.supplier_id, ns.slug AS store_slug
             FROM supplier_product_offers spo
             JOIN neture_suppliers ns ON ns.id = spo.supplier_id
             WHERE spo.id = $1`,
            [product_id],
          );

          await dataSource.query(
            `INSERT INTO partner_referrals (partner_id, store_id, product_id, referral_token) VALUES ($1, $2, $3, $4)`,
            [partnerId, retryOffer?.supplier_id || null, product_id, retryToken],
          );

          const referralUrl = retryOffer
            ? `/store/${retryOffer.store_slug}/product/${retryOffer.product_slug}?ref=${retryToken}`
            : `/store/product/${product_id}?ref=${retryToken}`;
          return res.status(201).json({ success: true, data: { referral_url: referralUrl, referral_token: retryToken, product_id } });
        } catch (retryErr) {
          logger.error('[Neture API] Referral link creation retry failed:', retryErr);
        }
      }
      logger.error('[Neture API] Error creating referral link:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /partner/referral-links
   * 파트너의 referral 링크 목록
   */
  router.get('/partner/referral-links', requireAuth, requireLinkedPartner as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const data = await partnerService.getReferralLinks(partnerId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching referral links:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== Partner Settlements (WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1) ====================

  /**
   * GET /partner/settlements
   * 파트너 본인 정산 목록
   */
  router.get('/partner/settlements', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

      const { settlements, total } = await partnerService.getPartnerSettlements(partnerId, page, limit);

      res.json({
        success: true,
        data: settlements,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner settlements:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner settlements' });
    }
  });

  /**
   * GET /partner/settlements/:id
   * 파트너 정산 상세
   */
  router.get('/partner/settlements/:id', requireAuth, requireLinkedPartner, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const settlementId = req.params.id;

      const result = await partnerService.getPartnerSettlementDetail(settlementId, partnerId);

      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }

      res.json({
        success: true,
        data: { ...result.settlement, items: result.items },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching partner settlement detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner settlement detail' });
    }
  });

  // ==================== Admin Partner Monitoring (WO-O4O-ADMIN-PARTNER-MONITORING-V1) ====================

  /**
   * GET /admin/partners
   * Admin 파트너 모니터링 — 파트너 목록 + 통계
   */
  router.get('/admin/partners', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const search = (req.query.search as string || '').trim();

      const { partners, total, kpi } = await partnerService.getAdminPartnerList(page, limit, search);

      res.json({
        success: true,
        data: partners,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        kpi,
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin partners:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partners' });
    }
  });

  /**
   * GET /admin/partners/:id
   * Admin 파트너 상세 + 최근 커미션
   */
  router.get('/admin/partners/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const partnerId = req.params.id;
      const result = await partnerService.getAdminPartnerDetail(partnerId);

      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Partner not found' });
      }

      res.json({
        success: true,
        data: { ...result.summary, commissions: result.commissions },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin partner detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner detail' });
    }
  });

  // ==================== Admin Partner Settlements (WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1) ====================

  /**
   * POST /admin/partner-settlements
   * approved 커미션으로 정산 배치 생성
   */
  router.post('/admin/partner-settlements', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { partner_id } = req.body;

      if (!partner_id) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'partner_id is required' });
      }

      const { settlement, itemCount } = await partnerService.createAdminSettlement(partner_id);

      res.status(201).json({
        success: true,
        data: {
          ...settlement,
          item_count: itemCount,
        },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'NO_PAYABLE') {
        return res.status(400).json({ success: false, error: 'NO_PAYABLE', message: 'No approved commissions available for settlement' });
      }
      logger.error('[Neture API] Error creating partner settlement:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create partner settlement' });
    }
  });

  /**
   * POST /admin/partner-settlements/:id/pay
   * 정산 지급 완료 처리
   */
  router.post('/admin/partner-settlements/:id/pay', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settlementId = req.params.id;
      const result = await partnerService.payAdminSettlement(settlementId);
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }
      if (msg === 'ALREADY_PAID') {
        return res.status(400).json({ success: false, error: 'ALREADY_PAID', message: 'Settlement already paid' });
      }
      logger.error('[Neture API] Error paying partner settlement:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to pay partner settlement' });
    }
  });

  /**
   * GET /admin/partner-settlements
   * Admin 파트너 정산 목록
   */
  router.get('/admin/partner-settlements', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;

      const { settlements, total } = await partnerService.getAdminSettlementList(page, limit, status);

      res.json({
        success: true,
        data: settlements,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin partner settlements:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner settlements' });
    }
  });

  /**
   * GET /admin/partner-settlements/:id
   * Admin 파트너 정산 상세
   */
  router.get('/admin/partner-settlements/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settlementId = req.params.id;
      const result = await partnerService.getAdminSettlementDetail(settlementId);

      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Settlement not found' });
      }

      res.json({
        success: true,
        data: { ...result.settlement, items: result.items },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin partner settlement detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner settlement detail' });
    }
  });

  return router;
}
