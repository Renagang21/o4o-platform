/**
 * Neture Operator Supplier Controller
 *
 * WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1
 *
 * 선행 IR : IR-O4O-NETURE-OPERATOR-DASHBOARD-DATA-ACCURACY-AUDIT-V1
 * 선행 CHECK: CHECK-O4O-NETURE-SUPPLIERS-PENDING-STALE-DATA-V1 — Case F 확정
 *
 * 목적:
 *  - Two-step supplier activation 의 2단계 (PENDING → ACTIVE/REJECTED) 처리를 operator 가
 *    수행할 수 있도록 별도 operator scope endpoint 신설.
 *  - 기존 /admin/suppliers/* 는 그대로 유지 (admin scope only) — 본 컨트롤러는 admin 권한
 *    확장이 아닌 별도 operator scope 진입로.
 *  - service layer (NetureService) 의 approveSupplier / rejectSupplier / getPendingSuppliers /
 *    getAllSuppliers 를 그대로 재사용.
 *
 * Routes (mount: /operator):
 *   GET  /operator/suppliers              — 전체 공급자 목록 (status 필터 optional)
 *   GET  /operator/suppliers/pending      — 승인 대기 공급자 목록 (편의 endpoint)
 *   POST /operator/suppliers/:id/approve  — 공급자 활성화 (PENDING → ACTIVE)
 *   POST /operator/suppliers/:id/reject   — 공급자 거절 (PENDING → REJECTED)
 *
 * 운영자 scope 의 의도적 차이 (vs admin):
 *  - deactivate 는 admin 전용 유지 — ACTIVE 공급자 비활성화는 운영 정책 영향이 크므로
 *    operator scope 에서는 노출하지 않는다.
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 *   scopeRoleMapping 에 의해 neture:operator + neture:admin 모두 통과.
 */
import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { NetureService } from '../neture.service.js';
import { ActionLogService } from '@o4o/action-log-core';
import { SupplierStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

export function createOperatorSupplierController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const actionLogService = new ActionLogService(dataSource);

  // Router-level guard: operator scope (admin 도 scopeRoleMapping 으로 통과)
  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/suppliers
   * 전체 공급자 목록 (status 필터)
   */
  router.get('/suppliers', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.query;
      const filters: { status?: SupplierStatus } = {};
      if (status && typeof status === 'string' && Object.values(SupplierStatus).includes(status as SupplierStatus)) {
        filters.status = status as SupplierStatus;
      }

      const suppliers = await netureService.getAllSuppliers(filters);
      res.json({ success: true, data: suppliers });
    } catch (error) {
      logger.error('[Neture Operator API] Error fetching suppliers:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch suppliers' } });
    }
  });

  /**
   * GET /operator/suppliers/pending
   * 승인 대기 공급자 목록 (편의 endpoint — getAllSuppliers + status=PENDING 과 동일)
   */
  router.get('/suppliers/pending', async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const suppliers = await netureService.getPendingSuppliers();
      res.json({ success: true, data: suppliers });
    } catch (error) {
      logger.error('[Neture Operator API] Error fetching pending suppliers:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pending suppliers' } });
    }
  });

  /**
   * POST /operator/suppliers/:id/approve
   * 공급자 활성화 (PENDING → ACTIVE)
   */
  router.post('/suppliers/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const approvedBy = req.user?.id;
      if (!approvedBy) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const result = await netureService.approveSupplier(id, approvedBy);
      if (!result.success) {
        const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      // operator-scope action log: admin 측 'neture.admin.supplier_approve' 와 별도 키
      actionLogService.logSuccess('neture', approvedBy, 'neture.operator.supplier_approve', {
        meta: { supplierId: id },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture Operator API] Error approving supplier:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve supplier' } });
    }
  });

  /**
   * POST /operator/suppliers/:id/reject
   * 공급자 거절 (PENDING → REJECTED)
   */
  router.post('/suppliers/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const rejectedBy = req.user?.id;
      if (!rejectedBy) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { reason } = req.body || {};
      const result = await netureService.rejectSupplier(id, rejectedBy, reason);
      if (!result.success) {
        const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      actionLogService.logSuccess('neture', rejectedBy, 'neture.operator.supplier_reject', {
        meta: { supplierId: id, reason },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture Operator API] Error rejecting supplier:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject supplier' } });
    }
  });

  return router;
}
