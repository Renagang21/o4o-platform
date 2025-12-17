/**
 * Sample Inventory Controller
 *
 * 샘플 재고 관리 API
 * WO-COSMETICS-SUPPLIER-INTEGRATION: Supplier 정책 체크 추가
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { SampleInventoryService } from '../services/sample-inventory.service';
import { SupplierProfileService } from '@o4o/cosmetics-supplier-extension';

export function createSampleInventoryController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SampleInventoryService(dataSource);
  const supplierProfileService = new SupplierProfileService(dataSource);

  /**
   * POST /inventory/receive
   * 샘플 입고 기록
   * WO-COSMETICS-SUPPLIER-INTEGRATION: Supplier 정책 체크 추가
   */
  router.post('/receive', async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.body;

      // Supplier 정책 체크: supplierId가 제공된 경우 승인 상태 확인
      if (supplierId) {
        const supplier = await supplierProfileService.findById(supplierId);
        if (!supplier) {
          return res.status(403).json({
            error: 'Supplier not found',
            code: 'SUPPLIER_NOT_FOUND',
          });
        }
        if (supplier.status !== 'approved') {
          return res.status(403).json({
            error: 'Supplier is not approved for sample supply',
            code: 'SUPPLIER_NOT_APPROVED',
            supplierStatus: supplier.status,
          });
        }
      }

      const inventory = await service.recordShipment(req.body);
      res.status(201).json(inventory);
    } catch (error) {
      console.error('Error recording sample shipment:', error);
      res.status(500).json({ error: 'Failed to record sample shipment' });
    }
  });

  /**
   * POST /inventory/use
   * 샘플 사용 기록
   */
  router.post('/use', async (req: Request, res: Response) => {
    try {
      const { storeId, productId, quantity } = req.body;

      if (!storeId || !productId || !quantity) {
        return res.status(400).json({
          error: 'storeId, productId, and quantity are required',
        });
      }

      const inventory = await service.recordUsage({ storeId, productId, quantity });
      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }

      res.json(inventory);
    } catch (error: any) {
      console.error('Error recording sample usage:', error);
      if (error.message === 'Insufficient inventory') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to record sample usage' });
    }
  });

  /**
   * GET /inventory/:storeId
   * 매장 재고 조회
   */
  router.get('/:storeId', async (req: Request, res: Response) => {
    try {
      const inventory = await service.getStoreInventory(req.params.storeId);
      res.json(inventory);
    } catch (error) {
      console.error('Error getting store inventory:', error);
      res.status(500).json({ error: 'Failed to get store inventory' });
    }
  });

  /**
   * GET /inventory/:storeId/stats
   * 매장 재고 통계
   */
  router.get('/:storeId/stats', async (req: Request, res: Response) => {
    try {
      const stats = await service.getStoreStats(req.params.storeId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting inventory stats:', error);
      res.status(500).json({ error: 'Failed to get inventory stats' });
    }
  });

  /**
   * GET /inventory
   * 재고 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { storeId, productId, supplierId, status, sampleType, lowStockOnly } = req.query;

      const inventory = await service.findAll({
        storeId: storeId as string,
        productId: productId as string,
        supplierId: supplierId as string,
        status: status as any,
        sampleType: sampleType as any,
        lowStockOnly: lowStockOnly === 'true',
      });

      res.json(inventory);
    } catch (error) {
      console.error('Error listing inventory:', error);
      res.status(500).json({ error: 'Failed to list inventory' });
    }
  });

  /**
   * GET /inventory/refill-check
   * 재고 보충 필요 항목 조회
   */
  router.get('/refill-check/list', async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query;
      const items = await service.autoRefillCheck(storeId as string);
      res.json(items);
    } catch (error) {
      console.error('Error checking refill:', error);
      res.status(500).json({ error: 'Failed to check refill' });
    }
  });

  /**
   * PATCH /inventory/:id/minimum-stock
   * 최소 재고 수준 설정
   */
  router.patch('/:id/minimum-stock', async (req: Request, res: Response) => {
    try {
      const { minimumStock } = req.body;

      if (minimumStock === undefined) {
        return res.status(400).json({ error: 'minimumStock is required' });
      }

      const inventory = await service.setMinimumStock(req.params.id, minimumStock);
      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }

      res.json(inventory);
    } catch (error) {
      console.error('Error setting minimum stock:', error);
      res.status(500).json({ error: 'Failed to set minimum stock' });
    }
  });

  /**
   * DELETE /inventory/:id
   * 재고 기록 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Inventory not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting inventory:', error);
      res.status(500).json({ error: 'Failed to delete inventory' });
    }
  });

  return router;
}
