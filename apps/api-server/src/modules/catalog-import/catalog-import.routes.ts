/**
 * Catalog Import Routes
 *
 * POST   /jobs           — Upload file (multipart)
 * GET    /jobs           — List jobs
 * GET    /jobs/:id       — Job detail with rows
 * POST   /jobs/:id/validate — Run validation
 * POST   /jobs/:id/apply    — Apply to catalog
 *
 * Auth: requireAuth + requireNetureScope('neture:admin')
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';
import { uploadSingleMiddleware } from '../../middleware/upload.middleware.js';
import { CatalogImportService } from './services/catalog-import.service.js';
import type { CatalogImportExtensionKey } from './types/catalog-import.types.js';
import logger from '../../utils/logger.js';

type AuthRequest = Request & {
  user: { id: string; email: string; roles?: string[] };
};

export function createCatalogImportRoutes(_dataSource: DataSource): Router {
  const router = Router();
  const service = new CatalogImportService();

  // Auth guard: all routes require neture:admin
  router.use(requireAuth as any);
  router.use(requireNetureScope('neture:admin') as any);

  // ==================== POST /jobs — Upload ====================
  router.post('/jobs', uploadSingleMiddleware('file'), async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'FILE_REQUIRED' });
      }

      const extensionKey = (req.body.extension_key || 'csv') as CatalogImportExtensionKey;
      const supplierId = req.body.supplier_id;

      if (!supplierId) {
        return res.status(400).json({ success: false, error: 'SUPPLIER_ID_REQUIRED' });
      }

      if (!['csv'].includes(extensionKey)) {
        return res.status(400).json({ success: false, error: `INVALID_EXTENSION: ${extensionKey}` });
      }

      const result = await service.createJob(
        { buffer: file.buffer, originalname: file.originalname },
        extensionKey,
        supplierId,
        authReq.user.id,
      );

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      return res.status(201).json({ success: true, data: result.data });
    } catch (err) {
      logger.error('[CatalogImport] POST /jobs error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== GET /jobs — List ====================
  router.get('/jobs', async (req: Request, res: Response) => {
    try {
      const supplierId = req.query.supplier_id as string | undefined;
      const jobs = await service.listJobs(supplierId);
      return res.json({ success: true, data: jobs });
    } catch (err) {
      logger.error('[CatalogImport] GET /jobs error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== GET /jobs/:id — Detail ====================
  router.get('/jobs/:id', async (req: Request, res: Response) => {
    try {
      const job = await service.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
      }
      return res.json({ success: true, data: job });
    } catch (err) {
      logger.error('[CatalogImport] GET /jobs/:id error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== POST /jobs/:id/validate ====================
  router.post('/jobs/:id/validate', async (req: Request, res: Response) => {
    try {
      const result = await service.validateJob(req.params.id);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      return res.json({ success: true, data: result.data });
    } catch (err) {
      logger.error('[CatalogImport] POST /jobs/:id/validate error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ==================== POST /jobs/:id/apply ====================
  router.post('/jobs/:id/apply', async (req: Request, res: Response) => {
    try {
      const supplierId = req.body.supplier_id;
      if (!supplierId) {
        return res.status(400).json({ success: false, error: 'SUPPLIER_ID_REQUIRED' });
      }

      const result = await service.applyJob(req.params.id, supplierId);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      return res.json({ success: true, data: result.data });
    } catch (err) {
      logger.error('[CatalogImport] POST /jobs/:id/apply error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
