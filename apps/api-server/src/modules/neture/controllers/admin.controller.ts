/**
 * AdminController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes:
 *   admin/suppliers/*, admin/products/*, admin/masters/*,
 *   admin/categories/*, admin/brands/*, admin/dashboard/summary,
 *   admin/requests, admin/service-approvals/*,
 *   admin/products/:masterId/images (admin image upload),
 *   products/:masterId/images (supplier image upload — mounted separately),
 *   products/images/:imageId/primary, products/images/:imageId (delete)
 *
 * Mounted at: /admin (admin-prefixed routes)
 *             + /  (image routes that lack the admin prefix)
 */
import { Router, Request, Response } from 'express';
import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import { NetureService } from '../neture.service.js';
import { ImageStorageService } from '../services/image-storage.service.js';
import { AdminService } from '../services/admin.service.js';
import { ActionLogService } from '@o4o/action-log-core';
import { ProductApprovalV2Service } from '../../product-policy-v2/product-approval-v2.service.js';
import { SupplierStatus, OfferDistributionType, OfferApprovalStatus } from '../entities/index.js';
import sharp from 'sharp';
import logger from '../../../utils/logger.js';

// Extended Request type with user info
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
};

/** Request with supplierId set by requireActiveSupplier middleware */
type SupplierRequest = AuthenticatedRequest & {
  supplierId: string;
};

/**
 * Creates the admin router with all admin-prefixed endpoints.
 *
 * The returned router should be mounted at `/admin` in the parent neture router
 * so that e.g. `router.get('/suppliers/pending', ...)` resolves to
 * `GET /api/v1/neture/admin/suppliers/pending`.
 */
