/**
 * Store Controller - Public StoreFront API
 *
 * WO-O4O-STOREFRONT-ACTIVATION-V1
 *
 * Public (인증 불필요):
 * - GET /stores/:slug           — 매장 정보
 * - GET /stores/:slug/categories — 상품 카테고리
 * - GET /stores/:slug/products   — 상품 목록 (pagination)
 * - GET /stores/:slug/products/featured — 추천 상품
 * - GET /stores/:slug/products/:id — 상품 상세
 * - GET /stores/:slug/storefront-config — 스토어 설정 조회
 * - GET /stores/:slug/hero       — Hero 콘텐츠 조회
 *
 * Authenticated (인증 필요):
 * - PUT /stores/:slug/storefront-config — 스토어 설정 저장
 * - PUT /stores/:slug/hero       — Hero 콘텐츠 저장
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmService } from '../services/glycopharm.service.js';
import { FeaturedProductsService } from '../services/featured-products.service.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import type { TemplateProfile } from '../entities/glycopharm-pharmacy.entity.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../types/auth.js';
import type { ListProductsQueryDto } from '../dto/index.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';

// ============================================================================
// WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1
// 소비자 Storefront 상품 노출 이중 게이트
//
// 노출 필수 조건:
// 1. organization_channels.status = 'APPROVED' AND channel_type = 'B2C'
// 2. organization_product_listings.is_active = true AND service_key = 'kpa'
// 3. organization_product_channels.is_active = true
// 4. glycopharm_products.status = 'active'
//
// 허브 visibleProductCount 계산과 동일 게이트.
// ============================================================================

/**
 * Visibility-gated 상품 목록 조회 (소비자 Storefront용)
 *
 * INNER JOIN으로 4중 게이트 적용:
 * product → listing → product_channel → channel(B2C, APPROVED)
 */
