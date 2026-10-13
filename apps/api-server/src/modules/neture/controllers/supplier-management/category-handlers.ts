import type { Response } from 'express';
import type {
  SupplierRequest,
  AuthenticatedRequest,
} from '../../middleware/neture-identity.middleware.js';
import logger from '../../../../utils/logger.js';
import type { SupplierRegulatedCategoryService } from '../../services/supplier-regulated-category.service.js';

/** HTTP contract handlers; authorization stays on the public controller routes. */
export function createSupplierCategoryHandlers(
  regulatedCategoryService: Pick<
    SupplierRegulatedCategoryService,
    | 'listForSupplier'
    | 'selectCategory'
    | 'removeCategory'
    | 'uploadEvidence'
    | 'getEvidenceDocument'
    | 'createReadStream'
  >,
) {
  return {
    list: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const data = await regulatedCategoryService.listForSupplier(supplierId);
        res.json({ success: true, data });
      } catch (error) {
        logger.error('[Neture API] Error listing regulated categories:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
    select: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const result = await regulatedCategoryService.selectCategory(
          supplierId,
          String(req.body?.category || ''),
        );
        if (!result.success) {
          const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
          return res.status(status).json({ success: false, error: { code: result.error } });
        }
        res.status(201).json({ success: true, data: result.data });
      } catch (error) {
        logger.error('[Neture API] Error selecting regulated category:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
    remove: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const result = await regulatedCategoryService.removeCategory(
          supplierId,
          req.params.category,
        );
        if (!result.success) {
          const status = result.error === 'CATEGORY_NOT_FOUND' ? 404 : 400;
          return res.status(status).json({ success: false, error: { code: result.error } });
        }
        res.json({ success: true });
      } catch (error) {
        logger.error('[Neture API] Error removing regulated category:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
    uploadEvidence: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
          return res.status(400).json({ success: false, error: { code: 'FILE_REQUIRED' } });
        }
        const result = await regulatedCategoryService.uploadEvidence(
          supplierId,
          req.params.category,
          file,
        );
        if (!result.success) {
          const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
          return res.status(status).json({ success: false, error: { code: result.error } });
        }
        res.status(201).json({ success: true, data: result.data });
      } catch (error) {
        logger.error('[Neture API] Error uploading regulated category evidence:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
    downloadEvidence: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const document = await regulatedCategoryService.getEvidenceDocument(
          supplierId,
          req.params.category,
        );
        if (!document) {
          return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND' } });
        }
        res.setHeader('Content-Type', document.mimeType || 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${encodeURIComponent(document.fileName)}"`,
        );
        const stream = await regulatedCategoryService.createReadStream(document);
        stream.on('error', (err) => {
          logger.error('[Neture API] Regulated category document stream error:', err);
          if (!res.headersSent) res.status(500).end();
          else res.end();
        });
        stream.pipe(res);
      } catch (error) {
        logger.error('[Neture API] Error downloading regulated category evidence:', error);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED' } });
        }
      }
    },
  };
}