export function createAdminController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const imageStorageService = new ImageStorageService();
  const adminService = new AdminService(dataSource);
  const netureActionLogService = new ActionLogService(dataSource);
  const approvalV2Service = new ProductApprovalV2Service(dataSource);

  // ==================== Admin: Supplier Management ====================

  /**
   * GET /admin/suppliers/pending
   * 승인 대기 공급자 목록 (관리자 전용)
   */
  router.get('/suppliers/pending', requireAuth, requireNetureScope('neture:admin'), async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const suppliers = await netureService.getPendingSuppliers();
      res.json({ success: true, data: suppliers });
    } catch (error) {
      logger.error('[Neture API] Error fetching pending suppliers:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pending suppliers' } });
    }
  });

  /**
   * POST /admin/suppliers/:id/approve
   * 공급자 승인 (PENDING → ACTIVE)
   */
  router.post('/suppliers/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const approvedBy = req.user?.id;
      if (!approvedBy) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const result = await netureService.approveSupplier(id, approvedBy);
      if (!result.success) {
        const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      netureActionLogService.logSuccess('neture', approvedBy, 'neture.admin.supplier_approve', {
        meta: { supplierId: id },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error approving supplier:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve supplier' } });
    }
  });

  /**
   * POST /admin/suppliers/:id/reject
   * 공급자 거절 (PENDING → REJECTED)
   */
  router.post('/suppliers/:id/reject', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const rejectedBy = req.user?.id;
      if (!rejectedBy) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { reason } = req.body || {};
      const result = await netureService.rejectSupplier(id, rejectedBy, reason);
      if (!result.success) {
        const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      netureActionLogService.logSuccess('neture', rejectedBy, 'neture.admin.supplier_reject', {
        meta: { supplierId: id, reason },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error rejecting supplier:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject supplier' } });
    }
  });

  /**
   * POST /admin/suppliers/:id/deactivate
   * WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1
   * 공급자 비활성화 (ACTIVE → INACTIVE)
   */
  router.post('/suppliers/:id/deactivate', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const result = await netureService.deactivateSupplier(id, adminUserId);
      if (!result.success) {
        const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.supplier_deactivate', {
        meta: { supplierId: id },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error deactivating supplier:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate supplier' } });
    }
  });

  /**
   * GET /admin/suppliers
   * WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1
   * 전체 공급자 목록 (상태 필터)
   */
  router.get('/suppliers', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.query;
      const filters: { status?: SupplierStatus } = {};
      if (status && typeof status === 'string' && Object.values(SupplierStatus).includes(status as SupplierStatus)) {
        filters.status = status as SupplierStatus;
      }

      const suppliers = await netureService.getAllSuppliers(filters);
      res.json({ success: true, data: suppliers });
    } catch (error) {
      logger.error('[Neture API] Error fetching all suppliers:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch suppliers' } });
    }
  });

  // ==================== Admin: Product Management (WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1) ====================

  /**
   * GET /admin/products/pending
   * 승인 대기 상품 목록
   */
  router.get('/products/pending', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
    try {
      const products = await netureService.getPendingProducts();
      res.json({ success: true, data: products });
    } catch (error) {
      logger.error('[Neture API] Error fetching pending products:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pending products' } });
    }
  });

  /**
   * POST /admin/products/:id/approve
   * 상품 승인 (isActive = true)
   */
  router.post('/products/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const result = await netureService.approveProduct(id, adminUserId);
      if (!result.success) {
        const status = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.product_approve', {
        meta: { productId: id },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error approving product:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve product' } });
    }
  });

  /**
   * POST /admin/offers/bulk-approve
   * 일괄 승인 — WO-O4O-NETURE-BULK-IMPORT-INTEGRATION-V1
   */
  router.post('/offers/bulk-approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { offerIds } = req.body;
      if (!Array.isArray(offerIds) || offerIds.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'offerIds array required' } });
      }
      if (offerIds.length > 100) {
        return res.status(400).json({ success: false, error: { code: 'TOO_MANY', message: 'Max 100 offers per request' } });
      }

      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const result = await netureService.approveProducts(offerIds, adminUserId);

      if (result.approved.length > 0) {
        netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.bulk_approve', {
          meta: { count: result.approved.length, offerIds: result.approved },
        }).catch(() => {});
      }

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error bulk-approving offers:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to bulk approve offers' } });
    }
  });

  /**
   * POST /admin/products/:id/reject
   * 상품 반려 (isActive 유지 false)
   */
  router.post('/products/:id/reject', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { reason } = req.body || {};
      const result = await netureService.rejectProduct(id, adminUserId, reason);
      if (!result.success) {
        const status = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.product_reject', {
        meta: { productId: id, reason },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error rejecting product:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject product' } });
    }
  });

  /**
   * GET /admin/products
   * 전체 상품 목록 (필터: supplierId, distributionType, isActive, approvalStatus)
   */
  router.get('/products', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { supplierId, distributionType, isActive, approvalStatus } = req.query;
      const filters: { supplierId?: string; distributionType?: OfferDistributionType; isActive?: boolean; approvalStatus?: OfferApprovalStatus } = {};

      if (supplierId && typeof supplierId === 'string') filters.supplierId = supplierId;
      if (distributionType && typeof distributionType === 'string' && Object.values(OfferDistributionType).includes(distributionType as OfferDistributionType)) {
        filters.distributionType = distributionType as OfferDistributionType;
      }
      if (isActive === 'true') filters.isActive = true;
      if (isActive === 'false') filters.isActive = false;
      if (approvalStatus && typeof approvalStatus === 'string' && Object.values(OfferApprovalStatus).includes(approvalStatus as OfferApprovalStatus)) {
        filters.approvalStatus = approvalStatus as OfferApprovalStatus;
      }

      const products = await netureService.getAllProducts(filters);
      res.json({ success: true, data: products });
    } catch (error) {
      logger.error('[Neture API] Error fetching all products:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' } });
    }
  });

  // ==================== Admin: ProductMaster SSOT (WO-O4O-PRODUCT-MASTER-CORE-RESET-V1) ====================

  /**
   * GET /admin/masters
   * ProductMaster 전체 목록 (Admin 전용)
   */
  router.get('/masters', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
    try {
      const masters = await netureService.getAllProductMasters();
      res.json({ success: true, data: masters });
    } catch (error) {
      logger.error('[Neture API] Error fetching product masters:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch product masters' } });
    }
  });

  /**
   * GET /admin/masters/barcode/:barcode
   * barcode로 ProductMaster 조회
   */
  router.get('/masters/barcode/:barcode', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const { barcode } = req.params;
      const master = await netureService.getProductMasterByBarcode(barcode);
      if (!master) {
        return res.status(404).json({ success: false, error: { code: 'MASTER_NOT_FOUND', message: 'ProductMaster not found for barcode' } });
      }
      res.json({ success: true, data: master });
    } catch (error) {
      logger.error('[Neture API] Error fetching product master by barcode:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch product master' } });
    }
  });

  /**
   * POST /admin/masters/resolve
   * Master 생성 파이프라인: barcode → GTIN 검증 → 내부 조회 → MFDS → create
   *
   * Body: { barcode, manualData?: { regulatoryName, manufacturerName, regulatoryType?, marketingName?, mfdsPermitNumber? } }
   */
  router.post('/masters/resolve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { barcode, manualData } = req.body;
      if (!barcode || typeof barcode !== 'string') {
        return res.status(400).json({ success: false, error: { code: 'MISSING_BARCODE', message: 'barcode is required' } });
      }

      const result = await netureService.resolveOrCreateMaster(barcode.trim(), manualData);
      if (!result.success) {
        return res.status(400).json({ success: false, error: { code: result.error, message: result.error } });
      }

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error resolving product master:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve product master' } });
    }
  });

  /**
   * PATCH /admin/masters/:id
   * ProductMaster 수정 (immutable 필드 변경 차단)
   *
   * 허용: marketingName, brandName, categoryId, brandId, specification, originCountry, tags
   * 차단: barcode, regulatoryType, regulatoryName, manufacturerName, mfdsPermitNumber, mfdsProductId
   */
  router.patch('/masters/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await netureService.updateProductMaster(id, req.body);
      if (!result.success) {
        const status = result.error === 'MASTER_NOT_FOUND' ? 404
          : result.error?.startsWith('IMMUTABLE_FIELD_VIOLATION') ? 403
          : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error updating product master:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update product master' } });
    }
  });

  // ==================== Admin: ProductCategory CRUD (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) ====================

  /**
   * GET /admin/categories
   * 카테고리 트리 (4단계 계층)
   */
  router.get('/categories', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
    try {
      const tree = await netureService.getCategoryTree();
      res.json({ success: true, data: tree });
    } catch (error) {
      logger.error('[Neture API] Error fetching categories:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories' } });
    }
  });

  /**
   * POST /admin/categories
   * 카테고리 생성
   */
  router.post('/categories', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, slug, parentId, sortOrder } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name and slug are required' } });
      }
      const category = await netureService.createCategory({ name, slug, parentId, sortOrder });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category';
      const status = message === 'PARENT_CATEGORY_NOT_FOUND' || message === 'MAX_CATEGORY_DEPTH_EXCEEDED' ? 400 : 500;
      logger.error('[Neture API] Error creating category:', error);
      res.status(status).json({ success: false, error: { code: message, message } });
    }
  });

  /**
   * PATCH /admin/categories/:id
   * 카테고리 수정
   */
  router.patch('/categories/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const category = await netureService.updateCategory(id, req.body);
      res.json({ success: true, data: category });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';
      const status = message === 'CATEGORY_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture API] Error updating category:', error);
      res.status(status).json({ success: false, error: { code: message, message } });
    }
  });

  /**
   * DELETE /admin/categories/:id
   * 카테고리 삭제
   */
  router.delete('/categories/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await netureService.deleteCategory(id);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category';
      const status = message === 'CATEGORY_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture API] Error deleting category:', error);
      res.status(status).json({ success: false, error: { code: message, message } });
    }
  });

  // ==================== Admin: Brand CRUD (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) ====================

  /**
   * GET /admin/brands
   * 브랜드 목록
   */
  router.get('/brands', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
    try {
      const brands = await netureService.getAllBrands();
      res.json({ success: true, data: brands });
    } catch (error) {
      logger.error('[Neture API] Error fetching brands:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch brands' } });
    }
  });

  /**
   * POST /admin/brands
   * 브랜드 생성
   */
  router.post('/brands', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, slug, manufacturerName, countryOfOrigin } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name and slug are required' } });
      }
      const brand = await netureService.createBrand({ name, slug, manufacturerName, countryOfOrigin });
      res.status(201).json({ success: true, data: brand });
    } catch (error) {
      logger.error('[Neture API] Error creating brand:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create brand' } });
    }
  });

  /**
   * PATCH /admin/brands/:id
   * 브랜드 수정
   */
  router.patch('/brands/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const brand = await netureService.updateBrand(id, req.body);
      res.json({ success: true, data: brand });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update brand';
      const status = message === 'BRAND_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture API] Error updating brand:', error);
      res.status(status).json({ success: false, error: { code: message, message } });
    }
  });

  /**
   * DELETE /admin/brands/:id
   * 브랜드 삭제
   */
  router.delete('/brands/:id', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await netureService.deleteBrand(id);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete brand';
      const status = message === 'BRAND_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture API] Error deleting brand:', error);
      res.status(status).json({ success: false, error: { code: message, message } });
    }
  });

  // ==================== Product Images (WO-O4O-NETURE-PRODUCT-IMAGE-STRUCTURE-V1) ====================

  /**
   * POST /admin/products/:masterId/images
   * Admin 이미지 업로드
   */
  router.post('/products/:masterId/images', requireAuth, requireNetureScope('neture:admin'), uploadSingleMiddleware('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { masterId } = req.params;
      const file = req.file as Express.Multer.File;
      const imageType = (['thumbnail', 'detail', 'content'].includes(req.body?.type) ? req.body.type : 'detail') as 'thumbnail' | 'detail' | 'content';

      if (!file) {
        return res.status(400).json({ success: false, error: 'NO_FILE' });
      }

      // WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: type별 리사이즈 정책
      const processed = imageType === 'thumbnail'
        ? await sharp(file.buffer).resize(1000, 1000, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()
        : await sharp(file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();

      const { url, gcsPath } = await imageStorageService.uploadImage(masterId, processed, 'image/webp', file.originalname, imageType);
      const image = await netureService.addProductImage(masterId, url, gcsPath, imageType);

      // 교체된 썸네일 GCS 삭제
      if (image.replacedGcsPath) {
        imageStorageService.deleteImage(image.replacedGcsPath).catch(() => {});
      }

      // Fire-and-forget: OCR 추출 (WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1)
      if (imageType !== 'thumbnail') {
        import('../../store-ai/services/product-ocr.service.js')
          .then(({ ProductOcrService }) => {
            const ocrService = new ProductOcrService(dataSource);
            return ocrService.extractAndSave(masterId, image.id, url);
          })
          .catch(() => {});
      }

      res.status(201).json({ success: true, data: image });
    } catch (error) {
      logger.error('[Neture API] Error uploading admin product image:', error);
      res.status(500).json({ success: false, error: 'UPLOAD_FAILED' });
    }
  });

  // ==================== Admin Request Management (WO-S2S-FLOW-RECOVERY-PHASE2-V1 T2) ====================

  /**
   * GET /admin/requests
   * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
   */
  router.get('/requests', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, supplierId, serviceId } = req.query;
      const rows = await adminService.listAdminRequests({
        status: status as string | undefined,
        supplierId: supplierId as string | undefined,
        serviceId: serviceId as string | undefined,
      });

      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin requests:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch requests',
      });
    }
  });

  // ==================== Admin SERVICE Approval Management (WO-NETURE-TIER2-SERVICE-USABILITY-BETA-V1) ====================

  /**
   * GET /admin/service-approvals
   * SERVICE 승인 요청 목록 조회
   * WO-O4O-ADMIN-UI-COMPLETION-V1
   */
  router.get('/service-approvals', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.query;
      const rows = await adminService.listServiceApprovals({
        status: status as string | undefined,
      });
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Neture] Failed to fetch service approvals:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch service approvals' });
    }
  });

  /**
   * POST /admin/service-approvals/:id/approve
   * SERVICE 승인 처리 + Listing 자동 생성
   */
  router.post('/service-approvals/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const result = await approvalV2Service.approveServiceProduct(id, adminUserId);
      if (!result.success) {
        const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.service_approval_approve', {
        meta: { approvalId: id },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error approving SERVICE approval:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve SERVICE approval' } });
    }
  });

  /**
   * POST /admin/service-approvals/:id/reject
   * SERVICE 승인 거절 (Listing 생성 없음)
   */
  router.post('/service-approvals/:id/reject', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { reason } = req.body || {};
      const result = await approvalV2Service.rejectServiceApproval(id, adminUserId, reason);
      if (!result.success) {
        const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.service_approval_reject', {
        meta: { approvalId: id, reason },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error rejecting SERVICE approval:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject SERVICE approval' } });
    }
  });

  /**
   * POST /admin/service-approvals/:id/revoke
   * WO-NETURE-TIER2-SERVICE-STATE-POLICY-REALIGN-V1
   * SERVICE 승인 철회 (APPROVED → REVOKED + listing 비활성화)
   */
  router.post('/service-approvals/:id/revoke', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      }

      const { reason } = req.body || {};
      const result = await approvalV2Service.revokeServiceApproval(id, adminUserId, reason);
      if (!result.success) {
        const status = result.error === 'APPROVAL_NOT_FOUND_OR_NOT_APPROVED' ? 404 : 400;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.error } });
      }

      netureActionLogService.logSuccess('neture', adminUserId, 'neture.admin.service_approval_revoke', {
        meta: { approvalId: id, reason },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error revoking SERVICE approval:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke SERVICE approval' } });
    }
  });

  /**
   * GET /admin/approval-integrity-check
   * WO-NETURE-APPROVAL-OPERATION-STABILIZATION-LITE-V1
   *
   * 읽기 전용 정합성 검사: offer ↔ service approval 불일치 탐지.
   */
  router.get('/approval-integrity-check', requireAuth, requireNetureScope('neture:admin'), async (_req: Request, res: Response) => {
    try {
      // 1. offer vs derived status mismatch
      const mismatches = await dataSource.query(
        `SELECT spo.id AS "offerId",
                spo.approval_status AS "offerStatus",
                CASE
                  WHEN bool_or(osa.approval_status = 'approved') THEN 'APPROVED'
                  WHEN bool_or(osa.approval_status = 'pending') THEN 'PENDING'
                  ELSE 'REJECTED'
                END AS "derivedStatus"
         FROM supplier_product_offers spo
         JOIN offer_service_approvals osa ON osa.offer_id = spo.id
         GROUP BY spo.id, spo.approval_status
         HAVING spo.approval_status != CASE
           WHEN bool_or(osa.approval_status = 'approved') THEN 'APPROVED'
           WHEN bool_or(osa.approval_status = 'pending') THEN 'PENDING'
           ELSE 'REJECTED'
         END`,
      );

      // 2. orphan approvals (no matching offer)
      const orphans = await dataSource.query(
        `SELECT osa.id, osa.offer_id AS "offerId", osa.service_key AS "serviceKey"
         FROM offer_service_approvals osa
         LEFT JOIN supplier_product_offers spo ON spo.id = osa.offer_id
         WHERE spo.id IS NULL`,
      );

      // 3. invalid status values
      const invalidStatus = await dataSource.query(
        `SELECT id, offer_id AS "offerId", approval_status AS "status"
         FROM offer_service_approvals
         WHERE approval_status NOT IN ('pending', 'approved', 'rejected')`,
      );

      // 4. missing service_key
      const missingServiceKey = await dataSource.query(
        `SELECT id, offer_id AS "offerId"
         FROM offer_service_approvals
         WHERE service_key IS NULL OR service_key = ''`,
      );

      const issues = mismatches.length + orphans.length + invalidStatus.length + missingServiceKey.length;

      res.json({
        success: true,
        data: {
          issues,
          mismatches: { count: mismatches.length, items: mismatches.slice(0, 50) },
          orphans: { count: orphans.length, items: orphans.slice(0, 50) },
          invalidStatus: { count: invalidStatus.length, items: invalidStatus.slice(0, 50) },
          missingServiceKey: { count: missingServiceKey.length, items: missingServiceKey.slice(0, 50) },
        },
      });
    } catch (error) {
      logger.error('[Neture API] Error checking approval integrity:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to check integrity' } });
    }
  });

  /**
   * POST /admin/sync-offer-approvals
   * WO-NETURE-OFFER-SERVICE-APPROVAL-SYNC-V1
   * WO-NETURE-APPROVAL-OPERATION-STABILIZATION-LITE-V1: 상세 리포트 추가
   *
   * 운영 안정화: 모든 offer의 approval_status를 service approvals 기준으로 재계산.
   * offer_service_approvals가 없는 offer는 skip.
   */
  router.post('/sync-offer-approvals', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }

      // 모든 offer 중 service approval이 존재하는 건만 대상
      const offers: Array<{ id: string }> = await dataSource.query(
        `SELECT DISTINCT spo.id
         FROM supplier_product_offers spo
         WHERE EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)`,
      );

      const { OfferServiceApprovalService } = await import('../services/offer-service-approval.service.js');
      const approvalService = new OfferServiceApprovalService(dataSource);

      let synced = 0;
      let changed = 0;
      const details: Array<{ offerId: string; before: string; after: string }> = [];
      const errors: string[] = [];

      for (const offer of offers) {
        try {
          const result = await approvalService.syncOfferFromServiceApprovals(offer.id, adminUserId, dataSource);
          synced++;
          if (result.changed) {
            changed++;
            details.push({ offerId: offer.id, before: result.previousStatus, after: result.derivedStatus });
          }
        } catch (err: any) {
          errors.push(`${offer.id}: ${err.message}`);
        }
      }

      logger.info(`[Admin] Sync offer approvals: ${synced} synced, ${changed} changed, ${errors.length} errors by ${adminUserId}`);
      res.json({
        success: true,
        data: {
          totalOffers: offers.length,
          synced,
          updated: changed,
          unchanged: synced - changed,
          details: details.slice(0, 100),
          errors: errors.slice(0, 20),
        },
      });
    } catch (error) {
      logger.error('[Neture API] Error syncing offer approvals:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync offer approvals' } });
    }
  });

  return router;
}

