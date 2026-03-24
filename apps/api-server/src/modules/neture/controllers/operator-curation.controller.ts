/**
 * Operator Curation Controller
 *
 * WO-NETURE-PRODUCT-CURATION-V1
 *
 * 큐레이션 CRUD — 승인된 Offer 노출 제어.
 *
 * GET    /curations         — 목록 (filters: serviceKey, placement)
 * POST   /curations         — 등록
 * PATCH  /curations/reorder — 순서 재정렬
 * PATCH  /curations/:id     — 수정
 * DELETE /curations/:id     — 삭제
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { OfferCurationService } from '../services/offer-curation.service.js';
import logger from '../../../utils/logger.js';

export function createOperatorCurationController(dataSource: DataSource): Router {
  const router = Router();
  const curationService = new OfferCurationService(dataSource);

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  // GET /curations — 큐레이션 목록
  router.get('/curations', async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceKey, placement } = req.query;
      const data = await curationService.listCurations({
        serviceKey: serviceKey as string | undefined,
        placement: placement as string | undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Curation] Error listing curations:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // POST /curations — 큐레이션 등록
  router.post('/curations', async (req: Request, res: Response): Promise<void> => {
    try {
      const { offerId, serviceKey, placement, categoryId, position, isActive, startAt, endAt } = req.body;
      if (!offerId || !serviceKey || !placement) {
        res.status(400).json({ success: false, error: 'MISSING_REQUIRED_FIELDS' });
        return;
      }
      const result = await curationService.createCuration({
        offerId, serviceKey, placement, categoryId, position, isActive, startAt, endAt,
      });
      if (!result.success) {
        const status = result.error === 'OFFER_NOT_FOUND' ? 404 : 400;
        res.status(status).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (error) {
      logger.error('[Curation] Error creating curation:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /curations/reorder — 순서 재정렬 (MUST be before /:id)
  router.patch('/curations/reorder', async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: 'IDS_REQUIRED' });
        return;
      }
      const result = await curationService.reorderCurations(ids);
      res.json(result);
    } catch (error) {
      logger.error('[Curation] Error reordering curations:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /curations/:id — 큐레이션 수정
  router.patch('/curations/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await curationService.updateCuration(id, req.body);
      if (!result.success) {
        const status = result.error === 'CURATION_NOT_FOUND' ? 404 : 400;
        res.status(status).json(result);
        return;
      }
      res.json(result);
    } catch (error) {
      logger.error('[Curation] Error updating curation:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // DELETE /curations/:id — 큐레이션 삭제
  router.delete('/curations/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await curationService.deleteCuration(id);
      if (!result.success) {
        res.status(404).json(result);
        return;
      }
      res.json(result);
    } catch (error) {
      logger.error('[Curation] Error deleting curation:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
