import type { Response } from 'express';
import type {
  SupplierRequest,
  AuthenticatedRequest,
} from '../../middleware/neture-identity.middleware.js';
import logger from '../../../../utils/logger.js';
import { OfferErrorCode } from '../../constants/offer-error-code.js';
import type { NetureService } from '../../neture.service.js';

/** HTTP contract handlers; authorization stays on the public controller routes. */
export function createSupplierOfferHandlers(
  netureService: Pick<
    NetureService,
    | 'createSupplierOfferFromExistingMaster'
    | 'submitForApproval'
    | 'bulkDeleteOffers'
    | 'batchUpdateSupplierOffers'
    | 'updateBusinessContent'
    | 'updateSupplierOffer'
  >,
) {
  return {
    fromMaster: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const result = await netureService.createSupplierOfferFromExistingMaster(
          supplierId,
          req.body ?? {},
        );
        if (!result.success) {
          const statusCode =
            result.error === OfferErrorCode.SUPPLIER_NOT_ACTIVE
              ? 403
              : result.error === OfferErrorCode.MASTER_NOT_FOUND
                ? 404
                : result.error === OfferErrorCode.MASTER_NOT_ACTIVE
                  ? 409
                  : result.error === OfferErrorCode.MASTER_REGULATORY_TYPE_UNSUPPORTED
                    ? 409
                    : result.error === 'OFFER_ALREADY_EXISTS'
                      ? 409
                      : result.error === 'OFFER_IN_RECYCLE_BIN'
                        ? 409
                        : 400;
          return res.status(statusCode).json(result);
        }
        res.status(201).json(result);
      } catch (error) {
        logger.error('[Neture API] Error creating supplier product from existing master:', error);
        res
          .status(500)
          .json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to create supplier product from existing master',
          });
      }
    },
    submitApproval: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { offerIds } = req.body;

        if (!Array.isArray(offerIds) || offerIds.length === 0) {
          return res
            .status(400)
            .json({
              success: false,
              error: 'INVALID_OFFER_IDS',
              message: 'offerIds array is required',
            });
        }
        if (offerIds.length > 100) {
          return res
            .status(400)
            .json({
              success: false,
              error: 'TOO_MANY_OFFERS',
              message: 'Max 100 offers per request',
            });
        }

        const result = await netureService.submitForApproval(supplierId, offerIds);
        res.json({ success: true, data: result });
      } catch (error) {
        logger.error('[Neture API] Error submitting for approval:', error);
        res
          .status(500)
          .json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to submit for approval',
          });
      }
    },
    bulkDelete: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { offerIds } = req.body;

        if (!Array.isArray(offerIds) || offerIds.length === 0) {
          return res
            .status(400)
            .json({
              success: false,
              error: OfferErrorCode.INVALID_OFFER_IDS,
              message: 'offerIds array is required',
            });
        }
        if (offerIds.length > 100) {
          return res
            .status(400)
            .json({
              success: false,
              error: OfferErrorCode.VALIDATION_ERROR,
              message: 'Max 100 offers per request',
            });
        }

        // WO-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1:
        // soft delete 로 정합화 — 운영자 휴지통이 읽는 deleted_by 를 채우기 위해 요청자 id 를 넘긴다.
        const result = await netureService.bulkDeleteOffers(supplierId, offerIds, req.user?.id);
        const allSucceeded = !result.failed || result.failed.length === 0;
        res.json({ success: allSucceeded, data: result });
      } catch (error) {
        logger.error('[Neture API] Error bulk deleting offers:', error);
        res
          .status(500)
          .json({
            success: false,
            error: OfferErrorCode.INTERNAL_ERROR,
            message: 'Failed to bulk delete offers',
          });
      }
    },
    batchUpdate: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { updates } = req.body;
        if (!Array.isArray(updates) || updates.length === 0) {
          return res
            .status(400)
            .json({
              success: false,
              error: 'INVALID_UPDATES',
              message: 'updates array is required',
            });
        }
        if (updates.length > 100) {
          return res
            .status(400)
            .json({
              success: false,
              error: 'TOO_MANY_UPDATES',
              message: 'Max 100 updates per request',
            });
        }
        const result = await netureService.batchUpdateSupplierOffers(supplierId, updates);
        res.json({ success: true, data: result });
      } catch (error) {
        logger.error('[Neture API] Error batch updating supplier products:', error);
        res
          .status(500)
          .json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to batch update' });
      }
    },
    updateBusinessContent: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { id } = req.params;
        const { businessShortDescription, businessDetailDescription } = req.body;
        const result = await netureService.updateBusinessContent(id, supplierId, {
          businessShortDescription,
          businessDetailDescription,
        });
        if (!result.success) {
          const statusCode = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
          return res.status(statusCode).json(result);
        }
        res.json(result);
      } catch (error) {
        logger.error('[Neture API] Error updating business content:', error);
        res
          .status(500)
          .json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to update business content',
          });
      }
    },
    updateOffer: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { id } = req.params;
        const {
          isActive,
          isPublic,
          distributionType,
          allowedSellerIds,
          priceGeneral,
          priceGold,
          pricePlatinum,
          consumerReferencePrice,
          stockQuantity,
          consumerShortDescription,
          consumerDetailDescription,
          name,
          categoryId,
          brandId,
          specification,
          originCountry,
          tags,
          // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
          isFeatured,
        } = req.body;
        const result = await netureService.updateSupplierOffer(id, supplierId, {
          isActive,
          isPublic,
          distributionType,
          allowedSellerIds,
          priceGeneral,
          priceGold,
          pricePlatinum,
          consumerReferencePrice,
          stockQuantity,
          consumerShortDescription,
          consumerDetailDescription,
          name,
          categoryId,
          brandId,
          specification,
          originCountry,
          tags,
          isFeatured,
        });
        if (!result.success) {
          const statusCode = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
          return res.status(statusCode).json(result);
        }
        res.json(result);
      } catch (error) {
        logger.error('[Neture API] Error updating supplier product:', error);
        res
          .status(500)
          .json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to update supplier product',
          });
      }
    },
  };
}
