/**
 * SupplierContractController — WO-O4O-NETURE-SELLER-CONTRACT-TO-SUPPLIER-MIGRATION-V1
 *
 * 공급자 계약 API. 이전에 /seller/contracts에 있던 supplier 전용 계약 엔드포인트를
 * /supplier/contracts로 이동하여 supplier = 계약 주체 경계를 명확히 한다.
 *
 * Routes (mounted at /supplier prefix):
 *   GET  /contracts                  공급자 계약 목록 조회
 *   POST /contracts/:id/terminate    공급자 계약 해지
 *   POST /contracts/:id/commission   공급자 수수료 변경
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import logger from '../../../utils/logger.js';

export function createSupplierContractController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);

  // ==================== 공급자 계약 (WO-NETURE-SELLER-PARTNER-CONTRACT-V1) ====================

  /**
   * GET /contracts
   * 공급자 계약 목록 조회
   * Query: ?status=active|terminated|expired
   */
  router.get('/contracts', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;

      const { status } = req.query;
      const contracts = await netureService.getSellerContracts(supplierId, status as string | undefined);
      res.json({ success: true, data: contracts });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier contracts:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
    }
  });

  /**
   * POST /contracts/:id/terminate
   * 공급자 계약 해지
   */
  router.post('/contracts/:id/terminate', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;

      const { id } = req.params;
      const result = await netureService.terminateContract(id, supplierId, 'seller');
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'CONTRACT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '계약을 찾을 수 없습니다.' });
      }
      if (msg === 'CONTRACT_NOT_ACTIVE') {
        return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '활성 상태의 계약만 해지할 수 있습니다.' });
      }
      logger.error('[Neture API] Error terminating supplier contract:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to terminate contract' });
    }
  });

  /**
   * POST /contracts/:id/commission
   * 수수료 변경 (기존 계약 terminated → 신규 계약 생성)
   */
  router.post('/contracts/:id/commission', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;

      const { id } = req.params;
      const { commissionRate } = req.body;
      if (commissionRate === undefined || typeof commissionRate !== 'number') {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'commissionRate (number) is required' });
      }

      const result = await netureService.updateCommissionRate(id, commissionRate, supplierId);
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'ACTIVE_CONTRACT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '활성 계약을 찾을 수 없습니다.' });
      }
      logger.error('[Neture API] Error updating supplier commission rate:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update commission rate' });
    }
  });

  return router;
}
