/**
 * Store Public Product Handler — Product detail (QR 제품 랜딩)
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * Extracted from unified-store-public.routes.ts
 *
 * WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1:
 *   KPA 자체 storefront 종료 — 자체몰 목록 렌더링 전용 endpoint 3건 제거.
 *   `/products/featured`(KPA-only) · `/products` · `/categories`(소비처 0)
 *   제품 상세만 QR 제품 랜딩(landingType='product') 착지 API 로 존치한다.
 *   GlycoPharm 은 `/api/v1/glycopharm/stores/*` 자체 controller 를 쓰므로 영향 없다.
 *
 * Endpoints:
 *   GET /:slug/products/:id — Product detail (QR 제품 랜딩 전용, B2C visibility gate)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { resolvePublicStore, queryVisibleProducts, resolveServiceKeys } from './store-public-utils.js';

export function createStorePublicProductRoutes(deps: {
  dataSource: DataSource;
}): Router {
  const router = Router();
  const { dataSource } = deps;

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


  return router;
}
