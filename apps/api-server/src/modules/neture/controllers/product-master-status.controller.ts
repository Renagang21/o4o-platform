/**
 * ProductMasterStatus Controller — ProductMaster 이용 상태 단건 변경 (admin)
 *
 * WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   PATCH /:id/status   — 상태 변경 (ACTIVE | SUSPENDED | ARCHIVED) + 사유·actor 기록
 *
 * 원칙:
 *   - product_masters.status 만 변경. 변경 이력은 product_master_notes 시스템 메모로 기록(단일 TX, catalog.service).
 *   - 참여자·공급자·매장·주문·콘텐츠·QR·POP 등 사용처 데이터는 **일절 변경하지 않는다**.
 *   - 일괄 변경/영구 삭제/승인 흐름/공지 자동 생성 없음.
 * 권한: 관리 메모 컨트롤러와 동일 ADMIN 롤셋.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { NetureService } from '../neture.service.js';
import { PRODUCT_MASTER_STATUSES } from '../services/catalog.service.js';
import type { ProductMasterStatus } from '../services/catalog.service.js';
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

const MAX_REASON_LEN = 500;

function actorId(req: Request): string | null {
  return (req as { user?: { id?: string } }).user?.id ?? null;
}

function isValidStatus(v: unknown): v is ProductMasterStatus {
  return typeof v === 'string' && (PRODUCT_MASTER_STATUSES as readonly string[]).includes(v);
}

export function createProductMasterStatusController(_dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const actor = actorId(req);
      if (!actor) {
        res.status(401).json({ success: false, error: '인증이 필요합니다', code: 'AUTH_REQUIRED' });
        return;
      }

      const status = req.body?.status;
      if (!isValidStatus(status)) {
        res.status(400).json({
          success: false,
          error: `status 는 ${PRODUCT_MASTER_STATUSES.join(' | ')} 중 하나여야 합니다`,
          code: 'INVALID_STATUS',
        });
        return;
      }

      const reasonRaw = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (reasonRaw.length > MAX_REASON_LEN) {
        res.status(400).json({
          success: false,
          error: `사유는 ${MAX_REASON_LEN}자를 넘을 수 없습니다`,
          code: 'REASON_TOO_LONG',
        });
        return;
      }

      const result = await netureService.setProductMasterStatus({
        masterId: req.params.id,
        status,
        reason: reasonRaw || null,
        actorId: actor,
      });

      if (!result.found) {
        res.status(404).json({ success: false, error: '기본상품을 찾을 수 없습니다', code: 'MASTER_NOT_FOUND' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: req.params.id,
          previousStatus: result.previousStatus,
          status,
          changed: result.changed,
        },
      });
    } catch (err) {
      logger.error('[product-master-status] status change failed:', err);
      res.status(500).json({ success: false, error: '상태 변경에 실패했습니다', code: 'MASTER_STATUS_CHANGE_FAILED' });
    }
  });

  return router;
}
