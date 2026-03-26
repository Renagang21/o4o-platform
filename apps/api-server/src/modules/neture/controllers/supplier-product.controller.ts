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

  // PATCH /supplier/products/bulk-price (WO-NETURE-SUPPLIER-BULK-EDIT-UX-V1)
  // 주의: /products/:id 보다 먼저 등록해야 'bulk-price'가 :id로 매칭되지 않음
  router.patch('/products/bulk-price', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { offerIds, operation, value } = req.body;

      if (!Array.isArray(offerIds) || offerIds.length === 0) {
        return res.status(400).json({ success: false, error: OfferErrorCode.INVALID_OFFER_IDS, message: 'offerIds array is required' });
      }
      if (offerIds.length > 100) {
        return res.status(400).json({ success: false, error: OfferErrorCode.VALIDATION_ERROR, message: 'Max 100 offers per request' });
      }
      const validOps = ['INCREASE', 'DECREASE', 'PERCENT_INCREASE', 'PERCENT_DECREASE', 'SET'];
      if (!validOps.includes(operation)) {
        return res.status(400).json({ success: false, error: OfferErrorCode.INVALID_OPERATION, message: `operation must be one of: ${validOps.join(', ')}` });
      }
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({ success: false, error: OfferErrorCode.INVALID_VALUE, message: 'value must be a non-negative number' });
      }

      const result = await netureService.bulkUpdatePrice(supplierId, offerIds, operation, value);
      const allSucceeded = !result.failed || result.failed.length === 0;
      res.json({ success: allSucceeded, data: result });
    } catch (error) {
      logger.error('[Neture API] Error bulk updating prices:', error);
      res.status(500).json({ success: false, error: OfferErrorCode.INTERNAL_ERROR, message: 'Failed to bulk update prices' });
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
                spo.supplier_id AS "supplierId", ns.name AS "supplierName",
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
                spo.supplier_id AS "supplierId", ns.name AS "supplierName",
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
      const result = await csvImportService.uploadAndValidate(supplierId, userId, {
        buffer: file.buffer,
        originalname: file.originalname,
      });
      if (!result.success) {
        return res.status(400).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.status(200).json(result);
    } catch (error) {
      logger.error('[Neture API] Error uploading CSV:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process CSV upload' } });
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

  return router;
}
