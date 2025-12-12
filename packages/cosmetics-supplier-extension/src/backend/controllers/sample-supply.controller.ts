/**
 * Sample Supply Controller
 *
 * 샘플 공급 관리 API
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { SampleSupplyService } from '../services/sample-supply.service';

export function createSampleSupplyController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SampleSupplyService(dataSource);

  /**
   * POST /sample
   * 샘플 출고 기록
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const sample = await service.recordShipment(req.body);
      res.status(201).json(sample);
    } catch (error) {
      console.error('Error recording sample shipment:', error);
      res.status(500).json({ error: 'Failed to record sample shipment' });
    }
  });

  /**
   * GET /sample/:id
   * 샘플 기록 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const sample = await service.findById(req.params.id);
      if (!sample) {
        return res.status(404).json({ error: 'Sample record not found' });
      }

      res.json(sample);
    } catch (error) {
      console.error('Error getting sample record:', error);
      res.status(500).json({ error: 'Failed to get sample record' });
    }
  });

  /**
   * GET /sample
   * 샘플 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { supplierId, storeId, partnerId, productId, status, sampleType, fromDate, toDate } =
        req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const samples = await service.findAll({
        supplierId: supplierId as string,
        storeId: storeId as string,
        partnerId: partnerId as string,
        productId: productId as string,
        status: status as any,
        sampleType: sampleType as any,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      });

      res.json(samples);
    } catch (error) {
      console.error('Error listing samples:', error);
      res.status(500).json({ error: 'Failed to list samples' });
    }
  });

  /**
   * POST /sample/:id/usage
   * 샘플 사용량 업데이트
   */
  router.post('/:id/usage', async (req: Request, res: Response) => {
    try {
      const { quantityUsed, notes } = req.body;

      if (quantityUsed === undefined) {
        return res.status(400).json({ error: 'quantityUsed is required' });
      }

      const sample = await service.updateUsage(req.params.id, { quantityUsed, notes });
      if (!sample) {
        return res.status(404).json({ error: 'Sample record not found' });
      }

      res.json(sample);
    } catch (error: any) {
      console.error('Error updating sample usage:', error);
      if (error.message.includes('exceed')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update sample usage' });
    }
  });

  /**
   * POST /sample/:id/delivered
   * 배송 완료 처리
   */
  router.post('/:id/delivered', async (req: Request, res: Response) => {
    try {
      const sample = await service.markDelivered(req.params.id);
      if (!sample) {
        return res.status(404).json({ error: 'Sample record not found' });
      }

      res.json(sample);
    } catch (error) {
      console.error('Error marking sample as delivered:', error);
      res.status(500).json({ error: 'Failed to mark sample as delivered' });
    }
  });

  /**
   * POST /sample/:id/conversion
   * 전환 기록
   */
  router.post('/:id/conversion', async (req: Request, res: Response) => {
    try {
      const { conversionCount, conversionRevenue } = req.body;

      if (conversionCount === undefined || conversionRevenue === undefined) {
        return res.status(400).json({
          error: 'conversionCount and conversionRevenue are required',
        });
      }

      const sample = await service.recordConversion(req.params.id, {
        conversionCount,
        conversionRevenue,
      });

      if (!sample) {
        return res.status(404).json({ error: 'Sample record not found' });
      }

      res.json(sample);
    } catch (error) {
      console.error('Error recording conversion:', error);
      res.status(500).json({ error: 'Failed to record conversion' });
    }
  });

  /**
   * GET /sample/stats/supplier
   * 공급사별 샘플 통계
   */
  router.get('/stats/supplier', async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const stats = await service.getStatsBySupplierId(supplierId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error getting supplier sample stats:', error);
      res.status(500).json({ error: 'Failed to get supplier sample stats' });
    }
  });

  /**
   * GET /sample/stats/store
   * 매장별 샘플 통계
   */
  router.get('/stats/store', async (req: Request, res: Response) => {
    try {
      const { supplierId, storeId } = req.query;

      if (!supplierId || !storeId) {
        return res.status(400).json({ error: 'supplierId and storeId are required' });
      }

      const stats = await service.getStatsByStore(supplierId as string, storeId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error getting store sample stats:', error);
      res.status(500).json({ error: 'Failed to get store sample stats' });
    }
  });

  /**
   * GET /sample/rankings/stores
   * 매장 전환율 순위
   */
  router.get('/rankings/stores', async (req: Request, res: Response) => {
    try {
      const { supplierId, limit } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const rankings = await service.getStoreRankings(
        supplierId as string,
        limit ? parseInt(limit as string) : 10
      );

      res.json(rankings);
    } catch (error) {
      console.error('Error getting store rankings:', error);
      res.status(500).json({ error: 'Failed to get store rankings' });
    }
  });

  /**
   * DELETE /sample/:id
   * 샘플 기록 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Sample record not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting sample record:', error);
      res.status(500).json({ error: 'Failed to delete sample record' });
    }
  });

  return router;
}
