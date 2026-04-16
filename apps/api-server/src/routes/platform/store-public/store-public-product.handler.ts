/**
 * Store Public Product Handler — Products, categories, featured
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * Extracted from unified-store-public.routes.ts
 *
 * Endpoints:
 *   GET /:slug/products/featured — Featured products (B2C visibility gate)
 *   GET /:slug/products          — Product list (B2C visibility gate, paginated)
 *   GET /:slug/products/:id      — Product detail (B2C visibility gate)
 *   GET /:slug/categories        — Product categories (B2C visibility gate)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { cacheAside, hashCacheKey, READ_CACHE_TTL } from '../../../cache/read-cache.js';
import { resolvePublicStore, queryVisibleProducts, resolveServiceKeys } from './store-public-utils.js';

export function createStorePublicProductRoutes(deps: {
  dataSource: DataSource;
}): Router {
  const router = Router();
  const { dataSource } = deps;

  // GET /:slug/products/featured — Featured products (MUST be before /:slug/products/:id)
  router.get('/:slug/products/featured', async (req: Request, res: Response): Promise<void> => {
    try {
      const resolved = await resolvePublicStore(dataSource, req.params.slug, req, res);
      if (!resolved) return;

      const limit = req.query.limit ? Number(req.query.limit) : 8;

      // WO-STORE-MULTI-SERVICE-GRID-V1: optional ?services= for multi-service grid
      const ALLOWED_SERVICE_KEYS = Object.values(SERVICE_KEYS) as string[];
      let serviceKeys: string[];
      if (req.query.services && typeof req.query.services === 'string') {
        const requested = req.query.services.split(',')
          .map((s) => s.trim().toLowerCase())
          .filter((s) => ALLOWED_SERVICE_KEYS.includes(s));
        serviceKeys = requested.length > 0 ? requested : resolveServiceKeys(resolved.serviceKey);
      } else {
        serviceKeys = resolveServiceKeys(resolved.serviceKey);
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

      const result = await queryVisibleProducts(dataSource, resolved.storeId, resolveServiceKeys(resolved.serviceKey), {
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

      const result = await queryVisibleProducts(dataSource, resolved.storeId, resolveServiceKeys(resolved.serviceKey), {
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

      // WO-O4O-GA-PRELAUNCH-VERIFICATION-V1: SHA1 hash key (collision-safe)
      const resolvedServiceKeys = resolveServiceKeys(resolved.serviceKey);
      const categories: Array<{ category: string; productCount: number }> = await cacheAside(
        hashCacheKey(`sf:cat:${resolved.storeId}`, { sk: resolvedServiceKeys.join(',') }),
        READ_CACHE_TTL.STOREFRONT,
        () => dataSource.query(
          `SELECT pm.brand_name AS category, COUNT(DISTINCT spo.id)::int AS "productCount"
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           JOIN neture_suppliers s ON s.id = spo.supplier_id
           INNER JOIN organization_product_listings opl
             ON opl.offer_id = spo.id
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
           WHERE spo.is_active = true
             AND s.status = 'ACTIVE'
           GROUP BY pm.brand_name
           ORDER BY "productCount" DESC`,
          [resolved.storeId, resolvedServiceKeys],
        ),
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

  return router;
}
