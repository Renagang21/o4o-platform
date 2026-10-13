import { PolicyAcceptanceError } from '../../../policy-acceptance/policy-acceptance.service.js';
import type { Response } from 'express';
import type {
  SupplierRequest,
  AuthenticatedRequest,
} from '../../middleware/neture-identity.middleware.js';
import logger from '../../../../utils/logger.js';
import type { NetureService } from '../../neture.service.js';

/** HTTP contract handlers; authorization stays on the public controller routes. */
export function createSupplierRegistrationHandlers(
  netureService: Pick<NetureService, 'registerSupplier' | 'getSupplierDashboardSummary'>,
) {
  return {
    register: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res
            .status(401)
            .json({
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
            });
        }
        const { name, slug, contactEmail, policyReferences } = req.body || {};
        const result = await netureService.registerSupplier(userId, {
          name,
          slug,
          contactEmail,
          policyReferences,
        });
        if (!result.success) {
          const statusMap: Record<string, number> = {
            NETURE_MEMBERSHIP_REQUIRED: 403,
            MISSING_NAME: 400,
            INVALID_SLUG: 400,
            USER_ALREADY_HAS_SUPPLIER: 409,
            SLUG_ALREADY_EXISTS: 409,
          };
          return res
            .status(statusMap[result.error!] || 400)
            .json({ success: false, error: { code: result.error, message: result.error } });
        }
        res.status(201).json({ success: true, data: result.data });
      } catch (error) {
        if (error instanceof PolicyAcceptanceError)
          return res
            .status(error.httpStatus)
            .json({ success: false, error: { code: error.code, message: error.message } });
        logger.error('[Neture API] Error registering supplier:', error);
        res
          .status(500)
          .json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to register supplier' },
          });
      }
    },
    dashboard: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const summary = await netureService.getSupplierDashboardSummary(supplierId);
        res.json({ success: true, data: summary });
      } catch (error) {
        logger.error('[Neture API] Error fetching supplier dashboard summary:', error);
        res
          .status(500)
          .json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to fetch dashboard summary',
          });
      }
    },
  };
}
