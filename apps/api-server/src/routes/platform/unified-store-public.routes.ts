/**
 * Unified Public Store Routes — Service-agnostic public storefront API
 *
 * WO-STORE-SLUG-UNIFICATION-V1
 *
 * All endpoints resolve slug → storeId + serviceKey internally via StoreSlugService.
 * Consumers never need to know the service_key — just the slug.
 *
 * Mount: /api/v1/stores (before store-policy.routes.ts)
 *
 * Public (no auth):
 *   GET  /:slug                      — Store info
 *   GET  /:slug/products/featured    — Featured products (B2C visibility gate)
 *   GET  /:slug/products             — Product list (B2C visibility gate, paginated)
 *   GET  /:slug/products/:id         — Product detail (B2C visibility gate)
 *   GET  /:slug/categories           — Product categories (B2C visibility gate)
 *   GET  /:slug/layout               — Block layout + channels
 *   GET  /:slug/blog                 — Published blog posts
 *   GET  /:slug/blog/:postSlug       — Blog post detail
 *   GET  /:slug/template             — Template profile
 *   GET  /:slug/storefront-config    — Storefront config
 *   GET  /:slug/hero                 — Hero contents
 *   GET  /:slug/tablet/products      — Tablet channel products
 *   POST /:slug/tablet/requests      — Tablet request submission (rate-limited)
 *   GET  /:slug/tablet/requests/:id  — Tablet request status
 */

import { Router, Request, Response } from 'express';
import { DataSource, LessThanOrEqual } from 'typeorm';
import rateLimit from 'express-rate-limit';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { GlycopharmPharmacy } from '../glycopharm/entities/glycopharm-pharmacy.entity.js';
import { StoreBlogPost } from '../glycopharm/entities/store-blog-post.entity.js';
import type { StoreBlogPostStatus } from '../glycopharm/entities/store-blog-post.entity.js';
import { GlycopharmProduct } from '../glycopharm/entities/glycopharm-product.entity.js';
import { TabletServiceRequest } from '../glycopharm/entities/tablet-service-request.entity.js';
import type { TabletServiceRequestStatus, TabletRequestItem } from '../glycopharm/entities/tablet-service-request.entity.js';
import type { StoreBlock, TemplateProfile } from '../glycopharm/entities/glycopharm-pharmacy.entity.js';

// ============================================================================
// Slug Resolution Helper
// ============================================================================

interface ResolvedStore {
  storeId: string;
  serviceKey: string;
  pharmacy: GlycopharmPharmacy;
}

async function resolvePublicStore(
  dataSource: DataSource,
  slug: string,
  req: Request,
  res: Response,
): Promise<ResolvedStore | null> {
  const slugService = new StoreSlugService(dataSource);
  const record = await slugService.findBySlug(slug);

  if (!record || !record.isActive) {
    const redirect = await slugService.findOldSlugRedirect(slug);
    if (redirect) {
      const newPath = req.originalUrl.replace(
        `/${encodeURIComponent(slug)}`,
        `/${encodeURIComponent(redirect.newSlug)}`,
      );
      res.redirect(301, newPath);
      return null;
    }
    res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
    });
    return null;
  }

  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
  const pharmacy = await pharmacyRepo.findOne({
    where: { id: record.storeId, status: 'active' as any },
  });

  if (!pharmacy) {
    res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
    });
    return null;
  }

  return { storeId: record.storeId, serviceKey: record.serviceKey, pharmacy };
}

// ============================================================================
// B2C Visibility-Gated Product Query (serviceKeys parameterized)
// WO-STORE-MULTI-SERVICE-GRID-V1: serviceKey → serviceKeys[]
// ============================================================================