/**
 * Creates a router for supplier-facing product image endpoints.
 *
 * These routes do NOT require admin scope — they use requireActiveSupplier
 * for supplier identity verification. They are separated because they are
 * mounted at a different prefix (not /admin).
 *
 * Mount at: / (root of neture router, paths start with /products/)
 */
export function createProductImageController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const imageStorageService = new ImageStorageService();

  // Inline requireActiveSupplier middleware (matches original neture.routes.ts)
  async function requireActiveSupplier(req: Request, res: Response, next: () => void): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const supplier = await netureService.getSupplierByUserId(authReq.user.id);
    if (!supplier) {
      res.status(401).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
      return;
    }
    if (supplier.status !== SupplierStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_ACTIVE', message: `Supplier account is ${supplier.status}. Only ACTIVE suppliers can perform this action.` },
        currentStatus: supplier.status,
      });
      return;
    }
    (req as SupplierRequest).supplierId = supplier.id;
    next();
  }

  /**
   * GET /products/:masterId/images
   * 상품 이미지 목록 조회
   */
  router.get('/products/:masterId/images', requireAuth, async (req: Request, res: Response) => {
    try {
      const images = await netureService.getProductImages(req.params.masterId);
      res.json({ success: true, data: images });
    } catch (error) {
      logger.error('[Neture API] Error fetching product images:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /products/:masterId/images
   * 상품 이미지 업로드 (공급자용)
   * - multer memoryStorage → sharp 리사이즈 → GCS 업로드 → DB 저장
   */
  router.post('/products/:masterId/images', requireAuth, requireActiveSupplier as unknown as RequestHandler, uploadSingleMiddleware('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { masterId } = req.params;
      const file = req.file as Express.Multer.File;
      const imageType = (['thumbnail', 'detail', 'content'].includes(req.body?.type) ? req.body.type : 'detail') as 'thumbnail' | 'detail' | 'content';

      if (!file) {
        return res.status(400).json({ success: false, error: 'NO_FILE' });
      }

      // WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: type별 리사이즈 정책
      const processed = imageType === 'thumbnail'
        ? await sharp(file.buffer).resize(1000, 1000, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()
        : await sharp(file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();

      // GCS 업로드
      const { url, gcsPath } = await imageStorageService.uploadImage(masterId, processed, 'image/webp', file.originalname, imageType);

      // DB 레코드 생성
      const image = await netureService.addProductImage(masterId, url, gcsPath, imageType);

      // 교체된 썸네일 GCS 삭제
      if (image.replacedGcsPath) {
        imageStorageService.deleteImage(image.replacedGcsPath).catch(() => {});
      }

      // Fire-and-forget: OCR 추출 (WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1)
      if (imageType !== 'thumbnail') {
        import('../../store-ai/services/product-ocr.service.js')
          .then(({ ProductOcrService }) => {
            const ocrService = new ProductOcrService(dataSource);
            return ocrService.extractAndSave(masterId, image.id, url);
          })
          .catch(() => {});
      }

      res.status(201).json({ success: true, data: image });
    } catch (error) {
      logger.error('[Neture API] Error uploading product image:', error);
      res.status(500).json({ success: false, error: 'UPLOAD_FAILED' });
    }
  });

  /**
   * PATCH /products/images/:imageId/primary
   * 대표 이미지 변경
   */
  router.patch('/products/images/:imageId/primary', requireAuth, requireActiveSupplier as unknown as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageId } = req.params;
      const { masterId } = req.body;

      if (!masterId) {
        return res.status(400).json({ success: false, error: 'MISSING_MASTER_ID' });
      }

      await netureService.setPrimaryImage(imageId, masterId);
      res.json({ success: true });
    } catch (error) {
      logger.error('[Neture API] Error setting primary image:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * DELETE /products/images/:imageId
   * 이미지 삭제 (DB + GCS)
   */
  router.delete('/products/images/:imageId', requireAuth, requireActiveSupplier as unknown as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageId } = req.params;
      const { masterId } = req.body;

      if (!masterId) {
        return res.status(400).json({ success: false, error: 'MISSING_MASTER_ID' });
      }

      const { gcsPath } = await netureService.deleteProductImage(imageId, masterId);
      await imageStorageService.deleteImage(gcsPath);

      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message === 'IMAGE_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture API] Error deleting product image:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  return router;
}
