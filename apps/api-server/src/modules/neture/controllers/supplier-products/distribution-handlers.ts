import type { Response } from 'express';
import type {
  SupplierRequest,
  AuthenticatedRequest,
} from '../../middleware/neture-identity.middleware.js';
import logger from '../../../../utils/logger.js';
import type { NetureService } from '../../neture.service.js';

/** HTTP contract handlers; authorization stays on the public controller routes. */
export function createSupplierDistributionHandlers(
  netureService: Pick<
    NetureService,
    'updateDistribution' | 'getServicePrices' | 'setServicePrices'
  >,
) {
  return {
    updateDistribution: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        const { id } = req.params;
        const { isPublic, serviceKeys, defaultSupplyEnabled, priceGeneral, servicePrices } = req.body || {};
        if (serviceKeys !== undefined && !Array.isArray(serviceKeys)) {
          return res.status(400).json({ success: false, error: 'INVALID_SERVICE_KEYS' });
        }
        const result = await netureService.updateDistribution(id, supplierId, userId, {
          isPublic,
          serviceKeys, defaultSupplyEnabled, priceGeneral, servicePrices,
        });
        if (!result.success) {
          const statusCode =
            result.error === 'OFFER_NOT_FOUND' ? 404 : result.error === 'NOT_OWNED' ? 403 : 400;
          return res.status(statusCode).json(result);
        }
        const data = result.data;
        res.json({ success: true, data: {
          isPublic: data.isPublic,
          serviceKeys: data.serviceKeys,
          defaultSupplyEnabled: data.defaultSupplyEnabled,
          priceGeneral: data.priceGeneral,
          distributionType: data.distributionType,
          serviceApprovals: data.serviceApprovals.map(approval => ({
            serviceKey: approval.serviceKey,
            status: approval.status,
            reason: approval.reason,
          })),
        } });
      } catch (error) {
        logger.error('[Neture API] Error updating product distribution:', error);
        res
          .status(500)
          .json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to update distribution',
          });
      }
    },
    getPrices: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const result = await netureService.getServicePrices(req.params.id, supplierId);
        if (!result.success) {
          return res.status(result.error === 'NOT_OWNED' ? 403 : 400).json(result);
        }
        res.json(result);
      } catch (error) {
        logger.error('[Neture API] Error fetching service prices:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
    setPrices: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { prices } = req.body || {};
        if (!Array.isArray(prices)) {
          return res.status(400).json({ success: false, error: 'INVALID_PRICES' });
        }
        const result = await netureService.setServicePrices(req.params.id, supplierId, prices);
        if (!result.success) {
          return res.status(result.error === 'NOT_OWNED' ? 403 : 400).json(result);
        }
        res.json(result);
      } catch (error) {
        logger.error('[Neture API] Error setting service prices:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  };
}
