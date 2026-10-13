import { Request, Response } from 'express';
import logger from '../../../../utils/logger.js';
import { SupplierLibraryHandoffService } from '../../services/supplier-library-handoff.service.js';
import type { AuthenticatedRequest, SupplierRequest } from './access.js';
export function createSupplierLibraryHandoffHandlers(
  handoffService: Pick<SupplierLibraryHandoffService, 'handoff'>,
) {
  return {
    handoff: async (req: Request, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const user = (req as AuthenticatedRequest).user!;
        const serviceKey = typeof req.body?.serviceKey === 'string' ? req.body.serviceKey : '';
        const result = await handoffService.handoff(
          supplierId,
          { id: user.id, name: (user as any).name, email: (user as any).email },
          req.params.id,
          serviceKey,
        );
        if ('error' in result) {
          res
            .status(result.error.status)
            .json({
              success: false,
              error: { code: result.error.code, message: result.error.message },
            });
          return;
        }
        // WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1 §7.1:
        //   이미 제공된 자료를 다시 제공하면 새 수신을 만들지 않는다 → 201 Created 가 아니라 200.
        //   응답 `reused` 로 호출측이 "이미 제공됨" 을 구분한다.
        res.status(result.data.reused ? 200 : 201).json({ success: true, data: result.data });
      } catch (error) {
        logger.error('[Neture Library API] Error handing off library item:', error);
        res
          .status(500)
          .json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to hand off library item' },
          });
      }
    },
  };
}
