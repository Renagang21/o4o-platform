/**
 * SupplierImportController
 *
 * WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-DYNAMIC-DETAIL-CONTENTS-DETECTION-V1
 *
 * 등록 도우미(import assistant) 가 상품 페이지에서 탐지한 "동적 상세설명 주소"
 * (Firstmall `/goods/view_contents?...` 등) 를 서버에서 SSRF 안전 경로로 조회하고
 * 상세설명 이미지 후보만 추출해 반환한다.
 *
 * 브라우저는 cross-origin 상품 사이트를 직접 fetch 할 수 없으므로(CORS) 서버 경유가 필요하다.
 *
 * Routes:
 *   POST /supplier/import/fetch-detail-contents  (linked supplier)
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest } from '../middleware/neture-identity.middleware.js';
import { fetchDetailContents, DetailFetchError } from '../services/product-detail-fetch.service.js';
import logger from '../../../utils/logger.js';

export function createSupplierImportController(dataSource: DataSource): Router {
  const router = Router();
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  /**
   * POST /supplier/import/fetch-detail-contents
   * body: { url: string, sourceUrl?: string }
   *
   * url       — 탐지된 상세설명 원본 절대 URL (view_contents 등)
   * sourceUrl — 상품 페이지 URL (제공 시 same-origin 으로 제한)
   */
  router.post(
    '/import/fetch-detail-contents',
    requireAuth,
    requireLinkedSupplier,
    async (req: SupplierRequest, res: Response) => {
      try {
        const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
        const sourceUrl = typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl.trim() : undefined;

        if (!url) {
          return res.status(400).json({
            success: false,
            error: { code: 'URL_REQUIRED', message: '상세설명 주소가 필요합니다.' },
          });
        }
        if (url.length > 2048) {
          return res.status(400).json({
            success: false,
            error: { code: 'URL_TOO_LONG', message: '주소가 너무 깁니다.' },
          });
        }

        const result = await fetchDetailContents(url, {
          sourceUrl: sourceUrl || undefined,
          dataSource, // O4O 미디어 라이브러리 복사용
          userId: req.user?.id, // 업로더 기록
        });
        return res.json({ success: true, data: result });
      } catch (error) {
        if (error instanceof DetailFetchError) {
          return res.status(error.status).json({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        logger.error('[Neture SupplierImport] fetch-detail-contents failed:', error);
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: '상세설명 원본 조회 중 오류가 발생했습니다.' },
        });
      }
    },
  );

  return router;
}
