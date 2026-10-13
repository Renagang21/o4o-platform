import type { Response } from 'express';
import type {
  SupplierRequest,
  AuthenticatedRequest,
} from '../../middleware/neture-identity.middleware.js';
import logger from '../../../../utils/logger.js';
import type { NetureService } from '../../neture.service.js';

/** HTTP contract handlers; authorization stays on the public controller routes. */
export function createSupplierProductReadHandlers(
  netureService: Pick<
    NetureService,
    'getSupplierProductsPaginated' | 'getSupplierProducts' | 'getSupplierProductApprovalCounts'
  >,
) {
  return {
    list: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const {
          page,
          limit,
          keyword,
          distributionType,
          isActive,
          sort,
          order,
          hasImage,
          hasDescription,
          barcodeSource,
          completenessStatus,
          serviceApprovalStatus,
        } = req.query;

        // 쿼리 파라미터가 있으면 paginated, 없으면 기존 호환
        if (
          page ||
          limit ||
          keyword ||
          distributionType ||
          isActive ||
          sort ||
          hasImage ||
          hasDescription ||
          barcodeSource ||
          completenessStatus ||
          serviceApprovalStatus
        ) {
          const result = await netureService.getSupplierProductsPaginated(supplierId, {
            page: (page as string | undefined) ? Number(page) : undefined,
            limit: (limit as string | undefined) ? Number(limit) : undefined,
            keyword: keyword as string | undefined,
            distributionType: distributionType as string | undefined,
            isActive: isActive as string | undefined,
            sort: sort as string | undefined,
            order: order as string | undefined,
            hasImage: hasImage as string | undefined,
            hasDescription: hasDescription as string | undefined,
            barcodeSource: barcodeSource as string | undefined,
            completenessStatus: completenessStatus as string | undefined,
            serviceApprovalStatus: serviceApprovalStatus as string | undefined,
          });
          res.json({ success: true, ...result });
        } else {
          const products = await netureService.getSupplierProducts(supplierId);
          res.json({ success: true, data: products });
        }
      } catch (error) {
        logger.error('[Neture API] Error fetching supplier products:', error);
        res
          .status(500)
          .json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to fetch supplier products',
          });
      }
    },
    approvalCounts: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        // WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1:
        // 탭 카운트에도 보조 필터/검색어를 적용하여 rows와 기준 일치
        const {
          keyword,
          distributionType,
          isActive,
          hasImage,
          hasDescription,
          barcodeSource,
          completenessStatus,
        } = req.query;
        const counts = await netureService.getSupplierProductApprovalCounts(supplierId, {
          keyword: keyword as string | undefined,
          distributionType: distributionType as string | undefined,
          isActive: isActive as string | undefined,
          hasImage: hasImage as string | undefined,
          hasDescription: hasDescription as string | undefined,
          barcodeSource: barcodeSource as string | undefined,
          completenessStatus: completenessStatus as string | undefined,
        });
        res.json({ success: true, data: counts });
      } catch (error) {
        logger.error('[Neture API] Error fetching approval counts:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  };
}