async function queryVisibleProducts(
  dataSource: DataSource,
  pharmacyId: string,
  options: {
    category?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
    isFeatured?: boolean;
    productId?: string;
  } = {},
): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [pharmacyId];
  let paramIdx = 2;

  if (options.category) {
    conditions.push(`p.category = $${paramIdx}`);
    params.push(options.category);
    paramIdx++;
  }

  if (options.q && options.q.length >= 2) {
    conditions.push(`(p.name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`);
    params.push(`%${options.q}%`);
    paramIdx++;
  }

  if (options.isFeatured !== undefined) {
    conditions.push(`p.is_featured = $${paramIdx}`);
    params.push(options.isFeatured);
    paramIdx++;
  }

  if (options.productId) {
    conditions.push(`p.id = $${paramIdx}`);
    params.push(options.productId);
    paramIdx++;
  }

  const whereExtra = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

  // Sort mapping
  const sortMap: Record<string, string> = {
    created_at: 'p.created_at',
    name: 'p.name',
    price: 'p.price',
    sort_order: 'p.sort_order',
  };
  const sortField = sortMap[options.sort || 'created_at'] || 'p.created_at';
  const sortOrder = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Count query
  const countResult: Array<{ count: string }> = await dataSource.query(
    `SELECT COUNT(DISTINCT p.id)::int AS count
     FROM glycopharm_products p
     INNER JOIN organization_product_listings opl
       ON opl.external_product_id = p.id::text
       AND opl.organization_id = $1
       AND opl.service_key = 'kpa'
       AND opl.is_active = true
     INNER JOIN organization_product_channels opc
       ON opc.product_listing_id = opl.id
       AND opc.is_active = true
     INNER JOIN organization_channels oc
       ON oc.id = opc.channel_id
       AND oc.channel_type = 'B2C'
       AND oc.status = 'APPROVED'
     WHERE p.pharmacy_id = $1
       AND p.status = 'active'
       ${whereExtra}`,
    params
  );
  const total = Number(countResult[0]?.count || 0);

  // Data query
  const data = await dataSource.query(
    `SELECT DISTINCT ON (p.id)
       p.id, p.name, p.sku, p.category, p.price, p.sale_price,
       p.stock_quantity, p.images, p.status, p.is_featured,
       p.manufacturer, p.description, p.short_description,
       p.sort_order, p.created_at, p.updated_at,
       p.pharmacy_id,
       opc.sales_limit,
       opc.channel_price
     FROM glycopharm_products p
     INNER JOIN organization_product_listings opl
       ON opl.external_product_id = p.id::text
       AND opl.organization_id = $1
       AND opl.service_key = 'kpa'
       AND opl.is_active = true
     INNER JOIN organization_product_channels opc
       ON opc.product_listing_id = opl.id
       AND opc.is_active = true
     INNER JOIN organization_channels oc
       ON oc.id = opc.channel_id
       AND oc.channel_type = 'B2C'
       AND oc.status = 'APPROVED'
     WHERE p.pharmacy_id = $1
       AND p.status = 'active'
       ${whereExtra}
     ORDER BY p.id, ${sortField} ${sortOrder}
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// WO-STORE-SLUG-REDIRECT-LAYER-V1
// Old slug → 301 redirect to new slug (SEO/brand asset protection)
async function checkSlugRedirect(
  dataSource: DataSource,
  slug: string,
  req: Request,
  res: Response,
): Promise<boolean> {
  try {
    const slugService = new StoreSlugService(dataSource);
    const redirect = await slugService.findOldSlugRedirect(slug);
    if (redirect) {
      const newPath = req.originalUrl.replace(
        `/${encodeURIComponent(slug)}`,
        `/${encodeURIComponent(redirect.newSlug)}`,
      );
      res.redirect(301, newPath);
      return true;
    }
  } catch {
    // redirect check failure → fallback to original 404
  }
  return false;
}

export function createStoreController(dataSource: DataSource): Router {
  const router = Router();
  const service = new GlycopharmService(dataSource);
  const featuredService = new FeaturedProductsService(dataSource);
  const productRepo = dataSource.getRepository(GlycopharmProduct);
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);

  // ============================================================================
  // GET /stores/:slug — 매장 정보 (public)
  // ============================================================================
  router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await service.getActivePharmacyBySlug(slug);

      if (!pharmacy) {
        if (await checkSlugRedirect(dataSource, slug, req, res)) return;
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      res.json({ success: true, data: pharmacy });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch store' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/categories — 상품 카테고리 (public)
  // ============================================================================
  router.get('/:slug/categories', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        if (await checkSlugRedirect(dataSource, slug, req, res)) return;
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      // WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1: 이중 게이트 적용 카테고리 조회
      const categories: Array<{ category: string; productCount: number }> = await dataSource.query(
        `SELECT p.category, COUNT(DISTINCT p.id)::int AS "productCount"
         FROM glycopharm_products p
         INNER JOIN organization_product_listings opl
           ON opl.external_product_id = p.id::text
           AND opl.organization_id = $1
           AND opl.service_key = 'kpa'
           AND opl.is_active = true
         INNER JOIN organization_product_channels opc
           ON opc.product_listing_id = opl.id
           AND opc.is_active = true
         INNER JOIN organization_channels oc
           ON oc.id = opc.channel_id
           AND oc.channel_type = 'B2C'
           AND oc.status = 'APPROVED'
         WHERE p.pharmacy_id = $1
           AND p.status = 'active'
         GROUP BY p.category
         ORDER BY "productCount" DESC`,
        [pharmacy.id]
      );

      const data = categories.map((c: any, idx: number) => ({
        id: c.category,
        name: c.category,
        slug: c.category,
        productCount: c.productCount,
        order: idx,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/categories error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/products/featured — 추천 상품 (public)
  // NOTE: This route MUST come before /:slug/products/:id
  // ============================================================================
  router.get('/:slug/products/featured', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 8;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        if (await checkSlugRedirect(dataSource, slug, req, res)) return;
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      // WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1: 이중 게이트 적용 추천 상품
      const result = await queryVisibleProducts(dataSource, pharmacy.id, {
        isFeatured: true,
        sort: 'sort_order',
        order: 'ASC',
        limit,
        page: 1,
      });

      const data = result.data.map((p: any) => ({
        id: p.id,
        productId: p.id,
        name: p.name,
        price: Number(p.price),
        salePrice: p.sale_price ? Number(p.sale_price) : undefined,
        thumbnailUrl: p.images?.[0]?.url,
        isFeatured: true,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/products/featured error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch featured products' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/products — 상품 목록 (public, pagination)
  // ============================================================================
  router.get('/:slug/products', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        if (await checkSlugRedirect(dataSource, slug, req, res)) return;
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      // WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1: 이중 게이트 적용 상품 목록
      const result = await queryVisibleProducts(dataSource, pharmacy.id, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as string | undefined,
        sort: (req.query.sort as string) || 'created_at',
        order: (req.query.order as string) || 'desc',
        q: req.query.q as string,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/products error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/products/:id — 상품 상세 (public)
  // ============================================================================
  router.get('/:slug/products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug, id } = req.params;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        if (await checkSlugRedirect(dataSource, slug, req, res)) return;
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      // WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1: 이중 게이트 적용 상품 상세
      const result = await queryVisibleProducts(dataSource, pharmacy.id, {
        productId: id,
        limit: 1,
        page: 1,
      });

      if (result.data.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found in this store' },
        });
        return;
      }

      res.json({ success: true, data: result.data[0] });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/products/:id error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch product' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/storefront-config — 스토어 설정 조회 (public)
  // ============================================================================
  router.get('/:slug/storefront-config', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });

      if (!pharmacy) {
        if (await checkSlugRedirect(dataSource, slug, req, res)) return;
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      res.json({ success: true, data: pharmacy.storefront_config || {} });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/storefront-config error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch storefront config' },
      });
    }
  });

  // ============================================================================
  // PUT /stores/:slug/storefront-config — 스토어 설정 저장 (authenticated)
  // ============================================================================
  router.put('/:slug/storefront-config', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      if (!userId || pharmacy.created_by_user_id !== userId) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not the owner of this store' },
        });
        return;
      }

      const { theme, template } = req.body;

      // Runtime validation (WO-STOREFRONT-STABILIZATION Phase 1)
      const VALID_THEMES = ['neutral', 'clean', 'modern', 'professional'];
      const VALID_TEMPLATES = ['franchise-standard'];

      if (theme !== undefined && !VALID_THEMES.includes(theme)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_THEME', message: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` },
        });
        return;
      }

      if (template !== undefined && !VALID_TEMPLATES.includes(template)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TEMPLATE', message: `Invalid template. Must be one of: ${VALID_TEMPLATES.join(', ')}` },
        });
        return;
      }

      const currentConfig = pharmacy.storefront_config || {};
      const updatedConfig = {
        ...currentConfig,
        ...(theme !== undefined && { theme }),
        ...(template !== undefined && { template }),
      };

      await pharmacyRepo.update(pharmacy.id, { storefront_config: updatedConfig });

      res.json({ success: true, data: updatedConfig });
    } catch (error: any) {
      console.error('[StoreController] PUT /:slug/storefront-config error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update storefront config' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/hero — Hero 콘텐츠 조회 (public)
  // ============================================================================
  router.get('/:slug/hero', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });

      if (!pharmacy) {
        if (await checkSlugRedirect(dataSource, slug, req, res)) return;
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      const heroContents = pharmacy.storefront_config?.heroContents || [];
      res.json({ success: true, data: heroContents });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/hero error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch hero contents' },
      });
    }
  });

  // ============================================================================
  // PUT /stores/:slug/hero — Hero 콘텐츠 저장 (authenticated)
  // ============================================================================
  router.put('/:slug/hero', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      if (!userId || pharmacy.created_by_user_id !== userId) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not the owner of this store' },
        });
        return;
      }

      const { heroContents } = req.body;
      if (!Array.isArray(heroContents)) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'heroContents must be an array' },
        });
        return;
      }

      // Per-item validation (WO-STOREFRONT-STABILIZATION Phase 1)
      const VALID_HERO_SOURCES = ['operator', 'pharmacy', 'default'];
      for (const item of heroContents) {
        if (!item.id || typeof item.id !== 'string') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_HERO_CONTENT', message: 'Each hero content must have a string id' },
          });
          return;
        }
        if (!item.title || typeof item.title !== 'string') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_HERO_CONTENT', message: 'Each hero content must have a string title' },
          });
          return;
        }
        if (item.source && !VALID_HERO_SOURCES.includes(item.source)) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_HERO_SOURCE', message: `Hero source must be one of: ${VALID_HERO_SOURCES.join(', ')}` },
          });
          return;
        }
      }

      const currentConfig = pharmacy.storefront_config || {};
      const updatedConfig = { ...currentConfig, heroContents };

      await pharmacyRepo.update(pharmacy.id, { storefront_config: updatedConfig });

      res.json({ success: true, data: heroContents });
    } catch (error: any) {
      console.error('[StoreController] PUT /:slug/hero error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update hero contents' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/template — Template Profile 조회 (public)
  // WO-STORE-TEMPLATE-PROFILE-V1
  // ============================================================================
  router.get('/:slug/template', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug, status: 'active' as any } });

      if (!pharmacy) {
        if (await checkSlugRedirect(dataSource, slug, req, res)) return;
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      res.json({
        success: true,
        data: {
          templateProfile: pharmacy.template_profile || 'BASIC',
          theme: pharmacy.storefront_config?.theme || null,
        },
      });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/template error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch template profile' },
      });
    }
  });

  // ============================================================================
  // PUT /stores/:slug/template — Template Profile 변경 (authenticated, owner only)
  // WO-STORE-TEMPLATE-PROFILE-V1
  // ============================================================================
  const VALID_PROFILES: TemplateProfile[] = ['BASIC', 'COMMERCE_FOCUS', 'CONTENT_FOCUS', 'MINIMAL'];

  router.put('/:slug/template', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { templateProfile } = req.body;

      if (!templateProfile || !VALID_PROFILES.includes(templateProfile)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `templateProfile must be one of: ${VALID_PROFILES.join(', ')}` },
        });
        return;
      }

      const pharmacy = await pharmacyRepo.findOne({ where: { slug, status: 'active' as any } });
      if (!pharmacy) {
        res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
        return;
      }

      if (!userId || pharmacy.created_by_user_id !== userId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not the store owner' } });
        return;
      }

      await pharmacyRepo.update(pharmacy.id, { template_profile: templateProfile });

      res.json({ success: true, data: { templateProfile } });
    } catch (error: any) {
      console.error('[StoreController] PUT /:slug/template error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update template profile' },
      });
    }
  });

  return router;
}
