/**
 * Neture Module Routes — Thin Router
 * WO-O4O-ROUTES-REFACTOR-V1
 *
 * All business logic extracted to controllers + services.
 * This file handles:
 *   - Controller delegation (10 new + 3 existing)
 *   - Public/store endpoints (inline, ~12 small routes)
 */
import { Router, Request, Response } from 'express';
import type { RequestHandler, Router as ExpressRouter } from 'express';
import type { DataSource } from 'typeorm';
import { NetureService } from './neture.service.js';
import { SupplierStatus, PartnershipStatus } from './entities/index.js';
import { NetureSupplierLibrary } from './entities/NetureSupplierLibrary.entity.js';
import logger from '../../utils/logger.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';
import { ActionLogService } from '@o4o/action-log-core';

// Controllers
import { createSupplierManagementController } from './controllers/supplier-management.controller.js';
import { createSupplierProductController } from './controllers/supplier-product.controller.js';
import { createSupplierOrderController } from './controllers/supplier-order.controller.js';
import { createShipmentController } from './controllers/shipment.controller.js';
import { createInventoryController } from './controllers/inventory.controller.js';
import { createSupplierSettlementController } from './controllers/supplier-settlement.controller.js';
import { createAdminController, createProductImageController } from './controllers/admin.controller.js';
import { createAdminSettlementController } from './controllers/admin-settlement.controller.js';
import { createPartnerController } from './controllers/partner.controller.js';
import { createSellerController, createPartnerContractController } from './controllers/seller.controller.js';
import { createContactController } from './controllers/contact.controller.js';
import { createOperatorRegistrationController } from './controllers/operator-registration.controller.js';
import { createOperatorDashboardController } from './controllers/operator-dashboard.controller.js';
import { createOperatorProductCleanupController } from './controllers/operator-product-cleanup.controller.js';
import { createOperatorCategoryController } from './controllers/operator-category.controller.js';
import { createOperatorBrandController } from './controllers/operator-brand.controller.js';
import { createNetureAssetSnapshotController } from './controllers/neture-asset-snapshot.controller.js';
import { createNetureHubTriggerController } from './controllers/hub-trigger.controller.js';
import { createNeureTier1TestController } from './controllers/neture-tier1-test.controller.js';
import { createOperatorServiceApprovalController } from './controllers/operator-service-approval.controller.js';
import { createOperatorCurationController } from './controllers/operator-curation.controller.js';
import { createOperatorActionQueueController } from './controllers/operator-action-queue.controller.js';

// Request type
type AuthenticatedRequest = Request & {
  user?: { id: string; role: string; supplierId?: string; };
};

/**
 * Factory: Create all neture module routes
 */
