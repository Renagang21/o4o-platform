import type { Response } from 'express';
import type {
  SupplierRequest,
  AuthenticatedRequest,
} from '../../middleware/neture-identity.middleware.js';
import logger from '../../../../utils/logger.js';
import { type SupplierOnboardingDocumentType } from '../../services/supplier-onboarding.service.js';
import type { SupplierOnboardingService } from '../../services/supplier-onboarding.service.js';

/** HTTP contract handlers; authorization stays on the public controller routes. */
export function createSupplierOnboardingHandlers(
  onboardingService: Pick<
    SupplierOnboardingService,
    | 'getOnboarding'
    | 'updateOnboarding'
    | 'uploadDocument'
    | 'getDocumentForSupplier'
    | 'createReadStream'
  >,
) {
  return {
    getOnboarding: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const data = await onboardingService.getOnboarding(supplierId);
        if (!data) {
          return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND' } });
        }
        res.json({ success: true, data });
      } catch (error) {
        logger.error('[Neture API] Error fetching supplier onboarding:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
    updateOnboarding: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const result = await onboardingService.updateOnboarding(supplierId, req.body || {});
        if (!result) {
          return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND' } });
        }
        if (!result.success) {
          return res.status(400).json({ success: false, error: { code: result.error } });
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        logger.error('[Neture API] Error updating supplier onboarding:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
    uploadDocument: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const documentType = req.params.documentType as SupplierOnboardingDocumentType;
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
          return res.status(400).json({ success: false, error: { code: 'FILE_REQUIRED' } });
        }
        const result = await onboardingService.uploadDocument(supplierId, documentType, file);
        if (!result.success) {
          const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
          return res.status(status).json({ success: false, error: { code: result.error } });
        }
        res.status(201).json({ success: true, data: result.data });
      } catch (error) {
        logger.error('[Neture API] Error uploading supplier onboarding document:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
      }
    },
    downloadDocument: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const documentType = req.params.documentType as SupplierOnboardingDocumentType;
        const document = await onboardingService.getDocumentForSupplier(supplierId, documentType);
        if (!document) {
          return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND' } });
        }

        res.setHeader('Content-Type', document.mimeType || 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${encodeURIComponent(document.fileName)}"`,
        );
        const stream = await onboardingService.createReadStream(document);
        stream.on('error', (err) => {
          logger.error('[Neture API] Supplier document stream error:', err);
          if (!res.headersSent) res.status(500).end();
          else res.end();
        });
        stream.pipe(res);
      } catch (error) {
        logger.error('[Neture API] Error downloading supplier onboarding document:', error);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED' } });
        }
      }
    },
  };
}
