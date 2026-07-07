/**
 * ProductMasterAuditLog Controller — ProductMaster 작업 이력 (admin, GET only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-MASTER-AUDIT-LOG-VIEW-V1
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   GET /:id/audit-logs — 확실한 이벤트 source 타임라인 + 미매핑 gaps
 *
 * 원칙: **read-only**. audit write 없음. ProductMaster/설명/이미지/후보 mutation 0.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductMasterAuditLogService } from '../services/product-master-audit-log.service.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:admin',
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

export function createProductMasterAuditLogController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductMasterAuditLogService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/:id/audit-logs', async (req: Request, res: Response) => {
    try {
      const data = await service.getAuditLog(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, error: '기본상품을 찾을 수 없습니다', code: 'MASTER_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      logger.error('[product-master-audit-log] failed:', err);
      res.status(500).json({ success: false, error: '작업 이력 조회에 실패했습니다', code: 'AUDIT_LOG_FAILED' });
    }
  });

  return router;
}
