/**
 * Display Controller
 *
 * 진열 레이아웃 관리 API
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { DisplayService } from '../services/display.service';

export function createDisplayController(dataSource: DataSource): Router {
  const router = Router();
  const service = new DisplayService(dataSource);

  /**
   * POST /display/layout
   * 진열 레이아웃 생성/수정
   */
  router.post('/layout', async (req: Request, res: Response) => {
    try {
      const layout = await service.updateDisplayLayout(req.body);
      res.status(201).json(layout);
    } catch (error) {
      console.error('Error updating display layout:', error);
      res.status(500).json({ error: 'Failed to update display layout' });
    }
  });

  /**
   * POST /display/photo
   * 진열 사진 업로드
   */
  router.post('/photo', async (req: Request, res: Response) => {
    try {
      const { displayId, photoUrl } = req.body;

      if (!displayId || !photoUrl) {
        return res.status(400).json({
          error: 'displayId and photoUrl are required',
        });
      }

      const layout = await service.saveDisplayPhoto({ displayId, photoUrl });
      if (!layout) {
        return res.status(404).json({ error: 'Display not found' });
      }

      res.json(layout);
    } catch (error) {
      console.error('Error saving display photo:', error);
      res.status(500).json({ error: 'Failed to save display photo' });
    }
  });

  /**
   * GET /display/:storeId
   * 매장 진열 목록
   */
  router.get('/:storeId', async (req: Request, res: Response) => {
    try {
      const displays = await service.getDisplayByStore(req.params.storeId);
      res.json(displays);
    } catch (error) {
      console.error('Error getting displays:', error);
      res.status(500).json({ error: 'Failed to get displays' });
    }
  });

  /**
   * GET /display/:storeId/summary
   * 매장 진열 요약
   */
  router.get('/:storeId/summary', async (req: Request, res: Response) => {
    try {
      const summary = await service.getStoreSummary(req.params.storeId);
      res.json(summary);
    } catch (error) {
      console.error('Error getting display summary:', error);
      res.status(500).json({ error: 'Failed to get display summary' });
    }
  });

  /**
   * GET /display
   * 진열 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { storeId, productId, supplierId, status, displayType, shelfPosition, isVerified } =
        req.query;

      const displays = await service.findAll({
        storeId: storeId as string,
        productId: productId as string,
        supplierId: supplierId as string,
        status: status as any,
        displayType: displayType as any,
        shelfPosition: shelfPosition as any,
        isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
      });

      res.json(displays);
    } catch (error) {
      console.error('Error listing displays:', error);
      res.status(500).json({ error: 'Failed to list displays' });
    }
  });

  /**
   * GET /display/unverified/list
   * 미인증 진열 목록
   */
  router.get('/unverified/list', async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query;
      const displays = await service.getUnverifiedDisplays(storeId as string);
      res.json(displays);
    } catch (error) {
      console.error('Error getting unverified displays:', error);
      res.status(500).json({ error: 'Failed to get unverified displays' });
    }
  });

  /**
   * POST /display/:id/verify
   * 진열 인증
   */
  router.post('/:id/verify', async (req: Request, res: Response) => {
    try {
      const verifiedBy = (req as any).user?.id || 'system';

      const display = await service.verifyDisplay(req.params.id, verifiedBy);
      if (!display) {
        return res.status(404).json({ error: 'Display not found' });
      }

      res.json(display);
    } catch (error) {
      console.error('Error verifying display:', error);
      res.status(500).json({ error: 'Failed to verify display' });
    }
  });

  /**
   * PATCH /display/:id/status
   * 진열 상태 변경
   */
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      const display = await service.updateStatus(req.params.id, status);
      if (!display) {
        return res.status(404).json({ error: 'Display not found' });
      }

      res.json(display);
    } catch (error) {
      console.error('Error updating display status:', error);
      res.status(500).json({ error: 'Failed to update display status' });
    }
  });

  /**
   * PATCH /display/:id/facing
   * 페이싱 수량 변경
   */
  router.patch('/:id/facing', async (req: Request, res: Response) => {
    try {
      const { facingCount } = req.body;

      if (facingCount === undefined) {
        return res.status(400).json({ error: 'facingCount is required' });
      }

      const display = await service.updateFacing(req.params.id, facingCount);
      if (!display) {
        return res.status(404).json({ error: 'Display not found' });
      }

      res.json(display);
    } catch (error) {
      console.error('Error updating facing count:', error);
      res.status(500).json({ error: 'Failed to update facing count' });
    }
  });

  /**
   * GET /display/:storeId/position/:position
   * 포지션별 진열 목록
   */
  router.get('/:storeId/position/:position', async (req: Request, res: Response) => {
    try {
      const displays = await service.getDisplaysByPosition(
        req.params.storeId,
        req.params.position as any
      );
      res.json(displays);
    } catch (error) {
      console.error('Error getting displays by position:', error);
      res.status(500).json({ error: 'Failed to get displays by position' });
    }
  });

  /**
   * DELETE /display/:id
   * 진열 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Display not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting display:', error);
      res.status(500).json({ error: 'Failed to delete display' });
    }
  });

  return router;
}