export default function createNetureModuleRoutes(dataSource: DataSource): ExpressRouter {
  const router: ExpressRouter = Router();
  const netureService = new NetureService();
  const netureActionLogService = new ActionLogService(dataSource);

  // Helper for getSupplierIdFromUser (needed by hub-trigger controller)
  async function getSupplierIdFromUser(req: AuthenticatedRequest): Promise<string | null> {
    if (!req.user?.id) return null;
    return netureService.getSupplierIdByUserId(req.user.id);
  }

  // ==================== Controller Delegations ====================

  // Supplier domain
  router.use('/supplier', createSupplierManagementController(dataSource));
  router.use('/supplier', createSupplierProductController(dataSource));
  router.use('/supplier', createSupplierOrderController(dataSource));
  router.use('/supplier', createShipmentController(dataSource));
  router.use('/supplier', createInventoryController(dataSource));
  router.use('/supplier', createSupplierSettlementController(dataSource));

  // Admin domain
  router.use('/admin', createAdminController(dataSource));
  router.use('/admin', createAdminSettlementController(dataSource));

  // Operator domain — dashboard + registration + category management
  // WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 2)
  router.use('/operator', createOperatorDashboardController(dataSource));
  router.use('/operator', createOperatorRegistrationController(dataSource, netureActionLogService));
  // WO-NETURE-CATEGORY-MANAGEMENT-V1
  router.use('/operator', createOperatorCategoryController());
  // WO-NETURE-BRAND-MANAGEMENT-V1
  router.use('/operator', createOperatorBrandController());
  // WO-NETURE-PRODUCT-DATA-CLEANUP-V1
  router.use('/operator/product-cleanup', createOperatorProductCleanupController(dataSource));
  // WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
  router.use('/operator', createOperatorServiceApprovalController(dataSource));
  router.use('/operator', createOperatorCurationController(dataSource));
  // WO-O4O-OPERATOR-ACTION-QUEUE-V1
  router.use('/operator', createOperatorActionQueueController(dataSource));

  // Partner domain (full paths included in controller: /partner/*, /admin/partners/*, /admin/partner-settlements/*)
  router.use('/', createPartnerController(dataSource));
  router.use('/partner', createPartnerContractController(dataSource));

  // Seller domain
  router.use('/seller', createSellerController(dataSource));

  // Contact (public POST + admin management)
  router.use('/', createContactController(dataSource));

  // Product images (supplier-facing, mounted at root: /products/*)
  router.use('/', createProductImageController(dataSource));

  // Existing controllers
  const hubTriggerController = createNetureHubTriggerController({
    dataSource,
    requireAuth,
    requireNetureScope,
    getSupplierIdFromUser,
    netureService,
    actionLogService: netureActionLogService,
  });
  router.use('/hub/trigger', hubTriggerController);
  router.use('/assets', createNetureAssetSnapshotController(dataSource, requireAuth as RequestHandler));
  router.use(createNeureTier1TestController({
    dataSource,
    requireAuth: requireAuth as RequestHandler,
    requireNetureScope,
    netureService,
  }));

  // ==================== Public Read-Only Endpoints ====================

  /**
   * GET /api/v1/neture/suppliers
   */
  router.get('/suppliers', requireAuth, async (req: Request, res: Response) => {
    try {
      const { category, status } = req.query;
      const filters: { category?: string; status?: SupplierStatus } = {};
      if (category && typeof category === 'string') filters.category = category;
      if (status && typeof status === 'string') filters.status = status as SupplierStatus;
      const suppliers = await netureService.getSuppliers(filters);
      res.json({ suppliers });
    } catch (error) {
      logger.error('[Neture API] Error fetching suppliers:', error);
      res.status(500).json({ error: 'Failed to fetch suppliers', details: (error as Error).message });
    }
  });

  /**
   * GET /api/v1/neture/suppliers/:slug
   */
  router.get('/suppliers/:slug', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { slug } = req.params;
      const viewerId = req.user?.id || null;
      const supplier = await netureService.getSupplierBySlug(slug, viewerId);
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      res.json(supplier);
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier detail:', error);
      res.status(500).json({ error: 'Failed to fetch supplier detail', details: (error as Error).message });
    }
  });

  /**
   * GET /api/v1/neture/partnership/requests
   */
  router.get('/partnership/requests', requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const filters: { status?: PartnershipStatus } = {};
      if (status && typeof status === 'string') filters.status = status as PartnershipStatus;
      const requests = await netureService.getPartnershipRequests(filters);
      res.json({ requests });
    } catch (error) {
      logger.error('[Neture API] Error fetching partnership requests:', error);
      res.status(500).json({ error: 'Failed to fetch partnership requests', details: (error as Error).message });
    }
  });

  /**
   * GET /api/v1/neture/partnership/requests/:id
   */
  router.get('/partnership/requests/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await netureService.getPartnershipRequestById(id);
      if (!request) {
        return res.status(404).json({ error: 'Partnership request not found' });
      }
      res.json(request);
    } catch (error) {
      logger.error('[Neture API] Error fetching partnership request detail:', error);
      res.status(500).json({ error: 'Failed to fetch partnership request detail', details: (error as Error).message });
    }
  });

  // ==================== Public Reference Data ====================

  /**
   * GET /api/v1/neture/categories
   */
  router.get('/categories', requireAuth, async (_req: Request, res: Response) => {
    try {
      const tree = await netureService.getCategoryTree();
      res.json({ success: true, data: tree });
    } catch (error) {
      logger.error('[Neture API] Error fetching public categories:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /api/v1/neture/brands
   */
  router.get('/brands', requireAuth, async (_req: Request, res: Response) => {
    try {
      const brands = await netureService.getAllBrands();
      res.json({ success: true, data: brands });
    } catch (error) {
      logger.error('[Neture API] Error fetching public brands:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /api/v1/neture/masters/barcode/:barcode
   */
  router.get('/masters/barcode/:barcode', requireAuth, async (req: Request, res: Response) => {
    try {
      const { barcode } = req.params;
      const master = await netureService.getProductMasterByBarcode(barcode);
      if (!master) {
        return res.status(404).json({ success: false, error: 'MASTER_NOT_FOUND' });
      }
      res.json({ success: true, data: master });
    } catch (error) {
      logger.error('[Neture API] Error fetching master by barcode (public):', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== Operator ====================

  /**
   * GET /api/v1/neture/operator/supply-products
   * WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-IMPLEMENTATION-V1
   */
  router.get('/operator/supply-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }
      const data = await netureService.getOperatorSupplyProducts(userId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching operator supply products:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch operator supply products' });
    }
  });

  // ==================== Store Product Detail (Public) ====================

  /**
   * GET /api/v1/neture/store/product/:offerId
   */
  router.get('/store/product/:offerId', async (req: Request, res: Response) => {
    try {
      const { offerId } = req.params;
      const orgId = req.query.org as string | undefined;
      const params: any[] = [offerId];
      let orgFilter = '';
      if (orgId) {
        params.push(orgId);
        orgFilter = `AND spp.organization_id = $${params.length}`;
      }
      const [product] = await dataSource.query(`
        SELECT
          spo.id AS offer_id,
          spo.master_id,
          COALESCE(pm.marketing_name, 'Unknown') AS product_name,
          pm.manufacturer_name,
          pm.brand_name,
          pm.specification,
          ns.name AS supplier_name,
          ns.id AS supplier_id,
          spo.price_general,
          spo.consumer_reference_price,
          (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = spo.master_id AND pi.is_primary = true LIMIT 1) AS image_url,
          profile.display_name,
          profile.description,
          profile.pharmacist_comment
        FROM supplier_product_offers spo
        LEFT JOIN product_masters pm ON pm.id = spo.master_id
        LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
        LEFT JOIN LATERAL (
          SELECT spp.display_name, spp.description, spp.pharmacist_comment
          FROM store_product_profiles spp
          WHERE spp.master_id = spo.master_id AND spp.is_active = true ${orgFilter}
          ORDER BY spp.updated_at DESC
          LIMIT 1
        ) profile ON true
        WHERE spo.id = $1 AND spo.is_active = true AND spo.approval_status = 'APPROVED'
      `, params);

      if (!product) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      logger.error('[Neture API] Error fetching store product:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /api/v1/neture/store/:storeSlug/product/:productSlug
   */
  router.get('/store/:storeSlug/product/:productSlug', async (req: Request, res: Response) => {
    try {
      const { storeSlug, productSlug } = req.params;
      const orgId = req.query.org as string | undefined;
      const params: any[] = [productSlug, storeSlug];
      let orgFilter = '';
      if (orgId) {
        params.push(orgId);
        orgFilter = `AND spp.organization_id = $${params.length}`;
      }
      const [product] = await dataSource.query(`
        SELECT
          spo.id AS offer_id,
          spo.slug AS product_slug,
          spo.master_id,
          COALESCE(pm.marketing_name, 'Unknown') AS product_name,
          pm.manufacturer_name,
          pm.brand_name,
          pm.specification,
          ns.name AS supplier_name,
          ns.slug AS store_slug,
          ns.id AS supplier_id,
          spo.price_general,
          spo.consumer_reference_price,
          (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = spo.master_id AND pi.is_primary = true LIMIT 1) AS image_url,
          profile.display_name,
          profile.description,
          profile.pharmacist_comment
        FROM supplier_product_offers spo
        LEFT JOIN product_masters pm ON pm.id = spo.master_id
        JOIN neture_suppliers ns ON ns.id = spo.supplier_id
        LEFT JOIN LATERAL (
          SELECT spp.display_name, spp.description, spp.pharmacist_comment
          FROM store_product_profiles spp
          WHERE spp.master_id = spo.master_id AND spp.is_active = true ${orgFilter}
          ORDER BY spp.updated_at DESC
          LIMIT 1
        ) profile ON true
        WHERE spo.slug = $1 AND ns.slug = $2
          AND spo.is_active = true AND spo.approval_status = 'APPROVED'
      `, params);

      if (!product) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      logger.error('[Neture API] Error fetching store product by slug:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /api/v1/neture/store/product/:offerId/flyer
   * 상품 QR 전단지 PDF 생성 (공개)
   */
  router.get('/store/product/:offerId/flyer', async (req: Request, res: Response) => {
    try {
      const { offerId } = req.params;
      const template = parseInt(req.query.template as string) || 4;
      const orgId = req.query.org as string | undefined;

      if (![1, 4, 8].includes(template)) {
        return res.status(400).json({ success: false, error: 'INVALID_TEMPLATE', message: 'template must be 1, 4, or 8' });
      }

      const params: any[] = [offerId];
      let orgFilter = '';
      if (orgId) {
        params.push(orgId);
        orgFilter = `AND spp.organization_id = $${params.length}`;
      }

      const [product] = await dataSource.query(`
        SELECT
          COALESCE(pm.marketing_name, 'Unknown') AS product_name,
          pm.brand_name,
          ns.name AS supplier_name,
          spo.price_general,
          spo.slug AS product_slug,
          ns.slug AS store_slug,
          (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = spo.master_id AND pi.is_primary = true LIMIT 1) AS image_url,
          profile.pharmacist_comment,
          profile.display_name
        FROM supplier_product_offers spo
        LEFT JOIN product_masters pm ON pm.id = spo.master_id
        LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
        LEFT JOIN LATERAL (
          SELECT spp.pharmacist_comment, spp.display_name
          FROM store_product_profiles spp
          WHERE spp.master_id = spo.master_id AND spp.is_active = true ${orgFilter}
          ORDER BY spp.updated_at DESC
          LIMIT 1
        ) profile ON true
        WHERE spo.id = $1 AND spo.is_active = true AND spo.approval_status = 'APPROVED'
      `, params);

      if (!product) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      }

      const publicDomain = process.env.PUBLIC_DOMAIN || 'neture.o4o.kr';
      let qrUrl: string;
      if (product.store_slug && product.product_slug) {
        qrUrl = `https://${publicDomain}/store/${product.store_slug}/product/${product.product_slug}`;
      } else {
        qrUrl = `https://${publicDomain}/store/product/${offerId}`;
      }
      if (orgId) {
        qrUrl += `?org=${orgId}`;
      }

      const { generateProductFlyer } = await import('../../services/qr-flyer.service.js');

      const pdfBuffer = await generateProductFlyer({
        productName: product.display_name || product.product_name,
        brandName: product.brand_name || undefined,
        price: product.price_general,
        pharmacistComment: product.pharmacist_comment || undefined,
        imageUrl: product.image_url || undefined,
        storeName: product.supplier_name || 'O4O Store',
        qrUrl,
      }, template as 1 | 4 | 8);

      const safeName = (product.display_name || product.product_name || 'product')
        .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
        .trim()
        .slice(0, 30);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="flyer-${safeName}-${template}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('[Neture API] Error generating product flyer:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== Public Library Item ====================

  /**
   * GET /api/v1/neture/library/public/:id
   */
  router.get('/library/public/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const repo = dataSource.getRepository(NetureSupplierLibrary);
      const item = await repo.findOne({ where: { id, status: 'published' as any } });

      if (!item) {
        res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Library item not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: item.id,
          title: item.title,
          description: item.description,
          type: item.type,
          imageUrl: item.imageUrl,
        },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching public library item:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch library item' });
    }
  });

  // ==================== Homepage CMS — Public ====================

  const HOMEPAGE_SECTION_MAP: Record<string, { type: string; metadataSection?: string }> = {
    hero: { type: 'hero' },
    ads: { type: 'promo', metadataSection: 'homepage-ads' },
    logos: { type: 'featured', metadataSection: 'partner-logo' },
  };

  /**
   * GET /api/v1/neture/home/hero — Published hero slides (public)
   * GET /api/v1/neture/home/ads  — Published homepage ads (public)
   * GET /api/v1/neture/home/logos — Published partner logos (public)
   */
  for (const [section, cfg] of Object.entries(HOMEPAGE_SECTION_MAP)) {
    router.get(`/home/${section}`, async (_req: Request, res: Response) => {
      try {
        const params: any[] = [cfg.type];
        let metadataFilter = '';
        if (cfg.metadataSection) {
          metadataFilter = ` AND metadata->>'section' = $2`;
          params.push(cfg.metadataSection);
        }
        const rows = await dataSource.query(
          `SELECT id, title, summary, "imageUrl", "linkUrl", "linkText", "sortOrder", metadata
           FROM cms_contents
           WHERE type = $1 AND "serviceKey" = 'neture' AND status = 'published'
             AND ("expiresAt" IS NULL OR "expiresAt" > NOW())${metadataFilter}
           ORDER BY "sortOrder" ASC, "createdAt" DESC`,
          params,
        );
        res.json({ success: true, data: rows });
      } catch (error) {
        logger.error(`[Neture Homepage] Error fetching ${section}:`, error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    });
  }

  // ==================== Homepage CMS — Admin CRUD ====================

  /**
   * GET /api/v1/neture/admin/homepage-contents?section=hero|ads|logos
   */
  router.get('/admin/homepage-contents', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const { section } = req.query;
      const cfg = HOMEPAGE_SECTION_MAP[section as string];
      if (!cfg) {
        res.status(400).json({ success: false, error: 'INVALID_SECTION', message: 'section must be hero, ads, or logos' });
        return;
      }
      const params: any[] = [cfg.type];
      let metadataFilter = '';
      if (cfg.metadataSection) {
        metadataFilter = ` AND metadata->>'section' = $2`;
        params.push(cfg.metadataSection);
      }
      const rows = await dataSource.query(
        `SELECT id, type, title, summary, "imageUrl", "linkUrl", "linkText", "sortOrder", status, metadata, "createdAt", "updatedAt"
         FROM cms_contents
         WHERE type = $1 AND "serviceKey" = 'neture'${metadataFilter}
         ORDER BY "sortOrder" ASC, "createdAt" DESC`,
        params,
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Neture Homepage Admin] Error listing:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /api/v1/neture/admin/homepage-contents — Create content
   */
  router.post('/admin/homepage-contents', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const { section, title, summary, imageUrl, linkUrl, linkText, sortOrder, metadata: extraMeta } = req.body;
      const cfg = HOMEPAGE_SECTION_MAP[section as string];
      if (!cfg) {
        res.status(400).json({ success: false, error: 'INVALID_SECTION' });
        return;
      }
      if (!title) {
        res.status(400).json({ success: false, error: 'TITLE_REQUIRED' });
        return;
      }
      const contentMetadata = { ...(extraMeta || {}), ...(cfg.metadataSection ? { section: cfg.metadataSection } : {}) };
      const authReq = req as AuthenticatedRequest;
      const rows = await dataSource.query(
        `INSERT INTO cms_contents (type, title, summary, "imageUrl", "linkUrl", "linkText", "sortOrder", status, "serviceKey", "authorRole", "visibilityScope", metadata, "createdBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', 'neture', 'service_admin', 'service', $8, $9)
         RETURNING *`,
        [cfg.type, title, summary || null, imageUrl || null, linkUrl || null, linkText || null, sortOrder || 0, JSON.stringify(contentMetadata), authReq.user?.id || null],
      );
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      logger.error('[Neture Homepage Admin] Error creating:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PUT /api/v1/neture/admin/homepage-contents/:id — Update content
   */
  router.put('/admin/homepage-contents/:id', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, summary, imageUrl, linkUrl, linkText, sortOrder, metadata: extraMeta } = req.body;
      const rows = await dataSource.query(
        `UPDATE cms_contents SET
           title = COALESCE($2, title),
           summary = $3,
           "imageUrl" = $4,
           "linkUrl" = $5,
           "linkText" = $6,
           "sortOrder" = COALESCE($7, "sortOrder"),
           metadata = COALESCE($8, metadata),
           "updatedAt" = NOW()
         WHERE id = $1 AND "serviceKey" = 'neture'
         RETURNING *`,
        [id, title, summary || null, imageUrl || null, linkUrl || null, linkText || null, sortOrder, extraMeta ? JSON.stringify(extraMeta) : null],
      );
      if (!rows.length) {
        res.status(404).json({ success: false, error: 'NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      logger.error('[Neture Homepage Admin] Error updating:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * DELETE /api/v1/neture/admin/homepage-contents/:id
   */
  router.delete('/admin/homepage-contents/:id', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await dataSource.query(
        `DELETE FROM cms_contents WHERE id = $1 AND "serviceKey" = 'neture' RETURNING id`,
        [id],
      );
      if (!result.length) {
        res.status(404).json({ success: false, error: 'NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      logger.error('[Neture Homepage Admin] Error deleting:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PATCH /api/v1/neture/admin/homepage-contents/:id/status — Publish/Archive
   */
  router.patch('/admin/homepage-contents/:id/status', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['draft', 'published', 'archived'].includes(status)) {
        res.status(400).json({ success: false, error: 'INVALID_STATUS' });
        return;
      }
      const publishClause = status === 'published' ? ', "publishedAt" = NOW()' : '';
      const rows = await dataSource.query(
        `UPDATE cms_contents SET status = $2${publishClause}, "updatedAt" = NOW()
         WHERE id = $1 AND "serviceKey" = 'neture'
         RETURNING *`,
        [id, status],
      );
      if (!rows.length) {
        res.status(404).json({ success: false, error: 'NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      logger.error('[Neture Homepage Admin] Error updating status:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
