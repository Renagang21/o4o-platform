/**
 * SupplierProductController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes: supplier/products, supplier/requests, supplier/csv-import/*
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import { CsvImportService } from '../services/csv-import.service.js';
import { generateProductTemplate } from '../services/xlsx-template.service.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import logger from '../../../utils/logger.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';

export function createSupplierProductController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const csvImportService = new CsvImportService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // POST /supplier/products
  router.post('/products', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { barcode, marketingName, categoryId, brandName,
              distributionType, manualData, priceGeneral, consumerReferencePrice,
              consumerShortDescription, consumerDetailDescription, serviceKeys } = req.body;
      const result = await netureService.createSupplierOffer(supplierId, {
        barcode, marketingName, categoryId, brandName,
        manualData, distributionType, serviceKeys,
        priceGeneral, consumerReferencePrice,
        consumerShortDescription, consumerDetailDescription,
      });
      if (!result.success) {
        const statusCode = result.error === 'SUPPLIER_NOT_ACTIVE' ? 403
          : result.error === 'OFFER_ALREADY_EXISTS' ? 409
          : 400;
        return res.status(statusCode).json(result);
      }
      res.status(201).json(result);
    } catch (error) {
      logger.error('[Neture API] Error creating supplier product:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create supplier product' });
    }
  });

  // GET /supplier/products (WO-NETURE-SUPPLIER-EXCEL-LIST-V1: pagination/search/filter 지원)
  router.get('/products', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { page, limit, keyword, distributionType, isActive, sort, order,
              hasImage, hasDescription, barcodeSource, completenessStatus } = req.query;

      // 쿼리 파라미터가 있으면 paginated, 없으면 기존 호환
      if (page || limit || keyword || distributionType || isActive || sort || hasImage || hasDescription || barcodeSource || completenessStatus) {
        const result = await netureService.getSupplierProductsPaginated(supplierId, {
          page: page as string | undefined ? Number(page) : undefined,
          limit: limit as string | undefined ? Number(limit) : undefined,
          keyword: keyword as string | undefined,
          distributionType: distributionType as string | undefined,
          isActive: isActive as string | undefined,
          sort: sort as string | undefined,
          order: order as string | undefined,
          hasImage: hasImage as string | undefined,
          hasDescription: hasDescription as string | undefined,
          barcodeSource: barcodeSource as string | undefined,
          completenessStatus: completenessStatus as string | undefined,
        });
        res.json({ success: true, ...result });
      } else {
        const products = await netureService.getSupplierProducts(supplierId);
        res.json({ success: true, data: products });
      }
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier products:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch supplier products' });
    }
  });

  // POST /supplier/products/submit-approval (WO-NETURE-PRODUCT-LIFECYCLE-COMPLETION-V1)
  // 주의: /products/:id 보다 먼저 등록해야 'submit-approval'이 :id로 매칭되지 않음
  router.post('/products/submit-approval', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { offerIds, serviceKeys } = req.body;

      if (!Array.isArray(offerIds) || offerIds.length === 0) {
        return res.status(400).json({ success: false, error: 'INVALID_OFFER_IDS', message: 'offerIds array is required' });
      }
      if (offerIds.length > 100) {
        return res.status(400).json({ success: false, error: 'TOO_MANY_OFFERS', message: 'Max 100 offers per request' });
      }
      if (!Array.isArray(serviceKeys) || serviceKeys.length === 0) {
        return res.status(400).json({ success: false, error: 'INVALID_SERVICE_KEYS', message: 'serviceKeys array is required' });
      }

      const result = await netureService.submitForApproval(supplierId, offerIds, serviceKeys);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error submitting for approval:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to submit for approval' });
    }
  });

  // DELETE /supplier/products/bulk (WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1)
  // 주의: /products/:id 보다 먼저 등록해야 'bulk'가 :id로 매칭되지 않음
  router.delete('/products/bulk', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { offerIds } = req.body;

      if (!Array.isArray(offerIds) || offerIds.length === 0) {
        return res.status(400).json({ success: false, error: OfferErrorCode.INVALID_OFFER_IDS, message: 'offerIds array is required' });
      }
      if (offerIds.length > 100) {
        return res.status(400).json({ success: false, error: OfferErrorCode.VALIDATION_ERROR, message: 'Max 100 offers per request' });
      }

      const result = await netureService.bulkDeleteOffers(supplierId, offerIds);
      const allSucceeded = !result.failed || result.failed.length === 0;
      res.json({ success: allSucceeded, data: result });
    } catch (error) {
      logger.error('[Neture API] Error bulk deleting offers:', error);
      res.status(500).json({ success: false, error: OfferErrorCode.INTERNAL_ERROR, message: 'Failed to bulk delete offers' });
    }
  });

  // PATCH /supplier/products/batch (WO-NETURE-SUPPLIER-EXCEL-LIST-V1)
  // 주의: /products/:id 보다 먼저 등록해야 'batch'가 :id로 매칭되지 않음
  router.patch('/products/batch', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, error: 'INVALID_UPDATES', message: 'updates array is required' });
      }
      if (updates.length > 100) {
        return res.status(400).json({ success: false, error: 'TOO_MANY_UPDATES', message: 'Max 100 updates per request' });
      }
      const result = await netureService.batchUpdateSupplierOffers(supplierId, updates);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error batch updating supplier products:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to batch update' });
    }
  });

  // PATCH /supplier/products/:id
  router.patch('/products/:id', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const { isActive, distributionType, allowedSellerIds,
              priceGeneral, consumerReferencePrice, stockQuantity,
              consumerShortDescription, consumerDetailDescription, marketingName } = req.body;
      const result = await netureService.updateSupplierOffer(id, supplierId, {
        isActive, distributionType, allowedSellerIds,
        priceGeneral, consumerReferencePrice, stockQuantity,
        consumerShortDescription, consumerDetailDescription, marketingName,
      });
      if (!result.success) {
        const statusCode = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json(result);
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error updating supplier product:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update supplier product' });
    }
  });

  // GET /supplier/requests (inline SQL - v2 product_approvals)
  router.get('/requests', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { status, serviceId } = req.query;
      const params: unknown[] = [supplierId];
      let statusFilter = '';
      let serviceFilter = '';
      if (status && typeof status === 'string') {
        params.push(status);
        statusFilter = ` AND pa.approval_status = $${params.length}`;
      }
      if (serviceId && typeof serviceId === 'string') {
        params.push(serviceId);
        serviceFilter = ` AND pa.service_key = $${params.length}`;
      }
      const rows = await dataSource.query(
        `SELECT pa.id, pa.approval_status AS status,
                spo.supplier_id AS "supplierId", supplier_org.name AS "supplierName",
                pa.organization_id AS "sellerId",
                pa.service_key AS "serviceId",
                pm.marketing_name AS "productName", pa.offer_id AS "offerId",
                pa.reason AS "rejectReason",
                pa.decided_by AS "decidedBy", pa.decided_at AS "decidedAt",
                pa.created_at AS "requestedAt"
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         JOIN product_masters pm ON pm.id = spo.master_id
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
         WHERE pa.approval_type = 'private'
           AND spo.supplier_id = $1${statusFilter}${serviceFilter}
         ORDER BY pa.created_at DESC`,
        params,
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier requests:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch supplier requests' });
    }
  });

  // GET /supplier/requests/:id (inline SQL - v2 product_approvals)
  router.get('/requests/:id', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const rows = await dataSource.query(
        `SELECT pa.id, pa.approval_status AS status,
                spo.supplier_id AS "supplierId", supplier_org.name AS "supplierName",
                pa.organization_id AS "sellerId",
                pa.service_key AS "serviceId",
                pm.marketing_name AS "productName", pa.offer_id AS "offerId",
                pm.brand_name AS "productCategory",
                pa.reason AS "rejectReason",
                pa.decided_by AS "decidedBy", pa.decided_at AS "decidedAt",
                pa.requested_by AS "requestedBy",
                pa.metadata, pa.created_at AS "requestedAt"
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         JOIN product_masters pm ON pm.id = spo.master_id
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
         WHERE pa.id = $1 AND pa.approval_type = 'private'
           AND spo.supplier_id = $2`,
        [id, supplierId],
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Supplier request not found' });
      }
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier request detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch supplier request detail' });
    }
  });

  // GET /supplier/products/template — XLSX 템플릿 다운로드 (WO-NETURE-BULK-IMPORT-TEMPLATE-UPGRADE-V1)
  router.get('/products/template', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const buffer = await generateProductTemplate();
      res.setHeader('Content-Disposition', 'attachment; filename=neture_product_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      logger.error('[Neture API] Error generating product template:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to generate template' });
    }
  });

  // POST /supplier/csv-import/upload
  router.post('/csv-import/upload', requireAuth, requireActiveSupplier as RequestHandler, uploadSingleMiddleware('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'CSV file is required' } });
      }
      // WO-O4O-NETURE-CSV-XLSX-UPLOAD-NETWORK-ERROR-FIX-V1: 업로드 파일 정보 로깅
      logger.info(`[Neture CSV] Upload started — file: ${file.originalname}, size: ${file.size}, mime: ${file.mimetype}, supplier: ${supplierId}`);
      const result = await csvImportService.uploadAndValidate(supplierId, userId, {
        buffer: file.buffer,
        originalname: file.originalname,
      });
      if (!result.success) {
        logger.warn(`[Neture CSV] Validation failed — file: ${file.originalname}, error: ${result.error}`);
        return res.status(400).json({ success: false, error: { code: result.error, message: result.error } });
      }
      logger.info(`[Neture CSV] Upload success — file: ${file.originalname}, batchId: ${result.data?.batchId}, valid: ${result.data?.validRows}/${result.data?.totalRows}`);
      res.status(200).json(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Neture API] Error uploading file: ${(req as any).file?.originalname} — ${errMsg}`, error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: `파일 처리 실패: ${errMsg}` } });
    }
  });

  // GET /supplier/csv-import/batches
  router.get('/csv-import/batches', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const batches = await csvImportService.listBatches(supplierId);
      res.json({ success: true, data: batches });
    } catch (error) {
      logger.error('[Neture API] Error listing CSV batches:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list CSV batches' } });
    }
  });

  // GET /supplier/csv-import/batches/:id
  router.get('/csv-import/batches/:id', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const result = await csvImportService.getBatch(id, supplierId);
      if (!result.success) {
        return res.status(404).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching CSV batch:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch CSV batch' } });
    }
  });

  // PATCH /supplier/csv-import/batches/:batchId/rows/:rowId — WO-NETURE-IMPORT-ROW-QUICK-EDIT-V1
  router.patch('/csv-import/batches/:batchId/rows/:rowId', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { batchId, rowId } = req.params;
      const result = await csvImportService.updateRow(batchId, rowId, supplierId, req.body);
      if (!result.success) {
        const status = result.error === 'BATCH_NOT_FOUND' || result.error === 'ROW_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error updating CSV import row:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update row' } });
    }
  });

  // POST /supplier/csv-import/batches/:id/apply
  router.post('/csv-import/batches/:id/apply', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const result = await csvImportService.applyBatch(id, supplierId);
      if (!result.success) {
        const status = result.error === 'BATCH_NOT_FOUND' ? 404
          : result.error === 'SUPPLIER_NOT_ACTIVE' ? 403
          : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.json(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('[Neture API] Error applying CSV batch:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: errMsg } });
    }
  });

  // POST /supplier/csv-import/batches/:id/retry — WO-O4O-NETURE-IMPORT-RETRY-FAILED-V1
  router.post('/csv-import/batches/:id/retry', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const targetRows = Array.isArray(req.body?.rows) ? req.body.rows : undefined;
      const result = await csvImportService.retryBatch(id, supplierId, targetRows);
      if (!result.success) {
        const status = result.error === 'BATCH_NOT_FOUND' ? 404
          : result.error === 'SUPPLIER_NOT_ACTIVE' ? 403
          : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.json(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('[Neture API] Error retrying CSV batch:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: errMsg } });
    }
  });

  // DELETE /supplier/csv-import/batches/:id — WO-O4O-NETURE-IMPORT-HISTORY-DELETE-V1
  router.delete('/csv-import/batches/:id', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const result = await csvImportService.deleteBatch(id, supplierId);
      if (!result.success) {
        const status = result.error === 'BATCH_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error deleting CSV batch:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete CSV batch' } });
    }
  });

  // GET /supplier/csv-import/batches/:id/delete-check — WO-O4O-NETURE-IMPORT-HISTORY-FULL-DELETE-V1
  router.get('/csv-import/batches/:id/delete-check', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const result = await csvImportService.checkFullDelete(id, supplierId);
      if (!result.success) {
        const status = result.error === 'BATCH_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error checking full delete:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to check full delete' } });
    }
  });

  // DELETE /supplier/csv-import/batches/:id/full-delete — WO-O4O-NETURE-IMPORT-HISTORY-FULL-DELETE-V1
  router.delete('/csv-import/batches/:id/full-delete', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const userId = req.user!.id;
      const { id } = req.params;
      const result = await csvImportService.fullDeleteBatch(id, supplierId, userId);
      if (!result.success) {
        const status = result.error === 'BATCH_NOT_FOUND' ? 404 : result.error === 'FULL_DELETE_BLOCKED' ? 409 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error full deleting CSV batch:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to full delete CSV batch' } });
    }
  });

  return router;
}