async function queryVisibleProducts(
  dataSource: DataSource,
  pharmacyId: string,
  serviceKeys: string[],
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
  const params: any[] = [pharmacyId, serviceKeys];
  let paramIdx = 3;

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

  const sortMap: Record<string, string> = {
    created_at: 'p.created_at',
    name: 'p.name',
    price: 'p.price',
    sort_order: 'p.sort_order',
  };
  const sortField = sortMap[options.sort || 'created_at'] || 'p.created_at';
  const sortOrder = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countResult: Array<{ count: string }> = await dataSource.query(
    `SELECT COUNT(DISTINCT p.id)::int AS count
     FROM glycopharm_products p
     INNER JOIN organization_product_listings opl
       ON opl.external_product_id = p.id::text
       AND opl.organization_id = $1
       AND opl.service_key = ANY($2::text[])
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
    params,
  );
  const total = Number(countResult[0]?.count || 0);

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
       AND opl.service_key = ANY($2::text[])
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
    params,
  );

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ============================================================================
// TABLET Visibility-Gated Product Query (serviceKey parameterized)
// ============================================================================

async function queryTabletVisibleProducts(
  dataSource: DataSource,
  pharmacyId: string,
  serviceKey: string,
  options: {
    category?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [pharmacyId, serviceKey];
  let paramIdx = 3;

  if (options.category) {
    conditions.push(`p.category = $${paramIdx}`);
    params.push(options.category);
    paramIdx++;
  }
  if (options.q && options.q.length >= 2) {
    conditions.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`);
    params.push(`%${options.q}%`);
    paramIdx++;
  }

  const whereExtra = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

  const sortMap: Record<string, string> = {
    created_at: 'p.created_at',
    name: 'p.name',
    price: 'p.price',
    sort_order: 'p.sort_order',
  };
  const sortField = sortMap[options.sort || 'sort_order'] || 'p.sort_order';
  const sortOrder = options.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const countResult: Array<{ count: string }> = await dataSource.query(
    `SELECT COUNT(DISTINCT p.id)::int AS count
     FROM glycopharm_products p
     INNER JOIN organization_product_listings opl
       ON opl.external_product_id = p.id::text
       AND opl.organization_id = $1
       AND opl.service_key = $2
       AND opl.is_active = true
     INNER JOIN organization_product_channels opc
       ON opc.product_listing_id = opl.id
       AND opc.is_active = true
     INNER JOIN organization_channels oc
       ON oc.id = opc.channel_id
       AND oc.channel_type = 'TABLET'
       AND oc.status = 'APPROVED'
     WHERE p.pharmacy_id = $1
       AND p.status = 'active'
       ${whereExtra}`,
    params,
  );
  const total = Number(countResult[0]?.count || 0);

  const data = await dataSource.query(
    `SELECT DISTINCT ON (p.id)
       p.id, p.name, p.sku, p.category, p.price, p.sale_price,
       p.stock_quantity, p.images, p.status, p.is_featured,
       p.manufacturer, p.description, p.short_description,
       p.sort_order, p.created_at, p.updated_at,
       p.pharmacy_id,
       opc.channel_price
     FROM glycopharm_products p
     INNER JOIN organization_product_listings opl
       ON opl.external_product_id = p.id::text
       AND opl.organization_id = $1
       AND opl.service_key = $2
       AND opl.is_active = true
     INNER JOIN organization_product_channels opc
       ON opc.product_listing_id = opl.id
       AND opc.is_active = true
     INNER JOIN organization_channels oc
       ON oc.id = opc.channel_id
       AND oc.channel_type = 'TABLET'
       AND oc.status = 'APPROVED'
     WHERE p.pharmacy_id = $1
       AND p.status = 'active'
       ${whereExtra}
     ORDER BY p.id, ${sortField} ${sortOrder}
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ============================================================================
// Layout: Template Profile → Default Blocks
// ============================================================================

function generateDefaultBlocks(profile: TemplateProfile): StoreBlock[] {
  switch (profile) {
    case 'COMMERCE_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
      ];
    case 'CONTENT_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'INFO_SECTION', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'MINIMAL':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'BASIC':
    default:
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'TABLET_PROMO', enabled: true },
      ];
  }
}

async function deriveChannels(
  dataSource: DataSource,
  organizationId: string,
): Promise<{ B2C: boolean; TABLET: boolean; SIGNAGE: boolean }> {
  const rows: Array<{ channel_type: string }> = await dataSource.query(
    `SELECT channel_type FROM organization_channels WHERE organization_id = $1 AND status = 'APPROVED'`,
    [organizationId],
  );
  const approved = new Set(rows.map((r) => r.channel_type));
  return {
    B2C: approved.has('B2C'),
    TABLET: approved.has('TABLET'),
    SIGNAGE: approved.has('SIGNAGE'),
  };
}

// ============================================================================
// Rate limiter for tablet requests
// ============================================================================

const tabletRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  },
});

// ============================================================================
// Route Factory
// ============================================================================

export function createUnifiedStorePublicRoutes(dataSource: DataSource): Router {
  const router = Router();
  const productRepo = dataSource.getRepository(GlycopharmProduct);
  const blogRepo = dataSource.getRepository(StoreBlogPost);
  const requestRepo = dataSource.getRepository(TabletServiceRequest);

  // GET /:slug — Store info
  router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const { pharmacy } = resolved;
      const productCount = await productRepo.count({
        where: { pharmacy_id: pharmacy.id, status: 'active' },
      });

      res.json({
        success: true,
        data: {
          id: pharmacy.id,
          name: pharmacy.name,
          slug: pharmacy.slug,
          description: pharmacy.description,
          address: pharmacy.address,
          phone: pharmacy.phone,
          logo: pharmacy.logo,
          hero_image: pharmacy.hero_image,
          status: pharmacy.status,
          productCount,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch store' },
      });
    }
  });

  // GET /:slug/products/featured — Featured products (MUST be before /:slug/products/:id)
  router.get('/:slug/products/featured', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const limit = req.query.limit ? Number(req.query.limit) : 8;

      // WO-STORE-MULTI-SERVICE-GRID-V1: optional ?services= for multi-service grid
      const ALLOWED_SERVICE_KEYS = ['glycopharm', 'kpa', 'cosmetics'];
      let serviceKeys: string[];
      if (req.query.services && typeof req.query.services === 'string') {
        const requested = req.query.services.split(',')
          .map((s) => s.trim().toLowerCase())
          .filter((s) => ALLOWED_SERVICE_KEYS.includes(s));
        serviceKeys = requested.length > 0 ? requested : [resolved.serviceKey];
      } else {
        serviceKeys = [resolved.serviceKey];
      }

      const result = await queryVisibleProducts(dataSource, resolved.storeId, serviceKeys, {
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
      console.error('[UnifiedStore] GET /:slug/products/featured error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch featured products' },
      });
    }
  });

  // GET /:slug/products — Product list (paginated)
  router.get('/:slug/products', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const result = await queryVisibleProducts(dataSource, resolved.storeId, [resolved.serviceKey], {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as string | undefined,
        sort: (req.query.sort as string) || 'created_at',
        order: (req.query.order as string) || 'desc',
        q: req.query.q as string,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/products error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' },
      });
    }
  });

  // GET /:slug/products/:id — Product detail
  router.get('/:slug/products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const result = await queryVisibleProducts(dataSource, resolved.storeId, [resolved.serviceKey], {
        productId: req.params.id,
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
      console.error('[UnifiedStore] GET /:slug/products/:id error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch product' },
      });
    }
  });

  // GET /:slug/categories — Categories
  router.get('/:slug/categories', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const categories: Array<{ category: string; productCount: number }> = await dataSource.query(
        `SELECT p.category, COUNT(DISTINCT p.id)::int AS "productCount"
         FROM glycopharm_products p
         INNER JOIN organization_product_listings opl
           ON opl.external_product_id = p.id::text
           AND opl.organization_id = $1
           AND opl.service_key = $2
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
        [resolved.storeId, resolved.serviceKey],
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
      console.error('[UnifiedStore] GET /:slug/categories error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories' },
      });
    }
  });

  // GET /:slug/layout — Block layout + channels
  router.get('/:slug/layout', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const { pharmacy } = resolved;
      const hasCustomBlocks = pharmacy.storefront_blocks && pharmacy.storefront_blocks.length > 0;
      const blocks = hasCustomBlocks
        ? pharmacy.storefront_blocks!
        : generateDefaultBlocks(pharmacy.template_profile);
      const channels = await deriveChannels(dataSource, pharmacy.id);

      res.json({
        success: true,
        data: {
          storeId: pharmacy.id,
          templateProfile: pharmacy.template_profile || 'BASIC',
          blocks,
          isDefault: !hasCustomBlocks,
          channels,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/layout error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch layout' },
      });
    }
  });

  // GET /:slug/blog — Published blog posts
  router.get('/:slug/blog', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

      const [posts, total] = await blogRepo.findAndCount({
        where: {
          storeId: resolved.storeId,
          serviceKey: resolved.serviceKey,
          status: 'published' as StoreBlogPostStatus,
          publishedAt: LessThanOrEqual(new Date()),
        },
        order: { publishedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
        select: ['id', 'title', 'slug', 'excerpt', 'status', 'publishedAt', 'createdAt'],
      });

      res.json({
        success: true,
        data: posts,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/blog error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch blog posts' },
      });
    }
  });

  // GET /:slug/blog/:postSlug — Blog post detail
  router.get('/:slug/blog/:postSlug', async (req: Request, res: Response): Promise<void> => {
    try {
      const { postSlug } = req.params;
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const post = await blogRepo.findOne({
        where: {
          storeId: resolved.storeId,
          serviceKey: resolved.serviceKey,
          slug: postSlug,
          status: 'published' as StoreBlogPostStatus,
          publishedAt: LessThanOrEqual(new Date()),
        },
      });

      if (!post) {
        res.status(404).json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Blog post not found' },
        });
        return;
      }

      res.json({ success: true, data: post });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/blog/:postSlug error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch blog post' },
      });
    }
  });

  // GET /:slug/template — Template profile
  router.get('/:slug/template', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      res.json({
        success: true,
        data: {
          templateProfile: resolved.pharmacy.template_profile || 'BASIC',
          theme: resolved.pharmacy.storefront_config?.theme || null,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/template error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch template profile' },
      });
    }
  });

  // GET /:slug/storefront-config — Storefront config
  router.get('/:slug/storefront-config', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      res.json({ success: true, data: resolved.pharmacy.storefront_config || {} });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/storefront-config error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch storefront config' },
      });
    }
  });

  // GET /:slug/hero — Hero contents
  router.get('/:slug/hero', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const heroContents = resolved.pharmacy.storefront_config?.heroContents || [];
      res.json({ success: true, data: heroContents });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/hero error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch hero contents' },
      });
    }
  });

  // GET /:slug/tablet/products — TABLET channel products
  router.get('/:slug/tablet/products', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const result = await queryTabletVisibleProducts(dataSource, resolved.storeId, resolved.serviceKey, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as string | undefined,
        sort: (req.query.sort as string) || 'sort_order',
        order: (req.query.order as string) || 'asc',
        q: req.query.q as string,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/products error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tablet products' },
      });
    }
  });

  // POST /:slug/tablet/requests — Tablet request submission (rate-limited)
  router.post('/:slug/tablet/requests', tabletRequestLimiter as any, async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const { items, note, customerName } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ITEMS', message: '상품을 1개 이상 선택해주세요.' },
        });
        return;
      }
      if (items.length > 20) {
        res.status(400).json({
          success: false,
          error: { code: 'TOO_MANY_ITEMS', message: '한 번에 최대 20개 상품까지 요청 가능합니다.' },
        });
        return;
      }

      const enrichedItems: TabletRequestItem[] = [];
      for (const item of items) {
        if (!item.productId || typeof item.productId !== 'string') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_ITEM', message: '각 항목에 productId가 필요합니다.' },
          });
          return;
        }
        const qty = Number(item.quantity);
        if (!qty || qty < 1 || qty > 99) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_QUANTITY', message: '수량은 1~99 사이여야 합니다.' },
          });
          return;
        }

        const product = await productRepo.findOne({
          where: { id: item.productId, pharmacy_id: resolved.pharmacy.id, status: 'active' },
        });
        if (!product) {
          res.status(400).json({
            success: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: `상품을 찾을 수 없습니다: ${item.productId}` },
          });
          return;
        }

        enrichedItems.push({
          productId: product.id,
          quantity: qty,
          productName: product.name,
          price: Number(product.sale_price || product.price || 0),
        });
      }

      const request = requestRepo.create({
        pharmacyId: resolved.pharmacy.id,
        items: enrichedItems,
        note: note?.trim() || undefined,
        customerName: customerName?.trim() || undefined,
        status: 'requested' as TabletServiceRequestStatus,
      });

      const saved = await requestRepo.save(request);

      res.status(201).json({
        success: true,
        data: {
          requestId: saved.id,
          status: saved.status,
          createdAt: saved.createdAt,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] POST /:slug/tablet/requests error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '요청 생성에 실패했습니다.' },
      });
    }
  });

  // GET /:slug/tablet/requests/:id — Tablet request status
  router.get('/:slug/tablet/requests/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const request = await requestRepo.findOne({ where: { id } });
      if (!request) {
        res.status(404).json({
          success: false,
          error: { code: 'REQUEST_NOT_FOUND', message: '요청을 찾을 수 없습니다.' },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: request.id,
          status: request.status,
          items: request.items,
          note: request.note,
          customerName: request.customerName,
          createdAt: request.createdAt,
          acknowledgedAt: request.acknowledgedAt,
          servedAt: request.servedAt,
          cancelledAt: request.cancelledAt,
        },
      });
    } catch (error: any) {
      console.error('[UnifiedStore] GET /:slug/tablet/requests/:id error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '요청 조회에 실패했습니다.' },
      });
    }
  });

  return router;
}
