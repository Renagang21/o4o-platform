/**
 * ExternalImportController — WO-NETURE-EXTERNAL-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * 외부 쇼핑몰 상품 페이지에서 B2C 설명/이미지를 가져오는 API
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { Request } from 'express';
import { ExternalImportService } from '../services/external-import.service.js';
import logger from '../../../utils/logger.js';

export function createExternalImportRouter(dataSource: DataSource): Router {
  const router = Router();

  /**
   * POST /external-import/parse
   * 외부 상품 페이지 파싱 + 이미지 업로드
   */
  router.post('/external-import/parse', authenticate, async (req, res) => {
    try {
      const { url, html, masterId } = req.body;

      if (!masterId || typeof masterId !== 'string') {
        res.status(400).json({ success: false, error: 'masterId is required' });
        return;
      }

      if (!url && !html) {
        res.status(400).json({ success: false, error: 'url or html is required' });
        return;
      }

      const service = new ExternalImportService(dataSource);

      const result = url
        ? await service.parseFromUrl(url, masterId)
        : await service.parseFromHtml(html, masterId);

      logger.info(`[ExternalImport] Parsed: source=${result.source}, images=${result.imageCount}, user=${(req as any).user?.id}`);

      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('[ExternalImport] Parse error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to parse external product',
      });
    }
  });

  return router;
}
