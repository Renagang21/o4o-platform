/**
 * Supplier Campaign Controller
 *
 * 공급사 캠페인 관리 API
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { SupplierCampaignService } from '../services/supplier-campaign.service';

export function createCampaignController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SupplierCampaignService(dataSource);

  /**
   * POST /campaign
   * 캠페인 생성
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const campaign = await service.create(req.body);
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  /**
   * GET /campaign/:id
   * 캠페인 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const campaign = await service.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error getting campaign:', error);
      res.status(500).json({ error: 'Failed to get campaign' });
    }
  });

  /**
   * GET /campaign
   * 캠페인 목록
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { supplierId, status, type, activeOnly } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const campaigns = await service.findAll({
        supplierId: supplierId as string,
        status: status as any,
        type: type as any,
        activeOnly: activeOnly === 'true',
      });

      res.json(campaigns);
    } catch (error) {
      console.error('Error listing campaigns:', error);
      res.status(500).json({ error: 'Failed to list campaigns' });
    }
  });

  /**
   * PATCH /campaign/:id
   * 캠페인 수정
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const campaign = await service.update(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      if (error.message.includes('Cannot update')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  /**
   * POST /campaign/:id/schedule
   * 캠페인 예약
   */
  router.post('/:id/schedule', async (req: Request, res: Response) => {
    try {
      const campaign = await service.schedule(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found or not in draft status' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      res.status(500).json({ error: 'Failed to schedule campaign' });
    }
  });

  /**
   * POST /campaign/:id/publish
   * 캠페인 게시
   */
  router.post('/:id/publish', async (req: Request, res: Response) => {
    try {
      const campaign = await service.publish(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error: any) {
      console.error('Error publishing campaign:', error);
      if (error.message.includes('must be in')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to publish campaign' });
    }
  });

  /**
   * POST /campaign/:id/pause
   * 캠페인 일시 중지
   */
  router.post('/:id/pause', async (req: Request, res: Response) => {
    try {
      const campaign = await service.pause(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found or not active' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error pausing campaign:', error);
      res.status(500).json({ error: 'Failed to pause campaign' });
    }
  });

  /**
   * POST /campaign/:id/resume
   * 캠페인 재개
   */
  router.post('/:id/resume', async (req: Request, res: Response) => {
    try {
      const campaign = await service.resume(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found or not paused' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error resuming campaign:', error);
      res.status(500).json({ error: 'Failed to resume campaign' });
    }
  });

  /**
   * POST /campaign/:id/complete
   * 캠페인 완료 처리
   */
  router.post('/:id/complete', async (req: Request, res: Response) => {
    try {
      const campaign = await service.complete(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error completing campaign:', error);
      res.status(500).json({ error: 'Failed to complete campaign' });
    }
  });

  /**
   * POST /campaign/:id/cancel
   * 캠페인 취소
   */
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const campaign = await service.cancel(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      res.status(500).json({ error: 'Failed to cancel campaign' });
    }
  });

  /**
   * POST /campaign/:id/stats
   * 캠페인 통계 업데이트
   */
  router.post('/:id/stats', async (req: Request, res: Response) => {
    try {
      const campaign = await service.updateStats(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error updating campaign stats:', error);
      res.status(500).json({ error: 'Failed to update campaign stats' });
    }
  });

  /**
   * POST /campaign/:id/view
   * 캠페인 조회 기록
   */
  router.post('/:id/view', async (req: Request, res: Response) => {
    try {
      await service.recordView(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error recording campaign view:', error);
      res.status(500).json({ error: 'Failed to record campaign view' });
    }
  });

  /**
   * POST /campaign/:id/click
   * 캠페인 클릭 기록
   */
  router.post('/:id/click', async (req: Request, res: Response) => {
    try {
      await service.recordClick(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error recording campaign click:', error);
      res.status(500).json({ error: 'Failed to record campaign click' });
    }
  });

  /**
   * POST /campaign/:id/conversion
   * 캠페인 전환 기록
   */
  router.post('/:id/conversion', async (req: Request, res: Response) => {
    try {
      const { revenue } = req.body;

      if (revenue === undefined) {
        return res.status(400).json({ error: 'revenue is required' });
      }

      await service.recordConversion(req.params.id, revenue);
      res.status(204).send();
    } catch (error) {
      console.error('Error recording campaign conversion:', error);
      res.status(500).json({ error: 'Failed to record campaign conversion' });
    }
  });

  /**
   * GET /campaign/:id/analytics
   * 캠페인 분석 데이터
   */
  router.get('/:id/analytics', async (req: Request, res: Response) => {
    try {
      const analytics = await service.getAnalytics(req.params.id);
      if (!analytics) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(analytics);
    } catch (error) {
      console.error('Error getting campaign analytics:', error);
      res.status(500).json({ error: 'Failed to get campaign analytics' });
    }
  });

  /**
   * GET /campaign/for-partner
   * 파트너용 활성 캠페인 목록
   */
  router.get('/for-partner/list', async (req: Request, res: Response) => {
    try {
      const { supplierId, partnerId } = req.query;

      if (!supplierId || !partnerId) {
        return res.status(400).json({ error: 'supplierId and partnerId are required' });
      }

      const campaigns = await service.getActiveCampaignsForPartner(
        supplierId as string,
        partnerId as string
      );

      res.json(campaigns);
    } catch (error) {
      console.error('Error getting campaigns for partner:', error);
      res.status(500).json({ error: 'Failed to get campaigns for partner' });
    }
  });

  /**
   * GET /campaign/stats/summary
   * 캠페인 통계 요약
   */
  router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const stats = await service.getStatsSummary(supplierId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error getting campaign stats:', error);
      res.status(500).json({ error: 'Failed to get campaign stats' });
    }
  });

  /**
   * DELETE /campaign/:id
   * 캠페인 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  return router;
}
