/**
 * SupplierImportController
 *
 * WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1
 *
 * 공급자가 자사 관리자 HTML 에서 추출한 이미지 URL 을 O4O 미디어 라이브러리로 복사한다.
 * (공개페이지 server fetch 기능은 제거됨 — 관리자 HTML 은 클라이언트에서만 분석한다)
 *
 * Routes:
 *   POST /supplier/import/copy-images  (linked supplier)
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest } from '../middleware/neture-identity.middleware.js';
import { copyImages } from '../services/product-detail-fetch.service.js';
import logger from '../../../utils/logger.js';

export function createSupplierImportController(dataSource: DataSource): Router {
  const router = Router();
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  /**
   * POST /supplier/import/copy-images
   * body: { urls: string[], shopOrigin?: string }
   *
   * 클라이언트가 자사 관리자 HTML 에서 추출한 이미지 URL 을 O4O 미디어 라이브러리로 복사한다.
   * 관리자 HTML 원문은 받지 않는다(이미지 URL 만). shopOrigin 제공 시 same-origin 으로 제한.
   * WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1
   */
  router.post(
    '/import/copy-images',
    requireAuth,
    requireLinkedSupplier,
    async (req: SupplierRequest, res: Response) => {
      try {
        const urls = Array.isArray(req.body?.urls) ? req.body.urls : null;
        const shopOrigin = typeof req.body?.shopOrigin === 'string' ? req.body.shopOrigin.trim() : undefined;

        if (!urls || urls.length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'URLS_REQUIRED', message: '복사할 이미지 주소가 필요합니다.' },
          });
        }
        if (urls.length > 60) {
          return res.status(400).json({
            success: false,
            error: { code: 'TOO_MANY', message: '한 번에 복사 가능한 이미지는 최대 60개입니다.' },
          });
        }
        if (!urls.every((u: unknown) => typeof u === 'string' && u.length <= 2048)) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_URLS', message: '이미지 주소 형식이 올바르지 않습니다.' },
          });
        }

        // shopOrigin 정규화 (origin 만)
        let normalizedOrigin: string | undefined;
        if (shopOrigin) {
          try {
            normalizedOrigin = new URL(shopOrigin).origin;
          } catch {
            return res.status(400).json({
              success: false,
              error: { code: 'INVALID_SHOP_ORIGIN', message: '쇼핑몰 주소 형식이 올바르지 않습니다.' },
            });
          }
        }

        const results = await copyImages(urls, {
          dataSource,
          userId: req.user!.id,
          shopOrigin: normalizedOrigin,
        });
        const copied = results.filter((r) => r.ok).length;
        return res.json({ success: true, data: { copied, total: results.length, results } });
      } catch (error) {
        logger.error('[Neture SupplierImport] copy-images failed:', error);
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: '이미지 복사 중 오류가 발생했습니다.' },
        });
      }
    },
  );

  return router;
}
