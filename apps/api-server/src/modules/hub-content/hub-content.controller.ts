/**
 * HUB Content Controller — 통합 콘텐츠 조회 라우트
 *
 * WO-O4O-HUB-CONTENT-QUERY-SERVICE-PHASE1-V2
 *
 * Base path: /api/v1/hub
 * 인증 불필요 (공개 읽기 전용 — 기존 CMS/Signage public API와 동일)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import type { HubProducer, HubSourceDomain } from '@o4o/types/hub-content';
import { HubContentQueryService } from './hub-content.service.js';

const VALID_PRODUCERS: string[] = ['operator', 'supplier', 'community'];
const VALID_DOMAINS: string[] = ['cms', 'signage-media', 'signage-playlist'];

export function createHubContentRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new HubContentQueryService(dataSource);

  /**
   * GET /api/v1/hub/contents
   *
   * Query params:
   *   serviceKey (required) — 서비스 격리 키
   *   producer (optional)   — operator | supplier | community
   *   sourceDomain (optional) — cms | signage-media | signage-playlist
   *   page (optional, default 1)
   *   limit (optional, default 20, max 50)
   */
  router.get('/contents', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceKey, producer, sourceDomain, page, limit } = req.query;

      if (!serviceKey || typeof serviceKey !== 'string') {
        res.status(400).json({
          success: false,
          error: 'serviceKey is required',
          code: 'MISSING_SERVICE_KEY',
        });
        return;
      }

      // Validate producer
      if (producer && !VALID_PRODUCERS.includes(producer as string)) {
        res.status(400).json({
          success: false,
          error: `Invalid producer. Must be one of: ${VALID_PRODUCERS.join(', ')}`,
          code: 'INVALID_PRODUCER',
        });
        return;
      }

      // Validate sourceDomain
      if (sourceDomain && !VALID_DOMAINS.includes(sourceDomain as string)) {
        res.status(400).json({
          success: false,
          error: `Invalid sourceDomain. Must be one of: ${VALID_DOMAINS.join(', ')}`,
          code: 'INVALID_SOURCE_DOMAIN',
        });
        return;
      }

      const result = await service.getContents({
        serviceKey: serviceKey as string,
        producer: producer as HubProducer | undefined,
        sourceDomain: sourceDomain as HubSourceDomain | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
